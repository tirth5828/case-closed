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

interface Letter {
  letter: string;
  why: string[];
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
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

const EXAMPLES = [
  "My radiator's been cold for two weeks and the landlord won't call back",
  "A truck parks on our crosswalk every single night",
  "The apartment upstairs blasts music until 3am",
  "There's mold spreading on my bathroom ceiling",
];

export default function AskPage() {
  const [problem, setProblem] = useState("");
  const [zip, setZip] = useState("");
  const [phase, setPhase] = useState<"idle" | "classifying" | "querying" | "advising" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<AskResult | null>(null);
  const [nearby, setNearby] = useState<NearbyResult | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [letterBusy, setLetterBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);

  function dictate() {
    const rec = getSpeechRecognition();
    if (!rec) {
      setError("Voice input isn't supported in this browser — Chrome works.");
      return;
    }
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join("");
      setProblem(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function draftLetter() {
    if (!ask || !nearby) return;
    setLetterBusy(true);
    setLetter(null);
    try {
      const l = await postJson<Letter>("/api/letter", {
        problem,
        complaint_type: ask.complaint_type,
        descriptor: ask.descriptor,
        templates: nearby.templates,
      });
      setLetter(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLetterBusy(false);
    }
  }

  async function copyLetter() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter.letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function run() {
    if (!problem.trim()) return;
    setError(null);
    setAsk(null);
    setNearby(null);
    setPlaybook(null);
    setLetter(null);
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
      <header className="pt-10">
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
          placeholder="Say it like you'd say it to a neighbor — we'll turn it into the city's language."
          rows={3}
          className="mt-2 w-full resize-none rounded border border-hairline bg-paper p-3 text-[15px] outline-none focus:border-ink-3"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setProblem(ex)}
              className="cursor-pointer rounded-full border border-hairline bg-paper px-2.5 py-1 text-[12px] text-ink-2 hover:border-ink-3 hover:text-ink"
            >
              &ldquo;{ex}&rdquo;
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="zip" className="sr-only">
              ZIP code (optional)
            </label>
            <input
              id="zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP"
              inputMode="numeric"
              maxLength={5}
              className="w-20 rounded border border-hairline bg-paper px-3 py-2 font-mono text-[14px] outline-none focus:border-ink-3"
            />
          </div>
          <button
            onClick={dictate}
            disabled={busy || listening}
            title="Say it out loud instead"
            aria-label="Dictate your problem"
            className="rounded border border-hairline bg-paper px-3 py-2 text-[15px] hover:border-ink-3 disabled:opacity-40"
          >
            {listening ? "🔴 listening…" : "🎙️"}
          </button>
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
        <section className="reveal mt-6 rounded border border-hairline bg-card p-4">
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
        <section className="reveal mt-6 rounded border border-hairline bg-card p-4">
          <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
            What happened to {nearby.total.toLocaleString()} {nearby.scope}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <p className="font-display text-5xl font-black" style={{ color: "var(--fixed)" }}>
                {(nearby.resolvedShare * 100).toFixed(0)}%
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">verifiably fixed</p>
            </div>
            <div>
              <p className="font-display text-5xl font-black text-cosmetic">
                {(nearby.cosmeticShare * 100).toFixed(0)}%
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                closed cosmetically — the ticket ended,
                <br />
                the problem wasn&apos;t verified to
              </p>
            </div>
          </div>

          <div className="mt-5">
            <OutcomeBar grouped={toGrouped(nearby)} height={30} />
          </div>
          <div className="mt-3">
            <OutcomeLegend />
          </div>
          {(nearby.breakdown.counts["duplicate"] ?? 0) / nearby.total > 0.2 && (
            <p className="mt-3 rounded border border-dashed border-hairline bg-paper p-2.5 text-[13px] text-ink-2">
              And{" "}
              <strong className="text-ink">
                {Math.round(((nearby.breakdown.counts["duplicate"] ?? 0) / nearby.total) * 100)}%
                never counted at all
              </strong>{" "}
              — closed as duplicates of a neighbor&apos;s report, so the file shows one complaint
              where a whole building was cold.
            </p>
          )}

          <ul className="mt-4 space-y-2.5 border-t border-dashed border-hairline pt-4">
            {nearby.templates.slice(0, 6).map((t) => (
              <li key={t.text} className="grid grid-cols-[7.5rem_1fr] items-start gap-3 sm:grid-cols-[9rem_1fr]">
                <div className="pt-0.5">
                  <Stamp outcome={t.outcome} />
                  <p className="mt-1 font-mono text-[11px] text-ink-3">×{t.n.toLocaleString()}</p>
                </div>
                <details className="pt-0.5">
                  <summary className="cursor-pointer list-none text-[13px] text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                    {t.gloss} <span className="font-mono text-[11px] text-ink-3">· read the city&apos;s words</span>
                  </summary>
                  <p className="mt-1.5 border-l-2 border-hairline pl-2.5 text-[12px] leading-snug text-ink-2">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </details>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <ReceiptLink url={nearby.receiptUrl} fromCache={nearby.fromCache} />
          </div>
        </section>
      )}

      {/* The most likely ending */}
      {nearby && nearby.templates.length > 0 && (
        <section className="reveal mt-6 rounded border border-hairline bg-card p-4">
          <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
            Your most likely ending
          </p>
          <p className="mt-1 text-[13px] text-ink-2">
            The sentence the city sends most often to complaints like yours —{" "}
            {Math.round((nearby.templates[0].n / nearby.total) * 100)}% of them got exactly this:
          </p>
          <blockquote className="mt-3 border-l-2 pl-3" style={{ borderColor: "var(--stamp)" }}>
            <p className="text-[15px] leading-relaxed text-ink">
              &ldquo;{nearby.templates[0].text}&rdquo;
            </p>
          </blockquote>
          <div className="mt-3 flex items-center gap-3">
            <Stamp outcome={nearby.templates[0].outcome} />
            <span className="text-[13px] text-ink-2">
              {nearby.templates[0].gloss} — unless you change the script. That&apos;s what the
              playbook below is for.
            </span>
          </div>
        </section>
      )}

      {/* Playbook */}
      {playbook && (
        <section className="reveal mt-6 rounded border-2 border-ink bg-card p-4">
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={draftLetter}
              disabled={letterBusy}
              className="rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2 disabled:opacity-40"
            >
              {letterBusy ? "Drafting…" : "Draft my complaint text"}
            </button>
            <a
              href="https://portal.311.nyc.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-ink px-5 py-2 font-display font-bold uppercase tracking-wide hover:bg-paper"
            >
              File it for real →
            </a>
          </div>
        </section>
      )}

      {/* The refile letter */}
      {letter && (
        <section className="carbon reveal mt-6 rounded p-4">
          <span className="copy-ghost" aria-hidden="true">
            COPY
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
              Ready to paste into 311 — fill the [brackets]
            </p>
            <button
              onClick={copyLetter}
              className="mr-20 cursor-pointer rounded border border-[#d8c68f] bg-paper/60 px-3 py-1 font-mono text-[12px] hover:border-ink-3"
            >
              {copied ? "✓ copied" : "copy"}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
            {letter.letter}
          </p>
          <ul className="mt-3 space-y-1">
            {letter.why.map((w, i) => (
              <li key={i} className="text-[12px] text-ink-2">
                ▸ {w}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
