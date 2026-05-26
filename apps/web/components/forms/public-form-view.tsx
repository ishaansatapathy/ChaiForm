"use client";

import { getVisibleFields } from "@repo/services/form/visibility";

import type { RouterOutputs } from "@repo/trpc/client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormFieldInput } from "~/components/forms/form-field-input";
import { isMultiCheckboxConfig } from "~/lib/checkbox-value";
import { getFormTheme } from "~/lib/form-themes";
import {
  checkRemoteSubmission,
  ensureRespondentSession,
  hasLocalSubmission,
  markFormSubmitted,
} from "~/lib/respondent-key";
import { clearSubmissionIdempotencyKey, getSubmissionIdempotencyKey } from "~/lib/idempotency-key";
import { TurnstileWidget, getClientTurnstileSiteKey } from "~/components/forms/turnstile-widget";
import { runWithRetry, useWarmApi } from "~/lib/warm-api";
import { trpc } from "~/trpc/client";

type PublicForm = RouterOutputs["forms"]["getPublic"];

type PublicFormViewProps = {
  form: PublicForm;
  thankYouPath: string;
};

function isFieldEmpty(field: PublicForm["fields"][number], value: string) {
  const trimmed = value.trim();
  if (field.type === "checkbox") {
    if (isMultiCheckboxConfig(field.config)) {
      if (!trimmed || trimmed === "[]") return true;
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return !Array.isArray(parsed) || parsed.length === 0;
      } catch {
        return true;
      }
    }
    return trimmed !== "true";
  }
  return trimmed.length === 0;
}

