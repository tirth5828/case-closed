"use client";

import { useState } from "react";
import Link from "next/link";
import OutcomeBar, { OutcomeLegend } from "@/components/OutcomeBar";
import Stamp from "@/components/Stamp";
import ReceiptLink from "@/components/ReceiptLink";
import type { Grouped } from "@/lib/honesty";
import type { OutcomeClass } from "@/lib/types";

interface AskResult {
  complaint_type: string;
  descriptor: string;
  reasoning: string;
}

interface NearbyTemplate {
  n: number;
  text: string;
  outcome: OutcomeClass | "unknown";
  gloss: string;
}

interface NearbyResult {
  scope: string;
  total: number;
  breakdown: { counts: Record<string, number>; total: number };
  resolvedShare: number;
  cosmeticShare: number;
  templates: NearbyTemplate[];
  receiptUrl: string;
  fromCache: boolean;
}

interface Playbook {
  odds: string;
  steps: string[];
}

function toGrouped(r: NearbyResult): Grouped {
  const cosmetic = Math.round(r.cosmeticShare * r.total);
  const verified = Math.round(r.resolvedShare * r.total);
  return { verified, cosmetic, neutral: r.total - verified - cosmetic, total: r.total };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `${url} failed (${res.status})`);
  return data as T;
}

export default function AskPage() {
  const [problem, setProblem] = useState("");
  const [zip, setZip] = useState("");
  const [phase, setPhase] = useState<"idle" | "classifying" | "querying" | "advising" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<AskResult | null>(null);
  const [nearby, setNearby] = useState<NearbyResult | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);

  async function run() {
    if (!problem.trim()) return;
    setError(null);
    setAsk(null);
    setNearby(null);
    setPlaybook(null);
    try {
      setPhase("classifying");
      const a = await postJson<AskResult>("/api/ask", { problem });
      setAsk(a);
      if (a.complaint_type === "OTHER") {
        setPhase("done");
        return;
      }

      setPhase("querying");
      const n = await postJson<NearbyResult>("/api/nearby", {
        complaint_type: a.complaint_type,
        descriptor: a.descriptor,
        zip,
      });
      setNearby(n);

      setPhase("advising");
      const p = await postJson<Playbook>("/api/playbook", {
        problem,
        complaint_type: a.complaint_type,
        scope: n.scope,
        total: n.total,
        resolvedShare: n.resolvedShare,
        cosmeticShare: n.cosmeticShare,
        templates: n.templates,
      });
      setPlaybook(p);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("done");
    }
  }

  const busy = phase === "classifying" || phase === "querying" || phase === "advising";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24">
      <nav className="pt-8">
        <Link href="/" className="font-mono text-[13px] text-receipt hover:underline">
          ← the Honesty Index
        </Link>
      </nav>

      <header className="pt-8">
        <h1 className="font-display text-4xl font-black uppercase leading-tight">
          Before you call 311
        </h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Describe the problem in your own words. We&apos;ll file it the way the city would — then
          show you what actually happened to identical complaints, and how to beat the odds.
        </p>
      </header>

      {/* Intake */}
      <section className="mt-8 rounded border border-hairline bg-card p-4">
        <label htmlFor="problem" className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
          What&apos;s wrong?
        </label>
        <textarea
          id="problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="My radiator has been cold for two weeks and the landlord won't call back."
          rows={3}
          className="mt-2 w-full resize-none rounded border border-hairline bg-paper p-3 text-[15px] outline-none focus:border-ink-3"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="zip" className="sr-only">
              ZIP code (optional)
            </label>
            <input
              id="zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP (optional)"
              inputMode="numeric"
              maxLength={5}
              className="w-32 rounded border border-hairline bg-paper px-3 py-2 font-mono text-[14px] outline-none focus:border-ink-3"
            />
          </div>
          <button
            onClick={run}
            disabled={busy || !problem.trim()}
            className="rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Working…" : "What are my odds?"}
          </button>
          {busy && (
            <span className="font-mono text-[12px] text-ink-3" aria-live="polite">
              {phase === "classifying" && "reading your words → the city's taxonomy…"}
              {phase === "querying" && "pulling identical complaints from NYC Open Data…"}
              {phase === "advising" && "reading the failure modes → your playbook…"}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-3 rounded border border-cosmetic/40 bg-paper p-3 text-[13px] text-cosmetic">
            {error}
          </p>
        )}
      </section>

      {/* Classification */}
      {ask && (
        <section className="mt-6 rounded border border-hairline bg-card p-4">
          <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
            How the city files this
          </p>
          {ask.complaint_type === "OTHER" ? (
            <p className="mt-2 text-[14px] text-ink-2">
              This doesn&apos;t map to one of the 15 highest-volume complaint types we&apos;ve
              indexed. It may still be reportable — try{" "}
              <a href="https://portal.311.nyc.gov" target="_blank" rel="noopener noreferrer" className="text-receipt hover:underline">
                311 directly
              </a>
              .
            </p>
          ) : (
            <>
              <p className="mt-2 text-xl font-bold">
                {ask.complaint_type}
                {ask.descriptor && <span className="font-normal text-ink-2"> — {ask.descriptor}</span>}
              </p>
              <p className="mt-1 text-[13px] text-ink-2">{ask.reasoning}</p>
            </>
          )}
        </section>
      )}

      {/* Outcomes */}
      {nearby && (
        <section className="mt-6 rounded border border-hairline bg-card p-4">
          <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
            What happened to {nearby.total.toLocaleString()} {nearby.scope}
          </p>
          <div className="mt-4">
            <OutcomeBar grouped={toGrouped(nearby)} height={30} />
          </div>
          <div className="mt-3">
            <OutcomeLegend />
          </div>
          <p className="mt-4 text-[15px]">
            <strong style={{ color: "var(--fixed)" }}>
              {(nearby.resolvedShare * 100).toFixed(0)}% verifiably fixed.
            </strong>{" "}
            <strong className="text-cosmetic">
              {(nearby.cosmeticShare * 100).toFixed(0)}% closed cosmetically
            </strong>{" "}
            — the ticket ended, the problem wasn&apos;t verified to.
          </p>

          <ul className="mt-4 space-y-2.5 border-t border-dashed border-hairline pt-4">
            {nearby.templates.slice(0, 6).map((t) => (
              <li key={t.text} className="grid grid-cols-[7.5rem_1fr] items-start gap-3 sm:grid-cols-[9rem_1fr]">
                <div className="pt-0.5">
                  <Stamp outcome={t.outcome} />
                  <p className="mt-1 font-mono text-[11px] text-ink-3">×{t.n.toLocaleString()}</p>
                </div>
                <p className="pt-0.5 text-[13px] text-ink-2">{t.gloss}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <ReceiptLink url={nearby.receiptUrl} fromCache={nearby.fromCache} />
          </div>
        </section>
      )}

      {/* Playbook */}
      {playbook && (
        <section className="mt-6 rounded border-2 border-ink bg-card p-4">
          <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
            Your playbook — beat the closure codes
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">{playbook.odds}</p>
          <ol className="mt-3 space-y-2">
            {playbook.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[14px]">
                <span className="font-mono font-bold text-ink-3">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <a
            href="https://portal.311.nyc.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2"
          >
            File it for real →
          </a>
        </section>
      )}
    </main>
  );
}
