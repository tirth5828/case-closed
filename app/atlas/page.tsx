import { loadLabels, loadRawTemplates } from "@/lib/data";
import AtlasSections from "@/components/AtlasSections";
import Translator from "@/components/Translator";
import { OUTCOME_CLASSES } from "@/lib/types";
import type { OutcomeClass } from "@/lib/types";

export const dynamic = "force-dynamic";

const SECTION_ORDER: OutcomeClass[] = [
  "no_access",
  "condition_gone",
  "no_jurisdiction",
  "referred",
  "no_action",
  "duplicate",
  "in_progress",
  "other",
  "resolved",
];

const SECTION_INTRO: Record<string, string> = {
  no_access: "The ticket ended because nobody could get in.",
  condition_gone: "By the time anyone looked, there was nothing to see.",
  no_jurisdiction: "Filed with the wrong agency — the complaint dies at the desk.",
  referred: "Handed to someone else. The trail usually ends here.",
  no_action: "Received, reviewed, and closed with explicitly no action.",
  duplicate: "Someone else already reported it — this copy is discarded.",
  in_progress: "Not actually an outcome: the text says work is still pending.",
  other: "Closures too ambiguous to call either way.",
  resolved: "The ones where the text says the problem was actually addressed.",
};

interface AtlasEntry {
  text: string;
  gloss: string;
  outcome: OutcomeClass;
  n: number;
  types: string[];
}

export default function Atlas() {
  const raw = loadRawTemplates();
  const { labels } = loadLabels();

  // A template can appear under several complaint types; merge counts.
  const merged = new Map<string, AtlasEntry>();
  for (const t of raw.types) {
    for (const tpl of t.templates) {
      const label = labels[tpl.text];
      if (!label) continue;
      const cur = merged.get(tpl.text);
      if (cur) {
        cur.n += tpl.n;
        cur.types.push(t.complaint_type);
      } else {
        merged.set(tpl.text, {
          text: tpl.text,
          gloss: label.gloss,
          outcome: label.outcome,
          n: tpl.n,
          types: [t.complaint_type],
        });
      }
    }
  }
  const entries = [...merged.values()];
  const grand = entries.reduce((s, e) => s + e.n, 0);

  const sections = SECTION_ORDER.filter((o) => OUTCOME_CLASSES.includes(o))
    .map((outcome) => ({
      outcome,
      items: entries.filter((e) => e.outcome === outcome).sort((a, b) => b.n - a.n),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24">
      <header className="border-b border-hairline pt-10 pb-8">
        <h1 className="font-display text-4xl font-black uppercase leading-tight">
          The Template Atlas
        </h1>
        <p className="mt-3 max-w-xl text-ink-2">
          {grand.toLocaleString()} complaint outcomes, written in {entries.length} sentences. This
          is the complete vocabulary NYC uses to close a 311 ticket — every template, what it
          really means, and how many New Yorkers received it this year.
        </p>
      </header>

      <Translator />

      <AtlasSections
        grand={grand}
        sections={sections.map((s) => ({
          outcome: s.outcome,
          intro: SECTION_INTRO[s.outcome] ?? "",
          items: s.items,
        }))}
      />

      <footer className="mt-16 border-t border-hairline pt-6 text-[13px] text-ink-2">
        <p>
          Templates pulled from NYC Open Data (erm2-nwe9) by grouping the top 15 complaint types
          (last 12 months) on their resolution text; classified once each by Gemini. Counts are
          complaints bearing that exact text.
        </p>
      </footer>
    </main>
  );
}
