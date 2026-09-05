# EnginTrack — handoff

Newest round first. Read `CLAUDE.md` for the durable facts.

---

## Round 2026-09-05 — live on Pages, and opening dates

### What was asked
"make it live - and make it show the ones that have recently opened - track
opening dates".

### Done
- **Live at https://anasfaisal0.github.io/engintrack/.** Pages 422s on a private
  repo on this plan, so the repo was made **public** — which also makes Actions
  minutes unlimited, so the whole thing now costs nothing. Scanned for secrets
  and personal contact details before flipping it; both clean. Verified live: the
  page and all five data files serve 200, and `listings.json` comes back gzipped
  at 791 KB rather than 7 MB.
- **Opening dates tracked**, with a "Just opened" board (3/7/14/30-day windows),
  an opened column on every row, and an "Opened in the last 7 days" figure.
  **2,362 roles opened in the last seven days.**

### The distinction the whole feature rests on
`openBasis` records where each date came from: `opens` (the employer published
one, 542 rows), `posted` (the board did, 7,331) or `first-seen` (neither did, so
it is the day WE saw it, 3,341). Only the first two count as opened or render as
fresh; first-seen rows show greyed and prefixed "seen". Without that split, the
first run of any source would report every row as having just opened.

Two new events, `opening_scheduled` and `opened`. **`opened` fires only when we
previously recorded the listing as scheduled** — an opening we actually watched
happen. Without that guard, adding this field to the existing snapshot would have
fired every already-open listing at once. Both cases are now unit-tested.

### Unprompted, and the best news of the round
**Trackr's UK Engineering board has filled up.** It was verifiably empty on
2026-09-02 and was wired in regardless; it now carries **1,082 listings, 86 of
them chemical or process**, and is the single biggest reason the chem-eng count
went from 141 to 246 and UK rows from 2,977 to 4,045.

### Current state
| | |
|---|---|
| Live listings | 11,213 |
| Opened in 7 / 30 days | 2,362 / 4,757 |
| Chemical or process | 246 |
| UK / US | 4,045 / 5,354 |
| Sources answering | 122 of 127 |

### Still failing, and why
- **Unilever** — its Workday tenant returns a permissions error. Upstream.
- **Worley** — its Eightfold rejects its own domain parameter. Upstream.
- **Trackr UK Tech / US Finance** — throttled on this run; they recover on their
  own and the guard means their listings are carried forward, not wiped.
- **Totaljobs** — one request timed out. Transient.

### Owner actions still open
1. **Run `npm run local` every couple of weeks** and commit `data/local/`.
   Gradcracker refuses GitHub's IP range, so this is the one thing the automation
   cannot do for itself. It reports itself stale after 14 days.
2. *(Optional)* Add `GMAIL_USER` + `GMAIL_APP_PASSWORD` secrets for the daily
   email digest.
3. **The repo is now public.** Nothing sensitive is in it, but it is your job
   search in the open — say the word and it goes private again (Pages would then
   stop, and the dashboard would be local-only).

---

## Round 2026-09-02 — built from scratch and verified live

### What was asked
A tracker for chemical-engineering internships, graduate roles and jobs, later
widened by the owner to "not limited to chem eng… Bright Network etc… and
LinkedIn… think creative, no restrictions… make a big big list… even US
potentially", with one constraint: **do not burn GitHub Actions minutes, once a
day is fine**.

### What exists now
A working daily watcher and a dashboard. First full run, 2026-09-02:

| | |
|---|---|
| Live listings | 10,201 |
| Sources answering | 121 of 127 |
| UK / US / EU | 2,968 / 5,509 / 334 |
| Chemical or process | 141 |
| With a published deadline | 533 |
| Employers researched | 374 (114 pollable, 260 link-only) |
| Run time | 1 min 50 s local, 5 min 19 s in CI |

### Research done before building
Seven parallel research passes, every endpoint called live rather than recalled:

- **Employer registry, 374 firms** across energy/oil/nuclear/utilities,
  chemicals/pharma/FMCG, EPC/defence/industrial, UK top graduate employers and
  engineering consultancies. Each row records the vendor, the endpoint, the HTTP
  status and the job count. Kept in `data/sources/` as the evidence.
