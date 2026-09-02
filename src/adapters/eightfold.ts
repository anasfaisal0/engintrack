import { CONFIG } from "../config.ts";
import { fetchJson, sleep } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

/** Research rows record hosts with and without a scheme/trailing slash. */
const cleanHost = (h: string) => h.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

type EfPosition = {
  id: number | string;
  name: string;
  location?: string;
  locations?: string[];
  t_create?: number; // epoch seconds
  t_update?: number;
  department?: string;
  business_unit?: string;
  canonicalPositionUrl?: string;
};

/** Eightfold (careers.{company}.com) — keyless JSON, keyword search + paging. */
export const eightfold = async (s: Source): Promise<RawJob[]> => {
  if (!s.host) throw new Error(`eightfold: ${s.id} needs host (careers host)`);
  const host = cleanHost(s.host);
  const domain = s.tenant ?? s.token;
  if (!domain) throw new Error(`eightfold: ${s.id} needs tenant/token (the domain param)`);
  const queries = s.queries ?? CONFIG.defaultQueries;
  const seen = new Map<string, RawJob>();
  let anyOk = false;
  let lastErr: unknown;

  for (const q of queries) {
    for (let page = 0; page < CONFIG.maxPagesPerQuery; page++) {
      const num = 100;
      const url = `https://${host}/api/apply/v2/jobs?domain=${encodeURIComponent(domain)}&query=${encodeURIComponent(q)}&start=${page * num}&num=${num}&sort_by=timestamp`;
      let data: { positions?: EfPosition[]; count?: number };
      try {
        data = await fetchJson(url);
        anyOk = true;
      } catch (e) {
        lastErr = e;
        break;
      }
      const rows = data.positions ?? [];
      for (const p of rows) {
        const id = String(p.id);
        if (seen.has(id)) continue;
        seen.set(id, {
          externalId: id,
          title: p.name ?? "",
          url: p.canonicalPositionUrl ?? `https://${host}/careers/job/${id}`,
          location: p.location ?? p.locations?.join("; ") ?? null,
          postedAt: p.t_create ? new Date(p.t_create * 1000).toISOString() : null,
          department: [p.department, p.business_unit].filter(Boolean).join(" / ") || null,
        });
      }
      const count = data.count ?? rows.length;
      if (rows.length < num || (page + 1) * num >= count) break;
      await sleep(300);
    }
    await sleep(400);
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`eightfold: ${s.id} — every query failed`);
  return [...seen.values()];
};
