import { adapterFor } from "./adapters/index.ts";
import { CONFIG } from "./config.ts";
import { diffSource } from "./diff.ts";
import { pool } from "./http.ts";
import { normalise } from "./normalise.ts";
import {
  readFeed,
  readRegistry,
  readRemoved,
  readSnapshot,
  writeFeed,
  writeListings,
  writeRemoved,
  writeSnapshot,
  writeSummary,
} from "./storage.ts";
import type { FeedEvent, Listing, RemovedListing, Snapshot, Source, SourceHealth, SourceState, Summary } from "./types.ts";

/**
 * One poll: fetch every enabled source → classify → diff against the snapshot →
 * write listings/feed/summary/removed. The Action commits whatever changed.
 *
 * Failure policy (the rule that keeps this honest): a source whose fetch throws
 * KEEPS ITS PREVIOUS STATE and contributes its previous listings. We never turn a
 * network blip into "everything closed".
 */
async function main() {
  const startedAt = Date.now();
  const now = new Date().toISOString();
  const registry = readRegistry();
  const prev = readSnapshot();
  const forceBootstrap = prev === null || prev.version !== CONFIG.snapshotVersion;
  const prevListingsById = new Map<string, Listing>();
  try {
    const { readListings } = await import("./storage.ts");
    for (const l of readListings().listings) prevListingsById.set(l.id, l);
  } catch {
    /* first run */
  }

  const enabled = registry.filter((s) => s.enabled !== false && adapterFor(s) !== null);
  const skipped = registry.filter((s) => s.enabled === false || adapterFor(s) === null);
  console.log(`EnginTrack: ${enabled.length} sources to poll (${skipped.length} skipped/unsupported)`);

  const firstSeen = new Map<string, string>();
  for (const [id, l] of prevListingsById) firstSeen.set(id, l.firstSeenAt);

  type Result = {
    source: Source;
    listings: Listing[];
    events: FeedEvent[];
    removed: Listing[];
    state: SourceState;
    ok: boolean;
    error: string | null;
    rawCount: number;
  };

  const settled = await pool(enabled, CONFIG.concurrency, async (s): Promise<Result> => {
    const prevState = prev?.sources?.[s.id];
    const adapter = adapterFor(s)!;
    try {
      const raw = await adapter(s);
      const listings = normalise(s, raw, now, firstSeen);

      // Zero-collapse guard: a big board that suddenly returns nothing is far more
      // likely to be a silent block than a firm closing every req overnight.
      if (listings.length === 0 && (prevState?.lastKept ?? 0) >= CONFIG.zeroCollapseGuard) {
        throw new Error(`zero rows but previous run kept ${prevState!.lastKept} — treating as a fetch failure`);
      }

      const { events, next, removed } = diffSource(prevState, listings, now, { bootstrap: forceBootstrap });
      next.lastCount = raw.length;
      return { source: s, listings, events, removed, state: next, ok: true, error: null, rawCount: raw.length };
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 300) ?? String(e);
      console.warn(`  ✗ ${s.id}: ${msg}`);
      // Carry the previous state and the previous listings forward untouched.
      const carried: Listing[] = [];
      for (const id of Object.keys(prevState?.listings ?? {})) {
        const l = prevListingsById.get(id);
        if (l) carried.push(l);
      }
      const state: SourceState = {
        listings: prevState?.listings ?? {},
        lastOkAt: prevState?.lastOkAt ?? null,
        lastError: msg,
        lastCount: prevState?.lastCount ?? 0,
        lastKept: prevState?.lastKept ?? 0,
        bootstrappedAt: prevState?.bootstrappedAt ?? null,
      };
      return { source: s, listings: carried, events: [], removed: [], state, ok: false, error: msg, rawCount: 0 };
    }
  });

  const results = settled.map((r) => (r.status === "fulfilled" ? r.value : null)).filter((r): r is Result => r !== null);

  // ---- assemble -------------------------------------------------------------
  const listings: Listing[] = [];
  const newEvents: FeedEvent[] = [];
  const removedNow: RemovedListing[] = [];
  const sources: Record<string, SourceState> = {};
  const health: SourceHealth[] = [];

  for (const r of results) {
    listings.push(...r.listings);
    newEvents.push(...r.events);
    for (const rl of r.removed) removedNow.push({ ...rl, removedAt: now });
    sources[r.source.id] = r.state;
  }
  // Sources we skipped keep whatever memory they had, so disabling one and
  // re-enabling it later does not re-flood the feed.
  for (const s of skipped) {
    const ps = prev?.sources?.[s.id];
    if (ps) sources[s.id] = ps;
  }

  listings.sort((a, b) => {
    if (a.chemEng !== b.chemEng) return a.chemEng ? -1 : 1;
    if (a.acceptsChemEng !== b.acceptsChemEng) return a.acceptsChemEng ? -1 : 1;
    // Then newest-open first, so what just opened sits at the top of its group.
    const at = a.openedAt ?? a.postedAt ?? a.firstSeenAt;
    const bt = b.openedAt ?? b.postedAt ?? b.firstSeenAt;
    return bt.localeCompare(at);
  });

  for (const r of results) {
    const live = r.listings.length;
    health.push({
      id: r.source.id,
      name: r.source.name,
      kind: r.source.kind,
      ats: r.source.ats,
      sector: r.source.sector,
      enabled: true,
      lastOkAt: r.state.lastOkAt,
      lastError: r.error,
      lastCount: r.rawCount || r.state.lastCount,
      lastKept: live,
      live,
      chemEngLive: r.listings.filter((l) => l.chemEng).length,
      careersUrl: r.source.careersUrl ?? null,
      earlyCareersUrl: r.source.earlyCareersUrl ?? null,
      chemEngRelevance: r.source.chemEngRelevance ?? null,
    });
  }
  for (const s of skipped) {
    health.push({
      id: s.id,
      name: s.name,
      kind: s.kind,
      ats: s.ats,
      sector: s.sector,
      enabled: false,
      lastOkAt: prev?.sources?.[s.id]?.lastOkAt ?? null,
      lastError: adapterFor(s) === null ? "no adapter for this ATS — manual link only" : "disabled in registry.json",
      lastCount: 0,
      lastKept: 0,
      live: 0,
      chemEngLive: 0,
      careersUrl: s.careersUrl ?? null,
      earlyCareersUrl: s.earlyCareersUrl ?? null,
      chemEngRelevance: s.chemEngRelevance ?? null,
    });
  }
  health.sort((a, b) => b.chemEngLive - a.chemEngLive || b.live - a.live || a.name.localeCompare(b.name));

  // ---- feed ------------------------------------------------------------------
  const feed = readFeed();
  const known = new Set(feed.events.map((e) => e.id));
  const fresh = newEvents.filter((e) => !known.has(e.id));
  fresh.sort((a, b) => (a.kind === "added" ? -1 : b.kind === "added" ? 1 : 0));
  const events = [...fresh, ...feed.events].slice(0, CONFIG.feedCap);

  // ---- removed archive --------------------------------------------------------
  const liveIds = new Set(listings.map((l) => l.id));
  const archive = readRemoved();
  const byId = new Map<string, RemovedListing>();
  for (const r of [...removedNow, ...archive.listings]) {
    if (liveIds.has(r.id)) continue; // live again – drop from the archive
    if (!byId.has(r.id)) byId.set(r.id, r); // newest removal wins
  }
  const removedList = [...byId.values()].sort((a, b) => b.removedAt.localeCompare(a.removedAt)).slice(0, CONFIG.removedCap);

  // ---- summary ----------------------------------------------------------------
  /**
   * How many listings opened in the last N days, counting only dates we can
   * actually stand behind. A `first-seen` date is when WE noticed a role, which
   * on a source's first run is every row at once — counting those would report a
   * flood of "just opened" listings that had been open for months.
   */
  const openedWithin = (rows: Listing[], days: number) => {
    const cutoff = Date.now() - days * 86_400_000;
    return rows.filter((l) => l.openedAt && l.openBasis !== "first-seen" && Date.parse(l.openedAt) >= cutoff).length;
  };

  const byLevel: Record<string, number> = {};
  const byDiscipline: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  for (const l of listings) {
    byLevel[l.level] = (byLevel[l.level] ?? 0) + 1;
    byRegion[l.region] = (byRegion[l.region] ?? 0) + 1;
    for (const d of l.disciplines) byDiscipline[d] = (byDiscipline[d] ?? 0) + 1;
  }

  const summary: Summary = {
    version: 1,
    lastCheckedAt: now,
    bootstrappedAt: prev?.bootstrappedAt ?? now,
    runMs: Date.now() - startedAt,
    totals: {
      sources: registry.length,
      sourcesOk: results.filter((r) => r.ok).length,
      sourcesFailed: results.filter((r) => !r.ok).length,
      listings: listings.length,
      chemEng: listings.filter((l) => l.chemEng).length,
      acceptsChemEng: listings.filter((l) => l.acceptsChemEng).length,
      uk: listings.filter((l) => l.region === "UK").length,
      us: listings.filter((l) => l.region === "US").length,
      eu: listings.filter((l) => l.region === "EU").length,
      addedThisRun: fresh.filter((e) => e.kind === "added").length,
      removedThisRun: fresh.filter((e) => e.kind === "removed").length,
      openedLast7: openedWithin(listings, 7),
      openedLast30: openedWithin(listings, 30),
      eventsAllTime: events.length,
    },
    byLevel,
    byDiscipline,
    byRegion,
    sources: health,
  };

  const snapshot: Snapshot = {
    version: CONFIG.snapshotVersion,
    bootstrappedAt: prev?.bootstrappedAt ?? now,
    lastRunAt: now,
    sources,
  };

  writeListings({ version: 1, generatedAt: now, listings });
  writeFeed({ version: 1, events });
  writeSummary(summary);
  writeRemoved({ version: 1, listings: removedList });
  writeSnapshot(snapshot);

  const t = summary.totals;
  console.log(
    `EnginTrack done in ${(summary.runMs / 1000).toFixed(1)}s: ${t.listings} live (${t.chemEng} chem-eng, ${t.uk} UK, ${t.us} US), ` +
      `+${t.addedThisRun} new, -${t.removedThisRun} gone, ${t.openedLast7} opened this week, ` +
      `${t.sourcesOk}/${t.sourcesOk + t.sourcesFailed} sources OK`,
  );
  if (forceBootstrap) console.log("This was a BOOTSTRAP run — baseline recorded, no events emitted.");

  // Hand the digest step the numbers without re-reading the files.
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, `added=${t.addedThisRun}\nlistings=${t.listings}\nchemeng=${t.chemEng}\n`);
  }
}

main().catch((e) => {
  console.error("EnginTrack run failed:", e);
  process.exit(1);
});
