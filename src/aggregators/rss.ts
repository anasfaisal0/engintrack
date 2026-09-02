import { fetchText } from "../http.ts";
import { decodeEntities } from "../adapters/teamtailor.ts";
import type { Level, RawJob, Source } from "../types.ts";

/**
 * Generic RSS / Atom job feed.
 *
 * Several UK boards (jobs.ac.uk, Madgex-powered society boards, some council and
 * government searches) still publish a per-search feed. One GET, no key, and the
 * search terms live in the URL, so a new discipline is a registry line.
 *
 * `params.url` may carry a `{q}` placeholder replaced by `params.q`.
 */
export const rssFeed = async (s: Source): Promise<RawJob[]> => {
  const raw = s.params?.url;
  if (!raw) throw new Error(`rss: ${s.id} needs params.url`);
  const urls = raw.split("|").map((u) => u.trim()).filter(Boolean);
  const levelHint = s.params?.level as Level | undefined;
  const out: RawJob[] = [];
  const seen = new Set<string>();
  let anyOk = false;
  let lastErr: unknown;

  for (const url of urls) {
    let xml: string;
    try {
      xml = await fetchText(url, { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
      anyOk = true;
    } catch (e) {
      lastErr = e;
      continue;
    }
    for (const item of parseItems(xml)) {
      const key = item.url || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ ...item, levelHint, employer: item.employer ?? s.params?.employer ?? null });
    }
    // Madgex boards (Guardian Jobs, Chemistry World) title items
    // "EMPLOYER: Role", which is the only place the employer appears.
    if (s.params?.employerInTitle === "prefix") {
      for (const row of out) {
        const m = row.title.match(/^([^:]{2,60}):\s+(.{4,})$/);
        if (m && !row.employer) {
          row.employer = titleCase(m[1]);
          row.title = m[2];
        }
      }
    }
  }
  if (!anyOk) throw lastErr instanceof Error ? lastErr : new Error(`rss: ${s.id} — every feed failed`);
  return out;
};

/** Minimal, dependency-free RSS 2.0 + Atom item parser. */
export function parseItems(xml: string): RawJob[] {
  const out: RawJob[] = [];
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  for (const b of blocks) {
    const body = b[2];
    const title = tag(body, "title");
    if (!title) continue;
    let link = tag(body, "link");
    if (!link) {
      const href = body.match(/<link\b[^>]*href="([^"]+)"/i);
      link = href?.[1] ?? null;
    }
    const guid = tag(body, "guid") ?? tag(body, "id") ?? link ?? title;
    const dateRaw = tag(body, "pubDate") ?? tag(body, "published") ?? tag(body, "updated") ?? tag(body, "dc:date");
    const d = dateRaw ? new Date(dateRaw) : null;
    out.push({
      externalId: guid.slice(0, 200),
      title,
      url: link ?? "",
      location: tag(body, "job:location") ?? tag(body, "location") ?? null,
      postedAt: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
      employer: tag(body, "job:company") ?? tag(body, "company") ?? tag(body, "author") ?? null,
      snippet: (tag(body, "description") ?? tag(body, "summary") ?? "").slice(0, 400) || null,
    });
  }
  return out.filter((r) => r.url);
}

function tag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  let v = m[1].trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) v = cdata[1];
  v = v.replace(/<[^>]+>/g, " ");
  return decodeEntities(v) || null;
}

/** Madgex feeds SHOUT the employer name; render it readably. */
function titleCase(s: string): string {
  const t = s.trim();
  if (t !== t.toUpperCase()) return t; // already mixed case – leave it alone
  return t
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\b(Uk|Nhs|Bbc|Itv|Plc|Llp|Ltd)\b/g, (w) => w.toUpperCase());
}
