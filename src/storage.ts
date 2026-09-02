import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { FeedFile, ListingsFile, RemovedFile, Snapshot, Source, Summary } from "./types.ts";

/** data/ by default; DATA_DIR overrides for local dry-runs (use a repo-relative path on Windows). */
export const DATA_DIR = resolve(process.env.DATA_DIR ?? "data");

function readJson<T>(name: string, fallback: T): T {
  const p = resolve(DATA_DIR, name);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch (e) {
    throw new Error(`Corrupt ${p}: ${(e as Error).message}`);
  }
}

function writeJson(name: string, value: unknown, pretty = true): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const p = resolve(DATA_DIR, name);
  writeFileSync(p, (pretty ? JSON.stringify(value, null, 1) : JSON.stringify(value)) + "\n");
}

export const readRegistry = (): Source[] => {
  const r = readJson<{ version: number; sources: Source[] }>("registry.json", { version: 1, sources: [] });
  const ids = new Set<string>();
  for (const s of r.sources) {
    if (ids.has(s.id)) throw new Error(`registry.json: duplicate source id ${s.id}`);
    ids.add(s.id);
  }
  return r.sources;
};
export const readSnapshot = (): Snapshot | null => readJson<Snapshot | null>("snapshot.json", null);
export const writeSnapshot = (s: Snapshot) => writeJson("snapshot.json", s, false);
export const readFeed = (): FeedFile => readJson<FeedFile>("feed.json", { version: 1, events: [] });
export const writeFeed = (f: FeedFile) => writeJson("feed.json", f);
// listings.json is the biggest file the dashboard downloads, and nothing reads
// it by eye, so it is written compact rather than indented.
export const writeListings = (l: ListingsFile) => writeJson("listings.json", l, false);
export const readListings = (): ListingsFile => readJson<ListingsFile>("listings.json", { version: 1, generatedAt: "", listings: [] });
export const writeSummary = (s: Summary) => writeJson("summary.json", s);
export const readSummary = (): Summary | null => readJson<Summary | null>("summary.json", null);
export const readRemoved = (): RemovedFile => readJson<RemovedFile>("removed.json", { version: 1, listings: [] });
export const writeRemoved = (r: RemovedFile) => writeJson("removed.json", r);
