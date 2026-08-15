# Demo script (~2:30) + submission draft

## Sunday-morning checklist (before anything else)

1. `npm run pipeline` — refreshes EVERYTHING with that morning's data (pull → agencies → classify → aggregate → boroughs → worst → boomerang). Rule: never quote a number you haven't derived that day.
2. `npm run warm` — pre-cache the demo-path queries while the wifi is good.
3. Run the demo once end-to-end exactly as scripted. Then once with wifi OFF to confirm the cache badges carry it.
4. Submit at https://on.nypl.org/hack-dev **well before 2:00 PM**.

## The demo — lead with the verdict, close with the fate

**Beat 1 — the stamp (0:00–0:25).**
Open `/`. Let the stamp slam.
> "Last year New Yorkers filed two and a half million 311 complaints in the top 15 categories. Almost every one is marked *closed*. But closed is a status code, not an outcome. The city writes down what actually happened — in free text nobody can search. We read all of it. **52 percent — 1.3 million complaints — were closed without the problem being verified fixed.**"

**Beat 2 — the integrity flex (0:25–0:45).** Point at the red callout.
> "And we checked ourselves. We hypothesized cosmetic closures get re-filed more than real fixes — we measured it, and it's *false*, so we don't claim it. What the data does prove: **at buildings with ten or more heat complaints, 95% of closures — even ones marked fixed — are followed by another complaint within 30 days.** The ticket closes. The building doesn't."

**Beat 3 — the Honesty Index + a receipt (0:45–1:10).**
Click **Illegal Parking** open, then a **receipt**.
> "This chart never existed because no query can tell 'fixed' from 'nobody got inside.' The trick: 2.5 million closure texts collapse into a few hundred templates — the AI classifies each one once, and the labels annotate millions of rows. *No criminal violation observed upon arrival* — 116,000 times. And every number expands to the exact NYC Open Data query behind it. Nothing here is invented."

**Beat 4 — where complaints go to die (1:10–1:35).**
Scroll to the leaderboard. Click **2081 MADISON AVENUE**.
> "These are the buildings where housing inspections keep not happening. Number one: 2081 Madison Avenue. Click it — **1,147 complaints in five years, ten percent verifiably fixed.** The sentence this building has heard 374 times: 'the inspector left a card.' Anyone can look up any address — including the building you're about to sign a lease in."

**Beat 5 — Before You Call, live (1:35–2:15).**
Go to `/ask`. Click the mold example chip (or 🎙️ speak it), run it.
> "Now flip it personal. Describe your problem in your words — the AI files it the way the city would: Unsanitary Condition, Mold. Here are your honest odds — and here is **the exact sentence your complaint will most likely receive.** Then the playbook: because we know precisely how complaints like yours die, the AI tells you how to land in the fixed column — and *drafts your complaint text* engineered against those failure modes. Copy, paste, file."

**Beat 6 — close (2:15–2:30).**
> "That's Case Closed: the city's own data, finally telling the truth about itself — and coaching every New Yorker to beat the odds. All of it public data, all of it receipted, rebuilt fresh this morning."

**If asked "what if the wifi dies?"** — it did, twice, during the build: the portal went into maintenance mid-hackathon and the app kept working from its disk cache. Point at a "served from cache" badge.

**If asked "everyone uses LLMs — what's unique here?"** — five things, rapid-fire: (1) *AI as a compiler* — 537 classification calls annotate 18.9 million rows; each output is reused ~35,000 times. (2) *AI audited by adversarial AI* — every label was re-examined by a second model told to overturn the first; corrections and disagreements are published in the Atlas. (3) *An agent that operates the city's own query language* — Ask the Record writes live SoQL and shows the query as its receipt. (4) *AI hypothesis testing that can say no* — the boomerang claim was measured, falsified, and not shipped. (5) *Generation grounded in observed failure modes* — the letter and playbook counter the specific templates that kill complaints like yours. None of that is a chatbot.

**If asked about the agencies table:** "different agencies end complaints differently — DHS 76% cosmetic, HPD 46% — it's a structural fact about how each works, not a report card on field workers." (Tone rule: the villain is a closure code, never a person.)

## Submission form draft

**Project name:** Case Closed?

**Tagline:** NYC closes almost every 311 complaint. "Closed" is a status code, not an outcome — we read the city's own closure text to reveal what really happened, and coach New Yorkers to beat the odds.

**What it does:** Reads the free-text resolution descriptions NYC attaches to 311 complaints (2.56M complaints → a few hundred templates → AI-classified outcomes), then: (1) the **Honesty Index** — what "closed" really means per complaint type, per borough, per agency; (2) **Where complaints go to die** — the buildings with the most no-access closures, each linking to a full five-year dossier anyone can pull for any address; (3) **Before You Call** — plain English (or voice) in → the city's official taxonomy out, with honest odds, the literal closure sentence you're most likely to receive, and a ready-to-paste complaint drafted against the specific failure modes in the data. Every statistic expands to the exact NYC Open Data query that produced it.

**Why AI is essential:** There is no WHERE clause for "nobody got inside." Template→outcome classification, plain-English→460-type taxonomy mapping, and failure-mode-aware complaint drafting are all impossible without an LLM. Remove the model and the project ceases to exist.

**Methodological honesty:** We hypothesized that cosmetically-closed complaints get re-filed more than verified fixes. We measured it (256k heat complaints, address-stratified) — it's false, so the app doesn't claim it. What it claims instead is measured: at chronic buildings, ~95% of all closures are followed by another complaint within 30 days.

**Built with:** Next.js, TypeScript, Tailwind, Gemini 2.5 Flash (Google AI Studio), NYC Open Data (Socrata SoQL, dataset erm2-nwe9), vibe-coded with Claude Code.

**Best Use of NYC Open Data angle:** 311 data is usually mapped by complaint *density*. We use the one field nobody touches — free-text resolution descriptions — to create an outcome layer that has never been visualized, and hand it back to New Yorkers at the moment they need it: right before they file, and right before they sign a lease.