- **UK student boards.** Gradcracker is the single best engineering source and is
  fully server-rendered. Several widely assumed sources are **dead**: DWP Find a
  Job is closed sitewide, New Scientist Jobs shut down, jobs.ac.uk has no RSS,
  RateMyPlacement is now HigherIn and JS-only, the IChemE board is a flat 403.
- **US lists.** Simplify's Summer-2027 and New-Grad repos are bot-updated every
  30 minutes and carry 2,759 and 3,071 live rows. cvrve's repos are gone.
- **Trackr.** It now has a UK **Engineering** tracker whose categories are
  Chemicals & Oil, Energy & Utilities and Oil & Gas, and which is the only board
  with a per-listing discipline taxonomy naming Chemical Engineering. Every tab
  is currently empty. It is configured here regardless, so it starts producing
  the day Trackr fills it.

### The four bugs worth remembering
1. **Node gets a Cloudflare challenge where curl gets a 200.** Gradcracker, same
   URL, same headers, seconds apart. Fixed by routing those pages through curl.
2. **Concurrency is what triggered the block**, not the client. Nine feeds at
   once cost the whole IP a challenge for tens of minutes. Now single-file.
3. **A bare `[]` from Trackr is the throttle response.** Accepting it as "empty
   board" would have wiped the feed. The adapter throws instead.
4. **A full Workday hostname in `host` produced `…myworkdayjobs.com.myworkdayjobs.com`**,
   which surfaces only as "fetch failed". Fixed by normalising in every adapter;
   this alone recovered Airbus, Barclays, Rolls-Royce, abrdn and a dozen more.

### Verification performed
- `npm test` — the classifier and the diff engine, both pure, all assertions pass.
  The classifier tests encode the real traps: "Graduate Recruitment Manager" is
  not a graduate role, "KYC Analyst" has no early-career signal, "Birmingham, AL"
  is not the UK, "Gas & Power Trading Summer Analyst" is not an energy role.
- `npx tsc --noEmit` clean.
- The full pipeline run end to end four times against live sources.
- The dashboard rendered and checked in light and dark, desktop and 375 px.

### Owner actions still open
1. **Decide public or private.** Public gives unlimited Actions minutes and a
   free live dashboard on GitHub Pages. Private keeps it unlisted and costs about
   90 of your 2,000 monthly minutes. There are no secrets and no personal data in
   the repo, so this is purely your call.
2. **Run `npm run local` every couple of weeks** and commit `data/local/`. It is
   the one thing the automation cannot do for itself, because Gradcracker refuses
   GitHub's IP range. After 14 days the source reports itself stale.
3. *(Optional)* Add `GMAIL_USER` + `GMAIL_APP_PASSWORD` secrets for the daily
   email digest. It stays silent on days when nothing changed.
4. *(Optional)* Enable Pages (source: root) for the live dashboard — needs a
   public repo on the free plan.

### Known limits, stated plainly
- **261 of 374 employers are link-only.** Their boards sit behind bot walls
  (Mott MacDonald, WSP's main site), or use vendors with no adapter yet
  (SuccessFactors, Phenom, Avature, iCIMS, Taleo — about 45 employers between
  them). They are in the dashboard with their careers link, not silently dropped.
- **US volume dominates the raw count.** 5,508 of 9,454 rows are American,
  because Simplify's lists are enormous and tech-heavy. The dashboard defaults to
  the chemical/process filter for exactly this reason.
- **141 rows are chemical or process.** That is the honest number: it counts rows
  whose title or Gradcracker discipline line actually names chemical or process
  work, not everything an employer might accept a chem-eng student for.
- **Deadlines are sparse outside Gradcracker** — 533 of the 10,201 rows carry one,
  and almost all of those come from Gradcracker, because most ATS boards never
  publish a closing date.
- Several large consultancies (Mott MacDonald, Arup, AECOM, Stantec, RSK) could
  not be pinned to a readable endpoint. They are the highest-value follow-up,
  since they hire process engineers in volume.
