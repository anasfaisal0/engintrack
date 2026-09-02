import { fetchJson, sleep } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type MuseJob = {
  id: number;
  name: string;
  publication_date?: string;
  locations?: Array<{ name?: string }>;
  categories?: Array<{ name?: string }>;
  levels?: Array<{ name?: string; short_name?: string }>;
  company?: { name?: string };
  refs?: { landing_page?: string };
};

/**
 * The Muse — keyless public job API with a REAL `level=Internship` filter
 * (8,320 internships across 416 pages on 2026-09-02).
 *
 * ⚠️ The working host is `www.themuse.com/api/public/jobs`. The commonly cited
 * `api-v2.themuse.com/jobs` is not it — measured 2026-09-02.
 */
export const themuse = async (s: Source): Promise<RawJob[]> => {
  const levels = (s.params?.levels ?? "Internship,Entry Level").split(",").map((l) => l.trim());
  const locations = (s.params?.locations ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  const maxPages = Number(s.params?.maxPages ?? 5);
  const out: RawJob[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  let lastErr: unknown;

  for (const level of levels) {
    for (let page = 0; page < maxPages; page++) {
      const q = new URLSearchParams({ page: String(page), level });
      for (const loc of locations) q.append("location", loc);
      let data: { results?: MuseJob[]; page_count?: number };
      try {
        data = await fetchJson(`https://www.themuse.com/api/public/jobs?${q}`);
        anyOk = true;
      } catch (e) {
        lastErr = e;
        break;
      }
      for (const j of data.results ?? []) {
        const id = String(j.id);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          externalId: id,
          title: j.name ?? "",
          url: j.refs?.landing_page ?? `https://www.themuse.com/jobs/${id}`,
          location: j.locations?.map((l) => l.name).filter(Boolean).join("; ") || null,
          postedAt: j.publication_date ?? null,
          employer: j.company?.name ?? null,
          department: j.categories?.map((c) => c.name).filter(Boolean).join(", ") || null,
          levelHint: /intern/i.test(level) ? "internship" : "entry",
        });
      }
      if ((data.page_count ?? 1) <= page + 1) break;
      await sleep(400);
    }
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`themuse: ${s.id} — every request failed`);
  return out;
};
