import { fetchJson, sleep } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type AnJob = {
  slug: string;
  title: string;
  company_name?: string;
  url?: string;
  location?: string;
  created_at?: number; // epoch seconds
  tags?: string[];
  job_types?: string[];
  remote?: boolean;
};

/** Arbeitnow — keyless EU/DE-heavy job board API, useful for EU internships. */
export const arbeitnow = async (s: Source): Promise<RawJob[]> => {
  const maxPages = Number(s.params?.maxPages ?? 5);
  const out: RawJob[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  let lastErr: unknown;

  for (let page = 1; page <= maxPages; page++) {
    let data: { data?: AnJob[]; links?: { next?: string | null } };
    try {
      data = await fetchJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      anyOk = true;
    } catch (e) {
      lastErr = e;
      break;
    }
    const rows = data.data ?? [];
    for (const j of rows) {
      if (seen.has(j.slug)) continue;
      seen.add(j.slug);
      out.push({
        externalId: j.slug,
        title: j.title ?? "",
        url: j.url ?? `https://www.arbeitnow.com/jobs/companies/${j.slug}`,
        location: j.remote ? `${j.location ?? ""} (Remote)`.trim() : (j.location ?? null),
        postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
        employer: j.company_name ?? null,
        department: [...(j.job_types ?? []), ...(j.tags ?? [])].slice(0, 6).join(", ") || null,
      });
    }
    if (rows.length === 0 || !data.links?.next) break;
    await sleep(400);
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`arbeitnow: ${s.id} — every request failed`);
  return out;
};
