import {
 createHmac,
 randomInt,
 timingSafeEqual,
} from "node:crypto";

import {
 and,
 eq,
 gt,
 isNotNull,
 isNull,
} from "drizzle-orm";

import { db } from "../../db/index.js";

import {
 refreshTokens,
 users,
 registrationChallenges,
} from "../../db/schema.js";

import { AppError } from "../../common/utils/app-error.js";

import type { PhoneEmailVerificationDto } from "./dto/auth.dto.js";

import {
 createAccessToken,
 createRefreshToken,
 hashRefreshToken,
 getRefreshTokenExpiry,
 getAccessTokenLifetimeSeconds,
} from "./token.service.js";

import { sendEmailOtp } from "./email.service.js";

const OTP_TTL_MS = 5 * 60 * 1000;

const OTP_COOLDOWN_MS = 30 * 1000;

const MAX_OTP_ATTEMPTS = 5;

function hashEmailOtp(phone: string, otp: string): string {
 const secret = process.env.EMAIL_OTP_SECRET;
 if (!secret) {
  throw new AppError(500, "Email verification is not configured.");
 }
 return createHmac("sha256", secret)
  .update(`${phone}:${otp}`)
  .digest("hex");
}

function emailOtpMatches(
 phone: string,
 otp: string,
 storedHash: string,
): boolean {
 const submitted = Buffer.from(hashEmailOtp(phone, otp), "hex");
 const stored = Buffer.from(storedHash, "hex");
 return (
  submitted.length === stored.length &&
  timingSafeEqual(submitted, stored)
 );
}

async function issueEmailOtp(challenge: {
 id: string;
 phone: string;
 email: string;
}) {
 const otp = randomInt(100000, 1000000).toString();
 const now = new Date();
 await db
  .update(registrationChallenges)
  .set({
   emailOtpHash: hashEmailOtp(challenge.phone, otp),
   emailOtpExpiresAt: new Date(now.getTime() + OTP_TTL_MS),
   emailOtpAttempts: 0,
   emailOtpNextRequestAt: new Date(
    now.getTime() + OTP_COOLDOWN_MS,
   ),
  })
  .where(eq(registrationChallenges.id, challenge.id));
 try {
  await sendEmailOtp(challenge.email, otp);
 } catch {
  await db
   .update(registrationChallenges)
   .set({
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    emailOtpNextRequestAt: null,
   })
   .where(eq(registrationChallenges.id, challenge.id));
  throw new AppError(
   502,
   "Unable to send the verification email. Please try again.",
  );
 }
 return {
  nextStep: "email_verification" as const,
  email: challenge.email,
  expiresInSeconds: OTP_TTL_MS / 1000,
  message: "Verification code sent to your email.",
 };
}

type PhoneEmailClaims = {
 country_code?: unknown;
 phone_no?: unknown;
 exp?: unknown;
};

function verifyPhoneEmailToken(token: string): PhoneEmailClaims {
 const secret = process.env.PHONE_EMAIL_API_KEY;
 if (!secret) {
  throw new AppError(500, "Phone verification is not configured.");
 }
 const parts = token.split(".");
 if (parts.length !== 3 || parts.some((part) => !part)) {
  throw new AppError(401, "Invalid phone verification token.");
 }
 const headerPart = parts[0]!;
 const payloadPart = parts[1]!;
 const signaturePart = parts[2]!;
 let header: { alg?: unknown };
 let claims: PhoneEmailClaims;
 try {
  header = JSON.parse(
   Buffer.from(headerPart, "base64url").toString("utf8"),
  );
  claims = JSON.parse(
   Buffer.from(payloadPart, "base64url").toString("utf8"),
  );
 } catch {
  throw new AppError(401, "Invalid phone verification token.");
 }
 if (header.alg !== "HS256") {
  throw new AppError(401, "Unsupported phone verification token.");
 }
 const expectedSignature = createHmac("sha256", secret)
  .update(`${headerPart}.${payloadPart}`)
  .digest();
 const actualSignature = Buffer.from(signaturePart, "base64url");
 if (
  actualSignature.length !== expectedSignature.length ||
  !timingSafeEqual(actualSignature, expectedSignature)
 ) {
  throw new AppError(401, "Phone verification could not be confirmed.");
 }
 if (
  claims.exp !== undefined &&
  (typeof claims.exp !== "number" ||
   claims.exp <= Math.floor(Date.now() / 1000))
 ) {
  throw new AppError(401, "Phone verification token has expired.");
 }
 return claims;
}

