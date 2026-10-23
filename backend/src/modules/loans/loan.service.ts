
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { loans } from "../../db/schema.js";
import { AppError } from "../../common/utils/app-error.js";
import type { CreateLoanDto } from "./dto/loan.dto.js";

export async function createLoan(
  userId: string,
  input: CreateLoanDto,
) {
  const [loan] = await db
    .insert(loans)
    .values({
      userId,
      friendName: input.friendName,
      amount: input.amount.toFixed(2),
      dueDate: input.dueDate,
    })
    .returning();

  return loan;
}

export async function getLoans(userId: string) {
  return db
    .select()
    .from(loans)
    .where(
      and(
        eq(loans.userId, userId),
        isNull(loans.archivedAt),
      ),
    )
    .orderBy(desc(loans.createdAt));
}

export async function markLoanRepaid(
  userId: string,
  loanId: string,
) {
  const [loan] = await db
    .update(loans)
    .set({
      status: "repaid",
      repaidAt: new Date(),
    })
    .where(
      and(
        eq(loans.id, loanId),
        eq(loans.userId, userId),
        eq(loans.status, "pending"),
        isNull(loans.archivedAt),
      ),
    )
    .returning();

  if (!loan) {
    throw new AppError(
      404,
      "Loan not found, or it has already been repaid or archived.",
    );
  }

  return loan;
}

export async function archiveLoan(
  userId: string,
  loanId: string,
) {
  const [loan] = await db
    .update(loans)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(loans.id, loanId),
        eq(loans.userId, userId),
        isNull(loans.archivedAt),
      ),
    )
    .returning();

  if (!loan) {
    throw new AppError(404, "Loan not found or already archived.");
  }

  return loan;
}

export async function restoreLoan(
  userId: string,
  loanId: string,
) {
  const [loan] = await db
    .update(loans)
    .set({ archivedAt: null })
    .where(
      and(
        eq(loans.id, loanId),
        eq(loans.userId, userId),
        isNotNull(loans.archivedAt),
      ),
    )
    .returning();

  if (!loan) {
    throw new AppError(404, "Archived loan not found.");
  }

  return loan;
}

export async function getArchivedLoans(userId: string) {
  return db
    .select()
    .from(loans)
    .where(
      and(
        eq(loans.userId, userId),
        isNotNull(loans.archivedAt),
      ),
    )
    .orderBy(desc(loans.createdAt));
}