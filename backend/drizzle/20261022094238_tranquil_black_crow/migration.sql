CREATE TYPE "loan_status" AS ENUM('pending', 'repaid');--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"friend_name" varchar(100) NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"due_date" date NOT NULL,
	"status" "loan_status" DEFAULT 'pending'::"loan_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"repaid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"loan_id" uuid NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"repaid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" varchar(20) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "loans_user_id_idx" ON "loans" ("user_id");--> statement-breakpoint
CREATE INDEX "loans_due_date_idx" ON "loans" ("due_date");--> statement-breakpoint
CREATE INDEX "repayments_loan_id_idx" ON "repayments" ("loan_id");--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loan_id_loans_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE;