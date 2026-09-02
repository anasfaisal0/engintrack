import { fetchText, sleep } from "../http.ts";
import { decodeEntities } from "../adapters/teamtailor.ts";
import type { Level, RawJob, Source } from "../types.ts";

/**
 * Gradcracker — the UK's main engineering/STEM early-careers site, and the only
 * source that is organised by DISCIPLINE, which is exactly the axis we care
 * about. It has a chemical/process hub with separate graduate-job, placement and
 * summer-internship lists.
 *
 * No API, but the search pages are SERVER-RENDERED (Livewire/Alpine, markup
 * present without JS). Structure verified against a saved page on 2026-09-02:
 *
 *   <a href="https://www.gradcracker.com/hub/44/stantec/graduate-job/81976/graduate-process-engineer-energy-2027"
 *      data-mk-label="Job Title" …> Graduate Process Engineer (Energy) - 2027 </a>
 *   <h3 …>Chemical, Process.</h3>
 *   <dl> <dt>Deadline</dt><dd>November 30th, 2026</dd>
 *        <dt>Salary</dt><dd>…</dd>
 *        <dt>Location</dt><dd>Redditch (Worcestershire) (Hybrid)</dd> … </dl>
 *
 * The URL carries the employer id + slug and the opportunity id, so the stable
 * external id is free and the employer never has to be guessed from text.
 *
 * ⚠️ THROWS on zero rows, so a layout change carries state forward instead of
 * reporting every listing removed.
 *
 * ⚠️⚠️ THE SEARCH PAGES ARE UNREACHABLE FROM A DATACENTRE IP, which is where the
 * daily Action runs. Measured on a GitHub-hosted runner: all nine discipline
 * feeds returned Cloudflare's "Just a moment…" challenge within half a second of
 * the run starting — far too fast to be rate limiting, so it is the IP range
 * itself. The same URLs answer 200 from a home connection.
 *
 * The SITEMAP is the way in, and it is `mode: "sitemap"`. robots.txt advertises
 * it, it is served to anyone, and its job URLs are
 *   /hub/{employerId}/{employer-slug}/{type}/{jobId}/{title-slug}
 * which carries the employer, the stage and the title — 825 live jobs on
 * 2026-09-02, of which 752 classify as early-career. It loses the location and
 * the deadline that the cards carry, so the discipline feeds are still the
 * better read when the network allows them; they are off by default and worth
 * turning on for a local run.
 *
 * params:
 *   mode  — "sitemap" to read only the sitemap (what CI uses)
 *   urls  — pipe-separated listing URLs (one per discipline × type)
 *   level — Level to stamp when the URL segment does not imply one
 */
/**
 * Every Gradcracker source shares ONE queue, and pages are spaced out.
 *
 * ⚠️ This is a measurement, not caution. Nine discipline feeds fetched
 * concurrently (~40 requests in 16 seconds) got the whole IP a Cloudflare
 * "Just a moment…" challenge on EVERY subsequent request, curl included, and it
 * persisted. The first serialised run of the same nine feeds was fine. So the
 * limit is request RATE, and the fix is to be a slow, single-file visitor:
 * roughly 36 requests spread over a couple of minutes, once a day.
 */
let queue: Promise<unknown> = Promise.resolve();

export const gradcracker = async (s: Source): Promise<RawJob[]> => {
  const run = queue.then(
    () => fetchDiscipline(s),
    () => fetchDiscipline(s),
  );
  queue = run.catch(() => undefined);
  return run;
};

