ALTER TABLE "users" ADD COLUMN "name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(254);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" ("email");