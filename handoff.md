# EnginTrack — handoff

Newest round first. Read `CLAUDE.md` for the durable facts.

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
| Live listings | 7,986 |
| Sources answering | 113 of 128 |
| UK / US / EU | 772 / 5,606 / 334 |
| Chemical or process | 104 |
| Employers researched | 270 (108 pollable, 162 link-only) |
| Run time | 2 min 17 s |

### Research done before building
Seven parallel research passes, every endpoint called live rather than recalled:

- **Employer registry, 270 firms** across energy/oil/nuclear/utilities,
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
1. **Create the GitHub repo and push.** Nothing is on GitHub yet — this is the
   only thing standing between you and it running by itself.
2. **Decide public or private.** Public gives unlimited Actions minutes and a
   free live dashboard on GitHub Pages. Private keeps it unlisted and costs about
   90 of your 2,000 monthly minutes. There are no secrets and no personal data in
   the repo, so this is purely your call.
3. **Run the workflow once by hand** to seed the baseline silently. Everything
   that changes after that is what you hear about.
4. *(Optional)* Add `GMAIL_USER` + `GMAIL_APP_PASSWORD` secrets for the daily
   email digest. It stays silent on days when nothing changed.
5. *(Optional)* Enable Pages (source: root) for the live dashboard.

### Known limits, stated plainly
- **162 of 270 employers are link-only.** Their boards sit behind bot walls
  (Mott MacDonald, WSP's main site), or use vendors with no adapter yet
  (SuccessFactors, Phenom, Avature, iCIMS, Taleo — about 45 employers between
  them). They are in the dashboard with their careers link, not silently dropped.
- **US volume dominates the raw count.** 5,606 of 7,986 rows are American,
  because Simplify's lists are enormous and tech-heavy. The dashboard defaults to
  the chemical/process filter for exactly this reason.
- **Only 104 rows are chemical or process** on this run, and that number is
  understated: Gradcracker was rate-limited during the final run, and it is the
  source that contributes both the discipline tagging and most of the deadlines.
  A clean run should roughly triple it.
- **Deadlines are sparse** because most ATS boards never publish one. Gradcracker
  does, which is another reason it matters.
- Several large consultancies (Mott MacDonald, Arup, AECOM, Stantec, RSK) could
  not be pinned to a readable endpoint. They are the highest-value follow-up,
  since they hire process engineers in volume.
