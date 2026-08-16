import { generateJson } from "@/lib/gemini";

interface TemplateSummary {
  n: number;
  outcome: string;
  gloss: string;
  text: string;
}

/**
 * The playbook's payoff: ready-to-paste complaint text engineered against
 * the specific failure modes observed in the closure data.
 */
export async function POST(request: Request) {
  const { problem, complaint_type, descriptor, templates, photo_details } = (await request.json()) as {
    problem?: string;
    complaint_type?: string;
    descriptor?: string;
    templates?: TemplateSummary[];
    photo_details?: string;
  };
  if (!problem || !complaint_type) {
    return Response.json({ error: "problem and complaint_type required" }, { status: 400 });
  }

  const schema = {
    type: "object",
    properties: {
      letter: {
        type: "string",
        description:
          "The complaint text, 90-140 words, first person, plain English. Use [SQUARE BRACKET] placeholders for anything personal (address, apartment, buzzer, phone, availability).",
      },
      why: {
        type: "array",
        items: { type: "string" },
        description: "2-3 bullets, each <=15 words: which failure mode a specific line of the letter counters",
      },
    },
    required: ["letter", "why"],
  };

  const failures = (templates ?? [])
    .filter((t) => t.outcome !== "resolved")
    .slice(0, 6)
    .map((t) => `- [${t.outcome}] x${t.n.toLocaleString()}: ${t.gloss}`)
    .join("\n");

  const prompt = `Write the text a New Yorker should paste into a NYC 311 complaint form.

Their problem, in their words: "${problem.slice(0, 400)}"
Official filing: ${complaint_type}${descriptor ? ` - ${descriptor}` : ""}.
${photo_details ? `Evidence visible in their photo (weave these specifics into the letter, and mention a photo is attached to the complaint): ${photo_details.slice(0, 400)}` : ""}

These are the ways complaints like theirs actually die (from the city's own closure records):
${failures || "- no failure data available"}

Engineer the letter to pre-empt those specific failure modes: if complaints die from "no access", include availability and access details; if they die from "condition gone on arrival", establish that the condition is persistent/recurring with specific times; if they die from vague reports, make the location and subject unmistakable. Use [PLACEHOLDERS] for personal details. First person, factual, respectful, no legal threats, no accusations against city workers.`;

  try {
    const result = await generateJson<{ letter: string; why: string[] }>(prompt, schema);
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: `Letter generation failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
