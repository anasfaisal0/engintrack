import { fetchJson } from "../http.ts";
import type { Level, RawJob, Source } from "../types.ts";

/**
 * Community-maintained internship / new-grad lists on GitHub.
 *
 * These repos (Simplify, cvrve, vanshb03, speedyapply, jobright…) are bot-updated
 * several times a day and publish a machine-readable JSON of every listing. It is
 * the richest FREE dataset for US internships and new-grad roles, and it costs us
 * one raw.githubusercontent.com GET.
 *
 * Row shapes differ slightly between repos, so every field is read defensively:
 *   company_name | company           title | position       url | link | apply_link
 *   locations[] | location           date_posted (epoch s or ISO)
 *   active / is_visible              sponsorship             terms[]
 * A row that is explicitly inactive or hidden is dropped — those are the repo's
 * own "this closed" markers, which is exactly our removal signal.
 */
export const githubList = async (s: Source): Promise<RawJob[]> => {
  const url = s.params?.url;
  if (!url) throw new Error(`github-list: ${s.id} needs params.url (a raw.githubusercontent.com JSON)`);
  const body = await fetchJson<unknown>(url, { headers: { Accept: "application/json" } });
  const rows = Array.isArray(body)
    ? body
    : ((body as { jobs?: unknown[]; listings?: unknown[]; data?: unknown[] }).jobs ??
      (body as { listings?: unknown[] }).listings ??
      (body as { data?: unknown[] }).data ??
      []);
  if (!Array.isArray(rows)) throw new Error(`github-list: ${s.id} — unexpected body shape`);

  const levelHint = (s.params?.level as Level | undefined) ?? undefined;
  const out: RawJob[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    if (raw.active === false || raw.is_visible === false) continue;
    const url2 = str(raw.url) ?? str(raw.link) ?? str(raw.apply_link) ?? str(raw.application_link);
    if (!url2) continue;
    const company = str(raw.company_name) ?? str(raw.company) ?? str(raw.employer) ?? null;
    const title = str(raw.title) ?? str(raw.position) ?? str(raw.role) ?? "";
    if (!title) continue;
    const id = str(raw.id) ?? `${company ?? ""}|${title}`.slice(0, 120);
    out.push({
      externalId: id,
      title,
      url: url2,
      location: locationOf(raw),
      postedAt: dateOf(raw.date_posted ?? raw.date_updated ?? raw.posted_date ?? raw.date),
      employer: company,
      levelHint,
      department: arr(raw.terms) ?? arr(raw.category) ?? str(raw.category) ?? null,
      snippet: typeof raw.sponsorship === "string" ? `Sponsorship: ${raw.sponsorship}` : null,
    });
  }
  return out;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const arr = (v: unknown): string | null => (Array.isArray(v) ? v.filter((x) => typeof x === "string").join(", ") || null : null);

function locationOf(raw: Record<string, unknown>): string | null {
  const l = raw.locations ?? raw.location ?? raw.locations_raw;
  if (Array.isArray(l)) return l.filter((x) => typeof x === "string").join("; ") || null;
  return str(l);
}

function dateOf(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    // epoch seconds (10 digits) or milliseconds (13)
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}
