import { fetchText } from "../http.ts";
import type { Level, RawJob, Source } from "../types.ts";

/**
 * Boards that server-render a Next.js page and embed the whole job list as JSON
 * in `<script id="__NEXT_DATA__">`. Reading that beats parsing the DOM: it is
 * the same data the page renders, with real ids and epoch timestamps.
 *
 * Verified 2026-09-02 on Getro, the platform behind many VC portfolio job boards
 * (e.g. jobsinvc.getro.com/jobs — 432 jobs at props.pageProps.initialState.jobs.found,
 * each with id, title, url pointing at the employer's own ATS, createdAt epoch,
 * searchableLocations[], organization.name). Guessed REST endpoints (/api/jobs,
 * /api/get_jobs) 404/406 — the embedded JSON is the only way in.
 *
 * params:
 *   urls  pipe-separated page URLs
 *   path  dot-path to the array inside __NEXT_DATA__
 *         (default "props.pageProps.initialState.jobs.found")
 *   level Level hint for every row
 */
export const nextData = async (s: Source): Promise<RawJob[]> => {
  const urls = (s.params?.urls ?? "").split("|").map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) throw new Error(`next-data: ${s.id} needs params.urls`);
  const path = (s.params?.path ?? "props.pageProps.initialState.jobs.found").split(".");
  const levelHint = s.params?.level as Level | undefined;

  const out: RawJob[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  let lastErr: unknown;

  for (const url of urls) {
    let html: string;
    try {
      html = await fetchText(url);
      anyOk = true;
    } catch (e) {
      lastErr = e;
      continue;
    }
    const raw = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
    if (!raw) {
      lastErr = new Error(`next-data: ${s.id} — no __NEXT_DATA__ block at ${url}`);
      continue;
    }
    let node: unknown;
    try {
      node = JSON.parse(raw);
    } catch (e) {
      lastErr = e;
      continue;
    }
    for (const key of path) {
      node = (node as Record<string, unknown> | null)?.[key];
      if (node === undefined || node === null) break;
    }
    if (!Array.isArray(node)) {
      lastErr = new Error(`next-data: ${s.id} — "${path.join(".")}" is not an array at ${url}`);
      continue;
    }
    for (const j of node as Record<string, unknown>[]) {
      const id = String(j.id ?? j.slug ?? "");
      const href = String(j.url ?? j.applyUrl ?? j.link ?? "");
      const title = String(j.title ?? j.name ?? "");
      if (!id || !href || !title || seen.has(id)) continue;
      seen.add(id);
      const org = j.organization as { name?: string } | undefined;
      const locs = j.searchableLocations ?? j.locations ?? j.location;
      out.push({
        externalId: id,
        title,
        url: href,
        location: Array.isArray(locs) ? locs.filter((x) => typeof x === "string").join("; ") : typeof locs === "string" ? locs : null,
        postedAt: epoch(j.createdAt ?? j.created_at ?? j.postedAt),
        employer: org?.name ?? (typeof j.company === "string" ? j.company : null),
        levelHint,
      });
    }
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`next-data: ${s.id} — every page failed`);
  if (out.length === 0) throw lastErr instanceof Error ? lastErr : new Error(`next-data: ${s.id} — parsed zero rows`);
  return out;
};

function epoch(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    if (typeof v === "string") {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
  }
  const d = new Date(v > 1e12 ? v : v * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
