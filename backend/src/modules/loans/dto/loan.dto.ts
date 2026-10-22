
import { z } from "zod";

export const createLoanSchema = z.object({
  friendName: z
    .string()
    .trim()
    .min(1, "Friend name is required.")
    .max(100, "Friend name must not exceed 100 characters."),

  amount: z
    .coerce
    .number()
    .finite()
    .positive("Loan amount must be greater than zero.")
    .max(9999999999.99, "Loan amount is too large.")
    .refine(
      (value) => Number.isSafeInteger(value * 100),
      "Loan amount can have at most two decimal places.",
    ),

  dueDate: z
    .iso
    .date("Due date must be a valid date in YYYY-MM-DD format."),
});

export type CreateLoanDto = z.infer<typeof createLoanSchema>;