const fetchDiscipline = async (s: Source): Promise<RawJob[]> => {
  // mode=sitemap skips the search pages entirely. That is the mode the daily
  // Action uses, because the search pages are unreachable from a datacentre IP.
  if (s.params?.mode === "sitemap") return await fromSitemap();

  const urls = (s.params?.urls ?? "").split("|").map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) throw new Error(`gradcracker: ${s.id} needs params.urls`);
  const fallbackLevel = s.params?.level as Level | undefined;
  const out: RawJob[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  let lastErr: unknown;

  // Verified 2026-09-02: a search page renders 80 cards and paginates with
  // `?page=N` (chemical/process alone was 136 graduate jobs + 153 placements).
  // Stop as soon as a page adds nothing new, so a pagination change cannot spin.
  const maxPages = Number(s.params?.maxPages ?? 6);

  for (const url of urls) {
    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = page === 1 ? url : `${url}${url.includes("?") ? "&" : "?"}page=${page}`;
      let html: string;
      try {
        html = await fetchText(pageUrl, { client: "curl" });
        anyOk = true;
      } catch (e) {
        lastErr = e;
        break;
      }
      const rows = parseGradcracker(html);
      let added = 0;
      for (const row of rows) {
        if (seen.has(row.externalId)) continue;
        seen.add(row.externalId);
        out.push({ ...row, levelHint: row.levelHint ?? fallbackLevel });
        added++;
      }
      await sleep(Number(s.params?.delayMs ?? 4000)); // see the queue note above
      if (added === 0 || rows.length < 80) break;
    }
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`gradcracker: ${s.id} — every page failed`);
  if (out.length === 0) throw new Error(`gradcracker: ${s.id} — parsed zero rows (page structure changed?)`);
  return out;
};

/** Only one source needs to pay for the sitemap; the rest reuse it this run. */
let sitemapCache: { at: number; rows: RawJob[] } | null = null;

async function fromSitemap(): Promise<RawJob[]> {
  if (sitemapCache && Date.now() - sitemapCache.at < 10 * 60_000) return sitemapCache.rows;

  // Try both clients and REPORT WHAT HAPPENED. Swallowing the reason here cost a
  // whole CI round-trip once: the run said only "the sitemap returned no job
  // URLs", which cannot distinguish "the fetch was blocked" from "the file
  // parsed but had no jobs in it" — two problems with completely different fixes.
  const attempts: string[] = [];
  let xml = "";
  for (const client of ["curl", "fetch"] as const) {
    try {
      const body = await fetchText("https://www.gradcracker.com/sitemap.xml", { client, retries: 1 });
      attempts.push(`${client}: ${body.length} bytes, starts ${JSON.stringify(body.slice(0, 60))}`);
      if (body.includes("<loc>")) {
        xml = body;
        break;
      }
    } catch (e) {
      attempts.push(`${client}: ${(e as Error).message.slice(0, 140)}`);
    }
  }
  if (!xml) throw new Error(`gradcracker sitemap unreadable — ${attempts.join(" | ")}`);
  const rows: RawJob[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(/<loc>(https?:\/\/(?:www\.)?gradcracker\.com\/hub\/\d+\/([a-z0-9-]+)\/([a-z-]+)\/(\d+)\/([a-z0-9-]+))<\/loc>/gi)) {
    const [, url, employerSlug, typeSegment, jobId, titleSlug] = m;
    if (seen.has(jobId)) continue;
    seen.add(jobId);
    rows.push({
      externalId: jobId,
      title: slugToTitle(titleSlug),
      url,
      location: null,
      postedAt: null,
      employer: prettify(employerSlug),
      levelHint: LEVEL_BY_SEGMENT[typeSegment.toLowerCase()],
    });
  }
  if (rows.length === 0) {
    // The file was readable but held no job URLs — a sitemap-index or a layout
    // change, not a block. Say which, so the next fix starts in the right place.
    throw new Error(`gradcracker sitemap parsed (${xml.length} bytes) but matched no /hub/ job URLs — sitemap index or path change?`);
  }
  sitemapCache = { at: Date.now(), rows };
  return rows;
}