export function PublicFormView({ form, thankYouPath }: PublicFormViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = getFormTheme(form.theme);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(!form.allowMultipleSubmissions);

  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery(
    {},
    { retry: false, staleTime: 30_000, enabled: form.requireAuthentication },
  );

  useWarmApi();

  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileSiteKey = getClientTurnstileSiteKey();
  const turnstileEnabled = Boolean(turnstileSiteKey);

  const fields = form.fields;
  const visibleFields = useMemo(() => getVisibleFields(fields, values), [fields, values]);
  const currentField = visibleFields[step];
  const isLastStep = visibleFields.length > 0 && step >= visibleFields.length - 1;
  const progress =
    visibleFields.length > 0 ? ((step + 1) / visibleFields.length) * 100 : 0;

  useEffect(() => {
    if (step >= visibleFields.length && visibleFields.length > 0) {
      setStep(Math.max(visibleFields.length - 1, 0));
    }
  }, [step, visibleFields.length]);

  useEffect(() => {
    if (honeypotRef.current) {
      honeypotRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!form.id) return;
    void fetch("/api/record-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formId: form.id }),
      cache: "no-store",
    }).catch(() => undefined);
  }, [form.id]);

  useEffect(() => {
    if (form.allowMultipleSubmissions) {
      setCheckingSubmission(false);
      return;
    }

    if (form.requireAuthentication) {
      if (authLoading) return;
      if (!user) {
        setCheckingSubmission(false);
        return;
      }
      void checkRemoteSubmission(form.id).then((submitted) => {
        setAlreadySubmitted(submitted);
        setCheckingSubmission(false);
      });
      return;
    }

    if (hasLocalSubmission(form.id)) {
      setAlreadySubmitted(true);
      setCheckingSubmission(false);
      return;
    }

    void ensureRespondentSession(form.id).then(() =>
      checkRemoteSubmission(form.id).then((submitted) => {
        setAlreadySubmitted(submitted);
        setCheckingSubmission(false);
      }),
    );
  }, [form.allowMultipleSubmissions, form.requireAuthentication, form.id, user, authLoading]);

  const validateCurrentStep = () => {
    if (!currentField) return true;
    const value = values[currentField.id] ?? "";
    if (currentField.required && isFieldEmpty(currentField, value)) {
      toast.error(`"${currentField.label}" is required`);
      return false;
    }
    return true;
  };

  const validateAllVisibleSteps = () => {
    for (const field of visibleFields) {
      const value = values[field.id] ?? "";
      if (field.required && isFieldEmpty(field, value)) {
        toast.error(`"${field.label}" is required`);
        return false;
      }
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateCurrentStep()) return;
    if (isLastStep) {
      void handleSubmit();
      return;
    }
    setStep((prev) => Math.min(prev + 1, visibleFields.length - 1));
  };

  const handleSubmit = async () => {
    if (!validateAllVisibleSteps()) return;
    if (turnstileEnabled && !turnstileToken) {
      toast.error("Please complete the CAPTCHA check");
      return;
    }
    const honeypot = honeypotRef.current?.value ?? "";
    await ensureRespondentSession(form.id);
    const idempotencyKey = getSubmissionIdempotencyKey(form.id);
    const payload = {
      formId: form.id,
      website: honeypot,
      idempotencyKey,
      ...(turnstileEnabled && turnstileToken ? { turnstileToken } : {}),
      answers: fields.map((field) => ({
        fieldId: field.id,
        value: values[field.id] ?? "",
      })),
    };

    setSubmitting(true);
    try {
      await runWithRetry(
        async () => {
          const response = await fetch("/api/submit-form", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: AbortSignal.timeout(20_000),
          });

          if (response.ok) return;

          let result: { error?: string; retryable?: boolean } = {};
          try {
            result = (await response.json()) as typeof result;
          } catch {
            throw new Error("Server did not respond. Try again.");
          }

          if (result.retryable ?? response.status >= 500) {
            throw new Error(result.error ?? "Server is waking up — please try again.");
          }

          throw new Error(result.error ?? "Could not submit form.");
        },
        {
          attempts: 3,
          delaysMs: [0, 2_000, 4_000],
          isRetryable: (error) => {
            if (error instanceof Error) {
              return (
                error.message.includes("waking up") ||
                error.message.includes("did not respond") ||
                error.message.includes("Try again")
              );
            }
            return true;
          },
        },
      );

      if (!form.allowMultipleSubmissions) {
        markFormSubmitted(form.id);
      }
      clearSubmissionIdempotencyKey(form.id);
      router.push(thankYouPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit form";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleContinue();
    }
  };

  const needsSignIn = form.requireAuthentication && !authLoading && !user;
  const signInHref = `/sign-in?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <div className={`relative flex min-h-dvh flex-col ${theme.pageBg}`}>
      <div className={`relative mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10 sm:px-8 ${theme.glow}`}>
        <div className="mb-10">
          <p
            className={`font-mono mb-2 text-[10px] tracking-[0.3em] uppercase opacity-70 ${theme.accentSoft}`}
          >
            ChaiForm · {theme.label}
          </p>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            {form.title}
          </h1>
        {form.description && step === 0 && !alreadySubmitted && !needsSignIn && (
          <p className="mt-2 text-sm text-white/50">{form.description}</p>
        )}
        </div>

        {checkingSubmission || authLoading ? (
          <p className="text-sm text-white/45">
            {authLoading ? "Checking sign-in status…" : "Checking your response status…"}
          </p>
        ) : needsSignIn ? (
          <div className="app-surface rounded-[32px] border border-cyan-400/20 bg-cyan-400/5 p-8 text-center">
            <p className="font-display text-2xl font-bold text-white">Sign in required</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              The form owner only accepts responses from signed-in ChaiForm users.
            </p>
            <Link
              href={signInHref}
              className="btn-omni font-display mt-6 inline-flex rounded-2xl px-8 py-3 text-sm font-black tracking-[0.18em] uppercase"
            >
              Sign in to continue
            </Link>
            <p className="mt-4 text-xs text-white/35">
              Don&apos;t have an account?{" "}
              <Link href={`/sign-up?next=${encodeURIComponent(pathname || "/")}`} className="text-lime-400">
                Create one
              </Link>
            </p>
          </div>
        ) : alreadySubmitted ? (
          <div className="app-surface rounded-[32px] border border-amber-400/20 bg-amber-400/5 p-8 text-center">
            <p className="font-display text-2xl font-bold text-white">Already submitted</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              You&apos;ve already sent a response to this form. You can&apos;t submit it again or edit
              your previous answers here.
            </p>
            <p className="mt-4 text-sm text-white/45">
              Need to change something? Contact the form owner and ask them to send you a new link.
            </p>
          </div>
        ) : (
          <>
        {visibleFields.length > 0 && (
          <div className="mb-6 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-lime-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {currentField && (
          <div className="flex flex-col" onKeyDown={handleKeyDown}>
            {(() => {
              const multiCheckbox =
                currentField.type === "checkbox" && isMultiCheckboxConfig(currentField.config);
              const Wrapper = multiCheckbox ? "div" : "label";

              return (
                <Wrapper className="block space-y-3">
                  {(currentField.type !== "checkbox" || multiCheckbox) && (
                    <span className="text-base font-medium text-white/90 sm:text-lg">
                      {currentField.label}
                      {currentField.required && <span className={theme.accentText}> *</span>}
                    </span>
                  )}
                  <FormFieldInput
                    field={currentField}
                    theme={theme}
                    value={values[currentField.id] ?? ""}
                    onChange={(value) =>
                      setValues((prev) => ({ ...prev, [currentField.id]: value }))
                    }
                  />
                </Wrapper>
              );
            })()}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold tracking-wide text-white/60 uppercase transition-colors hover:border-white/30 hover:text-white"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleContinue}
                disabled={submitting}
                className="btn-omni font-display rounded-2xl py-3.5 text-sm font-black tracking-[0.18em] uppercase disabled:opacity-50 sm:px-10"
              >
                {submitting ? "Submitting…" : isLastStep ? "Submit" : "Continue"}
              </button>
              <p className="w-full font-mono text-[10px] tracking-wider text-white/30 uppercase">
                Question {step + 1} of {visibleFields.length} · Press Enter ↵
              </p>
            </div>
          </div>
        )}

        <input
          ref={honeypotRef}
          type="text"
          name="_chaiform_hp"
          defaultValue=""
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          data-lpignore="true"
          data-1p-ignore
          readOnly
          onFocus={(event) => event.currentTarget.removeAttribute("readonly")}
          className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        />
          </>
        )}
      </div>

      {isLastStep && turnstileEnabled && !alreadySubmitted && !needsSignIn && (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          onTokenChange={setTurnstileToken}
          placement="bottom-right"
        />
      )}
    </div>
  );
}
