
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../../common/utils/app-error.js";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 7;

export interface AccessTokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new AppError(
      500,
      "JWT_SECRET must contain at least 32 characters."
    );
  }

  return secret;
}

export function createAccessToken(userId: string): string {
  return jwt.sign(
    {},
    getJwtSecret(),
    {
      subject: userId,
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: "miniledger-api",
      audience: "miniledger-mobile",
      algorithm: "HS256",
    }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "miniledger-api",
      audience: "miniledger-mobile",
      algorithms: ["HS256"],
    });

    if (typeof payload === "string" || !payload.sub) {
      throw new Error("Invalid token payload");
    }

    return payload as AccessTokenPayload;
  } catch {
    throw new AppError(401, "Invalid or expired access token.");
  }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(): Date {
  return new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
}

export function getAccessTokenLifetimeSeconds(): number {
  return 15 * 60;
}
