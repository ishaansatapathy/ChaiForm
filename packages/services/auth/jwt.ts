import jwt from "jsonwebtoken";
import type { Response } from "express";

import { env } from "../env";
import { getClearJwtCookieOptions, getJwtCookieOptions } from "./jwt-cookie-options";

const refreshSecret = () => env.JWT_REFRESH_SECRET ?? env.JWT_SECRET;

export type AccessTokenPayload = { userId: string };
export type RefreshTokenPayload = { userId: string; type: "refresh" };

export function issueAuthCookies(res: Response, userId: string) {
  const accessToken = jwt.sign({ userId } satisfies AccessTokenPayload, env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { userId, type: "refresh" } satisfies RefreshTokenPayload,
    refreshSecret(),
    { expiresIn: "30d" },
  );

  const baseOpts = getJwtCookieOptions();

  res.cookie("jwt", accessToken, {
    ...baseOpts,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("jwt_refresh", refreshToken, {
    ...baseOpts,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookies(res: Response) {
  const clearOpts = getClearJwtCookieOptions();
  res.clearCookie("jwt", clearOpts);
  res.clearCookie("jwt_refresh", clearOpts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, refreshSecret()) as RefreshTokenPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}
