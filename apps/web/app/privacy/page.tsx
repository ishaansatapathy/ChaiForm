export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black px-4 py-16 text-white">
      <article className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
        <p className="text-white/60">Last updated: May 2026</p>
        <section className="space-y-3 text-sm leading-relaxed text-white/70">
          <p>
            ChaiForm stores account information (name, email, authentication metadata) and form data
            you create, including submissions collected through your published forms.
          </p>
          <p>
            When you sign in with Google, we receive your email address, name, and profile image URL
            from Google solely to authenticate you and personalize your account.
          </p>
          <p>
            Submission data is accessible only to the form owner through authenticated dashboard and
            analytics endpoints. Public form endpoints do not expose other users&apos; responses.
          </p>
          <p>
            Authentication emails (verification, password reset, optional 2FA) are sent via configured
            email providers. Cookies are used for session management with httpOnly JWT tokens.
          </p>
          <p>
            To request account or data deletion, delete your forms from the dashboard or email{" "}
            <a href="mailto:support@chaiform.dev" className="text-lime-400 hover:text-lime-300">
              support@chaiform.dev
            </a>
            .
          </p>
        </section>
        <a href="/sign-in" className="inline-block text-sm text-lime-400 hover:text-lime-300">
          ← Back to sign in
        </a>
      </article>
    </div>
  );
}
