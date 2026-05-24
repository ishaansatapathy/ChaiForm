"use client";

import Link from "next/link";
import { Activity, BarChart2, Plus } from "lucide-react";

import { useAppData } from "~/components/app/app-data-provider";
import { FormCard } from "~/components/app/form-card";
import { Highlight } from "~/components/app/highlight";
import { getPublicDisplayName } from "~/lib/user-display-name";
import { trpc } from "~/trpc/client";

export default function DashboardPage() {
  const { initialForms, initialAnalytics } = useAppData();
  const { data: user } = trpc.auth.me.useQuery();
  const greetingName = user ? getPublicDisplayName(user) : "Hero";

  const {
    data: formsPage,
    isLoading,
    isError,
    refetch,
  } = trpc.forms.list.useQuery(
    { limit: 100 },
    {
      initialData: initialForms ?? undefined,
      enabled: Boolean(user),
      retry: 2,
      staleTime: 30_000,
    },
  );

  const { data: analytics } = trpc.analytics.summary.useQuery(
    {},
    {
      initialData: initialAnalytics ?? undefined,
      enabled: Boolean(user),
      retry: 2,
      staleTime: 30_000,
    },
  );

  const forms = formsPage?.items ?? initialForms?.items ?? [];
  const publishedCount = forms.filter((f) => f.visibility !== "draft").length;
  const totalResponses = analytics?.totalSubmissions ?? initialAnalytics?.totalSubmissions ?? 0;
  const loadingForms = isLoading && forms.length === 0 && !isError;

  const statItems = [
    { label: "Forms Created", value: forms.length.toString(), icon: BarChart2, trend: "All time" },
    { label: "Published", value: publishedCount.toString(), icon: Activity, trend: "Live" },
    { label: "Total Responses", value: String(totalResponses), icon: BarChart2, trend: "All forms" },
  ];

  return (
    <section className="relative py-4">
      <div className="animate-in fade-in slide-in-from-bottom-4 mb-12 duration-700">
        <p className="font-mono mb-2 text-[10px] tracking-[0.35em] text-lime-400/80 uppercase">
          {"// system online · creator mode"}
        </p>
        <h2 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">
          Welcome back, {greetingName}
        </h2>
        <p className="font-annotate mt-2 text-xl text-lime-400/90 -rotate-2">
          Your forms are ready to deploy.
        </p>
      </div>

      <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-white/5 pb-10">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="h-px w-8 bg-lime-400" />
            <p className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase">Overview</p>
          </div>
          <h1 className="font-display text-5xl font-normal tracking-[-0.05em] text-white md:text-7xl">
            <Highlight>Your</Highlight> Forms <br />
            <span className="text-white/40 italic">Dashboard</span>
          </h1>
          <span className="font-annotate mt-4 block text-xl text-lime-400 -rotate-3">
            Your form-building journey starts here.
          </span>
        </div>

        <Link
          href="/forms/new"
          className="btn-omni font-display inline-flex h-16 items-center gap-3 rounded-2xl px-8 text-lg font-black tracking-wide uppercase"
        >
          <Plus size={20} />
          New Form
        </Link>
      </div>

      <div className="mb-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {statItems.map((stat) => (
          <div key={stat.label}>
            <div className="mb-2 flex items-center gap-2 text-white/30">
              <stat.icon size={14} className="text-lime-400/70" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase">{stat.label}</span>
            </div>
            <span className="font-display text-5xl font-normal tracking-tight text-white">{stat.value}</span>
            <p className="font-annotate mt-2 text-base text-lime-400/80">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display mb-6 text-2xl font-bold text-white">Your Forms</h2>
        {loadingForms ? (
          <p className="text-white/40">Loading forms…</p>
        ) : isError && forms.length === 0 ? (
          <div className="app-surface mx-auto max-w-xl rounded-3xl border border-white/10 p-10 text-center">
            <p className="font-display text-xl font-bold text-white">Could not load forms</p>
            <p className="mt-3 text-sm text-white/50">
              The server may be waking up. Wait a few seconds and try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-omni font-display mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-black tracking-wide uppercase"
            >
              Retry
            </button>
          </div>
        ) : forms.length === 0 ? (
          <div className="app-surface mx-auto max-w-xl rounded-3xl border border-white/10 p-10 text-center">
            <p className="font-display text-2xl font-bold text-white">No forms yet</p>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Create your first form to start collecting responses, sharing links, and viewing analytics.
            </p>
            <Link
              href="/forms/new"
              className="btn-omni font-display mt-8 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black tracking-wide uppercase"
            >
              <Plus size={16} />
              Create your first form
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <FormCard key={form.id} form={form} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
