/**
 * Turn the researched employer files in data/sources/*.json into data/employers.json.
 *
 * Those files were produced by a live-verification pass over each employer's
 * careers site (every endpoint fetched, every status and job count recorded), and
 * they are kept in the repo as the evidence behind the registry. This script is
 * the ONLY thing that reads them, so re-running it after adding a new research
 * file is how the watcher grows.
 *
 * It normalises vendor names, keeps only rows whose adapter can actually be
 * built, and demotes everything else to `unsupported` with the careers link
 * intact — an employer we cannot poll is still worth one click.
 *
 *   npx tsx scripts/import-employers.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Source } from "../src/types.ts";

type Row = Record<string, unknown>;

const DIR = resolve("data/sources");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));

/** The research files use several spellings for the same vendor. */
const ATS_ALIASES: Record<string, Source["ats"]> = {
  workday: "workday",
  greenhouse: "greenhouse",
  lever: "lever",
  smartrecruiters: "smartrecruiters",
  workable: "workable",
  ashby: "ashby",
  eightfold: "eightfold",
  teamtailor: "teamtailor",
  recruitee: "recruitee",
  pinpoint: "pinpoint",
  oracle: "oracle",
  "oracle-hcm": "oracle",
  "oracle-cloud-hcm": "oracle",
  "oracle cloud hcm": "oracle",
  successfactors: "successfactors",
  "sap-successfactors": "successfactors",
  phenom: "phenom",
  avature: "avature",
  icims: "icims",
};

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() && v !== "null" ? v.trim() : undefined);

const rows: Source[] = [];
const byId = new Map<string, Source>();
const stats: Record<string, number> = {};
let skipped = 0;

for (const file of files) {
  const parsed = JSON.parse(readFileSync(resolve(DIR, file), "utf8"));
  const list: Row[] = Array.isArray(parsed) ? parsed : (parsed.sources ?? parsed.employers ?? parsed.registry ?? []);
  for (const r of list) {
    const id = slug(String(r.id ?? r.name ?? ""));
    const name = String(r.name ?? "").trim();
    if (!id || !name) {
      skipped++;
      continue;
    }
    if (byId.has(id)) continue; // first file wins; sectors overlap between researchers

    const rawAts = String(r.ats ?? "unsupported").toLowerCase().trim();
    const ats = ATS_ALIASES[rawAts] ?? "unsupported";
    const source: Source = {
      id,
      name,
      kind: "ats",
      sector: String(r.sector ?? "other"),
      region: (["UK", "US", "EU", "Global"].includes(String(r.region)) ? String(r.region) : "UK") as Source["region"],
      ats,
      token: str(r.token),
      host: str(r.host),
      tenant: str(r.tenant),
      site: str(r.site),
      endpoint: str(r.endpoint),
      careersUrl: str(r.careersUrl),
      earlyCareersUrl: str(r.earlyCareersUrl),
      chemEngRelevance: (["high", "medium", "low"].includes(String(r.chemEngRelevance)) ? String(r.chemEngRelevance) : undefined) as
        | Source["chemEngRelevance"]
        | undefined,
      verified: str(r.verified),
      notes: str(r.notes),
    };

    // Fill the fields each adapter needs from whatever the researcher recorded.
    if (source.ats === "workday" && (!source.host || !source.tenant || !source.site)) {
      const m = String(r.endpoint ?? "").match(/https:\/\/([\w.-]+)\.myworkdayjobs\.com\/wday\/cxs\/([^/]+)\/([^/]+)\/jobs/i);
      if (m) {
        source.host = source.host ?? m[1];
        source.tenant = source.tenant ?? m[2];
        source.site = source.site ?? m[3];
      }
    }
    if (source.ats === "oracle" && !source.host) {
      const m = String(r.endpoint ?? "").match(/https:\/\/([\w.-]+)\/hcmRestApi/i);
      if (m) source.host = m[1];
    }
    if (source.ats === "oracle" && source.site && !/^CX_/i.test(source.site)) {
      const m = String(r.endpoint ?? "").match(/siteNumber=(CX_\w+)/i);
      source.site = m ? m[1] : source.site;
    }
    if (source.ats === "eightfold" && !source.tenant) source.tenant = source.token ?? undefined;
    if (source.ats === "teamtailor" && !source.host && source.token) source.host = `${source.token}.teamtailor.com`;
    if (source.ats === "pinpoint" && !source.host && source.token) source.host = `${source.token}.pinpointhq.com`;

    // Anything we cannot actually call becomes a link, not a broken poller.
    const why = missingFields(source);
    if (why) {
      source.notes = [source.notes, `Not polled: ${why}. Careers link kept for manual checking.`].filter(Boolean).join(" | ");
      source.ats = "unsupported";
      source.enabled = false;
    }
    stats[source.ats] = (stats[source.ats] ?? 0) + 1;
    byId.set(id, source);
    rows.push(source);
  }
}

function missingFields(s: Source): string | null {
  switch (s.ats) {
    case "workday":
      return s.host && s.tenant && s.site ? null : "Workday needs host + tenant + site and the research file had no usable endpoint to derive them from";
    case "oracle":
      return s.host ? null : "Oracle HCM needs the fa.*.oraclecloud.com host";
    case "eightfold":
      return s.host && (s.tenant || s.token) ? null : "Eightfold needs a careers host and a domain param";
    case "teamtailor":
    case "pinpoint":
      return s.host ? null : `${s.ats} needs a host`;
    case "greenhouse":
    case "lever":
    case "smartrecruiters":
    case "workable":
    case "ashby":
    case "recruitee":
      return s.token ? null : `${s.ats} needs a board token`;
    case "successfactors":
    case "phenom":
    case "avature":
    case "icims":
      return `no adapter for ${s.ats} yet`;
    default:
      return null; // already unsupported
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

rows.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(resolve("data/employers.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), sources: rows }, null, 1) + "\n");

const pollable = rows.filter((r) => r.enabled !== false && r.ats !== "unsupported").length;
console.log(`employers.json: ${rows.length} employers from ${files.length} research files, ${pollable} pollable, ${rows.length - pollable} link-only${skipped ? `, ${skipped} rows skipped (no id/name)` : ""}`);
console.log(
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k.padEnd(18)} ${v}`)
    .join("\n"),
);
