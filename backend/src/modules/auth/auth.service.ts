
import { randomInt } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { refreshTokens, users } from "../../db/schema.js";
import { AppError } from "../../common/utils/app-error.js";
import type { RequestOtpDto, VerifyOtpDto } from "./dto/auth.dto.js";
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
  mode: "register" | "login";
  name?: string;
  email?: string;
};

const otpStore = new Map<string, OtpRecord>();

// Request an OTP for either registration or login.
export async function requestOtp(input: RequestOtpDto) {
  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      503,
      "Mock OTP authentication is disabled in production",
    );
  }

  const phone = input.phone.trim();
  const now = Date.now();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  // Registered phone numbers must use the login flow.
  if (input.mode === "register" && existingUser) {
    throw new AppError(
      409,
      "This mobile number is already registered. Please log in instead.",
    );
  }

  // Login is allowed only for an existing account.
  if (input.mode === "login" && !existingUser) {
    throw new AppError(
      404,
      "No account found for this mobile number. Please register first.",
    );
  }

  const existingOtp = otpStore.get(phone);

  if (existingOtp && now < existingOtp.nextRequestAt) {
    throw new AppError(
      429,
      "Please wait before requesting another OTP.",
    );
  }

  const code = randomInt(100000, 1000000).toString();

  const record: OtpRecord = {
    code,
    expiresAt: now + OTP_TTL_MS,
    nextRequestAt: now + OTP_COOLDOWN_MS,
    attempts: 0,
    mode: input.mode,
  };

  if (input.mode === "register") {
    record.name = input.name.trim();
    record.email = input.email.trim().toLowerCase();
  }

  otpStore.set(phone, record);

  console.info(`[MiniLedger DEV OTP] ${phone}: ${code}`);

  return {
    message: "OTP generated. Check the backend terminal.",
    expiresInSeconds: OTP_TTL_MS / 1000,
  };
}

// Verify the OTP, then register a new user or sign in an existing user.
export async function verifyOtp(input: VerifyOtpDto) {
  const phone = input.phone.trim();
  const record = otpStore.get(phone);

  if (!record) {
    throw new AppError(400, "Request a new OTP first.");
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    throw new AppError(400, "OTP has expired. Request a new one.");
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(phone);
    throw new AppError(429, "Too many incorrect OTP attempts.");
  }

  if (record.code !== input.otp) {
    record.attempts += 1;

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(phone);
      throw new AppError(429, "Too many incorrect OTP attempts.");
    }

    throw new AppError(400, "Invalid OTP.");
  }

  // Check the current database state after OTP verification.
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (record.mode === "login" && !user) {
    otpStore.delete(phone);
    throw new AppError(
      404,
      "No account found. Please register first.",
    );
  }

  if (record.mode === "register" && user) {
    otpStore.delete(phone);
    throw new AppError(
      409,
      "This mobile number is already registered. Please log in instead.",
    );
  }

  // Only the registration flow is permitted to create a user.
  if (record.mode === "register") {
    if (!record.name || !record.email) {
      throw new AppError(
        400,
        "Registration details are missing. Please register again.",
      );
    }

    const email = record.email.trim().toLowerCase();

    const [emailOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (emailOwner) {
      otpStore.delete(phone);
      throw new AppError(
        409,
        "This email is already associated with another account.",
      );
    }

    try {
      // Do not silently turn a conflicting registration into a login.
      await db.insert(users).values({
        phone,
        name: record.name.trim(),
        email,
      });
    } catch {
      // Handle concurrent registrations or unique-constraint conflicts.
      const [phoneOwner] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (phoneOwner) {
        otpStore.delete(phone);
        throw new AppError(
          409,
          "This mobile number has already been registered. Please log in.",
        );
      }

      const [emailOwnerAfterConflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (emailOwnerAfterConflict) {
        otpStore.delete(phone);
        throw new AppError(
          409,
          "This email is already associated with another account.",
        );
      }

      throw new AppError(
        500,
        "Unable to register user. Please try again.",
      );
    }

    [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
  }

  if (!user) {
    throw new AppError(
      500,
      "Unable to create or retrieve user.",
    );
  }

  // Consume the OTP only after the account operation succeeds.
  otpStore.delete(phone);

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
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  };
}

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

export async function updateProfile(
  userId: string,
  input: { name: string; email: string },
) {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();

  if (name.length < 2 || name.length > 100) {
    throw new AppError(400, "Name must be between 2 and 100 characters.");
  }

  if (!zEmailIsValid(email)) {
    throw new AppError(400, "Enter a valid email address.");
  }

  const [emailOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (emailOwner && emailOwner.id !== userId) {
    throw new AppError(
      409,
      "This email is already associated with another account.",
    );
  }

  try {
    const [updatedUser] = await db
      .update(users)
      .set({ name, email })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        phone: users.phone,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      });

    if (!updatedUser) {
      throw new AppError(404, "User account not found.");
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError(409, "Unable to update profile. Please try again.");
  }
}

function zEmailIsValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}