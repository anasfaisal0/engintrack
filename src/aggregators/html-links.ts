import { fetchText, sleep } from "../http.ts";
import { decodeEntities } from "../adapters/teamtailor.ts";
import type { Level, RawJob, Source } from "../types.ts";

/**
 * A configurable parser for server-rendered job boards whose listing pages put
 * the job links straight in the HTML. One adapter covers several boards because
 * the shape is always the same: an anchor to a job URL, the title as its text,
 * and an id inside the URL.
 *
 * Verified server-rendered on 2026-09-02 (each needs its own `linkPattern`):
 *   Totaljobs      https://www.totaljobs.com/jobs/graduate-engineer
 *                  a[data-testid=job-item-title] → /job/{slug}-job{id}
 *   Reed           https://www.reed.co.uk/jobs/graduate-engineer-jobs
 *                  /jobs/{slug}/{id}
 *   StudentJob UK  https://www.studentjob.co.uk/vacancies?keyword=…
 *                  /vacancies/{id}-{slug}, plus data-job-opening-* attributes
 *
 * ⚠️ Sibling brands are NOT interchangeable. Milkround shares StepStone markup
 * with Totaljobs and renders EMPTY anchors (href="#") for the same query, so
 * "same platform" is never evidence that a board is server-rendered — measure it.
 *
 * params:
 *   urls         pipe-separated listing URLs
 *   linkPattern  a JS regex source matched against the whole page. It must expose
 *                named groups `id` and `url`, and may expose `title`.
 *   titleFrom    "anchor" (default: the link's own text) or "slug"
 *   maxPages     pages to walk (default 3)
 *   pageParam    query param for paging (default "page")
 *   level        Level hint for every row
 */
export const htmlLinks = async (s: Source): Promise<RawJob[]> => {
  const urls = (s.params?.urls ?? "").split("|").map((u) => u.trim()).filter(Boolean);
  const patternSrc = s.params?.linkPattern;
  if (urls.length === 0 || !patternSrc) throw new Error(`html-links: ${s.id} needs params.urls and params.linkPattern`);
  const pattern = new RegExp(patternSrc, "gi");
  const titleFrom = s.params?.titleFrom ?? "anchor";
  const maxPages = Number(s.params?.maxPages ?? 3);
  const pageParam = s.params?.pageParam ?? "page";
  const levelHint = s.params?.level as Level | undefined;
  const useCurl = s.params?.client === "curl";

  const out: RawJob[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  let lastErr: unknown;

  for (const url of urls) {
    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = page === 1 ? url : `${url}${url.includes("?") ? "&" : "?"}${pageParam}=${page}`;
      let html: string;
      try {
        html = await fetchText(pageUrl, useCurl ? { client: "curl" } : {});
        anyOk = true;
      } catch (e) {
        lastErr = e;
        break;
      }
      pattern.lastIndex = 0;
      let added = 0;
      for (const m of html.matchAll(pattern)) {
        const g = m.groups ?? {};
        const id = g.id ?? g.url;
        if (!id || seen.has(id)) continue;
        const href = absolute(g.url ?? "", pageUrl);
        if (!href) continue;
        const title =
          titleFrom === "slug" ? slugToTitle(g.slug ?? g.title ?? "") : decodeEntities((g.title ?? "").replace(/<[^>]+>/g, " "));
        if (!title || title.length < 5 || title.length > 200) continue;
        seen.add(id);
        added++;
        out.push({
          externalId: id,
          title,
          url: href,
          location: g.location ? decodeEntities(g.location) : null,
          postedAt: null,
          // Employer is often only present as a URL slug (Totaljobs puts it in
          // the path), so de-slug it the same way the title is handled.
          employer: g.employer ? (titleFrom === "slug" ? slugToTitle(g.employer) : decodeEntities(g.employer)) : null,
          levelHint,
        });
      }
      await sleep(1500);
      if (added === 0) break;
    }
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`html-links: ${s.id} — every page failed`);
  if (out.length === 0) throw new Error(`html-links: ${s.id} — parsed zero rows (linkPattern no longer matches?)`);
  return out;
};

function absolute(href: string, pageUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return null;
  }
}

function slugToTitle(slug: string): string {
  return decodeEntities(slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
}
