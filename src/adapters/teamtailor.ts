import { fetchText } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

/** Research rows record hosts with and without a scheme/trailing slash. */
const cleanHost = (h: string) => h.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

/**
 * TeamTailor — no keyless REST API, but every career site publishes a JSON-LD
 * `JobPosting` block per job and a plain jobs index. We parse the index page's
 * embedded JSON-LD (`@type: JobPosting` inside an ItemList) which is
 * server-rendered, so no browser is needed.
 */
export const teamtailor = async (s: Source): Promise<RawJob[]> => {
  const host = s.host ? cleanHost(s.host) : s.token ? `${s.token}.teamtailor.com` : null;
  if (!host) throw new Error(`teamtailor: ${s.id} needs host or token`);

  // Every TeamTailor career site also serves /jobs.json — a JSON Feed 1.1
  // document listing the same jobs. It is far steadier than scraping JSON-LD out
  // of the HTML, so try it first and keep the parse below as the fallback.
  try {
    const feed = JSON.parse(await fetchText(`https://${host}/jobs.json`)) as {
      items?: Array<{ id?: string; url?: string; title?: string; date_published?: string; tags?: string[]; summary?: string }>;
    };
    const items = feed.items ?? [];
    if (items.length > 0) {
      return items
        .filter((i) => i.url && i.title)
        .map((i) => ({
          externalId: String(i.id ?? i.url),
          title: String(i.title),
          url: String(i.url),
          location: i.tags?.find((t) => /,|\bremote\b|[A-Z]/.test(t)) ?? null,
          postedAt: i.date_published ?? null,
          department: i.tags?.join(", ") || null,
        }));
    }
  } catch {
    // fall through to the HTML parse
  }

  const html = await fetchText(`https://${host}/jobs`);
  const out: RawJob[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    for (const node of flatten(parsed)) {
      if (node["@type"] !== "JobPosting") continue;
      const url = String(node.url ?? node.sameAs ?? "");
      const id = url.split("/").pop() ?? url;
      if (!url || seen.has(id)) continue;
      seen.add(id);
      out.push({
        externalId: id,
        title: String(node.title ?? ""),
        url,
        location: locationOf(node),
        postedAt: node.datePosted ? String(node.datePosted) : null,
        closesAt: node.validThrough ? String(node.validThrough) : null,
        department: node.occupationalCategory ? String(node.occupationalCategory) : null,
      });
    }
  }
  // Fallback: plain anchors to /jobs/<id>-<slug> when JSON-LD is absent.
  if (out.length === 0) {
    for (const a of html.matchAll(/href="(https?:\/\/[^"]*\/jobs\/(\d+)-[^"]*)"[^>]*>\s*([^<]{3,160}?)\s*</gi)) {
      if (seen.has(a[2])) continue;
      seen.add(a[2]);
      out.push({ externalId: a[2], title: decodeEntities(a[3]), url: a[1], location: null, postedAt: null });
    }
  }
  if (out.length === 0) throw new Error(`teamtailor: ${s.id} — no JobPosting rows found (layout changed?)`);
  return out;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* flatten(node: any): Generator<any> {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) yield* flatten(n);
    return;
  }
  yield node;
  for (const key of ["itemListElement", "item", "@graph", "mainEntity"]) {
    if (node[key]) yield* flatten(node[key]);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function locationOf(node: any): string | null {
  const j = node.jobLocation;
  const one = Array.isArray(j) ? j[0] : j;
  const a = one?.address;
  if (!a) return typeof j === "string" ? j : null;
  return [a.addressLocality, a.addressRegion, a.addressCountry?.name ?? a.addressCountry].filter(Boolean).join(", ") || null;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, " ")
    .trim();
}
