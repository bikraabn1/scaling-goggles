CREATE SCHEMA "ngabsennn";
--> statement-breakpoint
CREATE TABLE "ngabsennn"."attendance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"activity_log" text NOT NULL,
	"lesson_learned" text NOT NULL,
	"obstacles" text NOT NULL,
	"monev_attendance_id" text,
	"approval_status" text DEFAULT 'SUBMITTED',
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ngabsennn"."attendance_retry_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"first_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'WAITING_RETRY' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ngabsennn"."user_configs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"gitlab_base_url" text,
	"gitlab_project_id" text,
	"gitlab_token" text,
	"gitlab_author_name" text,
	"office_latitude" double precision,
	"office_longitude" double precision,
	"auto_attendance_enabled" boolean DEFAULT false NOT NULL,
	"scheduled_time" text DEFAULT '16:00' NOT NULL,
	"notify_email" text,
	"default_non_coding_activity" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ngabsennn"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"monev_access_token" text,
	"monev_refresh_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ngabsennn"."attendance_logs" ADD CONSTRAINT "attendance_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "ngabsennn"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngabsennn"."attendance_retry_queue" ADD CONSTRAINT "attendance_retry_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "ngabsennn"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngabsennn"."user_configs" ADD CONSTRAINT "user_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "ngabsennn"."users"("id") ON DELETE cascade ON UPDATE no action;