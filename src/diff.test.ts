import assert from "node:assert/strict";
import { diffSource } from "./diff.ts";
import type { Listing, SourceState } from "./types.ts";

const NOW = "2026-09-02T06:00:00.000Z";
const LATER = "2026-09-03T06:00:00.000Z";

const mk = (id: string, over: Partial<Listing> = {}): Listing => ({
  id: `shell:${id}`,
  source: "shell",
  sourceName: "Shell",
  sourceKind: "ats",
  employer: "Shell",
  sector: "oil-gas",
  title: `Graduate Process Engineer ${id}`,
  url: `https://example.com/${id}`,
  location: "London, UK",
  region: "UK",
  level: "graduate",
  disciplines: ["chem-eng"],
  chemEng: true,
  acceptsChemEng: true,
  postedAt: null,
  closesAt: null,
  opensAt: null,
  openedAt: NOW,
  openBasis: "first-seen",
  firstSeenAt: NOW,
  lastSeenAt: NOW,
  ...over,
});

// 1. bootstrap is silent
{
  const r = diffSource(undefined, [mk("a"), mk("b")], NOW, { bootstrap: false });
  assert.equal(r.events.length, 0, "bootstrap emits zero events");
  assert.equal(Object.keys(r.next.listings).length, 2);
  assert.equal(r.next.bootstrappedAt, NOW);
}

// 2. added after bootstrap
{
  const seed = diffSource(undefined, [mk("a")], NOW, { bootstrap: false }).next;
  const r = diffSource(seed, [mk("a"), mk("b")], LATER, { bootstrap: false });
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].kind, "added");
  assert.equal(r.events[0].importance, "high");
  assert.equal(r.events[0].listingId, "shell:b");
  // firstSeenAt of the survivor is preserved from the seed
  assert.equal(r.next.listings["shell:a"].firstSeenAt, NOW);
}

// 3. steady state emits nothing
{
  const seed = diffSource(undefined, [mk("a")], NOW, { bootstrap: false }).next;
  const r = diffSource(seed, [mk("a")], LATER, { bootstrap: false });
  assert.equal(r.events.length, 0);
}

// 4. removed
{
  const seed = diffSource(undefined, [mk("a"), mk("b")], NOW, { bootstrap: false }).next;
  const r = diffSource(seed, [mk("a")], LATER, { bootstrap: false });
  assert.equal(r.events.length, 1);
  assert.equal(r.events[0].kind, "removed");
  assert.equal(r.removed.length, 1);
  assert.equal(r.removed[0].id, "shell:b");
  assert.equal(r.removed[0].url, "https://example.com/b");
  assert.ok(r.events[0].id.includes(LATER), "removed id carries the run timestamp");
  assert.equal(Object.keys(r.next.listings).length, 1);
}

// 5. deadline set, then changed, closing soon fires once
{
  const seed = diffSource(undefined, [mk("a")], NOW, { bootstrap: false }).next;
  const r1 = diffSource(seed, [mk("a", { closesAt: "2026-09-30" })], LATER, { bootstrap: false });
  assert.deepEqual(
    r1.events.map((e) => e.kind),
    ["deadline_set"],
  );
  const r2 = diffSource(r1.next, [mk("a", { closesAt: "2026-09-06" })], LATER, { bootstrap: false });
  assert.deepEqual(
    r2.events.map((e) => e.kind).sort(),
    ["closing_soon", "deadline_changed"],
  );
  const r3 = diffSource(r2.next, [mk("a", { closesAt: "2026-09-06" })], LATER, { bootstrap: false });
  assert.equal(r3.events.length, 0, "closing_soon does not re-fire");
}

// 6. bootstrap latches anything already inside the window
{
  const seed = diffSource(undefined, [mk("a", { closesAt: "2026-09-04" })], NOW, { bootstrap: false }).next;
  assert.equal(seed.listings["shell:a"].announcedClosingSoon, true);
  const r = diffSource(seed, [mk("a", { closesAt: "2026-09-04" })], LATER, { bootstrap: false });
  assert.equal(r.events.length, 0);
}

// 7. forced re-bootstrap (version bump) is silent even with a prev state
{
  const seed = diffSource(undefined, [mk("a")], NOW, { bootstrap: false }).next as SourceState;
  const r = diffSource(seed, [mk("a"), mk("z")], LATER, { bootstrap: true });
  assert.equal(r.events.length, 0);
}

// 8. a listing that already closed long ago never fires closing_soon
{
  const seed = diffSource(undefined, [mk("a")], NOW, { bootstrap: false }).next;
  const r = diffSource(seed, [mk("a", { closesAt: "2026-01-01" })], LATER, { bootstrap: false });
  assert.deepEqual(
    r.events.map((e) => e.kind),
    ["deadline_set"],
  );
}

// ---- opening milestones ------------------------------------------------------
// A future opening date announces itself once, and is NOT reported as open.
{
  const seeded = diffSource(undefined, [], NOW, { bootstrap: true }).next;
  const future = mk("f1", { opensAt: "2026-11-01T00:00:00.000Z" });
  const r1 = diffSource(seeded, [future], NOW, { bootstrap: false });
  const kinds = r1.events.map((e) => e.kind);
  assert.ok(kinds.includes("added"), "a brand-new listing is still 'added'");
  assert.ok(kinds.includes("opening_scheduled"), "a future opening date is announced");
  assert.ok(!kinds.includes("opened"), "a future opening date must NOT read as open");

  // It does not re-announce on the next run.
  const r2 = diffSource(r1.next, [future], LATER, { bootstrap: false });
  assert.equal(r2.events.filter((e) => e.kind === "opening_scheduled").length, 0, "opening_scheduled is latched");

  // When the date arrives, it fires 'opened' exactly once.
  const AFTER = "2026-11-02T06:00:00.000Z";
  const r3 = diffSource(r2.next, [future], AFTER, { bootstrap: false });
  assert.equal(r3.events.filter((e) => e.kind === "opened").length, 1, "opened fires when the date passes");
  const r4 = diffSource(r3.next, [future], AFTER, { bootstrap: false });
  assert.equal(r4.events.filter((e) => e.kind === "opened").length, 0, "opened is latched");
}

// A listing that was ALREADY OPEN when we first met it never announces itself.
// This is what makes adding opening-dates to an existing snapshot safe: without
// it, every previously-known listing with a past opening date would fire at once.
{
  const seeded = diffSource(undefined, [], NOW, { bootstrap: true }).next;
  const alreadyOpen = mk("a1", { opensAt: "2026-01-01T00:00:00.000Z" });
  const first = diffSource(seeded, [alreadyOpen], NOW, { bootstrap: false });
  assert.ok(first.events.some((e) => e.kind === "added"), "it is still reported as added");
  assert.equal(first.events.filter((e) => e.kind === "opened").length, 0, "but never as newly opened");
  const second = diffSource(first.next, [alreadyOpen], LATER, { bootstrap: false });
  assert.equal(second.events.filter((e) => e.kind === "opened").length, 0, "and stays quiet after that");
}

// Bootstrap latches an ALREADY-PASSED opening date, so the next run stays quiet.
{
  const past = mk("p1", { opensAt: "2026-08-01T00:00:00.000Z" });
  const boot = diffSource(undefined, [past], NOW, { bootstrap: true });
  assert.equal(boot.events.length, 0, "bootstrap emits nothing");
  const next = diffSource(boot.next, [past], LATER, { bootstrap: false });
  assert.equal(next.events.filter((e) => e.kind === "opened").length, 0, "a listing open before we arrived never fires 'opened'");
}

console.log("diff.test: all assertions passed");
