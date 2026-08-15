"use client";

import type { Grouped } from "@/lib/honesty";

/**
 * The three-segment outcome bar: verified fixed / cosmetic closure / neutral.
 * 2px surface gaps between segments, rounded ends, direct labels when a
 * segment is wide enough to hold one.
 */
export default function OutcomeBar({
  grouped,
  height = 22,
  showLabels = true,
}: {
  grouped: Grouped;
  height?: number;
  showLabels?: boolean;
}) {
  const { verified, cosmetic, neutral, total } = grouped;
  if (total === 0) return null;
  const segs = [
    { key: "fixed", n: verified, color: "var(--fixed)", label: "verified fixed" },
    { key: "cosmetic", n: cosmetic, color: "var(--cosmetic)", label: "cosmetic closure" },
    { key: "neutral", n: neutral, color: "var(--neutral)", label: "duplicate / pending / unclear" },
  ].filter((s) => s.n > 0);

  return (
    <div
      className="flex w-full gap-[2px]"
      role="img"
      aria-label={segs.map((s) => `${s.label} ${((s.n / total) * 100).toFixed(0)}%`).join(", ")}
    >
      {segs.map((s) => {
        const pct = (s.n / total) * 100;
        return (
          <div
            key={s.key}
            className="relative flex items-center justify-center first:rounded-l first:rounded-r-none last:rounded-r only:rounded rounded-none"
            style={{ width: `${pct}%`, height, background: s.color, borderRadius: 4 }}
            title={`${s.label}: ${s.n.toLocaleString()} (${pct.toFixed(1)}%)`}
          >
            {showLabels && pct >= 12 && (
              <span className="font-mono text-[11px] font-medium text-white select-none">
                {pct.toFixed(0)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OutcomeLegend() {
  const items = [
    { color: "var(--fixed)", label: "Verified fixed" },
    { color: "var(--cosmetic)", label: "Cosmetic closure" },
    { color: "var(--neutral)", label: "Duplicate / pending / unclear" },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
