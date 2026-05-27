export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black px-4 py-16 text-white">
      <article className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-4xl font-bold">Terms of Service</h1>
        <p className="text-white/60">Last updated: May 2026</p>
        <section className="space-y-3 text-sm leading-relaxed text-white/70">
          <p>
            ChaiForm provides a form builder for creators to publish forms, collect responses, and
            view analytics. By using the service you agree to use it lawfully and not to submit spam,
            malware, or abusive content through public forms.
          </p>
          <p>
            Creators are responsible for the forms they publish and the data they collect. We may
            suspend accounts that violate these terms or abuse rate limits and platform resources.
          </p>
          <p>
            The service is provided as-is. For support, contact{" "}
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
