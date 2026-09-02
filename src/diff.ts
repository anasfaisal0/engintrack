import { CONFIG } from "./config.ts";
import type { FeedEvent, Listing, SourceState, Tracked } from "./types.ts";

/**
 * The brain. PURE, unit-tested.
 *
 * Given one source's previous memory and the listings it returned this run,
 * produce the events to surface and the next memory. Invariants:
 *   1. A source's first successful run is a SILENT bootstrap – zero events.
 *      This is per-source, so adding an employer never floods the feed.
 *   2. closing_soon fires once per listing (latched).
 *   3. `removed` and `deadline_changed` carry the run timestamp in their id so
 *      an oscillating value cannot be false-deduped against an old feed entry.
 *   4. The caller only invokes this when the fetch SUCCEEDED. On failure the
 *      previous state is carried forward untouched (never invent "removed").
 */
export function diffSource(
  prev: SourceState | undefined,
  current: Listing[],
  now: string,
  opts: { bootstrap: boolean },
): { events: FeedEvent[]; next: SourceState; removed: Listing[] } {
  const events: FeedEvent[] = [];
  const removed: Listing[] = [];
  const nowMs = Date.parse(now);
  const soonMs = CONFIG.closingSoonDays * 86_400_000;
  const prevListings = prev?.listings ?? {};
  const nextListings: Record<string, Tracked> = {};

  const bootstrap = opts.bootstrap || prev === undefined || prev.bootstrappedAt === null;

  for (const l of current) {
    const was = prevListings[l.id];
    const tracked: Tracked = {
      title: l.title,
      url: l.url,
      closesAt: l.closesAt,
      firstSeenAt: was?.firstSeenAt ?? l.firstSeenAt ?? now,
      announcedClosingSoon: was?.announcedClosingSoon ?? false,
    };

    if (!bootstrap) {
      if (!was) {
        events.push(ev("added", "high", l, now, `New ${l.level.replace("-", " ")} listing`, `${l.id}|added`));
      } else {
        if (l.closesAt && !was.closesAt) {
          events.push(ev("deadline_set", "low", l, now, `Deadline set: ${fmt(l.closesAt)}`, `${l.id}|deadline_set|${l.closesAt}`));
        } else if (l.closesAt && was.closesAt && l.closesAt !== was.closesAt) {
          events.push(
            ev("deadline_changed", "low", l, now, `Deadline moved ${fmt(was.closesAt)} → ${fmt(l.closesAt)}`, `${l.id}|deadline_changed|${now}`),
          );
        }
      }
      if (l.closesAt && !tracked.announcedClosingSoon) {
        const closeMs = Date.parse(l.closesAt);
        if (!Number.isNaN(closeMs) && closeMs - nowMs <= soonMs && closeMs >= nowMs - 86_400_000) {
          tracked.announcedClosingSoon = true;
          events.push(ev("closing_soon", "high", l, now, `Closes ${fmt(l.closesAt)}`, `${l.id}|closing_soon`));
        }
      }
    } else if (l.closesAt) {
      // On bootstrap, latch anything already inside the window so the next run
      // doesn't fire "closing soon" for listings that were closing all along.
      const closeMs = Date.parse(l.closesAt);
      if (!Number.isNaN(closeMs) && closeMs - nowMs <= soonMs) tracked.announcedClosingSoon = true;
    }
    nextListings[l.id] = tracked;
  }

  if (!bootstrap) {
    const currentIds = new Set(current.map((l) => l.id));
    for (const [id, was] of Object.entries(prevListings)) {
      if (currentIds.has(id)) continue;
      const ghost = ghostListing(id, was, current[0]);
      removed.push(ghost);
      events.push(ev("removed", "low", ghost, now, "Listing removed from the board", `${id}|removed|${now}`));
    }
  }

  const next: SourceState = {
    listings: nextListings,
    lastOkAt: now,
    lastError: null,
    lastCount: prev?.lastCount ?? current.length,
    lastKept: current.length,
    bootstrappedAt: bootstrap ? now : (prev?.bootstrappedAt ?? now),
  };
  return { events, next, removed };
}

function ev(kind: FeedEvent["kind"], importance: FeedEvent["importance"], l: Listing, now: string, note: string, id: string): FeedEvent {
  return {
    id,
    kind,
    importance,
    listingId: l.id,
    source: l.source,
    sourceName: l.sourceName,
    employer: l.employer,
    title: l.title,
    url: l.url,
    location: l.location,
    region: l.region,
    level: l.level,
    disciplines: l.disciplines,
    chemEng: l.chemEng,
    acceptsChemEng: l.acceptsChemEng,
    closesAt: l.closesAt,
    note,
    detectedAt: now,
  };
}

/** A removed listing only exists in memory as a Tracked; rebuild enough of a
 *  Listing for the event + archive from the id and a sibling row's source fields. */
function ghostListing(id: string, was: Tracked, sibling: Listing | undefined): Listing {
  const source = id.slice(0, id.indexOf(":"));
  return {
    id,
    source,
    sourceName: sibling?.sourceName ?? source,
    sourceKind: sibling?.sourceKind ?? "ats",
    employer: sibling?.sourceKind === "aggregator" ? was.title.split(" – ")[0] : (sibling?.employer ?? source),
    sector: sibling?.sector ?? "",
    title: was.title,
    url: was.url,
    location: null,
    region: "Other",
    level: "other",
    disciplines: ["general"],
    chemEng: false,
    acceptsChemEng: false,
    postedAt: null,
    closesAt: was.closesAt,
    opensAt: null,
    firstSeenAt: was.firstSeenAt,
    lastSeenAt: was.firstSeenAt,
  };
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
