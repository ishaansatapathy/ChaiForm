import rateLimit from "express-rate-limit";



const skipInTests = () => process.env.VITEST === "true";



export const authCredentialLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 40,

  skip: skipInTests,

  standardHeaders: true,

  legacyHeaders: false,

  message: { message: "Too many login or signup attempts. Try again later." },

});



export const passwordResetLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 30,

  skip: skipInTests,

  standardHeaders: true,

  legacyHeaders: false,

  message: { message: "Too many password reset attempts. Try again in 15 minutes." },

});



export const formSubmitIpLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 60,

  skip: skipInTests,

  standardHeaders: true,

  legacyHeaders: false,

  message: { message: "Too many form submissions. Try again later." },

});



export const formSubmitPerFormLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 20,

  skip: skipInTests,

  standardHeaders: true,

  legacyHeaders: false,

  keyGenerator: (req) => {

    const formId = extractSubmitFormId(req);

    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

    return formId ? `${ip}:${formId}` : ip;

  },

  message: { message: "Too many submissions for this form. Try again later." },

});



const AUTH_CREDENTIAL_PATHS = [

  "auth.signUp",

  "auth.signIn",

  "auth.verify2FA",

  "auth.refresh",

];



const PASSWORD_RESET_PATHS = [

  "auth.forgotPassword",

  "auth.verifyOtp",

  "auth.resetPassword",

];



const FORM_SUBMIT_PATHS = ["forms.submit"];



function extractSubmitFormId(req: import("express").Request): string | null {

  const body = req.body;

  if (!body || typeof body !== "object") return null;



  if ("json" in body && body.json && typeof body.json === "object" && "formId" in body.json) {

    return String((body.json as { formId?: string }).formId ?? "");

  }



  for (const value of Object.values(body)) {

    if (value && typeof value === "object" && "json" in value) {

      const json = (value as { json?: { formId?: string } }).json;

      if (json?.formId) return json.formId;

    }

  }



  return null;

}



export function createTrpcRateLimitMiddleware() {

  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {

    const path = req.path.replace(/^\//, "");



    if (AUTH_CREDENTIAL_PATHS.some((p) => path.includes(p))) {

      return authCredentialLimiter(req, res, next);

    }



    if (PASSWORD_RESET_PATHS.some((p) => path.includes(p))) {

      return passwordResetLimiter(req, res, next);

    }



    if (FORM_SUBMIT_PATHS.some((p) => path.includes(p))) {

      return formSubmitPerFormLimiter(req, res, () => {

        formSubmitIpLimiter(req, res, next);

      });

    }



    return next();

  };

}

