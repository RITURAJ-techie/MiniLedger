
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  numeric,
  date,
  timestamp,
  index
} from "drizzle-orm/pg-core";

// Loan lifecycle
export const loanStatusEnum = pgEnum("loan_status", [
  "pending",
  "repaid"
]);

// Registered users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

// Money lent to friends
export const loans = pgTable(
  "loans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    friendName: varchar("friend_name", { length: 100 }).notNull(),

    amount: numeric("amount", {
      precision: 12,
      scale: 2
    }).notNull(),

    dueDate: date("due_date", { mode: "string" }).notNull(),

    status: loanStatusEnum("status")
      .default("pending")
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    repaidAt: timestamp("repaid_at", { withTimezone: true })
  },
  (table) => [
    index("loans_user_id_idx").on(table.userId),
    index("loans_due_date_idx").on(table.dueDate)
  ]
);

// Repayment history
export const repayments = pgTable(
  "repayments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),

    amount: numeric("amount", {
      precision: 12,
      scale: 2
    }).notNull(),

    repaidAt: timestamp("repaid_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("repayments_loan_id_idx").on(table.loanId)
  ]
);

// Inferred TypeScript types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type Repayment = typeof repayments.$inferSelect;
export type NewRepayment = typeof repayments.$inferInsert;
