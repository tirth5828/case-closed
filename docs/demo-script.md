# Demo script (~2:15) + submission draft

## Sunday-morning checklist (before anything else)

1. `npm run pipeline` — refresh every stat with that morning's data (rule: never quote a number you haven't derived that day).
2. `npm run warm` — pre-cache the demo-path queries below while the wifi is good.
3. Run the demo once end-to-end exactly as scripted. Then run it once with wifi OFF to confirm the cache badge path.
4. Submit at https://on.nypl.org/hack-dev **well before 2:00 PM**.

## The demo (lead with the verdict, not the map)

**Beat 1 — the stamp (0:00–0:25).**
Open `/`. Let the stamp slam.
> "Last year New Yorkers filed two and a half million 311 complaints in the top 15 categories. Almost every single one is marked *closed*. But closed is a status code, not an outcome. The city writes down what actually happened — in free text nobody can search. We read it. **52 percent — 1.3 million complaints — were closed without the problem being verified fixed.**"

**Beat 2 — the Honesty Index (0:25–1:00).**
Scroll to the index, click **Illegal Parking** open.
> "This chart has never existed, because no database query can tell 'fixed' from 'nobody got inside.' The trick: 2.5 million closure texts collapse into just 232 templates. The AI classifies each template once — about six calls — and those labels annotate millions of rows. Look at the language: *no criminal violation observed upon arrival* — 116,000 times. The truck was gone before anyone looked. Snow complaints? 74% cosmetic — thousands closed as 'your report will be used for monitoring.'"

Click a **receipt**.
> "And every number expands to the exact NYC Open Data query that produced it. Nothing here is made up."

**Beat 3 — Before You Call (1:00–1:50).**
Go to `/ask`. Type: *"theres a huge truck thats been parked on the corner of my block for days blocking the crosswalk"* + ZIP `10016`.
> "Now flip it personal. You describe your problem in your own words — the AI files it the way the city would: Illegal Parking, Blocked Crosswalk. Nobody finds that in a dropdown. Then the real odds for identical complaints: not '99% closed' — but how many were *verifiably fixed*."

**Beat 4 — the Playbook (1:50–2:15).**
> "And because we know exactly *how* complaints like yours die — gone on arrival, no access — the AI writes you a playbook to land in the fixed column: name the exact corner, the plate, say it's been there for days so it isn't 'gone on arrival.' Advice derived from outcomes, not FAQ pages. That's Case Closed: the city's own data, finally telling the truth about itself."

**If asked "what if the wifi dies?"** — it did, yesterday: the NYC Open Data portal went down mid-build and the app kept working from its disk cache. Point at the "served from cache" badge.

**Tone guardrail:** the villain is a closure code that hides outcomes — never say "the city ignores you." City staff may be judging.

## Submission form draft

**Project name:** Case Closed?

**Tagline:** NYC closes almost every 311 complaint. "Closed" is a status code, not an outcome — we read the city's own closure text to reveal what really happened, and coach New Yorkers to beat the odds.

**What it does:** Reads the free-text resolution descriptions NYC attaches to 311 complaints (2.56M complaints → 232 templates → AI-classified outcomes), then (1) publishes the first Honesty Index of what "closed" really means per complaint type, (2) translates any plain-English problem into the city's official complaint taxonomy and shows the real outcomes of identical complaints nearby, and (3) generates a playbook to counter the specific failure modes in the data. Every statistic expands to the literal NYC Open Data query that produced it.

**Why AI is essential:** There is no WHERE clause for "nobody got inside." Both core features — template→outcome classification and plain-English→460-type taxonomy mapping — are impossible without an LLM. Remove the model and the project ceases to exist.

**Built with:** Next.js, TypeScript, Tailwind, Gemini 2.5 Flash (Google AI Studio), NYC Open Data (Socrata SoQL, dataset erm2-nwe9), vibe-coded with Claude Code.

**Best Use of NYC Open Data angle:** 311 data is usually mapped by complaint *density*. We use the one field nobody touches — free-text resolution descriptions — to create an outcome layer that has never been visualized, and hand it back to New Yorkers at the moment they need it: right before they file.
