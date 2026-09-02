import { fetchText } from "../http.ts";
import type { RawJob, Source } from "../types.ts";

/**
 * employd (employdapp.com/board) — a curated early-careers board with no public
 * API. robots.txt allows /board. The page is a Next.js app whose RSC payload
 * carries `{company, opportunities[]}` objects as escaped JSON inside
 * `self.__next_f.push(...)` chunks, so it is readable server-side without a
 * browser.
 *
 * ⚠️ This is a SCRAPE. It THROWS when the payload shape changes, so the runner
 * carries the previous state forward instead of reporting every listing removed.
 */
export const employd = async (s: Source): Promise<RawJob[]> => {
  const url = s.params?.url ?? "https://employdapp.com/board";
  const html = await fetchText(url);

  // The RSC stream escapes the JSON; join the pushed chunks, then unescape.
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g)].map((m) => m[1]);
  const joined = chunks.join("");
  const text = joined
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");

  const out: RawJob[] = [];
  const seen = new Set<string>();
  // Each opportunity object carries an id, title/role, link and status.
  for (const m of text.matchAll(/\{"id":"([^"]+)"[^{}]*?"(?:title|role|name)":"([^"]{3,200})"[^{}]*?\}/g)) {
    const block = m[0];
    const id = m[1];
    if (seen.has(id)) continue;
    const link = block.match(/"(?:link|url|applicationLink|applyUrl)":"(https?:[^"]+)"/)?.[1];
    if (!link) continue;
    seen.add(id);
    out.push({
      externalId: id,
      title: m[2],
      url: link,
      location: block.match(/"location":"([^"]*)"/)?.[1] || null,
      postedAt: block.match(/"(?:createdAt|postedAt|updatedAt)":"([^"]+)"/)?.[1] ?? null,
      closesAt: block.match(/"(?:deadline|closingDate|closesAt)":"([^"]+)"/)?.[1] ?? null,
      employer: block.match(/"company(?:Name)?":"([^"]+)"/)?.[1] ?? null,
      department: block.match(/"sector":"([^"]*)"/)?.[1] || null,
      levelHint: "internship",
    });
  }
  if (out.length === 0) throw new Error("employd: parsed zero opportunities — the RSC payload shape changed");
  return out;
};
