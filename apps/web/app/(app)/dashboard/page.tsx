"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BarChart2, Plus } from "lucide-react";

import type { RouterOutputs } from "@repo/trpc/client";

import { useAppData } from "~/components/app/app-data-provider";
import { FormCard } from "~/components/app/form-card";
import { Highlight } from "~/components/app/highlight";
import { getPublicDisplayName } from "~/lib/user-display-name";
import { trpc } from "~/trpc/client";

type FormListItem = RouterOutputs["forms"]["list"]["items"][number];
const PAGE_SIZE = 20;

export default function DashboardPage() {
  const { initialForms, initialAnalytics } = useAppData();
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery({});
  const greetingName = user ? getPublicDisplayName(user) : "Hero";
  const [pages, setPages] = useState<FormListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem("cf_onboarding_dismissed") === "true");
  }, []);

  const handleDismissOnboarding = () => {
    localStorage.setItem("cf_onboarding_dismissed", "true");
    setDismissed(true);
  };

  const {
    data: formsPage,
    isLoading,
    isError,
    refetch,
  } = trpc.forms.list.useQuery(
    { limit: PAGE_SIZE },
    {
      initialData: initialForms ?? undefined,
      enabled: Boolean(user),
      retry: 2,
      staleTime: 30_000,
    },
  );

  useEffect(() => {
    if (!formsPage) return;
    setPages(formsPage.items);
    setNextCursor(formsPage.nextCursor);
  }, [formsPage]);

  const { data: analytics } = trpc.analytics.summary.useQuery(
    {},
    {
      initialData: initialAnalytics ?? undefined,
      enabled: Boolean(user),
      retry: 2,
      staleTime: 30_000,
    },
  );

  const forms = pages.length > 0 ? pages : (formsPage?.items ?? initialForms?.items ?? []);
  const serverFormCount = analytics?.totalForms ?? initialAnalytics?.totalForms ?? 0;
  const totalResponses = analytics?.totalSubmissions ?? initialAnalytics?.totalSubmissions ?? 0;
  const formsCount = Math.max(serverFormCount, forms.length);
  const listFailedButFormsExist =
    forms.length === 0 && (isError || serverFormCount > 0 || totalResponses > 0);
  const publishedCount = forms.filter((f) => f.visibility !== "draft").length;
  const loadingForms = isLoading && forms.length === 0 && !isError;

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await utils.forms.list.fetch({ limit: PAGE_SIZE, cursor: nextCursor });
      setPages((prev) => [...prev, ...next.items]);
      setNextCursor(next.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const statItems = [
    { label: "Forms Created", value: formsCount.toString(), icon: BarChart2, trend: "All time" },
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

      {formsCount === 0 && !dismissed && (
        <div className="animate-in fade-in slide-in-from-top-4 mb-10 overflow-hidden rounded-[32px] border border-lime-400/20 bg-lime-400/5 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Getting Started Checklist</h3>
              <p className="text-xs text-white/60 mb-6 max-w-xl leading-relaxed">
                Welcome to ChaiForm! Complete these 3 quick steps to start gathering responses and analyzing data.
              </p>
            </div>
            <button
              onClick={handleDismissOnboarding}
              className="rounded-full border border-white/10 p-1.5 text-white/40 hover:border-white/20 hover:text-white transition-colors"
              aria-label="Dismiss onboarding"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lime-400/10 font-mono text-xs font-bold text-lime-400">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Create a Form</p>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Click the button below to add fields and customize your form theme.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lime-400/10 font-mono text-xs font-bold text-lime-400">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Share the Link</p>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  Copy the public or unlisted URL and send it to your respondents.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lime-400/10 font-mono text-xs font-bold text-lime-400">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-white">See Responses</p>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  View instant analytics and detailed answers as soon as they roll in.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
        {listFailedButFormsExist ? (
          <div className="app-surface mb-6 rounded-3xl border border-amber-400/20 p-5">
            <p className="text-sm text-amber-200/90">
              {serverFormCount > 0
                ? `Your forms are still in the database (${serverFormCount} found), but the list could not load.`
                : totalResponses > 0
                  ? `You have ${totalResponses} response(s), but the forms list could not load.`
                  : "The forms list could not load."}{" "}
              Please retry in a moment. If this keeps happening, contact support.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-omni font-display mt-4 inline-flex rounded-xl px-5 py-2 text-xs font-black tracking-wide uppercase"
            >
              Retry
            </button>
          </div>
        ) : null}
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
            {nextCursor ? (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="btn-omni font-display inline-flex rounded-xl px-6 py-2.5 text-xs font-black tracking-wide uppercase disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more forms"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
