
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number");

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

export const requestOtpSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("register"),
    phone: phoneSchema,
    name: nameSchema,
    email: emailSchema,
  }),
  z.object({
    mode: z.literal("login"),
    phone: phoneSchema,
  }),
]);

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});

export const updateProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
