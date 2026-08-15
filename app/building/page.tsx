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
  const searchParams = useSearchParams();
  const autoRan = useRef(false);

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
      setAddress(fromUrl);
      void run(fromUrl);
    }
  }, [searchParams, run]);

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
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(address)}
            placeholder="100 GOLD STREET"
            className="min-w-64 flex-1 rounded border border-hairline bg-paper px-3 py-2 font-mono text-[15px] uppercase outline-none focus:border-ink-3"
          />
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
