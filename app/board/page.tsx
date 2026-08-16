"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OutcomeBar, { OutcomeLegend } from "@/components/OutcomeBar";
import Stamp from "@/components/Stamp";
import ReceiptLink from "@/components/ReceiptLink";
import type { Grouped } from "@/lib/honesty";
import type { OutcomeClass } from "@/lib/types";

interface BoardStats {
  board: string;
  total: number;
  grouped: Grouped;
  resolvedShare: number;
  cosmeticShare: number;
  cityCosmeticShare: number;
  failures: { n: number; outcome: OutcomeClass | "unknown"; gloss: string }[];
  receiptUrl: string;
  since: string;
  brief?: { headline: string; summary: string; questions: string[] };
}

export default function BoardPage() {
  const [boards, setBoards] = useState<{ board: string; total: number }[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [briefBusy, setBriefBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BoardStats | null>(null);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => r.json())
      .then((d) => setBoards(d.boards ?? []))
      .catch(() => setError("Couldn't load the board list."));
  }, []);

  async function lookup(board: string, withBrief: boolean) {
    setError(null);
    if (withBrief) setBriefBusy(true);
    else {
      setBusy(true);
      setStats(null);
    }
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board, brief: withBrief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `lookup failed (${res.status})`);
      setStats(data as BoardStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setBriefBusy(false);
    }
  }

  const delta = stats ? stats.cosmeticShare - stats.cityCosmeticShare : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24">
      <header className="pt-10 print:hidden">
        <h1 className="font-display text-4xl font-black uppercase leading-tight">
          Take it to your board
        </h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Community board meetings are where 311 patterns get discussed with city officials in the
          room. Pick your district, see how closures really end there, and print a one-page brief -
          with questions - for the next public session.
        </p>
      </header>

      <section className="mt-8 rounded border border-hairline bg-card p-4 print:hidden">
        <label htmlFor="board" className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
          Community board
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <select
            id="board"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              if (e.target.value) void lookup(e.target.value, false);
            }}
            className="min-w-64 flex-1 cursor-pointer rounded border border-hairline bg-paper px-3 py-2 font-mono text-[14px] outline-none focus:border-ink-3"
          >
            <option value="">Choose your district…</option>
            {boards.map((b) => (
              <option key={b.board} value={b.board}>
                {b.board} - {b.total.toLocaleString()} complaints
              </option>
            ))}
          </select>
        </div>
        {busy && <p className="mt-3 font-mono text-[12px] text-ink-3">pulling the district file…</p>}
        {error && (
          <p className="mt-3 rounded border border-cosmetic/40 bg-paper p-3 text-[13px] text-cosmetic">
            {error}
          </p>
        )}
      </section>

      {stats && (
        <section className="reveal mt-6 rounded border border-hairline bg-card p-4 print:border-0 print:p-0">
          <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
            Community Board {stats.board} · 311 closures, last 12 months
          </p>

          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <p className="font-display text-5xl font-black">{stats.total.toLocaleString()}</p>
              <p className="mt-0.5 text-[13px] text-ink-2">complaints closed</p>
            </div>
            <div>
              <p className="font-display text-5xl font-black" style={{ color: "var(--fixed)" }}>
                {(stats.resolvedShare * 100).toFixed(0)}%
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">verifiably fixed</p>
            </div>
            <div>
              <p className="font-display text-5xl font-black text-cosmetic">
                {(stats.cosmeticShare * 100).toFixed(0)}%
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                closed cosmetically
                <br />
                (citywide: {(stats.cityCosmeticShare * 100).toFixed(0)}% -{" "}
                {delta >= 0 ? `${(delta * 100).toFixed(0)} pts worse` : `${(-delta * 100).toFixed(0)} pts better`})
              </p>
            </div>
          </div>

          <div className="mt-5">
            <OutcomeBar grouped={stats.grouped} height={30} />
          </div>
          <div className="mt-3 print:hidden">
            <OutcomeLegend />
          </div>

          <ul className="mt-4 space-y-2.5 border-t border-dashed border-hairline pt-4">
            {stats.failures.slice(0, 5).map((f, i) => (
              <li key={i} className="grid grid-cols-[7.5rem_1fr] items-start gap-3 sm:grid-cols-[9rem_1fr]">
                <div className="pt-0.5">
                  <Stamp outcome={f.outcome} />
                  <p className="mt-1 font-mono text-[11px] text-ink-3">×{f.n.toLocaleString()}</p>
                </div>
                <p className="pt-0.5 text-[13px] text-ink-2">{f.gloss}</p>
              </li>
            ))}
          </ul>

          {!stats.brief && (
            <button
              onClick={() => lookup(stats.board, true)}
              disabled={briefBusy}
              className="mt-5 rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2 disabled:opacity-40 print:hidden"
            >
              {briefBusy ? "Drafting the brief…" : "Draft the meeting brief"}
            </button>
          )}

          {stats.brief && (
            <div className="mt-6 rounded border-2 border-ink p-4 print:border print:border-ink">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
                  One-page brief · Community Board {stats.board} · prepared{" "}
                  {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <button
                  onClick={() => window.print()}
                  className="rounded border border-hairline px-3 py-1 font-mono text-[12px] hover:border-ink-3 print:hidden"
                >
                  🖨 print
                </button>
              </div>
              <h2 className="mt-3 font-display text-2xl font-black leading-snug">
                {stats.brief.headline}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed">{stats.brief.summary}</p>
              <p className="mt-4 font-mono text-[12px] uppercase tracking-widest text-ink-3">
                Questions for agency representatives
              </p>
              <ol className="mt-2 space-y-2">
                {stats.brief.questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-[14px]">
                    <span className="font-mono font-bold text-ink-3">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-dashed border-hairline pt-3 text-[11px] leading-relaxed text-ink-2">
                Source: NYC Open Data, 311 Service Requests (erm2-nwe9), 12 months ending{" "}
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Outcome
                classes derived by AI classification of the city&apos;s own closure text; full
                methodology and the exact queries at the Case Closed project. &ldquo;Closed
                cosmetically&rdquo; means the ticket ended without the text stating the problem was
                verified fixed.
              </p>
            </div>
          )}

          <div className="mt-4 print:hidden">
            <ReceiptLink url={stats.receiptUrl} />
          </div>
        </section>
      )}
    </main>
  );
}
