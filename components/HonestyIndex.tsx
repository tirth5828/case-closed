"use client";

import { useState } from "react";
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

export default function HonestyIndex({ rows }: { rows: IndexRow[] }) {
  const [openType, setOpenType] = useState<string | null>(null);

  return (
    <div className="mt-6 divide-y divide-hairline border-y border-hairline">
      {rows.map((row) => {
        const open = openType === row.complaint_type;
        return (
          <div key={row.complaint_type}>
            <button
              onClick={() => setOpenType(open ? null : row.complaint_type)}
              aria-expanded={open}
              className="grid w-full cursor-pointer grid-cols-[minmax(9rem,14rem)_1fr_4.5rem] items-center gap-4 py-3 text-left hover:bg-card sm:grid-cols-[14rem_1fr_5.5rem]"
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
  );
}
