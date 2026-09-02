# EnginTrack — daily early-careers watcher

Personal tool for Anas. Watches **early-career engineering roles** (internships,
industrial placements, graduate schemes, spring weeks, apprenticeships, entry
level) across employer applicant-tracking boards and student job boards, with
**chemical / process engineering ranked first**. Sibling of `Trackr Watch`, which
does the same job for finance only and polls hourly; this one is broader and runs
**once a day** because the owner asked for the Actions bill to stay small.

## ⚠️ Keep the docs current (owner's standing rule)
Every change updates **`handoff.md`** (dated round + gotchas) **and this file**
(durable facts) in the same commit.

## Architecture

- **Scheduler = GitHub Action** (`.github/workflows/watch.yml`), `17 6 * * *`, one
  fire a day, `timeout-minutes: 30`. A run measures ~2.5 min and GitHub bills
  each job rounded UP to a whole minute, so the cost is ~90 min/month of the
  2,000 free private-repo minutes. **Do not add a second trigger** — an external
  pinger plus a schedule doubles the bill and neither side's logs show it.
- **The repo is the database** (`data/`):
  - `registry.json` — the generated list of everything to poll. **Never edit by
    hand**; it is built from the two files below.
  - `aggregators.json` — hand-written aggregator sources (Gradcracker, Trackr,
    Simplify, RSS, Reed…). This one IS edited by hand.
  - `employers.json` — generated from `data/sources/*.json`.
  - `sources/*.json` — the **research evidence**: 374 employers, each board
    identified and its endpoint actually called, with status and job count. This
    is the expensive artefact; everything else is cheap to rebuild.
  - `listings.json` — every live classified listing (written compact; ~5 MB raw,
    ~660 KB gzipped, which is what Pages serves).
  - `feed.json` — append-only change log, newest first, capped 3,000.
  - `summary.json` — totals + per-source health, read by the dashboard.
  - `removed.json` — durable archive of listings that dropped off, capped 2,000,
    keeping the application link because a role often stays reachable after it
    stops being listed.
  - `snapshot.json` — the watcher's memory between runs.
- **`index.html`** is a zero-build dashboard reading those files. Enable GitHub
  Pages (source: root) to get it live; that needs a public repo on the free plan.
- Pure TypeScript run by `tsx`. One runtime dependency (`nodemailer`) and only
  for the optional digest.

## Code map

- `config.ts` — knobs. `closingSoonDays`, caps, `concurrency`, `zeroCollapseGuard`.
- `types.ts` — Source / RawJob / Listing / FeedEvent / Snapshot / Summary.
- `http.ts` — fetch with retry + timeout, a `pool()` limiter, and **`client:"curl"`**
  (see the Gradcracker gotcha).
- `classify.ts` — **PURE + tested. The heart of the thing.** Title → level +
  disciplines, and the early-career gate.
- `region.ts` — **PURE + tested.** Location → region, ordered so US state codes
  and city names beat UK city names.
- `normalise.ts` — RawJob → Listing, applies the gate, applies a source's own
  discipline tag.
- `diff.ts` — **PURE + tested.** Per-source diff, silent bootstrap, latched
  milestones.
- `run.ts` — orchestrator and the failure policy.
- `adapters/` — one per ATS vendor. `aggregators/` — one per board.
- `scripts/` — `build-registry`, `import-employers`, `probe` (poll one source and
  print it), `local` (capture the datacentre-blocked sources at home), `snapshot`
  (inline the data into one file), `send-digest`, `serve.mjs`.

## The rules that keep it honest

1. **Require a positive early-career signal.** Never merely reject seniority. An
   ATS board is the firm's entire req list; "Analyst" alone admits "KYC Analyst",
   "Engineer" alone admits every mid-career hire.
2. **A failing source keeps its previous listings.** `run.ts` carries the prior
   state forward on any throw. A network blip must never read as mass closure.
3. **A collapse to zero from a big board is a failure, not an empty board**
   (`zeroCollapseGuard`, 25 rows).
4. **Bootstrap is per-source and silent.** Adding an employer never floods the feed.
5. **An unbuildable registry row is disabled with the reason printed**, never
   silently kept. A no-op that looks like success is this workspace's most
   repeated failure mode.

## Hard-won gotchas

