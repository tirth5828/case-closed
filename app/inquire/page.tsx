"use client";

import { useState } from "react";
import ReceiptLink from "@/components/ReceiptLink";

interface Plan {
  select: string;
  where: string;
  group: string;
  order: string;
  limit: number;
  explanation: string;
}

interface InquireResult {
  question: string;
  plan: Plan;
  rows: Record<string, string>[];
  answer: string;
  receiptUrl: string;
  fromCache: boolean;
  attempts: number;
}

const EXAMPLES = [
  "Which ZIP code had the most rat sightings this year?",
  "How many heat complaints came in last December vs this January?",
  "What hour of the day do noise complaints peak?",
  "Which borough files the most complaints per day?",
];

export default function InquirePage() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InquireResult | null>(null);

  async function run(q?: string) {
    const asked = (q ?? question).trim();
    if (!asked) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `inquiry failed (${res.status})`);
      setResult(data as InquireResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const columns = result?.rows.length ? Object.keys(result.rows[0]) : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24">
      <header className="pt-10">
        <h1 className="font-display text-4xl font-black uppercase leading-tight">Ask the record</h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Ask anything about NYC&apos;s 40 million 311 complaints. The AI doesn&apos;t answer from
          memory — it writes the database query itself, runs it against NYC Open Data live, and
          shows you the query as its receipt.
        </p>
      </header>

      <section className="mt-8 rounded border border-hairline bg-card p-4">
        <label htmlFor="question" className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
          Your inquiry
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Which block gets the most noise complaints?"
            className="min-w-64 flex-1 rounded border border-hairline bg-paper px-3 py-2 text-[15px] outline-none focus:border-ink-3"
          />
          <button
            onClick={() => run()}
            disabled={busy || !question.trim()}
            className="rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Consulting…" : "Pull the file"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuestion(ex);
                void run(ex);
              }}
              className="cursor-pointer rounded-full border border-hairline bg-paper px-2.5 py-1 text-[12px] text-ink-2 hover:border-ink-3 hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
        {busy && (
          <p className="mt-3 font-mono text-[12px] text-ink-3" aria-live="polite">
            drafting the query → running it against data.cityofnewyork.us…
          </p>
        )}
        {error && (
          <p className="mt-3 rounded border border-cosmetic/40 bg-paper p-3 text-[13px] text-cosmetic">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="reveal mt-6 rounded border border-hairline bg-card p-4">
          <p className="text-[17px] leading-relaxed">{result.answer}</p>

          <div className="mt-4 rounded border border-dashed border-hairline bg-paper p-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
              The query the model wrote — {result.plan.explanation}
              {result.attempts > 1 && " · self-corrected after a rejection"}
            </p>
            <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-relaxed text-ink">
              {`SELECT ${result.plan.select}` +
                (result.plan.where ? `\nWHERE  ${result.plan.where}` : "") +
                (result.plan.group ? `\nGROUP  ${result.plan.group}` : "") +
                (result.plan.order ? `\nORDER  ${result.plan.order}` : "") +
                `\nLIMIT  ${result.plan.limit}`}
            </pre>
          </div>

          {result.rows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[12px]">
                <thead>
                  <tr className="border-b border-hairline text-left text-ink-3">
                    {columns.map((c) => (
                      <th key={c} className="py-1.5 pr-4 font-normal uppercase tracking-wide">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 12).map((r, i) => (
                    <tr key={i} className="border-b border-hairline/60">
                      {columns.map((c) => (
                        <td key={c} className="py-1.5 pr-4">
                          {/* Don't comma-format identifiers: ZIPs, keys, dates. */}
                          {isNaN(Number(r[c])) || /zip|key|date|board/i.test(c)
                            ? r[c]
                            : Number(r[c]).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 12 && (
                <p className="mt-1 font-mono text-[11px] text-ink-3">
                  + {result.rows.length - 12} more rows in the receipt
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <ReceiptLink url={result.receiptUrl} fromCache={result.fromCache} />
          </div>
        </section>
      )}
    </main>
  );
}