function normalizeVerifiedPhone(claims: PhoneEmailClaims): string {
 if (
  typeof claims.country_code !== "string" ||
  typeof claims.phone_no !== "string"
 ) {
  throw new AppError(401, "Verified phone number is missing from the token.");
 }
 const countryCode = claims.country_code.replace(/\D/g, "");
 const phoneNumber = claims.phone_no.replace(/\D/g, "");
 if (
  !/^[1-9]\d{0,2}$/.test(countryCode) ||
  !/^\d{4,14}$/.test(phoneNumber)
 ) {
  throw new AppError(401, "The verified phone number is invalid.");
 }
 return `+${countryCode}${phoneNumber}`;
}

export async function verifyPhoneEmail(
 input: PhoneEmailVerificationDto,
) {
 const claims = verifyPhoneEmailToken(input.token);
 const verifiedPhone = normalizeVerifiedPhone(claims);
 const expectedPhone = input.expectedPhone.trim();
 if (verifiedPhone !== expectedPhone) {
  throw new AppError(
   400,
   "The verified phone number does not match the number entered. Please try again.",
  );
 }
 const [existingUser] = await db
  .select()
  .from(users)
  .where(eq(users.phone, verifiedPhone))
  .limit(1);
 // LOGIN: the verified phone must already belong to an account.
 if (input.mode === "login") {
  if (!existingUser) {
   throw new AppError(
    404,
    "No account found for this mobile number. Please register first.",
   );
  }
  const accessToken = createAccessToken(existingUser.id);
  const refreshToken = createRefreshToken();
  await db.insert(refreshTokens).values({
   userId: existingUser.id,
   tokenHash: hashRefreshToken(refreshToken),
   expiresAt: getRefreshTokenExpiry(),
  });
  return {
   accessToken,
   refreshToken,
   tokenType: "Bearer" as const,
   expiresIn: getAccessTokenLifetimeSeconds(),
   user: {
    id: existingUser.id,
    phone: existingUser.phone,
    name: existingUser.name,
    email: existingUser.email,
    createdAt: existingUser.createdAt,
   },
  };
 }
 // REGISTER: don't create another account for an existing phone.
 if (existingUser) {
  throw new AppError(
   409,
   "This mobile number is already registered. Please log in instead.",
  );
 }
 const name = input.name.trim().replace(/\s+/g, " ");
 const email = input.email.trim().toLowerCase();
 const [emailOwner] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
 if (emailOwner) {
  throw new AppError(
   409,
   "This email is already associated with another account.",
  );
 }
 let challenge: {
  id: string;
  phone: string;
  email: string;
 };
 try {
  // Replace only a previous pending registration for this phone.
  await db
   .delete(registrationChallenges)
   .where(eq(registrationChallenges.phone, verifiedPhone));
  const [created] = await db
   .insert(registrationChallenges)
   .values({
    phone: verifiedPhone,
    name,
    email,
    phoneVerifiedAt: new Date(),
    emailOtpAttempts: 0,
   })
   .returning({
    id: registrationChallenges.id,
    phone: registrationChallenges.phone,
    email: registrationChallenges.email,
   });
  if (!created) {
   throw new Error("Registration challenge was not created.");
  }
  challenge = created;
 } catch (error) {
  if (error instanceof AppError) {
   throw error;
  }
  throw new AppError(
   409,
   "Unable to start registration. Check the details and try again.",
  );
 }
 // Continue through your existing email OTP verification flow.
 return issueEmailOtp(challenge);
}

export async function requestEmailOtp(input: { phone: string }) {
 const phone = input.phone.trim();
 const [challenge] = await db
  .select()
  .from(registrationChallenges)
  .where(
   and(
    eq(registrationChallenges.phone, phone),
    isNotNull(registrationChallenges.phoneVerifiedAt),
   ),
  )
  .limit(1);
 if (!challenge) {
  throw new AppError(
   400,
   "Verify your phone number before requesting an email OTP.",
  );
 }
 if (
  challenge.emailOtpNextRequestAt &&
  Date.now() < challenge.emailOtpNextRequestAt.getTime()
 ) {
  throw new AppError(
   429,
   "Please wait before requesting another email OTP.",
  );
 }
 return issueEmailOtp({
  id: challenge.id,
  phone: challenge.phone,
  email: challenge.email,
 });
}

