"use client";

import { useMemo, useState } from "react";
import OutcomeBar from "./OutcomeBar";
import Stamp from "./Stamp";
import ReceiptLink from "./ReceiptLink";
import type { Grouped } from "@/lib/honesty";
import type { OutcomeClass } from "@/lib/types";

export interface IndexTemplate {
  n: number;
  text: string;
  outcome: OutcomeClass | "unknown";
  gloss: string;
}

export interface IndexBorough {
  name: string;
  grouped: Grouped;
  cosmeticShare: number;
}

export interface IndexRow {
  complaint_type: string;
  total: number;
  grouped: Grouped;
  cosmeticShare: number;
  receiptUrl: string;
  templates: IndexTemplate[];
  /** Optional — present once the borough pipeline has run. */
  boroughs?: IndexBorough[];
}

type SortKey = "impact" | "share" | "volume";

const SORTS: { key: SortKey; label: string; fn: (a: IndexRow, b: IndexRow) => number }[] = [
  { key: "impact", label: "impact", fn: (a, b) => b.cosmeticShare * b.total - a.cosmeticShare * a.total },
  { key: "share", label: "worst %", fn: (a, b) => b.cosmeticShare - a.cosmeticShare },
  { key: "volume", label: "volume", fn: (a, b) => b.total - a.total },
];

export function SortToggle<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div className="flex items-center gap-1 font-mono text-[11px] text-ink-3">
      <span className="mr-0.5">sort:</span>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`cursor-pointer rounded border px-1.5 py-0.5 ${
            value === o.key
              ? "border-ink bg-ink text-paper"
              : "border-hairline text-ink-2 hover:border-ink-3"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MoreButton({
  showAll,
  onToggle,
  hiddenCount,
}: {
  showAll: boolean;
  onToggle: () => void;
  hiddenCount: number;
}) {
  return (
    <div className="mt-2 flex justify-end">
      <button
        onClick={onToggle}
        className="cursor-pointer font-mono text-[12px] text-receipt underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {showAll ? "less ↑" : `more (${hiddenCount}) ↓`}
      </button>
    </div>
  );
}

const INITIAL_ROWS = 8;

export default function HonestyIndex({ rows }: { rows: IndexRow[] }) {
  const [openType, setOpenType] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("impact");
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...rows].sort(SORTS.find((s) => s.key === sortKey)!.fn),
    [rows, sortKey],
  );
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_ROWS);

  return (
    <>
      <div className="mt-4 flex justify-end">
        <SortToggle options={SORTS} value={sortKey} onChange={setSortKey} />
      </div>
      <div className="mt-2 divide-y divide-hairline border-y border-hairline">
        {visible.map((row) => {
        const open = openType === row.complaint_type;
        return (
          <div key={row.complaint_type}>
            <button
              onClick={() => setOpenType(open ? null : row.complaint_type)}
              aria-expanded={open}
              className="grid w-full cursor-pointer grid-cols-[minmax(6.5rem,9rem)_1fr_3.5rem] items-center gap-3 py-3 text-left hover:bg-card sm:grid-cols-[14rem_1fr_5.5rem] sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{row.complaint_type}</p>
                <p className="font-mono text-[11px] text-ink-3">{row.total.toLocaleString()}</p>
              </div>
              <OutcomeBar grouped={row.grouped} />
              <p className="text-right font-mono text-[13px] font-semibold text-cosmetic">
                {(row.cosmeticShare * 100).toFixed(0)}%
                <span className="block text-[10px] font-normal text-ink-3">cosmetic</span>
              </p>
            </button>

            {open && (
              <div className="border-t border-dashed border-hairline bg-card px-2 py-4 sm:px-4">
                <p className="mb-3 text-[13px] text-ink-2">
                  The closure language behind the bar — what the city actually wrote, and what it
                  means:
                </p>
                <ul className="space-y-2.5">
                  {row.templates.map((t) => (
                    <li key={t.text} className="grid grid-cols-[7.5rem_1fr] items-start gap-3 sm:grid-cols-[9rem_1fr]">
                      <div className="pt-0.5">
                        <Stamp outcome={t.outcome} />
                        <p className="mt-1 font-mono text-[11px] text-ink-3">
                          ×{t.n.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{t.gloss}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-2">
                          &ldquo;{t.text}&rdquo;
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {row.boroughs && row.boroughs.length > 0 && (
                  <div className="mt-5 border-t border-dashed border-hairline pt-4">
                    <p className="mb-3 text-[13px] text-ink-2">
                      The gap isn&apos;t evenly distributed — same complaint, five different
                      cities:
                    </p>
                    <ul className="space-y-2">
                      {row.boroughs.map((b) => (
                        <li
                          key={b.name}
                          className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[9rem_1fr_4rem]"
                        >
                          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-2">
                            {b.name}
                          </p>
                          <OutcomeBar grouped={b.grouped} height={14} showLabels={false} />
                          <p className="text-right font-mono text-[12px] font-semibold text-cosmetic">
                            {(b.cosmeticShare * 100).toFixed(0)}%
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4">
                  <ReceiptLink url={row.receiptUrl} />
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
      {rows.length > INITIAL_ROWS && (
        <MoreButton
          showAll={showAll}
          onToggle={() => setShowAll(!showAll)}
          hiddenCount={rows.length - INITIAL_ROWS}
        />
      )}
    </>
  );
}
