import { fetchJson } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type WkJob = {
  id?: string | number;
  shortcode: string;
  title: string;
  url?: string;
  application_url?: string;
  published_on?: string;
  created_at?: string;
  location?: { city?: string; region?: string; country?: string; workplace_type?: string } | null;
  department?: string[] | string | null;
};

/** Workable — keyless widget endpoint, whole account in one request. */
export const workable = async (s: Source): Promise<RawJob[]> => {
  if (!s.token) throw new Error(`workable: ${s.id} has no token`);
  const url = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(s.token)}?details=true`;
  const data = await fetchJson<{ jobs?: WkJob[]; name?: string }>(url);
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const loc = [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(", ");
    return {
      externalId: String(j.shortcode ?? j.id ?? ""),
      title: j.title ?? "",
      url: j.url ?? j.application_url ?? `https://apply.workable.com/${s.token}/j/${j.shortcode}/`,
      location: j.location?.workplace_type === "remote" ? (loc ? `${loc} (Remote)` : "Remote") : loc || null,
      postedAt: j.published_on ?? j.created_at ?? null,
      department: Array.isArray(j.department) ? j.department.join(", ") : (j.department ?? null),
    };
  });
};
