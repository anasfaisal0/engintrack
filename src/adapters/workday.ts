import { CONFIG } from "../config.ts";
import { fetchJson, sleep } from "../http.ts";
import { relativePostedToIso } from "../classify.ts";
import type { RawJob, Source } from "../types.ts";

type WdPosting = {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
};

/**
 * Workday — the biggest single ATS among large UK/US employers.
 *
 * ⚠️ Three facts that shape this adapter:
 *   1. It is a POST to /wday/cxs/{tenant}/{site}/jobs, not a GET.
 *   2. `limit` CAPS AT 20, so a big tenant is many round-trips. We therefore do
 *      NOT walk the whole board — we run a handful of keyword searches
 *      ("intern", "graduate", "placement"…) and page each to a cap. A firm's
 *      full req list can be thousands of rows and we only want early careers.
 *   3. `postedOn` is relative English ("Posted 5 Days Ago"), NOT a date.
 */
export const workday = async (s: Source): Promise<RawJob[]> => {
  if (!s.host || !s.tenant || !s.site) throw new Error(`workday: ${s.id} needs host+tenant+site`);
  // `host` is recorded either as the subdomain ("shell.wd3") or as the whole
  // hostname ("shell.wd3.myworkdayjobs.com"), depending on which research file a
  // row came from. Appending the domain to the latter produced
  // "…myworkdayjobs.com.myworkdayjobs.com", whose DNS failure surfaces only as a
  // bare "fetch failed" — so normalise instead of trusting the shape.
  const host = s.host.replace(/\.myworkdayjobs\.com\/?$/i, "").replace(/^https?:\/\//i, "");
  const base = `https://${host}.myworkdayjobs.com/wday/cxs/${s.tenant}/${s.site}/jobs`;
  const site = `https://${host}.myworkdayjobs.com/en-US/${s.site}`;
  const queries = s.queries ?? CONFIG.defaultQueries;
  const seen = new Map<string, RawJob>();
  let anyOk = false;
  let lastErr: unknown;

  for (const q of queries) {
    for (let page = 0; page < CONFIG.maxPagesPerQuery; page++) {
      let data: { jobPostings?: WdPosting[]; total?: number };
      try {
        data = await fetchJson(base, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: page * 20, searchText: q }),
        });
        anyOk = true;
      } catch (e) {
        lastErr = e;
        break; // this query is done; try the next one
      }
      const rows = data.jobPostings ?? [];
      for (const p of rows) {
        if (!p.externalPath) continue;
        const id = p.externalPath.split("/").pop() ?? p.externalPath;
        if (seen.has(id)) continue;
        seen.set(id, {
          externalId: id,
          title: p.title ?? "",
          url: `${site}${p.externalPath}`,
          location: p.locationsText ?? null,
          postedAt: relativePostedToIso(p.postedOn),
          department: p.bulletFields?.join(" / ") || null,
        });
      }
      const total = data.total ?? rows.length;
      if (rows.length < 20 || (page + 1) * 20 >= total) break;
      await sleep(250);
    }
    await sleep(400);
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`workday: ${s.id} — every query failed`);
  return [...seen.values()];
};
