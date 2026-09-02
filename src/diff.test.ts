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

console.log("diff.test: all assertions passed");
