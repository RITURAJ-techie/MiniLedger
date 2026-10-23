
import type { Request, Response } from "express";

import { AppError } from "../../common/utils/app-error.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

import {
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
  refreshTokenSchema,
  updateProfileSchema,
  phoneEmailVerificationSchema,
} from "./dto/auth.dto.js";

import * as authService from "./auth.service.js";

export const phoneEmailVerificationController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = phoneEmailVerificationSchema.parse(req.body);
    const result = await authService.verifyPhoneEmail(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const requestEmailOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = requestEmailOtpSchema.parse(req.body);
    const result = await authService.requestEmailOtp(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const verifyEmailOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = verifyEmailOtpSchema.parse(req.body);
    const result = await authService.verifyEmailOtp(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const refreshTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = refreshTokenSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, "A valid refresh token is required.");
    }

    const result = await authService.refreshSession(
      parsed.data.refreshToken,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const logoutController = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = refreshTokenSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, "A valid refresh token is required.");
    }

    await authService.logoutSession(parsed.data.refreshToken);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  },
);

export const updateProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.id) {
      throw new AppError(401, "Authentication required.");
    }

    const input = updateProfileSchema.parse(req.body);
    const result = await authService.updateProfile(req.user.id, input);

    res.status(200).json({
      success: true,
      data: result,
      message: "Profile updated successfully.",
    });
  },
);