function slugToTitle(slug: string): string {
  const words = slug.split("-");
  const SMALL = new Set(["and", "the", "of", "for", "at", "in", "to", "a", "an", "with", "on"]);
  return words
    .map((w, i) => {
      if (/^\d+$/.test(w)) return w;
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

const JOB_HREF =
  /https?:\/\/(?:www\.)?gradcracker\.com\/hub\/(\d+)\/([a-z0-9-]+)\/([a-z-]+)\/(\d+)\/([a-z0-9-]+)/i;

const LEVEL_BY_SEGMENT: Record<string, Level> = {
  "graduate-job": "graduate",
  "graduate-jobs": "graduate",
  "placement-year": "placement",
  "industrial-placement": "placement",
  "year-in-industry": "placement",
  "summer-internship": "internship",
  "summer-internships": "internship",
  internship: "internship",
  "work-placement": "placement",
  // Gradcracker groups year-long placements and summer internships under one
  // segment, so this is only a FALLBACK — the title ("… Summer Internship",
  // "… 12 Month Industrial Placement") almost always decides, and classify()
  // prefers the title over a hint.
  "work-placement-internship": "placement",
  "insight-day": "insight",
  "insight-event": "insight",
  event: "event",
  apprenticeship: "apprenticeship",
};

/**
 * PURE, so it can be tested against a saved page.
 *
 * ⚠️ Scan for the JOB URLS directly, never "every anchor then filter". These
 * pages are ~1 MB and a global `<a …>([\s\S]*?)</a>` over them backtracks so
 * badly it does not finish — measured, it hung a 3-minute test run. Matching the
 * href pattern first turns the same work into a linear pass.
 */
export function parseGradcracker(html: string): RawJob[] {
  const out: RawJob[] = [];
  const seen = new Set<string>();

  const hrefScan = new RegExp(`href="(${JOB_HREF.source})"`, "gi");
  const positions: Array<{ index: number; href: string; parts: RegExpMatchArray }> = [];
  for (const m of html.matchAll(hrefScan)) {
    const parts = m[1].match(JOB_HREF);
    if (parts) positions.push({ index: m.index ?? 0, href: m[1], parts });
  }

  for (let i = 0; i < positions.length; i++) {
    const { index, href, parts } = positions[i];
    const [, employerId, employerSlug, typeSegment, jobId] = parts;
    if (employerId === "9000001") continue; // the demo "featured employer" card
    if (seen.has(jobId)) continue;

    // Title: the text of the anchor that owns this href, read forward a bounded
    // distance so a malformed card cannot run away.
    const after = html.slice(index, index + 1200);
    const closeTag = after.indexOf(">");
    const endAnchor = after.indexOf("</a>", closeTag);
    if (closeTag < 0 || endAnchor < 0) continue;
    const title = decodeEntities(after.slice(closeTag + 1, endAnchor).replace(/<[^>]+>/g, " "));
    if (!title || title.length < 4 || title.length > 200) continue;
    if (/^(apply|view|read more|find out more|shortlist)/i.test(title)) continue;
    seen.add(jobId);

    const windowEnd = positions[i + 1]?.index ?? Math.min(html.length, index + 6000);
    const card = html.slice(index, windowEnd);

    const details = new Map<string, string>();
    for (const d of card.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
      details.set(decodeEntities(d[1].replace(/<[^>]+>/g, " ")).toLowerCase(), decodeEntities(d[2].replace(/<[^>]+>/g, " ")));
    }
    // The discipline line sits in the <h3> immediately after the title.
    const disciplines = decodeEntities((card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "").replace(/<[^>]+>/g, " "));

    out.push({
      externalId: jobId,
      title,
      url: href,
      location: details.get("location") ?? null,
      postedAt: null,
      closesAt: parseUkDate(details.get("deadline")),
      employer: prettify(employerSlug),
      department: [disciplines, details.get("degree required")].filter(Boolean).join(" | ") || null,
      levelHint: LEVEL_BY_SEGMENT[typeSegment.toLowerCase()],
      snippet: disciplines || null,
    });
  }
  return out;
}

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/** "November 30th, 2026" → ISO. Returns null for "Ongoing" / "Rolling" / anything odd. */
export function parseUkDate(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(Number(m[3]), month, Number(m[2])));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function prettify(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length <= 3 && /^(uk|bp|gsk|jlr|bae|abb|imi|npl|hse|tfl|ey)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
