import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "./env";

const JWT_ALGORITHMS = ["HS256"] as const;

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

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "365d",
    algorithm: "HS256",
  });
}

export function parseRespondentToken(token: string, formId: string): string | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [...JWT_ALGORITHMS],
    }) as RespondentPayload;

    if (decoded.type !== "respondent" || decoded.formId !== formId) return null;
    if (!decoded.key || decoded.key.length < 8) return null;
    return decoded.key;
  } catch {
    return null;
  }
}
