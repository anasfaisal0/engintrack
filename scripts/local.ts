/**
 * Capture the sources that a datacentre IP cannot reach, from a machine that can.
 *
 * Run this at home now and then, then commit data/local/:
 *   npm run local
 *
 * Only Gradcracker needs it today. It blocks GitHub's IP range outright —
 * search pages and sitemap alike, both curl and Node — while answering a home
 * connection normally. Everything else in the registry polls fine from CI.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gradcracker } from "../src/aggregators/gradcracker.ts";
import type { RawJob, Source } from "../src/types.ts";

const DISCIPLINES: Array<{ slug: string; label: string }> = [
  { slug: "chemical-process", label: "Chemical & Process" },
  { slug: "science", label: "Science" },
  { slug: "mechanical-manufacturing", label: "Mechanical & Manufacturing" },
  { slug: "electronic-electrical", label: "Electronic & Electrical" },
  { slug: "civil-building", label: "Civil & Building" },
  { slug: "computing-technology", label: "Computing & Technology" },
  { slug: "maths-business", label: "Maths & Business" },
  { slug: "aerospace", label: "Aerospace" },
];

const rows = new Map<string, RawJob>();
let failures = 0;

for (const d of DISCIPLINES) {
  const source: Source = {
    id: `local-gradcracker-${d.slug}`,
    name: `Gradcracker ${d.label}`,
    kind: "aggregator",
    sector: "student-board",
    region: "UK",
    ats: "custom",
    adapter: "gradcracker",
    params: { urls: `https://www.gradcracker.com/search/${d.slug}/${d.slug}-jobs?order=dateAdded`, maxPages: "6" },
  };
  try {
    const got = await gradcracker(source);
    for (const r of got) if (!rows.has(r.externalId)) rows.set(r.externalId, r);
    console.log(`  ${d.label.padEnd(30)} ${got.length} rows`);
  } catch (e) {
    failures++;
    console.warn(`  ${d.label.padEnd(30)} FAILED: ${(e as Error).message.slice(0, 120)}`);
  }
}

// The degree-apprenticeship list sits outside the discipline hubs.
try {
  const appr = await gradcracker({
    id: "local-gradcracker-apprenticeships",
    name: "Gradcracker Degree Apprenticeships",
    kind: "aggregator",
    sector: "student-board",
    region: "UK",
    ats: "custom",
    adapter: "gradcracker",
    params: { urls: "https://www.gradcracker.com/search/all-disciplines/degree-apprenticeships", maxPages: "4", level: "apprenticeship" },
  });
  for (const r of appr) if (!rows.has(r.externalId)) rows.set(r.externalId, r);
  console.log(`  ${"Degree Apprenticeships".padEnd(30)} ${appr.length} rows`);
} catch (e) {
  failures++;
  console.warn(`  Degree Apprenticeships         FAILED: ${(e as Error).message.slice(0, 120)}`);
}

if (rows.size === 0) {
  console.error(
    "\nCaptured nothing. If every discipline returned a Cloudflare challenge, this machine is being treated as a datacentre too — try a different network.",
  );
  process.exit(1);
}

mkdirSync(resolve("data/local"), { recursive: true });
const out = { capturedAt: new Date().toISOString(), source: "gradcracker", rows: [...rows.values()] };
writeFileSync(resolve("data/local/gradcracker.json"), JSON.stringify(out, null, 1) + "\n");

const withDeadline = out.rows.filter((r) => r.closesAt).length;
console.log(
  `\ndata/local/gradcracker.json: ${out.rows.length} unique rows, ${withDeadline} with a deadline` +
    `${failures ? `, ${failures} discipline(s) failed` : ""}.\nCommit it and the next daily run will pick it up.`,
);
