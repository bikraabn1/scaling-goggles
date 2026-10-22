import { pgSchema, text, timestamp, serial, doublePrecision, boolean, integer } from "drizzle-orm/pg-core";

// Dedicated schema for ngabsennn to isolate from other apps on same Supabase DB
export const ngabsenSchema = pgSchema("ngabsennn");

export const users = ngabsenSchema.table("users", {
  id: text("id").primaryKey(), // SIAPkerja user_id
  email: text("email").notNull(),
  name: text("name").notNull(),
  monevAccessToken: text("monev_access_token"),
  monevRefreshToken: text("monev_refresh_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userConfigs = ngabsenSchema.table("user_configs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  gitlabBaseUrl: text("gitlab_base_url"),
  gitlabProjectId: text("gitlab_project_id"),
  gitlabToken: text("gitlab_token"),
  gitlabAuthorName: text("gitlab_author_name"),
  officeLatitude: doublePrecision("office_latitude"),
  officeLongitude: doublePrecision("office_longitude"),
  autoAttendanceEnabled: boolean("auto_attendance_enabled").default(false).notNull(),
  scheduledTime: text("scheduled_time").default("16:00").notNull(), // Format HH:mm WIB (misal "16:15")
  notifyEmail: text("notify_email"),
  defaultNonCodingActivity: text("default_non_coding_activity"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceRetryQueue = ngabsenSchema.table("attendance_retry_queue", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD (WIB)
  firstAttemptAt: timestamp("first_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  status: text("status").default("WAITING_RETRY").notNull(), // WAITING_RETRY, RETRIED, SKIPPED
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceLogs = ngabsenSchema.table("attendance_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD (WIB)
  activityLog: text("activity_log").notNull(),
  lessonLearned: text("lesson_learned").notNull(),
  obstacles: text("obstacles").notNull(),
  monevAttendanceId: text("monev_attendance_id"),
  approvalStatus: text("approval_status").default("SUBMITTED"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserConfig = typeof userConfigs.$inferSelect;
export type AttendanceRetry = typeof attendanceRetryQueue.$inferSelect;
export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;
