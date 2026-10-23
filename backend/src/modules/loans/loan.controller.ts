
import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../../common/utils/app-error.js";
import { asyncHandler } from "../../common/utils/async-handler.js";

import { createLoanSchema } from "./dto/loan.dto.js";
import * as loanService from "./loan.service.js";

const loanIdSchema = z.string().uuid();

function getAuthenticatedUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError(401, "Authentication required.");
  }

  return req.user.id;
}

export const createLoanController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const input = createLoanSchema.parse(req.body);

    const loan = await loanService.createLoan(userId, input);

    res.status(201).json({
      success: true,
      data: loan,
    });
  },
);

export const getLoansController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const loans = await loanService.getLoans(userId);

    res.status(200).json({
      success: true,
      data: loans,
    });
  },
);

export const markLoanRepaidController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const parsedId = loanIdSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      throw new AppError(400, "A valid loan ID is required.");
    }

    const loan = await loanService.markLoanRepaid(
      userId,
      parsedId.data,
    );

    res.status(200).json({
      success: true,
      data: loan,
    });
  },
);


export const archiveLoanController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const parsedId = loanIdSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      throw new AppError(400, "A valid loan ID is required.");
    }

    const loan = await loanService.archiveLoan(
      userId,
      parsedId.data,
    );

    res.status(200).json({
      success: true,
      data: loan,
    });
  },
);

export const restoreLoanController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const parsedId = loanIdSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      throw new AppError(400, "A valid loan ID is required.");
    }

    const loan = await loanService.restoreLoan(
      userId,
      parsedId.data,
    );

    res.status(200).json({
      success: true,
      data: loan,
    });
  },
);

export const getArchivedLoansController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const loans = await loanService.getArchivedLoans(userId);

    res.status(200).json({
      success: true,
      data: loans,
    });
  },
);