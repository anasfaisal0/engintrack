import { fetchJson } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

/** Research rows record hosts with and without a scheme/trailing slash. */
const cleanHost = (h: string) => h.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

type PpPosting = {
  id: number | string;
  title: string;
  url?: string;
  location?: { name?: string } | string | null;
  department?: { name?: string } | string | null;
  created_at?: string;
  published_at?: string;
  employment_type?: string;
};

/** Pinpoint — keyless `/postings.json`, whole board in one request. */
export const pinpoint = async (s: Source): Promise<RawJob[]> => {
  const host = s.host ? cleanHost(s.host) : s.token ? `${s.token}.pinpointhq.com` : null;
  if (!host) throw new Error(`pinpoint: ${s.id} needs host or token`);
  const data = await fetchJson<{ data?: PpPosting[] }>(`https://${host}/postings.json`);
  return (data.data ?? []).map((p) => ({
    externalId: String(p.id),
    title: p.title ?? "",
    url: p.url ?? `https://${host}/postings/${p.id}`,
    location: name(p.location),
    postedAt: p.published_at ?? p.created_at ?? null,
    department: [name(p.department), p.employment_type].filter(Boolean).join(" / ") || null,
  }));
};

const name = (v: PpPosting["location"]): string | null =>
  typeof v === "string" ? v : ((v as { name?: string } | null)?.name ?? null);
