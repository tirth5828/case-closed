"use client";

import { useState } from "react";
import OutcomeBar from "./OutcomeBar";
import Stamp from "./Stamp";
import type { Grouped } from "@/lib/honesty";
import type { OutcomeClass } from "@/lib/types";

export interface AgencyRow {
  agency: string;
  total: number;
  grouped: Grouped;
  cosmeticShare: number;
  templates: { n: number; gloss: string; outcome: OutcomeClass | "unknown" }[];
}

/** Expandable agency rows: click a department to read how it ends complaints. */
export default function AgencyLeague({ rows }: { rows: AgencyRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="mt-5 divide-y divide-hairline border-y border-hairline">
      {rows.map((a) => (
        <li key={a.agency}>
          <button
            onClick={() => setOpen(open === a.agency ? null : a.agency)}
            aria-expanded={open === a.agency}
            className="grid w-full cursor-pointer grid-cols-[minmax(6rem,8rem)_1fr_4rem] items-center gap-4 py-2.5 text-left hover:bg-card"
          >
            <div>
              <p className="font-mono text-[13px] font-semibold">{a.agency}</p>
              <p className="font-mono text-[11px] text-ink-3">{a.total.toLocaleString()}</p>
            </div>
            <OutcomeBar grouped={a.grouped} height={16} showLabels={false} />
            <p className="text-right font-mono text-[13px] font-semibold text-cosmetic">
              {(a.cosmeticShare * 100).toFixed(0)}%
            </p>
          </button>
          {open === a.agency && (
            <ul className="space-y-2 border-t border-dashed border-hairline bg-card px-2 py-3 sm:px-4">
              {a.templates.map((t, i) => (
                <li key={i} className="grid grid-cols-[7.5rem_1fr] items-start gap-3 sm:grid-cols-[9rem_1fr]">
                  <div className="pt-0.5">
                    <Stamp outcome={t.outcome} />
                    <p className="mt-1 font-mono text-[11px] text-ink-3">×{t.n.toLocaleString()}</p>
                  </div>
                  <p className="pt-0.5 text-[13px] text-ink-2">{t.gloss}</p>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
