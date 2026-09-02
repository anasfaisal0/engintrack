import { fetchJson } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

type LeverPost = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number; // epoch ms
  categories?: { location?: string; team?: string; department?: string; commitment?: string };
};

/** Lever — keyless, one request. `createdAt` is epoch MILLISECONDS. */
export const lever = async (s: Source): Promise<RawJob[]> => {
  if (!s.token) throw new Error(`lever: ${s.id} has no token`);
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(s.token)}?mode=json`;
  const posts = await fetchJson<LeverPost[]>(url);
  if (!Array.isArray(posts)) throw new Error(`lever: ${s.id} returned a non-array body`);
  return posts.map((p) => ({
    externalId: p.id,
    title: p.text ?? "",
    url: p.hostedUrl ?? p.applyUrl ?? "",
    location: p.categories?.location ?? null,
    postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    department: [p.categories?.department, p.categories?.team, p.categories?.commitment].filter(Boolean).join(" / ") || null,
  }));
};
