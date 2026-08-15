"use client";

import { useMemo, useState } from "react";
import OutcomeBar from "./OutcomeBar";
import { MoreButton, SortToggle } from "./HonestyIndex";
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

type AgencySortKey = "share" | "volume";

const AGENCY_SORTS: { key: AgencySortKey; label: string; fn: (a: AgencyRow, b: AgencyRow) => number }[] = [
  { key: "share", label: "worst %", fn: (a, b) => b.cosmeticShare - a.cosmeticShare },
  { key: "volume", label: "volume", fn: (a, b) => b.total - a.total },
];

const INITIAL_AGENCIES = 6;

/** Expandable agency rows: click a department to read how it ends complaints. */
export default function AgencyLeague({ rows }: { rows: AgencyRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<AgencySortKey>("share");
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...rows].sort(AGENCY_SORTS.find((s) => s.key === sortKey)!.fn),
    [rows, sortKey],
  );
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_AGENCIES);

  return (
    <>
    <div className="mt-4 flex justify-end">
      <SortToggle options={AGENCY_SORTS} value={sortKey} onChange={setSortKey} />
    </div>
    <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
      {visible.map((a) => (
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
    {rows.length > INITIAL_AGENCIES && (
      <MoreButton
        showAll={showAll}
        onToggle={() => setShowAll(!showAll)}
        hiddenCount={rows.length - INITIAL_AGENCIES}
      />
    )}
    </>
  );
}
