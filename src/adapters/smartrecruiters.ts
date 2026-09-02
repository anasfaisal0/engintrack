import { fetchJson, sleep } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type SrPosting = {
  id: string;
  name: string;
  releasedDate?: string;
  location?: { city?: string; region?: string; country?: string; remote?: boolean };
  department?: { label?: string };
  function?: { label?: string };
  ref?: string;
};

/** SmartRecruiters — keyless, paginated 100 at a time. Apply URL is derived. */
export const smartrecruiters = async (s: Source): Promise<RawJob[]> => {
  if (!s.token) throw new Error(`smartrecruiters: ${s.id} has no token`);
  const out: RawJob[] = [];
  const limit = 100;
  for (let offset = 0; offset < 2000; offset += limit) {
    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(s.token)}/postings?limit=${limit}&offset=${offset}`;
    const page = await fetchJson<{ content?: SrPosting[]; totalFound?: number }>(url);
    const rows = page.content ?? [];
    for (const p of rows) {
      const loc = [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(", ");
      out.push({
        externalId: p.id,
        title: p.name ?? "",
        url: `https://jobs.smartrecruiters.com/${s.token}/${p.id}`,
        location: p.location?.remote ? (loc ? `${loc} (Remote)` : "Remote") : loc || null,
        postedAt: p.releasedDate ?? null,
        department: [p.department?.label, p.function?.label].filter(Boolean).join(" / ") || null,
      });
    }
    if (rows.length < limit) break;
    await sleep(300);
  }
  return out;
};
