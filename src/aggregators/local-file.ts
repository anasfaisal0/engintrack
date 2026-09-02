import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Level, RawJob, Source } from "../types.ts";

/**
 * A source whose rows were captured on a machine that can actually reach it, and
 * committed to the repo.
 *
 * ⚠️ This exists for ONE measured reason. Gradcracker — far and away the best
 * chemical-engineering source, and the only one organised by discipline —
 * refuses GitHub's IP range outright. Verified on a hosted runner: the search
 * pages, AND `sitemap.xml`, AND `robots.txt`'s advertised routes all returned
 * Cloudflare's "Just a moment…" challenge, to curl and to Node's fetch alike,
 * within half a second of the run starting. The same URLs answer 200 from a home
 * connection. There is no header, client or pacing fix for that: it is the IP.
 *
 * So the owner runs `npm run local` at home, which writes data/local/*.json, and
 * the daily Action reads the file. The rows are real and dated; they simply age
 * between local runs, which is why `staleAfterDays` makes the file's age visible
 * as a source error rather than letting stale rows pass as fresh.
 *
 * params:
 *   file           path under the repo, e.g. "data/local/gradcracker.json"
 *   staleAfterDays warn once the capture is older than this (default 14)
 */
export const localFile = async (s: Source): Promise<RawJob[]> => {
  const rel = s.params?.file;
  if (!rel) throw new Error(`local-file: ${s.id} needs params.file`);
  const path = resolve(rel);
  if (!existsSync(path)) {
    throw new Error(`local-file: ${rel} has never been captured — run "npm run local" on a machine that can reach ${s.careersUrl ?? s.id}`);
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as { capturedAt?: string; rows?: RawJob[] };
  const rows = parsed.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`local-file: ${rel} holds no rows`);

  const ageDays = parsed.capturedAt ? (Date.now() - Date.parse(parsed.capturedAt)) / 86_400_000 : Infinity;
  const staleAfter = Number(s.params?.staleAfterDays ?? 14);
  if (ageDays > staleAfter) {
    // Deliberately a THROWN error, not a silent pass: the previous listings are
    // then carried forward and the dashboard shows the source as failing, which
    // is the honest reading of "nobody has refreshed this in a fortnight".
    throw new Error(
      `local-file: ${rel} was captured ${Math.round(ageDays)} days ago (stale after ${staleAfter}) — run "npm run local" to refresh it`,
    );
  }

  const levelHint = s.params?.level as Level | undefined;
  return rows.map((r) => ({ ...r, levelHint: r.levelHint ?? levelHint }));
};
