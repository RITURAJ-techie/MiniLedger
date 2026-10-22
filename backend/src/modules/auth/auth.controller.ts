import type { Request, Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import { requestOtpSchema, verifyOtpSchema } from "./dto/auth.dto.js";
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