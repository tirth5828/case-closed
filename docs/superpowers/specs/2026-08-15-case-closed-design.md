# Case Closed? — Design Spec

*Built for NYC: AI Hackathon (NYPL × MLH), Aug 15–16 2026. Submission deadline: 2:00 PM Sunday.*

## One-liner

NYC closes essentially every 311 complaint — but "closed" is a status code, not an outcome. Case Closed? reads the free-text resolution descriptions the city attaches to millions of tickets and builds the first honest map of what actually happens after New Yorkers ask their city for help.

## The insight

The `Resolution Description` field in the 311 dataset (`erm2-nwe9`) says things like *"unable to gain access to the location"*, *"does not fall under the jurisdiction of this agency"*, *"those responsible for the condition were gone."* Every one is a **closed ticket and an unfixed problem**, and nothing on any city portal distinguishes the two.

The text is heavily templated: grouping server-side by `resolution_description` collapses millions of rows into a few hundred distinct templates **with row counts attached for free**. Classifying ~hundreds of templates with an LLM (~tens of calls) annotates hundreds of thousands of rows with a real outcome.

**The AI is load-bearing twice — delete it and the project vanishes:**
1. Template → outcome classification (no `WHERE` clause can do it).
2. Plain-English problem → the city's 460-type complaint taxonomy (the only thing standing between a resident and their own data).

## The app — three acts

| Act | Screen | What happens |
|---|---|---|
| 1. The Reveal | `/` | The **Honesty Index**: complaint types ranked by what "closed" really meant — resolved vs. closed-without-access vs. bounced-between-agencies. A chart that has never existed. |
| 2. Your Block | `/ask` | Type your problem in plain English → **live Gemini** maps it into the official taxonomy → **live Socrata** pulls identical complaints near your ZIP → honest outcome breakdown via the template dictionary. |
| 3. The Playbook | `/ask` (panel) | **Live Gemini** reads the failure templates + stats for that complaint type and writes concrete advice for landing in the resolved cohort. |

The hero complaint type for the demo is **picked empirically** by the pipeline (largest honesty gap × volume), not assumed.

## Architecture (Approach C — hybrid, approved)

Precompute what's expensive and stable; run live what impresses.

- **Precomputed (offline pipeline, rerun Sunday morning):** the template→outcome dictionary and citywide/borough aggregates.
- **Live on stage:** Act 2 taxonomy mapping (Gemini), Act 2 nearby-complaints query (Socrata), Act 3 playbook (Gemini).
- **Cached fallback:** every Socrata response is written to disk; on network failure the cache serves silently with a "cached" badge. The demo survives dead wifi.

### Offline pipeline (`scripts/`)

1. **`pull-templates`** — top ~15 complaint types by 12-month volume, then per type: `SELECT resolution_description, count(unique_key) GROUP BY resolution_description` (server-side SoQL). Output: `data/raw-templates.json`.
2. **`classify-templates`** — Gemini labels each template with an outcome class + one-line plain-English gloss. Classes: `resolved | no_access | no_jurisdiction | condition_gone | referred | no_action | duplicate | other`. Output: `data/templates.json`.
3. **`aggregate`** — join counts × classes → per-type and per-borough honesty stats; print hero-type ranking. Output: `data/honesty.json`.

### App (Next.js, App Router, TypeScript, Tailwind)

- `app/page.tsx` — Honesty Index (Act 1). Reads `data/honesty.json`.
- `app/ask/page.tsx` — Acts 2 + 3.
- `app/api/ask/route.ts` — Gemini: free text → `{complaint_type, descriptor?, agency}` constrained to the real taxonomy (list shipped from pipeline data).
- `app/api/nearby/route.ts` — Socrata query with **zero-row fallback chain**: descriptor+ZIP → complaint_type+ZIP → complaint_type citywide. A blank screen is impossible.
- `app/api/playbook/route.ts` — Gemini: failure templates + stats → advice.
- All keys (`GEMINI_API_KEY`, `SOCRATA_APP_TOKEN`) live in `.env.local`, server-side only, gitignored.

### Receipts

Every number on screen expands to the literal Socrata URL that produced it. This is the credibility feature — it answers "is the AI making this up?" before it's asked.

### Tone (hard rule, enforced in prompts)

*"Closed without site access"* — never *"ignored."* The villain is a closure code that hides the outcome, not a city worker. Event host is a public library; city staff may judge.

## Verification

- Pipeline pure functions (template normalization, aggregation math) get unit tests (Vitest).
- Classification gets a spot-check harness: ~20 hand-labeled templates, measure agreement, eyeball disagreements.
- Demo path verified end-to-end, including with wifi cut (cache fallback).
- Every statistic shown at the event is re-derived that morning (rerun pipeline Sunday).

## Build order (MVP gates)

1. **Gate 1 — data proven:** pipeline runs, `honesty.json` exists, hero type identified. *(Nothing else matters until this works.)*
2. **Gate 2 — Act 1 demoable:** Honesty Index renders with receipts.
3. **Gate 3 — Act 2 live loop:** free text → taxonomy → nearby outcomes, with fallback chain + disk cache.
4. **Gate 4 — Act 3 playbook.**
5. Polish: per-borough drill-down, template atlas explorer, second hero type, design pass.

The LLM calls are the **last** thing on the cut list, not the first.

## Rules-driven constraints

- Web app, built with AI assistance ("vibe coding") — satisfied by construction.
- Submission by **2:00 PM Sunday** via the event link; public GitHub repo expected.
- Frame explicitly for **"Best Use of NYC Open Data"** ($150): novel use of `erm2-nwe9` that makes hidden public information accessible.
- Demo from localhost; no public deployment needed (keeps keys safe).

## Out of scope (YAGNI)

- Maps (every 311 project will have one; we lead with the verdict).
- User accounts, persistence, mobile app, deployment.
- Complaint filing integration — we link to the real 311 portal, pre-filled knowledge in hand.
