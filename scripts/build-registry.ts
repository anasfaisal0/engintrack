/**
 * Merge the hand-written aggregator list with the machine-collected employer ATS
 * list into data/registry.json — the single file the runner reads.
 *
 * Run it after editing data/aggregators.json or data/employers.json:
 *   npx tsx scripts/build-registry.ts
 *
 * It VALIDATES rather than trusting: a row missing the fields its adapter needs
 * is reported and marked `enabled: false` instead of silently returning nothing
 * forever. A silent no-op is this workspace's most repeated failure mode.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Source } from "../src/types.ts";
import { supportedAggregators, supportedAts } from "../src/adapters/index.ts";

const DATA = resolve("data");
const read = (name: string): { sources: Source[] } =>
  existsSync(resolve(DATA, name)) ? JSON.parse(readFileSync(resolve(DATA, name), "utf8")) : { sources: [] };

const aggregators = read("aggregators.json").sources ?? [];
const employers = read("employers.json").sources ?? [];

const problems: string[] = [];
const byId = new Map<string, Source>();

for (const s of [...aggregators, ...employers]) {
  if (!s.id || !s.name) {
    problems.push(`row without id/name: ${JSON.stringify(s).slice(0, 120)}`);
    continue;
  }
  if (byId.has(s.id)) {
    problems.push(`duplicate id "${s.id}" — the later row was dropped`);
    continue;
  }
  const why = validate(s);
  if (why) {
    problems.push(`${s.id}: ${why}`);
    s.enabled = false;
    s.notes = [s.notes, `DISABLED by build-registry: ${why}`].filter(Boolean).join(" | ");
  }
  byId.set(s.id, s);
}

function validate(s: Source): string | null {
  if (s.enabled === false) return null; // already off on purpose
  if (s.kind === "aggregator") {
    if (!s.adapter) return "aggregator with no adapter";
    if (!supportedAggregators.includes(s.adapter)) return `unknown adapter "${s.adapter}"`;
    return null;
  }
  if (s.ats === "unsupported") {
    s.enabled = false;
    return null; // kept deliberately, for the manual careers link
  }
  if (!supportedAts.includes(s.ats)) return `no adapter for ats "${s.ats}" — set ats to "unsupported" to keep the link only`;
  switch (s.ats) {
    case "workday":
      return s.host && s.tenant && s.site ? null : "workday needs host + tenant + site";
    case "oracle":
      return s.host ? null : "oracle needs host";
    case "eightfold":
      return s.host && (s.tenant || s.token) ? null : "eightfold needs host + tenant/token";
    case "teamtailor":
      return s.host || s.token ? null : "teamtailor needs host or token";
    default:
      return s.token || s.tenant ? null : `${s.ats} needs a token`;
  }
}

const sources = [...byId.values()].sort((a, b) => {
  if (a.kind !== b.kind) return a.kind === "aggregator" ? -1 : 1;
  return a.name.localeCompare(b.name);
});

writeFileSync(resolve(DATA, "registry.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), sources }, null, 1) + "\n");

const live = sources.filter((s) => s.enabled !== false);
const byAts: Record<string, number> = {};
for (const s of live) byAts[s.kind === "aggregator" ? `aggregator:${s.adapter}` : s.ats] = (byAts[s.kind === "aggregator" ? `aggregator:${s.adapter}` : s.ats] ?? 0) + 1;

console.log(`registry.json written: ${sources.length} sources, ${live.length} enabled`);
console.log(
  Object.entries(byAts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k.padEnd(24)} ${v}`)
    .join("\n"),
);
if (problems.length) {
  console.log(`\n${problems.length} problem row(s) — each was disabled, not silently kept:`);
  for (const p of problems) console.log(`  ! ${p}`);
}
