
import { randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AppError } from "../../common/utils/app-error.js";
import type {
  RequestOtpDto,
  VerifyOtpDto,
} from "./dto/auth.dto.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 30 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const JWT_TTL_SECONDS = 7 * 24 * 60 * 60;

type OtpRecord = {
  code: string;
  expiresAt: number;
  nextRequestAt: number;
  attempts: number;
};

const otpStore = new Map<string, OtpRecord>();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new AppError(
      500,
      "JWT_SECRET must be configured with at least 32 characters",
    );
  }

  return secret;
}

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

export async function verifyOtp(input: VerifyOtpDto) {
  const record = otpStore.get(input.phone);

  if (!record) {
    throw new AppError(400, "Request a new OTP first");
  }

  if (Date.now() >= record.expiresAt) {
    otpStore.delete(input.phone);
    throw new AppError(400, "OTP has expired. Request a new one");
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(input.phone);
    throw new AppError(429, "Too many attempts. Request a new OTP");
  }

  if (record.code !== input.otp) {
    record.attempts += 1;

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(input.phone);
    }

    throw new AppError(400, "Invalid OTP");
  }

  otpStore.delete(input.phone);

  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.phone, input.phone))
    .limit(1);

  let user = existingUsers[0];

  if (!user) {
    const createdUsers = await db
      .insert(users)
      .values({ phone: input.phone })
      .onConflictDoNothing({ target: users.phone })
      .returning();

    user = createdUsers[0];

    if (!user) {
      const concurrentUsers = await db
        .select()
        .from(users)
        .where(eq(users.phone, input.phone))
        .limit(1);

      user = concurrentUsers[0];
    }
  }

  if (!user) {
    throw new AppError(500, "Unable to create or retrieve user");
  }

  const token = jwt.sign(
    { sub: user.id },
    getJwtSecret(),
    { expiresIn: JWT_TTL_SECONDS },
  );

  return {
    token,
    tokenType: "Bearer",
    expiresIn: JWT_TTL_SECONDS,
    user: {
      id: user.id,
      phone: user.phone,
      createdAt: user.createdAt,
    },
  };
}
