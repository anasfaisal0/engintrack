import { fetchJson, sleep } from "../http.ts";
import type { Level, RawJob, Source } from "../types.ts";

type Programme = {
  id: string;
  name: string | null;
  url: string | null;
  openingDate: string | null;
  closingDate: string | null;
  categories: string[] | null;
  locations?: string[] | null;
  company: { id?: string; name?: string | null } | null;
};

/**
 * the-trackr.com — a curated tracker of UK/US/EU early-career programmes.
 * Keyless JSON, but WAF-fronted: it 403s without an `Origin` header and a
 * browser UA. Addressed by region+industry+season, NOT by the frontend slug.
 *
 * ⚠️⚠️ THE MOST IMPORTANT FACT ABOUT THIS API: **a bare `[]` is the THROTTLE
 * RESPONSE, not an empty board.** Measured 2026-09-02 by deliberate
 * reproduction — the first request of a 400 ms sweep returned the normal
 * envelope and every request after it returned a 2-byte `[]`, and recovery took
 * over TWO HOURS. The real contract is an OBJECT: `{programmes: [...],
 * groups: [...]}` (a UK Finance tab returned 823 KB as that envelope, with 471
 * programmes and 9 groups). `groups` is UI row-grouping, not an addressing
 * dimension — programmes carry a `groupId`.
 *
 * So this adapter THROWS when it sees a bare array. Accepting one as "zero
 * programmes" is exactly how a throttle turns into a feed-wipe: every listing
 * looks removed at once. Throwing makes the runner carry the previous state
 * forward instead, which is the correct reading of "we could not see the board".
 *
 * ⚠️ The UK Engineering tracker is real and active in the app (industry enum is
 * Finance|Tech|Law|Engineering; its categories are Chemicals & Oil, Energy &
 * Utilities, Oil & Gas, Manufacturing & Product Design, and it is the only
 * tracker with a per-listing `disciplines` taxonomy that names Chemical
 * Engineering). As of 2026-09-02 all four of its tabs are genuinely EMPTY —
 * verified as a real empty envelope, not a throttle. The board is armed here so
 * it starts producing the day Trackr populates it.
 */
/**
 * All Trackr sources share ONE queue. The runner polls sources concurrently, and
 * several Trackr boards firing at once is precisely the request burst that trips
 * the throttle for hours. Serialising them costs a couple of minutes a day and
 * removes the failure mode entirely.
 */
let queue: Promise<unknown> = Promise.resolve();

export const trackr = async (s: Source): Promise<RawJob[]> => {
  const run = queue.then(
    () => fetchBoard(s),
    () => fetchBoard(s),
  );
  queue = run.catch(() => undefined);
  return run;
};

const fetchBoard = async (s: Source): Promise<RawJob[]> => {
  const region = s.params?.region;
  const industry = s.params?.industry;
  const season = s.params?.season;
  const types = (s.params?.types ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  if (!region || !industry || !season || types.length === 0) {
    throw new Error(`trackr: ${s.id} needs params region, industry, season, types`);
  }
  const out: RawJob[] = [];
  let anyOk = false;
  let lastErr: unknown;

  for (const type of types) {
    const url = `https://api.the-trackr.com/programmes?region=${region}&industry=${industry}&season=${season}&type=${type}`;
    let body: unknown;
    try {
      body = await fetchJson(url, {
        headers: { Origin: "https://app.the-trackr.com", Referer: "https://app.the-trackr.com/" },
      });
      anyOk = true;
    } catch (e) {
      lastErr = e;
      await sleep(3000);
      continue;
    }
    // A bare array means throttled — never treat it as an empty board.
    if (Array.isArray(body)) {
      throw new Error(`trackr: ${s.id}/${type} returned a bare array — that is the throttle response, not an empty board`);
    }
    const envelope = body as { programmes?: Programme[]; groups?: unknown[] } | null;
    if (!envelope || !Array.isArray(envelope.programmes)) {
      throw new Error(`trackr: ${s.id}/${type} returned an unrecognised body (expected {programmes, groups})`);
    }
    const rows: Programme[] = envelope.programmes;
    for (const p of rows) {
      const company = p.company?.name ?? "";
      const name = p.name ?? "";
      out.push({
        externalId: `${type}:${p.id}`,
        title: name,
        url: p.url ?? `https://app.the-trackr.com/${s.params?.siteSlug ?? ""}/${type}`,
        location: p.locations?.join(", ") ?? null,
        postedAt: null,
        opensAt: p.openingDate,
        closesAt: p.closingDate,
        employer: company || null,
        department: p.categories?.join(", ") ?? null,
        levelHint: LEVEL_BY_TYPE[type],
      });
    }
    await sleep(2500); // the API rate-limits bulk callers
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`trackr: ${s.id} — every tab failed`);
  return out;
};

const LEVEL_BY_TYPE: Record<string, Level | undefined> = {
  "summer-internships": "internship",
  "off-cycle-internships": "internship",
  "industrial-placements": "placement",
  "graduate-programmes": "graduate",
  "full-time-programmes": "graduate",
  "spring-weeks": "spring-week",
  "insight-programmes": "insight",
  "pre-university": "insight",
  apprenticeships: "apprenticeship",
  events: "event",
};
