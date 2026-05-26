import crypto from "node:crypto";

import jwt from "jsonwebtoken";

const JWT_ALGORITHMS = ["HS256"] as const;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is required (set on Vercel and Railway).");
  }
  return secret;
}

type RespondentPayload = {
  formId: string;
  key: string;
  type: "respondent";
};

export function createRespondentToken(formId: string): string {
  const payload: RespondentPayload = {
    formId,
    key: crypto.randomUUID(),
    type: "respondent",
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "365d",
    algorithm: "HS256",
  });
}

export function parseRespondentToken(token: string, formId: string): string | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [...JWT_ALGORITHMS],
    }) as RespondentPayload;

    if (decoded.type !== "respondent" || decoded.formId !== formId) return null;
    if (!decoded.key || decoded.key.length < 8) return null;
    return decoded.key;
  } catch {
    return null;
  }
}
