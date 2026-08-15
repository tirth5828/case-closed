import { generateJson } from "@/lib/gemini";
import { loadLabels, loadRawTemplates } from "@/lib/data";
import { OUTCOME_CLASSES } from "@/lib/types";
import type { OutcomeClass } from "@/lib/types";

/** Static, tone-checked next steps per outcome class — instant for dictionary hits. */
const NEXT_STEPS: Record<string, string> = {
  resolved:
    "If the problem is actually fixed, you're done. If it isn't, file again and say the prior complaint was closed as resolved while the condition continued.",
  no_access:
    "The case died at your door. Refile, and this time include availability windows, a buzzer or unit number, and a phone number you'll answer — then respond fast to any card or letter.",
  no_jurisdiction:
    "It went to the wrong desk. Refile through our Ask page so it maps to the right agency and complaint type the first time.",
  condition_gone:
    "It was gone when they looked. If it recurs, refile and say it's recurring, with the times it happens — that changes how it's handled.",
  referred:
    "It was handed off, and handoffs are where complaints vanish. Note the agency it went to, and follow up with that agency directly, citing your complaint number.",
  no_action:
    "It was received and closed with no action. Refile with more specifics — exact location, dates, photos if the portal allows — so 'no action necessary' is harder to write.",
  duplicate:
    "Someone else's complaint absorbed yours — the underlying case may still be open. Keep your complaint number and check the original's status; refile if the condition persists.",
  in_progress:
    "This one isn't over: work is still pending. Keep the complaint number and check back; escalate if nothing changes in the stated timeframe.",
  other:
    "This closure doesn't say what actually happened. Keep your complaint number and refile if the condition persists, stating that the prior closure did not resolve it.",
};

/**
 * The Translator: paste the closure text the city sent you, get the honest
 * verdict. Exact dictionary hits are instant (and carry their citywide
 * count); unknown wordings are classified live.
 */
export async function POST(request: Request) {
  const { text } = (await request.json()) as { text?: string };
  const clean = text?.trim().replace(/\s+/g, " ");
  if (!clean || clean.length < 20) {
    return Response.json({ error: "Paste the full closure text — the whole paragraph." }, { status: 400 });
  }

  const { labels } = loadLabels();

  // Exact match first; then containment (people often paste with extra header text).
  let matched = labels[clean] ? clean : undefined;
  if (!matched) {
    matched = Object.keys(labels).find((t) => clean.includes(t) || t.includes(clean));
  }

  if (matched) {
    const label = labels[matched];
    // How many New Yorkers got this exact sentence in the last 12 months.
    const raw = loadRawTemplates();
    let count = 0;
    for (const t of raw.types) for (const x of t.templates) if (x.text === matched) count += x.n;
    return Response.json({
      outcome: label.outcome,
      gloss: label.gloss,
      next: NEXT_STEPS[label.outcome] ?? NEXT_STEPS["other"],
      matched: true,
      count: count || undefined,
    });
  }

  // Unknown wording -> live classification.
  const schema = {
    type: "object",
    properties: {
      outcome: { type: "string", enum: OUTCOME_CLASSES },
      gloss: { type: "string", description: "Plain-English, <=14 words: what this closure really means for the complainant" },
    },
    required: ["outcome", "gloss"],
  };
  try {
    const result = await generateJson<{ outcome: OutcomeClass; gloss: string }>(
      `Classify the OUTCOME of this closed NYC 311 complaint from the resolution text the city attached. Judge only what the text states the agency did. Be strict about "resolved": phone confirmations and attempted inspections are not verified fixes.

Classes: resolved (condition verifiably fixed or enforcement taken), no_access (couldn't get in to inspect), no_jurisdiction (not this agency's responsibility), condition_gone (nothing observed on arrival), referred (handed to another agency/person), no_action (closed with explicitly no action), duplicate (duplicate of another complaint), in_progress (work still pending), other.

Text: "${clean.slice(0, 800)}"`,
      schema,
    );
    return Response.json({
      ...result,
      next: NEXT_STEPS[result.outcome] ?? NEXT_STEPS["other"],
      matched: false,
    });
  } catch (e) {
    return Response.json(
      { error: `Translation failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
