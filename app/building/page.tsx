"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import OutcomeBar, { OutcomeLegend } from "@/components/OutcomeBar";
import Stamp from "@/components/Stamp";
import ReceiptLink from "@/components/ReceiptLink";
import type { Grouped } from "@/lib/honesty";
import type { OutcomeClass } from "@/lib/types";

interface BuildingResult {
  address: string;
  total: number;
  since: string;
  grouped: Grouped;
  resolvedShare: number;
  cosmeticShare: number;
  types: { complaint_type: string; total: number; grouped: Grouped; cosmeticShare: number }[];
  topSentence: { text: string; n: number; outcome: OutcomeClass | "unknown"; gloss: string } | null;
  receiptUrl: string;
  fromCache: boolean;
}

export default function BuildingPage() {
  return (
    <Suspense>
      <BuildingLookup />
    </Suspense>
  );
}

function BuildingLookup() {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildingResult | null>(null);
  const [suggestions, setSuggestions] = useState<{ address: string; borough?: string; n?: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const searchParams = useSearchParams();
  const autoRan = useRef(false);
  const lastPicked = useRef<string | null>(null);
  const suggestSeq = useRef(0);

  const run = useCallback(async (addr: string) => {
    if (!addr.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/building", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `lookup failed (${res.status})`);
      setResult(data as BuildingResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // Arriving from a leaderboard link (?address=...) opens the file immediately.
  useEffect(() => {
    const fromUrl = searchParams.get("address");
    if (fromUrl && !autoRan.current) {
      autoRan.current = true;
      lastPicked.current = fromUrl;
      setAddress(fromUrl);
      void run(fromUrl);
    }
  }, [searchParams, run]);

  // Typeahead against the addresses the city actually writes, so "125 110 st"
  // still finds "125 WEST 110 STREET".
  useEffect(() => {
    if (address === lastPicked.current) return; // picked/auto-set, not typed
    const q = address.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const id = ++suggestSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/building/suggest?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as {
          suggestions?: { address: string; borough?: string; n?: number }[];
        };
        if (suggestSeq.current !== id) return; // a newer keystroke owns the dropdown
        setSuggestions(data.suggestions ?? []);
        setShowSuggestions((data.suggestions ?? []).length > 0);
        setHighlight(-1);
      } catch {
        /* typeahead is best-effort; plain lookup still works */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [address]);

  const pick = useCallback(
    (addr: string) => {
      lastPicked.current = addr;
      setAddress(addr);
      setShowSuggestions(false);
      void run(addr);
    },
    [run],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24">
      <header className="pt-10">
        <h1 className="font-display text-4xl font-black uppercase leading-tight">
          Your building&apos;s record
        </h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Every 311 complaint filed from one address in the last five years, and how each one
          really ended. Check where you live — or where you&apos;re about to sign a lease.
        </p>
      </header>

      <section className="mt-8 rounded border border-hairline bg-card p-4">
        <label htmlFor="address" className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
          Street address
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <div className="relative min-w-64 flex-1">
            <input
              id="address"
              value={address}
              autoComplete="off"
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => setShowSuggestions(false)}
              onKeyDown={(e) => {
                if (showSuggestions && e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => (h + 1) % suggestions.length);
                } else if (showSuggestions && e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                } else if (e.key === "Enter") {
                  if (showSuggestions && highlight >= 0) pick(suggestions[highlight].address);
                  else {
                    setShowSuggestions(false);
                    void run(address);
                  }
                }
              }}
              placeholder="100 GOLD STREET"
              className="w-full rounded border border-hairline bg-paper px-3 py-2 font-mono text-[15px] uppercase outline-none focus:border-ink-3"
            />
            {showSuggestions && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded border border-hairline bg-card shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={`${s.address}|${s.borough ?? ""}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // fire before the input's blur closes the list
                        pick(s.address);
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left font-mono text-[13px] uppercase ${
                        i === highlight ? "bg-paper" : ""
                      }`}
                    >
                      <span className="truncate">{s.address}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">
                        {s.n != null ? `×${s.n.toLocaleString()}` : (s.borough ?? "")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => run(address)}
            disabled={busy || !address.trim()}
            className="rounded bg-ink px-5 py-2 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Pulling the file…" : "Open the file"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded border border-cosmetic/40 bg-paper p-3 text-[13px] text-cosmetic">
            {error}
          </p>
        )}
      </section>

      {result && (
        <>
          <section className="reveal mt-6 rounded border border-hairline bg-card p-4">
            <p className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
              The file on {result.address}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
              <div>
                <p className="font-display text-5xl font-black">{result.total.toLocaleString()}</p>
                <p className="mt-0.5 text-[13px] text-ink-2">complaints in five years</p>
              </div>
              <div>
                <p className="font-display text-5xl font-black" style={{ color: "var(--fixed)" }}>
                  {(result.resolvedShare * 100).toFixed(0)}%
                </p>
                <p className="mt-0.5 text-[13px] text-ink-2">verifiably fixed</p>
              </div>
              <div>
                <p className="font-display text-5xl font-black text-cosmetic">
                  {(result.cosmeticShare * 100).toFixed(0)}%
                </p>
                <p className="mt-0.5 text-[13px] text-ink-2">closed cosmetically</p>
              </div>
            </div>
            <div className="mt-5">
              <OutcomeBar grouped={result.grouped} height={30} />
            </div>
            <div className="mt-3">
              <OutcomeLegend />
            </div>

            {result.topSentence && (
              <div className="mt-4 border-t border-dashed border-hairline pt-4">
                <p className="text-[13px] text-ink-2">
                  The sentence this building hears most (&times;{result.topSentence.n.toLocaleString()}):
                </p>
                <blockquote className="mt-2 border-l-2 pl-3" style={{ borderColor: "var(--stamp)" }}>
                  <p className="text-[14px] leading-relaxed">&ldquo;{result.topSentence.text}&rdquo;</p>
                </blockquote>
                <div className="mt-2">
                  <Stamp outcome={result.topSentence.outcome} />
                </div>
              </div>
            )}

            <ul className="mt-4 space-y-2 border-t border-dashed border-hairline pt-4">
              {result.types.map((t) => (
                <li
                  key={t.complaint_type}
                  className="grid grid-cols-[minmax(8rem,12rem)_1fr_3.5rem] items-center gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{t.complaint_type}</p>
                    <p className="font-mono text-[11px] text-ink-3">×{t.total.toLocaleString()}</p>
                  </div>
                  <OutcomeBar grouped={t.grouped} height={14} showLabels={false} />
                  <p className="text-right font-mono text-[12px] font-semibold text-cosmetic">
                    {(t.cosmeticShare * 100).toFixed(0)}%
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <ReceiptLink url={result.receiptUrl} fromCache={result.fromCache} />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
