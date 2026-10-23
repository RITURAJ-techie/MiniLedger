CREATE TABLE "registration_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" varchar(20) NOT NULL UNIQUE,
	"name" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL UNIQUE,
	"phone_verified_at" timestamp with time zone,
	"email_otp_hash" varchar(64),
	"email_otp_expires_at" timestamp with time zone,
	"email_otp_attempts" numeric(2,0) DEFAULT '0' NOT NULL,
	"email_otp_next_request_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;