export async function verifyEmailOtp(input: {
 phone: string;
 otp: string;
}) {
 const phone = input.phone.trim();
 const [challenge] = await db
  .select()
  .from(registrationChallenges)
  .where(
   and(
    eq(registrationChallenges.phone, phone),
    isNotNull(registrationChallenges.phoneVerifiedAt),
   ),
  )
  .limit(1);
 if (!challenge || !challenge.emailOtpHash) {
  throw new AppError(
   400,
   "Request an email verification code first.",
  );
 }
 if (
  !challenge.emailOtpExpiresAt ||
  Date.now() > challenge.emailOtpExpiresAt.getTime()
 ) {
  await db
   .update(registrationChallenges)
   .set({
    emailOtpHash: null,
    emailOtpExpiresAt: null,
   })
   .where(eq(registrationChallenges.id, challenge.id));
  throw new AppError(
   400,
   "Email OTP has expired. Request a new one.",
  );
 }
 const attempts = challenge.emailOtpAttempts;
 if (attempts >= MAX_OTP_ATTEMPTS) {
  throw new AppError(
   429,
   "Too many incorrect email OTP attempts. Request a new code.",
  );
 }
 if (
  !emailOtpMatches(
   phone,
   input.otp,
   challenge.emailOtpHash,
  )
 ) {
  const nextAttempts = attempts + 1;
  await db
   .update(registrationChallenges)
   .set({
    emailOtpAttempts: nextAttempts,
    ...(nextAttempts >= MAX_OTP_ATTEMPTS
     ? {
       emailOtpHash: null,
       emailOtpExpiresAt: null,
      }
     : {}),
   })
   .where(eq(registrationChallenges.id, challenge.id));
  if (nextAttempts >= MAX_OTP_ATTEMPTS) {
   throw new AppError(
    429,
    "Too many incorrect email OTP attempts. Request a new code.",
   );
  }
  throw new AppError(400, "Invalid email OTP.");
 }
 try {
  return await db.transaction(async (tx) => {
   // Recheck the challenge inside the transaction.
   const [current] = await tx
    .select()
    .from(registrationChallenges)
    .where(
     and(
      eq(registrationChallenges.id, challenge.id),
      eq(registrationChallenges.phone, phone),
      isNotNull(registrationChallenges.phoneVerifiedAt),
     ),
    )
    .limit(1);
   if (
    !current ||
    !current.emailOtpHash ||
    !current.emailOtpExpiresAt ||
    Date.now() > current.emailOtpExpiresAt.getTime() ||
    !emailOtpMatches(phone, input.otp, current.emailOtpHash)
   ) {
    throw new AppError(
     400,
     "This verification code is no longer valid. Request a new one.",
    );
   }
   const [user] = await tx
    .insert(users)
    .values({
     phone: current.phone,
     name: current.name,
     email: current.email,
     emailVerifiedAt: new Date(),
    })
    .returning();
   if (!user) {
    throw new AppError(500, "Unable to complete registration.");
   }
   const accessToken = createAccessToken(user.id);
   const refreshToken = createRefreshToken();
   await tx.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
   });
   await tx
    .delete(registrationChallenges)
    .where(eq(registrationChallenges.id, current.id));
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
  });
 } catch (error) {
  if (error instanceof AppError) throw error;
  throw new AppError(
   409,
   "Unable to complete registration. The phone number or email may already be registered.",
  );
 }
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
 const [currentUser] = await db
  .select({ email: users.email })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
 if (!currentUser) {
  throw new AppError(404, "User account not found.");
 }
 const emailChanged = currentUser.email !== email;
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
   .set({
    name,
    email,
    ...(emailChanged ? { emailVerifiedAt: null } : {}),
   })
   .where(eq(users.id, userId))
   .returning({
    id: users.id,
    phone: users.phone,
    name: users.name,
    email: users.email,
    emailVerifiedAt: users.emailVerifiedAt,
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
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
  email.length <= 254;
}
