import { pgTable, text, timestamp, serial, doublePrecision } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // SIAPkerja user_id
  email: text("email").notNull(),
  name: text("name").notNull(),
  monevRefreshToken: text("monev_refresh_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userConfigs = pgTable("user_configs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  gitlabBaseUrl: text("gitlab_base_url"),
  gitlabProjectId: text("gitlab_project_id"),
  gitlabToken: text("gitlab_token"),
  gitlabAuthorName: text("gitlab_author_name"),
  officeLatitude: doublePrecision("office_latitude"),
  officeLongitude: doublePrecision("office_longitude"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceLogs = pgTable("attendance_logs", {
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
export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;
