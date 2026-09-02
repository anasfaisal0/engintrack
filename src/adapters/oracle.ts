import { CONFIG } from "../config.ts";
import { fetchJson, sleep } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

/** Research rows record hosts with and without a scheme/trailing slash. */
const cleanHost = (h: string) => h.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

type OracleReq = {
  Id: string;
  Title: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  ShortDescriptionStr?: string;
  JobFunction?: string;
  ExternalPostedEndDate?: string;
  ExternalPostedStartDate?: string;
};

/**
 * Oracle Cloud HCM (Recruiting Cloud) — used by a lot of large UK industrials.
 *
 * The public endpoint is `recruitingCEJobRequisitions` with a `finder=findReqs;…`
 * query. `siteNumber` identifies the external careers site and differs per
 * tenant (CX_1 / CX_2 / CX_45001 …), so it is stored on the registry row as
 * `site`. The response nests the rows under `items[0].requisitionList`.
 */
export const oracle = async (s: Source): Promise<RawJob[]> => {
  if (!s.host) throw new Error(`oracle: ${s.id} needs host (e.g. ehxx.fa.em2.oraclecloud.com)`);
  const host = cleanHost(s.host);
  const siteNumber = s.site ?? "CX_1";
  const queries = s.queries ?? CONFIG.defaultQueries;
  const seen = new Map<string, RawJob>();
  let anyOk = false;
  let lastErr: unknown;

  for (const q of queries) {
    for (let page = 0; page < CONFIG.maxPagesPerQuery; page++) {
      const limit = 50;
      const finder = `findReqs;siteNumber=${siteNumber},keyword=${encodeURIComponent(q)},limit=${limit},offset=${page * limit},sortBy=POSTING_DATES_DESC`;
      const url = `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${finder}`;
      let data: { items?: Array<{ requisitionList?: OracleReq[]; TotalJobsCount?: number }> };
      try {
        data = await fetchJson(url);
        anyOk = true;
      } catch (e) {
        lastErr = e;
        break;
      }
      const rows = data.items?.[0]?.requisitionList ?? [];
      for (const r of rows) {
        if (seen.has(r.Id)) continue;
        seen.set(r.Id, {
          externalId: r.Id,
          title: r.Title ?? "",
          url: `https://${host}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${r.Id}`,
          location: r.PrimaryLocation ?? null,
          postedAt: r.PostedDate ?? r.ExternalPostedStartDate ?? null,
          closesAt: r.ExternalPostedEndDate ?? null,
          department: r.JobFunction ?? null,
        });
      }
      const total = data.items?.[0]?.TotalJobsCount ?? rows.length;
      if (rows.length < limit || (page + 1) * limit >= total) break;
      await sleep(300);
    }
    await sleep(400);
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`oracle: ${s.id} — every query failed`);
  return [...seen.values()];
};
