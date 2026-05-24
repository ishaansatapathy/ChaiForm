"use client";

import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";

import { getFormTheme } from "~/lib/form-themes";
import { trpc } from "~/trpc/client";

export default function ExplorePage() {
  const { data, isLoading } = trpc.forms.listPublic.useQuery({ limit: 24 });

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/8 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-lg font-black tracking-[0.22em] text-lime-400 uppercase">
            ChaiForm
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="font-mono text-[11px] tracking-[0.28em] text-white/50 uppercase transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-lime-400/40 px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-lime-400 uppercase transition-colors hover:bg-lime-400/10"
            >
              Create
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <Compass size={18} className="text-lime-400" />
            <p className="font-mono text-[10px] tracking-[0.35em] text-white/35 uppercase">Public gallery</p>
          </div>
          <h1 className="font-display text-5xl font-black tracking-tight md:text-6xl">Explore Forms</h1>
          <p className="mt-4 max-w-2xl text-sm text-white/45">
            Browse published public forms from creators. Unlisted forms stay off this page and are only reachable by direct link.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-3xl bg-white/4" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="rounded-3xl border border-white/8 bg-white/2 p-10 text-center">
            <p className="text-white/50">No public forms yet. Be the first to publish one.</p>
            <Link href="/sign-up" className="font-annotate mt-4 inline-block text-xl text-lime-400">
              Create a form →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((form) => {
              const theme = getFormTheme(form.theme);
              const href = form.slug ? `/f/s/${form.slug}` : `/f/${form.id}`;
              return (
                <Link
                  key={form.id}
                  href={href}
                  className="group rounded-3xl border border-white/8 bg-white/2 p-6 transition-colors hover:border-white/15 hover:bg-white/4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${theme.badge}`}>
                      {theme.label}
                    </span>
                    <ArrowUpRight size={16} className="text-white/25 transition-colors group-hover:text-lime-400" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-white">{form.title}</h2>
                  {form.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/45">{form.description}</p>
                  )}
                  <div className="mt-5 flex gap-4 font-mono text-[10px] tracking-wider text-white/30 uppercase">
                    <span>{form.submissionCount} responses</span>
                    <span>{form.viewCount} views</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
