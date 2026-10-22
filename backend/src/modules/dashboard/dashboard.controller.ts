
import type { Request, Response } from "express";

import { AppError } from "../../common/utils/app-error.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import * as dashboardService from "./dashboard.service.js";

export const getDashboardSummaryController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, "Authentication required.");
    }

    const summary = await dashboardService.getDashboardSummary(userId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  },
);
