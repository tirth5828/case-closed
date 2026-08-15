/**
 * Gate 1, step 2: classify every unique resolution template with Gemini.
 * ~hundreds of templates, batched ~40 per call -> a dictionary that annotates
 * hundreds of thousands of complaints. This is where the AI is load-bearing:
 * no WHERE clause can tell "fixed" from "closed because nobody got inside."
 *
 * Usage: npm run classify
 */
import fs from "node:fs";
import path from "node:path";
import { generateJson, DEFAULT_MODEL } from "../lib/gemini";
import { OUTCOME_CLASSES } from "../lib/types";
import type { OutcomeClass, RawTemplatesFile, TemplateLabel, TemplatesFile } from "../lib/types";

const IN = path.join(process.cwd(), "data", "raw-templates.json");
const OUT = path.join(process.cwd(), "data", "templates.json");
const BATCH = 40;

const CLASS_GUIDE = `
- resolved: the agency states the condition was fixed, corrected, restored, or violations were issued after an inspection confirmed the problem (enforcement counts as action taken).
- no_access: the agency could not get into the apartment/building/location to inspect.
- no_jurisdiction: the agency says this isn't its responsibility / doesn't violate rules it enforces.
- condition_gone: responders arrived and the condition/violators were gone, or observed no violation at that time.
- referred: ticket was handed to another agency or the complainant was told to contact someone else / file elsewhere.
- no_action: closed with explicitly no action taken (e.g. warning only where a fix was requested, "no action necessary", insufficient info to act).
- duplicate: closed as a duplicate of another complaint.
- in_progress: text says work/inspection is still pending, scheduled, or ongoing (not actually a final outcome).
- other: none of the above fits.

Judge ONLY what the text states the agency did, not what you assume happened.
Be strict about "resolved": phone calls where someone said it was fixed, or "attempted to conduct an inspection", are NOT verified fixes — pick the class that matches what actually occurred (condition_gone, no_access, other...).
Tone rule for glosses: neutral and factual — "closed without site access", never "ignored". The villain is a closure code, not a city worker.`;

interface BatchItem {
  id: number;
  outcome: string;
  gloss: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          outcome: { type: "string", enum: OUTCOME_CLASSES },
          gloss: { type: "string", description: "Plain-English, <=12 words, what this closure really means" },
        },
        required: ["id", "outcome", "gloss"],
      },
    },
  },
  required: ["items"],
};

async function main() {
  const raw = JSON.parse(fs.readFileSync(IN, "utf8")) as RawTemplatesFile;
  const texts = raw.types.flatMap((t) => t.templates.map((x) => x.text));

  // Sweep in templates surfaced by the agency league pull, if it has run.
  try {
    const agencies = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "agencies-raw.json"), "utf8"),
    ) as { rows: { text: string; n: number }[] };
    texts.push(...agencies.rows.filter((r) => r.n >= 100).map((r) => r.text));
  } catch {}

  const unique = [...new Set(texts)];
  console.log(`${unique.length} unique templates to classify (batches of ${BATCH})...`);

  // Resume support: keep labels from a previous partial run.
  let labels: Record<string, TemplateLabel> = {};
  try {
    labels = (JSON.parse(fs.readFileSync(OUT, "utf8")) as TemplatesFile).labels;
  } catch {}
  const todo = unique.filter((t) => !labels[t]);
  console.log(`${todo.length} not yet labeled.`);

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const numbered = batch.map((t, j) => `[${j}] ${t}`).join("\n\n");
    const prompt = `You are classifying the OUTCOME of closed NYC 311 complaints from the resolution text the city attached to them.

Classes:${CLASS_GUIDE}

For each numbered template below, return its id, outcome class, and a short plain-English gloss of what this closure really means for the person who complained.

${numbered}`;

    const res = await generateJson<{ items: BatchItem[] }>(prompt, RESPONSE_SCHEMA);
    for (const item of res.items) {
      const text = batch[item.id];
      if (text === undefined) continue;
      labels[text] = { outcome: item.outcome as OutcomeClass, gloss: item.gloss };
    }
    const out: TemplatesFile = { classifiedAt: new Date().toISOString(), model: DEFAULT_MODEL, labels };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(todo.length / BATCH)} done (${Object.keys(labels).length} labeled)`);
  }

  const missing = unique.filter((t) => !labels[t]);
  console.log(`\nWrote ${OUT}. ${Object.keys(labels).length} labeled, ${missing.length} missing.`);
  if (missing.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
