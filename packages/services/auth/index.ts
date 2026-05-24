import crypto from "node:crypto";

import { db, and, eq, gt } from "@repo/database";
import { usersTable, type SelectUser } from "@repo/database/schema";
import { logger } from "@repo/logger";
import type { Request, Response } from "express";

import { env } from "../env";
import { getGoogleOAuth2Client, isGoogleOAuthConfigured } from "../clients/google-oauth";
import { sendEmail } from "./email";
import { AuthError, toAuthError } from "./errors";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  ResendVerificationEmailInput,
  SignInInput,
  SignUpInput,
  Verify2FAInput,
  VerifyEmailInput,
  VerifyOtpInput,
} from "./dtos";
import {
  clearAuthCookies,
  issueAuthCookies,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt";
import { hashPassword, verifyPassword } from "./password";
import type { AuthUser, SignInOutput, SignUpOutput } from "./model";

const GENERIC_RECOVERY_MESSAGE = "If an account exists for that email, we sent reset instructions.";
const GENERIC_VERIFY_MESSAGE =
  "If an account exists and is not yet verified, we sent a new verification link.";
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function verificationExpiry() {
  return new Date(Date.now() + VERIFICATION_TTL_MS);
}

async function sendVerificationEmail(email: string, verificationToken: string) {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${verificationToken}`;
  await sendEmail({
    email,
    subject: "Verify Your ChaiForm Account",
    html: `<p>Welcome to ChaiForm! <a href="${verifyUrl}">Verify your email</a></p>`,
    text: `Verify your account: ${verifyUrl}`,
  });
}

function sanitizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function toPublicUser(user: SelectUser): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    displayName: user.displayName ?? null,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
    profileImageUrl: user.profileImageUrl ?? null,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
  };
}

function generateOtp() {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

function assertEmailVerified(user: SelectUser) {
  if (!user.emailVerified) {
    throw new AuthError(
      "FORBIDDEN",
      "Please verify your email before signing in. Check your inbox for the verification link.",
    );
  }
}

function issueVerifiedSession(res: Response, user: SelectUser) {
  assertEmailVerified(user);
  issueAuthCookies(res, user.id);
}

class AuthService {
  private async findUserByEmail(email: string) {
    const sanitized = sanitizeEmail(email);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, sanitized)).limit(1);
    return user ?? null;
  }

  private async findUserById(userId: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return user ?? null;
  }

  public toPublicUser(user: SelectUser): AuthUser {
    return toPublicUser(user);
  }

  public async resolveSession(req: Request, res?: Response): Promise<AuthUser | null> {
    const accessToken = req.cookies?.jwt as string | undefined;
    const refreshToken = req.cookies?.jwt_refresh as string | undefined;

    const rejectUnverified = (user: SelectUser | null) => {
      if (user && !user.emailVerified) {
        if (res) clearAuthCookies(res);
        return null;
      }
      return user ? toPublicUser(user) : null;
    };

    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        const user = await this.findUserById(decoded.userId);
        return rejectUnverified(user);
      } catch {
        // access token expired — try refresh below
      }
    }

    if (refreshToken && res) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await this.findUserById(decoded.userId);
        if (!user) return null;
        if (!user.emailVerified) {
          clearAuthCookies(res);
          return null;
        }
        issueAuthCookies(res, user.id);
        return toPublicUser(user);
      } catch {
        if (res) clearAuthCookies(res);
        return null;
      }
    }

    return null;
  }

  public async signUp(input: SignUpInput): Promise<SignUpOutput> {
    const sanitizedEmail = sanitizeEmail(input.email);
    const existing = await this.findUserByEmail(sanitizedEmail);
    if (existing) {
      throw new AuthError("CONFLICT", "User already exists");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const passwordHash = await hashPassword(input.password);

    const [user] = await db
      .insert(usersTable)
      .values({
        fullName: input.fullName.trim(),
        email: sanitizedEmail,
        passwordHash,
        authProvider: "local",
        verificationToken,
        verificationTokenExpire: verificationExpiry(),
        emailVerified: false,
      })
      .returning();

    if (!user) {
      throw new AuthError("INTERNAL", "Unable to create account. Please try again.");
    }

    await sendVerificationEmail(user.email, verificationToken);

    return {
      message: "Account created. Check your email to verify before signing in.",
      email: user.email,
    };
  }

  public async signIn(input: SignInInput, res: Response): Promise<SignInOutput> {
    const sanitizedEmail = sanitizeEmail(input.email);
    const user = await this.findUserByEmail(sanitizedEmail);

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AuthError("UNAUTHORIZED", "Invalid email or password");
    }

    assertEmailVerified(user);

    if (user.twoFactorEnabled) {
      const otp = generateOtp();
      const expire = new Date(Date.now() + 5 * 60 * 1000);

      await db
        .update(usersTable)
        .set({ twoFactorOtp: otp, twoFactorOtpExpire: expire })
        .where(eq(usersTable.id, user.id));

      await sendEmail({
        email: user.email,
        subject: "Your ChaiForm 2FA Code",
        html: `<p>Your two-factor authentication code is: <strong>${otp}</strong></p>`,
        text: `Your 2FA code is: ${otp}`,
      });

      return {
        twoFactorRequired: true,
        email: user.email,
        message: "2FA code sent to your email",
      };
    }

    issueVerifiedSession(res, user);
    return {
      twoFactorRequired: false,
      user: toPublicUser(user),
    };
  }

  public async verify2FA(input: Verify2FAInput, res: Response): Promise<AuthUser> {
    const sanitizedEmail = sanitizeEmail(input.email);
    const now = new Date();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.email, sanitizedEmail),
          eq(usersTable.twoFactorOtp, input.otp),
          gt(usersTable.twoFactorOtpExpire, now),
        ),
      )
      .limit(1);

    if (!user) {
      throw new AuthError("UNAUTHORIZED", "Invalid or expired 2FA code");
    }

    assertEmailVerified(user);

    await db
      .update(usersTable)
      .set({ twoFactorOtp: null, twoFactorOtpExpire: null })
      .where(eq(usersTable.id, user.id));

    issueVerifiedSession(res, user);
    return toPublicUser(user);
  }

  public logout(res: Response) {
    clearAuthCookies(res);
    return { message: "Logged out successfully" };
  }

  public async refreshAccessToken(req: Request, res: Response): Promise<AuthUser> {
    const refreshToken = req.cookies?.jwt_refresh as string | undefined;
    if (!refreshToken) {
      throw new AuthError("UNAUTHORIZED", "No refresh token");
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await this.findUserById(decoded.userId);
      if (!user) {
        throw new AuthError("UNAUTHORIZED", "User not found");
      }

      assertEmailVerified(user);
      issueAuthCookies(res, user.id);
      return toPublicUser(user);
    } catch (error) {
      clearAuthCookies(res);
      logger.error("Refresh token error", { message: error instanceof Error ? error.message : error });
      throw new AuthError("UNAUTHORIZED", "Invalid or expired refresh token");
    }
  }

  public async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await this.findUserByEmail(input.email);
    if (!user) {
      return { message: GENERIC_RECOVERY_MESSAGE };
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const otp = generateOtp();
    const expire = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(usersTable)
      .set({
        resetPasswordToken: resetToken,
        resetPasswordOtp: otp,
        resetPasswordExpire: expire,
      })
      .where(eq(usersTable.id, user.id));

    if (input.method === "otp") {
      await sendEmail({
        email: user.email,
        subject: "Your ChaiForm password reset code",
        html: `<p>Your password reset code is: <strong>${otp}</strong></p>`,
        text: `Your password reset code is: ${otp}`,
      });
    } else {
      const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}?email=${encodeURIComponent(user.email)}`;
      await sendEmail({
        email: user.email,
        subject: "Reset Your Password — ChaiForm",
        html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`,
        text: `Reset your password: ${resetUrl}`,
      });
    }

    return { message: GENERIC_RECOVERY_MESSAGE };
  }

  public async verifyOtp(input: VerifyOtpInput): Promise<{ message: string }> {
    const sanitizedEmail = sanitizeEmail(input.email);
    const now = new Date();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.email, sanitizedEmail),
          eq(usersTable.resetPasswordOtp, input.otp),
          gt(usersTable.resetPasswordExpire, now),
        ),
      )
      .limit(1);

    if (!user) {
      throw new AuthError("BAD_REQUEST", "Invalid or expired code.");
    }

    return { message: "Code verified successfully." };
  }

  public async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const sanitizedEmail = sanitizeEmail(input.email);
    const now = new Date();

    const whereClause = input.otp
      ? and(
          eq(usersTable.email, sanitizedEmail),
          eq(usersTable.resetPasswordOtp, input.otp),
          gt(usersTable.resetPasswordExpire, now),
        )
      : and(
          eq(usersTable.email, sanitizedEmail),
          eq(usersTable.resetPasswordToken, input.token!),
          gt(usersTable.resetPasswordExpire, now),
        );

    const [user] = await db.select().from(usersTable).where(whereClause).limit(1);

    if (!user) {
      throw new AuthError("BAD_REQUEST", "Invalid or expired reset request.");
    }

    const passwordHash = await hashPassword(input.newPassword);

    await db
      .update(usersTable)
      .set({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordOtp: null,
        resetPasswordExpire: null,
      })
      .where(eq(usersTable.id, user.id));

    return { message: "Password reset successfully." };
  }

  public async verifyEmail(input: VerifyEmailInput, res: Response): Promise<AuthUser> {
    const now = new Date();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.verificationToken, input.token))
      .limit(1);

    if (!user) {
      throw new AuthError("BAD_REQUEST", "Invalid or expired verification link.");
    }

    if (user.verificationTokenExpire && user.verificationTokenExpire < now) {
      throw new AuthError("BAD_REQUEST", "Verification link expired. Request a new one.");
    }

    const [updated] = await db
      .update(usersTable)
      .set({ emailVerified: true, verificationToken: null, verificationTokenExpire: null })
      .where(eq(usersTable.id, user.id))
      .returning();

    if (!updated) {
      throw new AuthError("INTERNAL", "Unable to verify email. Please try again.");
    }

    issueAuthCookies(res, updated.id);
    return toPublicUser(updated);
  }

  public async resendVerificationEmail(
    input: ResendVerificationEmailInput,
  ): Promise<{ message: string }> {
    const user = await this.findUserByEmail(input.email);
    if (!user || user.emailVerified) {
      return { message: GENERIC_VERIFY_MESSAGE };
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await db
      .update(usersTable)
      .set({ verificationToken, verificationTokenExpire: verificationExpiry() })
      .where(eq(usersTable.id, user.id));

    await sendVerificationEmail(user.email, verificationToken);

    return { message: GENERIC_VERIFY_MESSAGE };
  }

  public async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new AuthError("NOT_FOUND", "User not found");
    }
    if (user.emailVerified) {
      throw new AuthError("BAD_REQUEST", "User already verified");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await db
      .update(usersTable)
      .set({ verificationToken, verificationTokenExpire: verificationExpiry() })
      .where(eq(usersTable.id, user.id));

    await sendVerificationEmail(user.email, verificationToken);

    return { message: "Verification email resent successfully!" };
  }

  public async toggle2FA(userId: string, enabled: boolean): Promise<{ message: string; twoFactorEnabled: boolean }> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new AuthError("NOT_FOUND", "User not found");
    }

    await db
      .update(usersTable)
      .set({ twoFactorEnabled: enabled })
      .where(eq(usersTable.id, user.id));

    return {
      message: `Two-factor authentication ${enabled ? "enabled" : "disabled"} successfully`,
      twoFactorEnabled: enabled,
    };
  }

  public async setupProfile(userId: string, displayName: string): Promise<AuthUser> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new AuthError("NOT_FOUND", "User not found");
    }

    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      throw new AuthError("BAD_REQUEST", "Display name must be at least 2 characters");
    }

    const [updated] = await db
      .update(usersTable)
      .set({ displayName: trimmed })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      throw new AuthError("INTERNAL", "Unable to save display name");
    }

    return toPublicUser(updated);
  }

  public async handleGoogleCallback(code: string, res: Response, returnTo = "/dashboard"): Promise<string> {
    if (!isGoogleOAuthConfigured()) {
      throw new AuthError("INTERNAL", "Google OAuth is not configured");
    }

    try {
      const client = getGoogleOAuth2Client();
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      if (!tokens.id_token) {
        throw new AuthError("UNAUTHORIZED", "Google sign-in did not return an ID token");
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_OAUTH_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new AuthError("UNAUTHORIZED", "Google account email not available");
      }

      const sanitizedEmail = sanitizeEmail(payload.email);
      let user = await this.findUserByEmail(sanitizedEmail);

      if (!user) {
        const [created] = await db
          .insert(usersTable)
          .values({
            fullName: payload.name?.trim() || sanitizedEmail.split("@")[0] || "User",
            email: sanitizedEmail,
            emailVerified: payload.email_verified ?? false,
            authProvider: "google",
            providerId: payload.sub,
            profileImageUrl: payload.picture ?? null,
          })
          .returning();

        if (!created) {
          throw new AuthError("INTERNAL", "Unable to sign in with Google");
        }

        user = created;
      } else if (user.authProvider === "local" && !user.providerId) {
        await db
          .update(usersTable)
          .set({
            authProvider: "google",
            providerId: payload.sub,
            profileImageUrl: user.profileImageUrl ?? payload.picture ?? null,
            emailVerified: user.emailVerified || (payload.email_verified ?? false),
          })
          .where(eq(usersTable.id, user.id));
        user = (await this.findUserById(user.id))!;
      }

      if (!user) {
        throw new AuthError("INTERNAL", "Unable to sign in with Google");
      }

      if (!user.emailVerified) {
        clearAuthCookies(res);
        const verificationToken = crypto.randomBytes(32).toString("hex");
        await db
          .update(usersTable)
          .set({ verificationToken, verificationTokenExpire: verificationExpiry() })
          .where(eq(usersTable.id, user.id));
        await sendVerificationEmail(user.email, verificationToken);
        return `${env.CLIENT_URL}/check-email?email=${encodeURIComponent(user.email)}`;
      }

      issueAuthCookies(res, user.id);
      const destination = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
      const separator = destination.includes("?") ? "&" : "?";
      return `${env.CLIENT_URL}${destination}${separator}hero=1`;
    } catch (error) {
      throw toAuthError(error, "Google sign-in failed. Please try again.");
    }
  }
}

export default AuthService;
