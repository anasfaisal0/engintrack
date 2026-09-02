export const CONFIG = {
  /** closesAt within this many days fires a one-time "closing soon" event. */
  closingSoonDays: 7,
  /** Keep at most this many events in feed.json (newest kept). */
  feedCap: 3000,
  /** Keep at most this many rows in removed.json (newest kept). */
  removedCap: 2000,
  /** Per-request timeout (ms). */
  fetchTimeoutMs: 25_000,
  /** Retries per request before the SOURCE is marked failed for the run. */
  fetchRetries: 2,
  /** Parallel sources in flight. Each source is itself sequential. */
  concurrency: 8,
  /** Workday / Oracle / Eightfold page cap PER QUERY (Workday pages are 20 rows). */
  maxPagesPerQuery: 15,
  /** Default keyword queries for search-style ATSes. */
  defaultQueries: ["intern", "graduate", "placement", "early careers", "student"],
  /** Bump to force a clean re-bootstrap of every source (silent reseed). */
  snapshotVersion: 1,
  /** A source whose count collapses to 0 from >= this many rows is treated as a fetch
   *  failure (carry forward), not as "everything closed". Empty boards are real for
   *  small employers, so the guard only bites on a big drop. */
  zeroCollapseGuard: 25,
};

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
