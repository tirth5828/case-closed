import type { OutcomeClass } from "@/lib/types";

const STAMP_TEXT: Record<string, string> = {
  resolved: "VERIFIED FIXED",
  no_access: "NO ACCESS",
  no_jurisdiction: "NOT OUR DESK",
  condition_gone: "GONE ON ARRIVAL",
  referred: "REFERRED",
  no_action: "NO ACTION",
  duplicate: "DUPLICATE",
  in_progress: "STILL PENDING",
  other: "OTHER",
  unknown: "UNCLASSIFIED",
};

const STAMP_COLOR: Record<string, string> = {
  resolved: "var(--fixed)",
  no_access: "var(--cosmetic)",
  no_jurisdiction: "var(--cosmetic)",
  condition_gone: "var(--cosmetic)",
  referred: "var(--cosmetic)",
  no_action: "var(--cosmetic)",
  duplicate: "var(--ink-3)",
  in_progress: "var(--ink-3)",
  other: "var(--ink-3)",
  unknown: "var(--ink-3)",
};

/** A clerk's stamp for an outcome class - the app's recurring signature. */
export default function Stamp({
  outcome,
  flat = false,
  className = "",
}: {
  outcome: OutcomeClass | "unknown";
  flat?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`stamp ${flat ? "stamp-flat" : ""} text-[11px] font-bold whitespace-nowrap ${className}`}
      style={{ color: STAMP_COLOR[outcome] ?? "var(--ink-3)" }}
    >
      {STAMP_TEXT[outcome] ?? outcome}
    </span>
  );
}
