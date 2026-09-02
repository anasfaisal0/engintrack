import { fetchJson } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type AshbyJob = {
  id: string;
  title: string;
  jobUrl?: string;
  applyUrl?: string;
  location?: string;
  publishedAt?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  isListed?: boolean;
};

/** Ashby — keyless posting API, whole board in one request. */
export const ashby = async (s: Source): Promise<RawJob[]> => {
  if (!s.token) throw new Error(`ashby: ${s.id} has no token`);
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(s.token)}`;
  const data = await fetchJson<{ jobs?: AshbyJob[] }>(url);
  const jobs = (data.jobs ?? []).filter((j) => j.isListed !== false);
  return jobs.map((j) => ({
    externalId: j.id,
    title: j.title ?? "",
    url: j.jobUrl ?? j.applyUrl ?? `https://jobs.ashbyhq.com/${s.token}/${j.id}`,
    location: j.location ?? null,
    postedAt: j.publishedAt ?? null,
    department: [j.department, j.team, j.employmentType].filter(Boolean).join(" / ") || null,
  }));
};
