
import { randomInt } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { refreshTokens, users } from "../../db/schema.js";
import { AppError } from "../../common/utils/app-error.js";

import type {
  RequestOtpDto,
  VerifyOtpDto,
} from "./dto/auth.dto.js";

import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  getAccessTokenLifetimeSeconds,
} from "./token.service.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;

type OtpRecord = {
  code: string;
  expiresAt: number;
  nextRequestAt: number;
  attempts: number;
};

const otpStore = new Map<string, OtpRecord>();

// Request a development OTP.
export async function requestOtp(input: RequestOtpDto) {
  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      503,
      "Mock OTP authentication is disabled in production",
    );
  }

  const now = Date.now();
  const existing = otpStore.get(input.phone);

  if (existing && now < existing.nextRequestAt) {
    throw new AppError(
      429,
      "Please wait before requesting another OTP",
    );
  }

  const code = randomInt(100000, 1000000).toString();

  otpStore.set(input.phone, {
    code,
    expiresAt: now + OTP_TTL_MS,
    nextRequestAt: now + OTP_COOLDOWN_MS,
    attempts: 0,
  });

  console.info(`[MiniLedger DEV OTP] ${input.phone}: ${code}`);

  return {
    message: "OTP generated. Check the backend terminal.",
    expiresInSeconds: OTP_TTL_MS / 1000,
  };
}

// Verify OTP, find or create the user, and issue both tokens.
export async function verifyOtp(input: VerifyOtpDto) {
  const record = otpStore.get(input.phone);

  if (!record) {
    throw new AppError(400, "Request a new OTP first.");
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(input.phone);
    throw new AppError(400, "OTP has expired. Request a new one.");
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(input.phone);
    throw new AppError(429, "Too many incorrect OTP attempts.");
  }

  if (record.code !== input.otp) {
    record.attempts += 1;

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(input.phone);
      throw new AppError(429, "Too many incorrect OTP attempts.");
    }

    throw new AppError(400, "Invalid OTP.");
  }

  otpStore.delete(input.phone);

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, input.phone))
    .limit(1);

  if (!user) {
    await db
      .insert(users)
      .values({ phone: input.phone })
      .onConflictDoNothing({ target: users.phone });

    [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, input.phone))
      .limit(1);
  }

  if (!user) {
    throw new AppError(500, "Unable to create or retrieve user.");
  }

  const accessToken = createAccessToken(user.id);
  const refreshToken = createRefreshToken();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer" as const,
    expiresIn: getAccessTokenLifetimeSeconds(),
    user: {
      id: user.id,
      phone: user.phone,
      createdAt: user.createdAt,
    },
  };
}

// Rotate the refresh token and issue a new token pair.
export async function refreshSession(rawToken: string) {
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
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!storedToken) {
      throw new AppError(401, "Invalid or expired refresh token.");
    }

    // Only one concurrent request can revoke this token successfully.
    const [revoked] = await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokens.id, storedToken.id),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .returning({ id: refreshTokens.id });

    if (!revoked) {
      throw new AppError(401, "Refresh token has already been used.");
    }

    const newRefreshToken = createRefreshToken();

    await tx.insert(refreshTokens).values({
      userId: storedToken.userId,
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken: createAccessToken(storedToken.userId),
      refreshToken: newRefreshToken,
      tokenType: "Bearer" as const,
      expiresIn: getAccessTokenLifetimeSeconds(),
    };
  });
}

// Revoke the supplied refresh token.
export async function logoutSession(rawToken: string): Promise<void> {
  if (!rawToken || rawToken.length > 512) {
    throw new AppError(400, "A valid refresh token is required.");
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenHash, hashRefreshToken(rawToken)),
        isNull(refreshTokens.revokedAt),
      ),
    );
}
