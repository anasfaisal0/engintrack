import { fetchJson } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type GhJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string } | null;
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string }>;
  metadata?: Array<{ name?: string; value?: unknown }> | null;
};

/**
 * Greenhouse — the single most common board for tech/startups and a fair number
 * of UK engineering employers. Keyless, one request, whole board.
 * ⚠️ EU boards (job-boards.eu.greenhouse.io) come from the SAME API host.
 * `content=true` inflates the payload with full HTML descriptions, so we don't
 * ask for it: the title carries the classification signal.
 */
export const greenhouse = async (s: Source): Promise<RawJob[]> => {
  if (!s.token) throw new Error(`greenhouse: ${s.id} has no token`);
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(s.token)}/jobs`;
  const data = await fetchJson<{ jobs?: GhJob[] }>(url);
  const jobs = data.jobs ?? [];
  return jobs.map((j) => ({
    externalId: String(j.id),
    title: j.title ?? "",
    url: j.absolute_url,
    location: j.location?.name ?? j.offices?.map((o) => o.name).filter(Boolean).join(", ") ?? null,
    postedAt: j.first_published ?? j.updated_at ?? null,
    department: j.departments?.map((d) => d.name).filter(Boolean).join(", ") || null,
  }));
};
