# EnginTrack

A daily watcher for **early-career engineering roles** — internships, industrial
placements, graduate schemes, spring weeks, apprenticeships and entry-level jobs
— pulled straight from **employers' own applicant-tracking boards** and the
student job boards, with **chemical and process engineering ranked first**.

**Live board: https://anasfaisal0.github.io/engintrack/**

It runs **once a day** in a GitHub Action, diffs against yesterday, and commits
what changed. The repo is the database; `index.html` is the dashboard.

**11,213 live listings from 122 working sources**: 4,045 in the UK, 5,354 in the
US, 246 that name chemical or process work, and **2,362 that opened in the last
seven days**.

---

## Why it is built this way

Job aggregators mostly resell free public data. Nearly every employer's careers
page is a thin front-end over an applicant-tracking system that serves **keyless
public JSON**, so this reads those directly. No API keys, no accounts, no paid
tier, no scraping of anything that hides behind a login.

The hard part was never the fetching — it is the **firm-to-ATS registry**, and
that is what `data/sources/` holds: 374 employers, each one's board identified
and its endpoint actually called, with the HTTP status and job count recorded.

## What it watches

| Kind | What | Rows |
|---|---|---|
| **Employer boards** | 113 employers on Workday, Greenhouse, Oracle HCM, SmartRecruiters, Lever, Ashby, Eightfold, TeamTailor and Pinpoint | varies daily |
| **Gradcracker** | all 9 discipline hubs, captured at home (see below) | 825, 533 with deadlines |
| **Simplify** | the community Summer-2027 and New-Grad lists, bot-updated every 30 min | ~5,700 |
| **Reed, Totaljobs, Guardian Jobs, Chemistry World** | UK graduate and placement searches | ~300 |
| **The Muse, Arbeitnow, Getro** | US internships, EU roles, VC-portfolio startups | ~250 |
| **Trackr** | UK Finance, UK Tech, US Finance and **UK Engineering** | 2,655 |

261 further employers are listed **link-only**: their board is behind a bot wall
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

## Knowing when something opened

The board's most useful view is **Just opened**, and it only works because the
data is honest about how well it knows each date. `openBasis` records the source:

| Basis | Meaning | Rows |
|---|---|---|
| `opens` | the employer published an opening date | 542 |
| `posted` | the board published a posting date | 7,331 |
| `first-seen` | neither did — this is the day **we** first saw it | 3,341 |

Only the first two count as "opened". A first-seen date is a fact about this
watcher, not about the employer, and on a source's first run it is every row at
once; counting those would report thousands of roles as just-opened when they had
been open for months. They render greyed and prefixed "seen" instead.

A **future** opening date is not an opening: it leaves `openedAt` null, so a
programme opening in November never appears among the roles you can apply to
today. When that date arrives, an `opened` event fires — but only if we had
previously recorded it as scheduled, so a listing that was already open the first
time we met it never announces itself.

## Running it

```bash
npm install
npm test          # the classifier and the diff engine
npm run watch     # one full poll into ./data
npm run local     # refresh Gradcracker from a home connection, then commit it
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

The repo is **public**, so Actions minutes are unlimited and GitHub Pages is
free — the whole thing costs nothing. It reads only public listings and holds no
secrets. A run takes about five minutes; on a private repo that would have been
roughly 180 of the 2,000 free monthly minutes.

## Optional email digest

Set repo secrets `GMAIL_USER` and `GMAIL_APP_PASSWORD` (and optionally the
`DIGEST_TO` / `DASHBOARD_URL` variables) and each run emails what changed. It
**sends nothing when nothing changed** — a daily "no new roles" email teaches you
to ignore the one that matters.

## Notes worth keeping

- **Trackr's UK Engineering board went from empty to full.** Every tab returned
  zero on 2026-09-02; it was wired up anyway, and it now carries **1,082 listings,
  86 of them chemical or process** — the single biggest reason the chem-eng count
  went from 141 to 246. Arming an empty board paid off within days.
- **A bare `[]` from Trackr means throttled, not empty.** Reproduced deliberately;
  recovery took over two hours. The adapter throws on a bare array rather than
  reporting every listing closed.
- **Gradcracker blocks GitHub's IP range outright.** Search pages *and*
  `sitemap.xml`, to curl *and* to Node, all challenged within half a second of a
  hosted run starting; the same URLs answer 200 from a home connection. So
  `npm run local` captures it at home and commits `data/local/gradcracker.json`,
  which the daily run reads. That file declares itself **stale after 14 days**
  rather than passing old rows off as current.
- **From a home connection it answers curl and refuses Node**, same URL and
  headers seconds apart, because the TLS client itself is fingerprinted — hence
  the `curl` path. And it limits by request RATE: nine feeds at once cost the
  whole IP a challenge for tens of minutes, so they are fetched single-file.
- **A failing source keeps its previous listings.** A network blip must never read
  as a wave of closures, and a board that collapses from hundreds of rows to zero
  is treated as a failure rather than believed.