- **Gradcracker BLOCKS GITHUB'S IP RANGE**, which is where the daily Action runs.
  Search pages *and* `sitemap.xml`, curl *and* Node's fetch, all challenged within
  half a second of a hosted run; 200 from a home connection. No header, client or
  pacing fix exists — it is the IP. Hence `npm run local` + the `local-file`
  adapter, and hence `data/local/gradcracker.json` being a committed artefact that
  goes stale (14 days) rather than silently ageing.
- **Gradcracker answers `curl` and refuses Node** *from a reachable network*. Same URL, byte-identical browser
  headers, seconds apart: curl 200 with 978 KB, Node's fetch a 403 "Just a
  moment…" challenge. Header spoofing does not help because the TLS/HTTP client
  itself is fingerprinted. Hence `fetchText(url, {client:"curl"})`; curl is present
  on GitHub-hosted runners.
- **Gradcracker's limit is request RATE.** Nine discipline feeds fetched
  concurrently (~40 requests in 16 s) earned the whole IP a challenge on every
  later request, curl included, and it persisted for tens of minutes. All
  Gradcracker sources now share one queue with a 4 s pause between pages.
- **A bare `[]` from the Trackr API means THROTTLED, not empty.** Reproduced
  deliberately: the first request of a 400 ms sweep answered normally, every one
  after returned a 2-byte `[]`, and recovery took over two hours. The real
  contract is `{programmes, groups}`. The adapter **throws** on a bare array —
  accepting it as zero programmes is exactly how a throttle becomes a feed wipe.
  Trackr sources also share one queue for the same reason.
- **Trackr's UK Engineering board is real and currently empty.** Its tabs are
  graduate-programmes / industrial-placements / summer-internships /
  apprenticeships and its categories include Chemicals & Oil. Verified empty as a
  genuine empty envelope, not a throttle. Armed so it lights up on its own.
- **A 1 MB page will not tolerate `<a …>([\s\S]*?)</a>` globally.** That regex
  backtracked so badly on Gradcracker's markup that a 3-minute test never
  finished. Match the job-URL pattern first, then read a bounded window; the same
  work then takes 176 ms.
- **`host` is recorded two ways.** Some research rows store the Workday subdomain
  (`shell.wd3`), others the whole hostname. Appending the domain to the latter
  produced `…myworkdayjobs.com.myworkdayjobs.com`, whose DNS failure surfaces only
  as a bare "fetch failed". Every host-based adapter normalises now.
- **`limit` caps at 20 on Workday**, so a big tenant is many round-trips. We do
  NOT walk whole boards: a handful of keyword searches ("intern", "graduate",
  "placement"…) is the point, since we only want early careers. `postedOn` is
  relative English ("Posted 5 Days Ago"), never a date.
- **Simplify's list is on the `dev` branch**, not main, and most rows are dead:
  15,532 rows, 2,759 with `active && is_visible`. Filter on both.
- **The Muse's working host is `www.themuse.com/api/public/jobs`.** The commonly
  cited `api-v2.themuse.com/jobs` is not it.
- **Madgex RSS lives at `/jobsrss/`** (Guardian Jobs, Chemistry World). The
  `/jobs/rss/` path 301s to an HTML page.
- **Dead or walled, verified 2026-09-02, do not re-add:** DWP Find a Job (the
  service is closed, 503 sitewide), New Scientist Jobs (shut down), jobs.ac.uk
  (has no RSS, despite it being widely assumed), RateMyPlacement (merged into
  HigherIn, whose results are JS-only behind a robots-disallowed API), the IChemE
  board (`jobs.icheme.org` does not resolve; `jobs.thechemicalengineer.com` is a
  flat 403), Civil Service Jobs, Indeed, CV-Library, Milkround (StepStone markup
  but empty `href="#"` anchors — "same platform as Totaljobs" is not evidence).
- **The LinkedIn guest endpoint works without a login but robots.txt disallows
  that path**, so it is deliberately not used.
- **A CSS selector list must not be followed by `@media`.** An `@media` block
  written as if it were another selector in a comma list silently kills the whole
  rule. The active-chip colour is a token (`--on-brand`) defined in every palette
  block instead — a filled control whose foreground is only defined in one theme
  is unreadable in the other.
- **Windows/AV:** `NODE_TLS_REJECT_UNAUTHORIZED=0` for any local Node run. Git
  Bash `/tmp` is not Node's `/tmp`; use a repo-relative `DATA_DIR` locally.

## Owner preferences carried over

End every owner message with a ⭐. En dashes, never em dashes.
