
import { eq, gt, isNull, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { refreshTokens } from "../../db/schema.js";
import { AppError } from "../../common/utils/app-error.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  getAccessTokenLifetimeSeconds,
} from "./token.service.js";

export async function rotateRefreshToken(rawToken: string) {
  if (!rawToken || rawToken.length > 512) {
    throw new AppError(401, "Invalid or expired refresh token.");
  }

  const tokenHash = hashRefreshToken(rawToken);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [storedToken] = await tx
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!storedToken) {
      throw new AppError(401, "Invalid or expired refresh token.");
    }

    // Atomically revoke the old token to prevent concurrent reuse.
    const [revokedToken] = await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokens.id, storedToken.id),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now)
        )
      )
      .returning({ id: refreshTokens.id });

    if (!revokedToken) {
      throw new AppError(401, "Refresh token has already been used.");
    }

    const newRefreshToken = createRefreshToken();

    await tx.insert(refreshTokens).values({
      userId: storedToken.userId,
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: getRefreshTokenExpiry(),
    });

    const accessToken = createAccessToken(storedToken.userId);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer" as const,
      expiresIn: getAccessTokenLifetimeSeconds(),
    };
  });
}
