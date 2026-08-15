"use client";

import { useState } from "react";
import Stamp from "./Stamp";
import type { OutcomeClass } from "@/lib/types";

interface TranslateResult {
  outcome: OutcomeClass | "unknown";
  gloss: string;
  next: string;
  matched: boolean;
  count?: number;
}

/** Paste the closure email the city sent you; get the honest verdict. */
export default function Translator() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `translation failed (${res.status})`);
      setResult(data as TranslateResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded border border-hairline bg-card p-4">
      <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
        Got one of these? Decode yours
      </p>
      <p className="mt-1 text-[13px] text-ink-2">
        Paste the closure text from the email or status page the city sent you. We&apos;ll tell you
        what it actually means — and what to do next.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="The Department responded to the complaint and…"
        rows={3}
        className="mt-3 w-full resize-none rounded border border-hairline bg-paper p-3 font-mono text-[13px] outline-none focus:border-ink-3"
      />
      <button
        onClick={run}
        disabled={busy || !text.trim()}
        className="mt-2 rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Reading…" : "Translate it"}
      </button>
      {error && (
        <p className="mt-3 rounded border border-cosmetic/40 bg-paper p-3 text-[13px] text-cosmetic">
          {error}
        </p>
      )}
      {result && (
        <div className="reveal mt-4 border-t border-dashed border-hairline pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Stamp outcome={result.outcome} className="text-[14px]" />
            <p className="text-[15px] font-medium">{result.gloss}</p>
          </div>
          {result.count && (
            <p className="mt-2 font-mono text-[12px] text-ink-3">
              This exact sentence was sent to {result.count.toLocaleString()} complaints in the
              last 12 months.
            </p>
          )}
          {!result.matched && (
            <p className="mt-2 font-mono text-[12px] text-ink-3">
              Not one of the standard templates — classified live.
            </p>
          )}
          <p className="mt-3 text-[14px] leading-relaxed">{result.next}</p>
        </div>
      )}
    </section>
  );
}
