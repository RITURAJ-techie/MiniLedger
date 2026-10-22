
import type { Request, Response } from "express";

import { AppError } from "../../common/utils/app-error.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from "./dto/auth.dto.js";

import * as authService from "./auth.service.js";

export const requestOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = requestOtpSchema.parse(req.body);
    const result = await authService.requestOtp(input);

    res.status(200).json({
      success: true,
      data: result,
    });
  },
);

export const verifyOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(input);

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
