/**
 * Build a SELF-CONTAINED copy of the dashboard with the data inlined.
 *
 * The live dashboard fetches data/*.json from beside itself, which needs GitHub
 * Pages or a local server. A published Artifact cannot fetch anything, so this
 * writes one file with the data embedded — a snapshot to read on a phone, not
 * the live board. It trims to what is worth carrying: everything chemical or
 * process first, then the UK, then anything with a deadline, then the rest.
 *
 *   npx tsx scripts/snapshot.ts out.html [maxListings]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readFeed, readListings, readRemoved, readSummary } from "../src/storage.ts";
import type { Listing } from "../src/types.ts";

const out = process.argv[2] ?? "snapshot.html";
const cap = Number(process.argv[3] ?? 2500);

const summary = readSummary();
const all = readListings().listings;
const score = (l: Listing) => (l.chemEng ? 0 : l.acceptsChemEng ? 1 : l.region === "UK" ? 2 : l.closesAt ? 3 : 4);
const listings = [...all].sort((a, b) => score(a) - score(b)).slice(0, cap);

const payload = {
  listings,
  summary,
  feed: { version: 1, events: readFeed().events.slice(0, 400) },
  removed: { version: 1, listings: readRemoved().listings.slice(0, 200) },
  registry: JSON.parse(readFileSync("data/registry.json", "utf8")),
};

let html = readFileSync("index.html", "utf8");

/**
 * Both replacements below ASSERT before writing. A `replace()` that quietly
 * matches nothing reports success and ships a page that loads no data — the
 * single most repeated failure mode in this workspace. The loader is matched by
 * pattern rather than by an exact string because the working copy's line endings
 * differ from the source's, which is exactly how an exact match fails silently.
 */
const loader = /\n[ \t]*Promise\.all\(\[grab\("data\/listings\.json"\)[\s\S]*?\.then\(\(\[l,s,f,r,reg\]\) => \{/;
if (!loader.test(html)) throw new Error("snapshot: the loader in index.html has changed — update scripts/snapshot.ts");
html = html.replace(
  loader,
  () =>
    `\n  const SNAPSHOT = ${JSON.stringify(payload)};\n` +
    `  Promise.resolve([{listings:SNAPSHOT.listings}, SNAPSHOT.summary, SNAPSHOT.feed,\n` +
    `                   SNAPSHOT.removed, SNAPSHOT.registry]).then(([l,s,f,r,reg]) => {`,
);

const noticeAnchor = '<div id="notice" hidden class="notice">';
if (!html.includes(noticeAnchor)) throw new Error("snapshot: the notice element has changed — update scripts/snapshot.ts");
const banner =
  `<div class="notice"><b>Snapshot</b><span>A frozen copy for reading on a phone, holding the ` +
  `${listings.length.toLocaleString("en-GB")} most relevant of ${all.length.toLocaleString("en-GB")} live listings. ` +
  `The board itself updates daily in the repo.</span></div>\n  `;
html = html.replace(noticeAnchor, banner + noticeAnchor);
html = html.replace("<title>EnginTrack</title>", "<title>EnginTrack Snapshot</title>");

writeFileSync(out, html);
console.log(`${out}: ${listings.length} of ${all.length} listings, ${(html.length / 1e6).toFixed(2)} MB`);
