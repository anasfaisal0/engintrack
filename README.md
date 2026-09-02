# EnginTrack

A daily watcher for **early-career engineering roles** — internships, industrial
placements, graduate schemes, spring weeks, apprenticeships and entry-level jobs
— pulled straight from **employers' own applicant-tracking boards** and the
student job boards, with **chemical and process engineering ranked first**.

It runs **once a day** in a GitHub Action, diffs against yesterday, and commits
what changed. The repo is the database; `index.html` is the dashboard.

**7,986 live listings from 113 working sources** on the first full run
(2026-09-02): 772 in the UK, 5,606 in the US, 334 in Europe.

---

## Why it is built this way

Job aggregators mostly resell free public data. Nearly every employer's careers
page is a thin front-end over an applicant-tracking system that serves **keyless
public JSON**, so this reads those directly. No API keys, no accounts, no paid
tier, no scraping of anything that hides behind a login.

The hard part was never the fetching — it is the **firm-to-ATS registry**, and
that is what `data/sources/` holds: 270 employers, each one's board identified
and its endpoint actually called, with the HTTP status and job count recorded.

## What it watches

| Kind | What | Rows |
|---|---|---|
| **Employer boards** | 108 employers on Workday, Greenhouse, Oracle HCM, SmartRecruiters, Lever, Ashby, Eightfold, TeamTailor and Pinpoint | varies daily |
| **Gradcracker** | all 9 engineering discipline hubs, chemical/process first | ~290 chem-eng alone |
| **Simplify** | the community Summer-2027 and New-Grad lists, bot-updated every 30 min | ~5,700 |
| **Reed, Totaljobs, Guardian Jobs, Chemistry World** | UK graduate and placement searches | ~300 |
| **The Muse, Arbeitnow, Getro** | US internships, EU roles, VC-portfolio startups | ~250 |
| **Trackr** | UK Finance, UK Tech, US Finance — plus **UK Engineering**, armed and waiting | see note |

162 further employers are listed **link-only**: their board is behind a bot wall
or has no readable endpoint, so the dashboard keeps the careers link rather than
pretending to poll them.

## How a role gets in

1. An adapter fetches the board and returns raw rows.
2. `classify.ts` reads the title and requires a **positive early-career signal** —
   an internship, placement, graduate scheme or entry grade — and rejects any
   senior marker. This is the whole game: an ATS board is the firm's *entire*
   requisition list, so "Analyst" alone lets in "KYC Analyst" and "Engineer"
   alone lets in every mid-career hire.
3. `region.ts` reads the location, in an order that stops "Birmingham, AL" and
   "Bristol, TN" being read as the UK.
4. `diff.ts` compares against yesterday and emits events.

## Running it

```bash
npm install
npm test          # the classifier and the diff engine
npm run watch     # one full poll into ./data
npm run probe reed-uk gradcracker-chemical-process   # try single sources
npm run serve     # dashboard at http://localhost:8791
```

On the Windows dev box prefix Node with `NODE_TLS_REJECT_UNAUTHORIZED=0` — the
AV intercepts TLS. Not needed in CI.

## Adding an employer

Add a row to `data/sources/*.json` with the board's vendor and token, then:

```bash
npx tsx scripts/import-employers.ts && npx tsx scripts/build-registry.ts
```

A row missing what its adapter needs is **disabled with the reason printed**,
never silently kept — a no-op that looks like success is the failure mode this
repo works hardest to avoid. A newly added source is **seeded silently** on its
first run, so it never floods the feed.

## Cost

A full run takes about 2.5 minutes. GitHub bills each job rounded up to a whole
minute, so daily costs roughly **90 minutes a month** against the 2,000 free
private-repo minutes. A **public** repo would make Actions unlimited and
GitHub Pages free; this watcher reads only public listings and holds no secrets.

## Optional email digest

Set repo secrets `GMAIL_USER` and `GMAIL_APP_PASSWORD` (and optionally the
`DIGEST_TO` / `DASHBOARD_URL` variables) and each run emails what changed. It
**sends nothing when nothing changed** — a daily "no new roles" email teaches you
to ignore the one that matters.

## Notes worth keeping

- **Trackr's UK Engineering board exists and is empty.** The tracker is live in
  Trackr's app (its categories are Chemicals & Oil, Energy & Utilities, Oil & Gas,
  and it is the only board with a per-listing discipline taxonomy naming Chemical
  Engineering) but every tab returned zero on 2026-09-02. It is configured here so
  it starts producing the day Trackr fills it.
- **A bare `[]` from Trackr means throttled, not empty.** Reproduced deliberately;
  recovery took over two hours. The adapter throws on a bare array rather than
  reporting every listing closed.
- **Gradcracker rate-limits by request rate, not by client.** Nine feeds fetched
  concurrently earned the whole IP a Cloudflare challenge on every later request,
  curl included. It is now fetched single-file with a pause between pages.
- **Gradcracker answers curl and refuses Node.** Same URL, same headers, seconds
  apart: 200 versus a 403 challenge. What is fingerprinted is the TLS client, so
  those pages go through `curl`.
- **A failing source keeps its previous listings.** A network blip must never read
  as a wave of closures, and a board that collapses from hundreds of rows to zero
  is treated as a failure rather than believed.
