import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const authProviderEnum = ["local", "google"] as const;
export type AuthProvider = (typeof authProviderEnum)[number];

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  fullName: varchar("full_name", { length: 80 }).notNull(),
  displayName: varchar("display_name", { length: 80 }),

  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),

  passwordHash: text("password_hash"),
  authProvider: varchar("auth_provider", { length: 20 }).$type<AuthProvider>().default("local").notNull(),
  providerId: varchar("provider_id", { length: 255 }),

  verificationToken: varchar("verification_token", { length: 64 }),
  verificationTokenExpire: timestamp("verification_token_expire"),
  resetPasswordToken: varchar("reset_password_token", { length: 64 }),
  resetPasswordOtp: varchar("reset_password_otp", { length: 6 }),
  resetPasswordExpire: timestamp("reset_password_expire"),

  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorOtp: varchar("two_factor_otp", { length: 6 }),
  twoFactorOtpExpire: timestamp("two_factor_otp_expire"),

  profileImageUrl: text("profile_image_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
