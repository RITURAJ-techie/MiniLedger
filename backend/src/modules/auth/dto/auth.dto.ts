
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(100);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

// Phone.Email verification
export const phoneEmailVerificationSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("register"),
    token: z.string().min(1).max(10000),
    expectedPhone: phoneSchema,
    name: nameSchema,
    email: emailSchema,
  }),
  z.object({
    mode: z.literal("login"),
    token: z.string().min(1).max(10000),
    expectedPhone: phoneSchema,
  }),
]);

export type PhoneEmailVerificationDto = z.infer<
  typeof phoneEmailVerificationSchema
>;

// Email OTP verification
export const requestEmailOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyEmailOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export type RequestEmailOtpDto = z.infer<
  typeof requestEmailOtpSchema
>;

export type VerifyEmailOtpDto = z.infer<
  typeof verifyEmailOtpSchema
>;

// Session management
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export type RefreshTokenDto = z.infer<
  typeof refreshTokenSchema
>;

// Profile management
export const updateProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export type UpdateProfileDto = z.infer<
  typeof updateProfileSchema
>;
