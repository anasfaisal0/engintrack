/**
 * Email one digest of what changed on the last run.
 *
 * Deliberately OFF unless GMAIL_USER + GMAIL_APP_PASSWORD are set, so the
 * watcher works fully without it. It sends nothing at all when nothing changed —
 * a daily "no new roles" email trains you to ignore the ones that matter.
 *
 * The email is written as a short plain message from a person rather than a
 * designed template, which is also the shape that lands in a Primary inbox.
 */
import nodemailer from "nodemailer";
import { readFeed, readSummary } from "../src/storage.ts";
import type { FeedEvent } from "../src/types.ts";

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;
const to = process.env.DIGEST_TO || user;
const dashboard = process.env.DASHBOARD_URL;

if (!user || !pass) {
  console.log("digest: GMAIL_USER / GMAIL_APP_PASSWORD not set — nothing sent.");
  process.exit(0);
}

const summary = readSummary();
const feed = readFeed();
if (!summary) {
  console.log("digest: no summary.json — nothing sent.");
  process.exit(0);
}

const since = Date.parse(summary.lastCheckedAt) - 60_000;
const fresh = feed.events.filter((e) => Date.parse(e.detectedAt) >= since);
const added = fresh.filter((e) => e.kind === "added");
const closing = fresh.filter((e) => e.kind === "closing_soon");

if (added.length === 0 && closing.length === 0) {
  console.log("digest: nothing changed — no email sent (silence is the signal).");
  process.exit(0);
}

/** Chem-eng first, then the rest — the same ranking the dashboard uses. */
const rank = (e: FeedEvent) => (e.chemEng ? 0 : e.acceptsChemEng ? 1 : 2);
const line = (e: FeedEvent) =>
  `${e.chemEng ? "* " : "  "}${e.employer} — ${e.title}` +
  `${e.location ? ` (${e.location})` : ""}` +
  `${e.closesAt ? ` — closes ${new Date(e.closesAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}\n    ${e.url}`;

const body: string[] = [];
if (added.length) {
  body.push(`${added.length} new listing${added.length === 1 ? "" : "s"}:`, "");
  body.push(...added.sort((a, b) => rank(a) - rank(b)).slice(0, 40).map(line));
  if (added.length > 40) body.push(`  …and ${added.length - 40} more.`);
  body.push("");
}
if (closing.length) {
  body.push(`${closing.length} closing within a week:`, "");
  body.push(...closing.sort((a, b) => rank(a) - rank(b)).slice(0, 20).map(line));
  body.push("");
}
body.push(`Live now: ${summary.totals.listings} roles, ${summary.totals.chemEng} chemical or process, ${summary.totals.uk} in the UK.`);
if (summary.totals.sourcesFailed > 0) {
  body.push(`${summary.totals.sourcesFailed} of ${summary.totals.sourcesOk + summary.totals.sourcesFailed} sources did not answer this run; their previous listings were kept rather than reported closed.`);
}
if (dashboard) body.push("", dashboard);
body.push("", "A line starting with * is a chemical or process role.");

const chem = added.filter((e) => e.chemEng).length;
const subject =
  added.length === 1 && closing.length === 0
    ? `${added[0].employer}: ${added[0].title}`.slice(0, 120)
    : `${added.length} new${chem ? `, ${chem} chem-eng` : ""}${closing.length ? `, ${closing.length} closing` : ""}`;

const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
await transport.sendMail({
  from: `EnginTrack <${user}>`,
  to,
  subject,
  text: body.join("\n"),
});
console.log(`digest: sent "${subject}" to ${to}`);
