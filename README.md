# Case Closed?

**NYC closes almost every 311 complaint. "Closed" is a status code, not an outcome.**

In the last 12 months, New Yorkers filed 2.56 million complaints across the city's 15 highest-volume 311 categories. Nearly every one is marked **closed** — but the free-text resolution description the city attaches to each ticket tells a different story: *"unable to gain access to the location"*, *"observed no criminal violation upon their arrival"*, *"does not fall under the jurisdiction of this agency."* Every one of those is a closed ticket **and** an unfixed problem, and nothing on any city portal distinguishes the two.

**Case Closed? reads that text and builds the first honest map of what actually happens after New Yorkers ask their city for help.**

> **52% — 1,320,035 complaints — were closed without the problem being verified fixed.**
> (Derived live from NYC Open Data; every number in the app expands to the exact query that produced it.)

Built at the NYPL **Built for NYC: AI Hackathon**, Aug 15–16 2026.

## The three acts

1. **The Honesty Index** (`/`) — complaint types ranked by what "closed" really meant: verified fixed vs. cosmetic closure (no access, gone on arrival, wrong desk, no action) vs. duplicates/pending. Click any row to read the city's actual closure language, stamped and translated. A chart that has never existed, because the data for it was locked in free text.
2. **Before You Call** (`/ask`) — describe your problem in plain English. Gemini maps it into the city's official complaint taxonomy (a broken radiator is `HEAT/HOT WATER` under HPD — nobody finds that in a dropdown), then NYC Open Data shows what happened to identical complaints near you.
3. **The Playbook** — the model reads the failure templates for your complaint type and tells you, concretely, how to land in the verified-fixed cohort.

## How the AI is used — not a chatbot

Five distinct patterns, none of which is "send the user's text to a model and print the reply":

1. **AI as a compiler.** There is no `WHERE` clause for "nobody got inside." The resolution text is heavily templated: millions of rows collapse into ~537 distinct templates via server-side `GROUP BY`. The model classifies each template **once**, and each label is reused across tens of thousands of rows — ~537 calls annotate **18.9 million closures**. Amortized inference, the opposite of per-request prompting.
2. **AI audited by adversarial AI, with the record published.** Every label is re-examined by a second model instructed to *overturn* the first. Upheld labels are notarized in the Atlas; confident overturns are adopted and marked "corrected on review"; low-confidence disagreements are published as *contested*, with both readings shown. The disagreement rate is on the page.
3. **An agent that operates the city's own query language.** "Ask the Record" doesn't answer from model memory: the model writes the SoQL query, we execute it live against NYC Open Data, and **the query itself is displayed as the receipt** — including when the model's first attempt is rejected and it self-corrects.
4. **AI-assisted hypothesis testing that can say no.** We hypothesized cosmetic closures get re-filed more than verified fixes. We measured it (256k complaints, address-stratified) — it's false, so the app doesn't claim it, and says so on the homepage.
5. **Generation grounded in observed failure modes.** The playbook, the refile letter, and the community-board brief aren't generic advice: each is generated *against the actual closure templates* that kill complaints like yours, and every claim traces to a number on screen.

Plus the taxonomy mapping (plain English → the city's 460-type filing system — the only thing standing between a resident and their own data).

## Architecture

- **Next.js (App Router)** — pages + API routes; all keys server-side.
- **Offline pipeline** (`npm run pipeline`): `pull` (Socrata SoQL group-bys) → `classify` (Gemini, structured output) → `aggregate` (honesty stats; the demo's hero complaint type is picked empirically, not assumed).
- **Live on stage:** taxonomy mapping and playbook run against Gemini in real time; nearby-complaint queries hit Socrata live with a zero-row fallback chain (descriptor+ZIP → type+ZIP → citywide), so a blank screen is impossible.
- **Every Socrata response is cached to disk** and served on network failure with a "served from cache" badge. This was battle-tested involuntarily: the NYC Open Data portal went down mid-build and the demo kept working.
- **Receipts everywhere:** every statistic expands to the literal `data.cityofnewyork.us` URL that produced it.

## Run it

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free: aistudio.google.com/apikey)
npm run pipeline             # pull -> classify -> aggregate (rerun anytime for fresh data)
npm run dev                  # http://localhost:3000
```

`SOCRATA_APP_TOKEN` is optional but recommended (avoids anonymous rate limits).

## Data

[NYC Open Data — 311 Service Requests from 2010 to Present](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9) (`erm2-nwe9`), refreshed daily. All aggregation happens server-side in Socrata via SoQL; the app never downloads raw rows.

A note on tone: the villain here is a closure code that hides outcomes — not 311, and not city workers. "Closed without site access" is a data-transparency gap, and this project's whole purpose is to close it.
