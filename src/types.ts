/**
 * EnginTrack – shared types.
 *
 * Three files in data/ ARE the database (committed by the daily Action):
 *   listings.json  – every LIVE early-career listing we currently see, normalised
 *   feed.json      – append-only change log (newest first, capped)
 *   summary.json   – at-a-glance totals + per-source health, read by the dashboard
 * plus snapshot.json (the watcher's memory between runs) and registry.json (the
 * employer / aggregator list – the only file a human edits).
 */

export type Level =
  | "spring-week" // first-year spring insight weeks (UK finance/tech/law)
  | "insight" // insight days, discovery programmes, tasters
  | "internship" // summer / off-cycle / co-op / vacation scheme
  | "placement" // industrial placement / year in industry / 12-month
  | "graduate" // graduate scheme / new-grad / rotational programme
  | "entry" // entry-level / junior role, no scheme wording
  | "apprenticeship"
  | "event"
  | "other";

export type Region = "UK" | "US" | "EU" | "Remote" | "Other";

export type Discipline =
  | "chem-eng" // chemical / process engineering – surfaced first
  | "mech"
  | "elec"
  | "civil"
  | "materials"
  | "energy"
  | "manufacturing"
  | "software"
  | "data"
  | "science"
  | "finance"
  | "consulting"
  | "business"
  | "ops"
  | "general";

/** One row of data/registry.json – an employer ATS board or an aggregator feed. */
export type Source = {
  id: string;
  name: string;
  /** "ats" = one employer's own board; "aggregator" = a student site / community list. */
  kind: "ats" | "aggregator";
  sector: string;
  /** Where the employer mainly hires; listings still get their own region from location. */
  region: Region | "Global";
  ats:
    | "greenhouse"
    | "lever"
    | "smartrecruiters"
    | "workable"
    | "ashby"
    | "workday"
    | "oracle"
    | "successfactors"
    | "eightfold"
    | "teamtailor"
    | "recruitee"
    | "pinpoint"
    | "icims"
    | "phenom"
    | "avature"
    | "custom"
    | "unsupported";
  token?: string;
  host?: string;
  tenant?: string;
  site?: string;
  /** Verified endpoint (informational for humans; adapters build their own). */
  endpoint?: string;
  careersUrl?: string;
  earlyCareersUrl?: string;
  /** Search terms for ATSes that need a keyword (Workday, Oracle, Eightfold). */
  queries?: string[];
  /** For aggregators: which adapter in src/aggregators handles it. */
  adapter?: string;
  /** Aggregator-specific knobs (URLs, list slugs…). */
  params?: Record<string, string>;
  /**
   * A discipline this WHOLE feed is filtered to by the source itself. Every row
   * gets it, because the source's own categorisation outranks our regex.
   */
  disciplineTag?: string;
  /** The source's own filter says every row here accepts chemical/process students. */
  acceptsChemEng?: boolean;
  /** false = keep in the list for the manual link, never fetch. */
  enabled?: boolean;
  /** How relevant to chemical/process engineering (registry hint, for the employers table). */
  chemEngRelevance?: "high" | "medium" | "low";
  notes?: string;
  verified?: string;
};

/** What an adapter returns before classification – the minimum every ATS gives us. */
export type RawJob = {
  externalId: string;
  title: string;
  url: string;
  location: string | null;
  postedAt: string | null;
  closesAt?: string | null;
  opensAt?: string | null;
  department?: string | null;
  /** Aggregators carry the employer per row; ATS rows inherit the source name. */
  employer?: string | null;
  /** Aggregators may already know the level (list type) – a hint, title wins if explicit. */
  levelHint?: Level;
  /** Short plain-text snippet when the source gives one cheaply (never full HTML). */
  snippet?: string | null;
};

/** A normalised, classified, LIVE early-career listing. */
export type Listing = {
  /** `${sourceId}:${externalId}` – stable across runs. */
  id: string;
  source: string;
  sourceName: string;
  sourceKind: "ats" | "aggregator";
  employer: string;
  sector: string;
  title: string;
  url: string;
  location: string | null;
  region: Region;
  level: Level;
  disciplines: Discipline[];
  /** True when the TITLE/discipline text names chemical or process work. */
  chemEng: boolean;
  /**
   * True when the SOURCE ITSELF says this listing accepts chemical/process
   * students – e.g. it came from Gradcracker's chemical-process feed. That is
   * the employer's own eligibility statement, which is better evidence than any
   * title regex, but it is a WEAKER claim than "this is a chem-eng role", so the
   * two are kept apart and the dashboard ranks strict matches first.
   */
  acceptsChemEng: boolean;
  postedAt: string | null;
  closesAt: string | null;
  /** An opening date the EMPLOYER stated, which may still be in the future. */
  opensAt: string | null;
  /**
   * The best available answer to "when did this open?", so the board can show
   * what is genuinely new rather than what we happened to notice.
   *
   * `openBasis` says where it came from, and that distinction is the whole point:
   *   "opens"      – the employer published an opening date. Trustworthy.
   *   "posted"     – the board published a posting date. Trustworthy.
   *   "first-seen" – NEITHER did, so this is the day WE first saw it. That is a
   *                  fact about this watcher, not about the employer, and on the
   *                  first run it is the bootstrap date for everything. The
   *                  dashboard labels these differently and never counts them as
   *                  "opened today" on a source's first run.
   */
  openedAt: string | null;
  openBasis: "opens" | "posted" | "first-seen" | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type EventKind =
  | "added" // a new early-career listing appeared
  | "opened" // a stated opening date has now been reached – applications are live
  | "opening_scheduled" // an opening date was announced and is still in the future
  | "removed" // it dropped off the board (closed / filled)
  | "closing_soon" // closesAt within CONFIG.closingSoonDays (fires once)
  | "deadline_set" // a closesAt appeared
  | "deadline_changed"; // a closesAt moved

export type FeedEvent = {
  id: string;
  kind: EventKind;
  importance: "high" | "low";
  listingId: string;
  source: string;
  sourceName: string;
  employer: string;
  title: string;
  url: string;
  location: string | null;
  region: Region;
  level: Level;
  disciplines: Discipline[];
  chemEng: boolean;
  acceptsChemEng: boolean;
  closesAt: string | null;
  opensAt: string | null;
  openedAt: string | null;
  openBasis: Listing["openBasis"];
  note: string;
  detectedAt: string;
};

/** Per-listing memory between runs. */
export type Tracked = {
  title: string;
  url: string;
  closesAt: string | null;
  opensAt: string | null;
  firstSeenAt: string;
  announcedClosingSoon: boolean;
  /** Latched so a long-open listing never re-announces itself every day. */
  announcedOpen: boolean;
  announcedOpeningScheduled: boolean;
};

export type SourceState = {
  listings: Record<string, Tracked>;
  lastOkAt: string | null;
  lastError: string | null;
  lastCount: number;
  /** Early-career rows kept after classification on the last OK run. */
  lastKept: number;
  bootstrappedAt: string | null;
};

export type Snapshot = {
  version: number;
  bootstrappedAt: string;
  lastRunAt: string;
  sources: Record<string, SourceState>;
};

export type SourceHealth = {
  id: string;
  name: string;
  kind: "ats" | "aggregator";
  ats: Source["ats"];
  sector: string;
  enabled: boolean;
  lastOkAt: string | null;
  lastError: string | null;
  lastCount: number;
  lastKept: number;
  live: number;
  chemEngLive: number;
  careersUrl: string | null;
  earlyCareersUrl: string | null;
  chemEngRelevance: Source["chemEngRelevance"] | null;
};

export type Summary = {
  version: number;
  lastCheckedAt: string;
  bootstrappedAt: string;
  runMs: number;
  totals: {
    sources: number;
    sourcesOk: number;
    sourcesFailed: number;
    listings: number;
    chemEng: number;
    acceptsChemEng: number;
    uk: number;
    us: number;
    eu: number;
    addedThisRun: number;
    removedThisRun: number;
    /** Listings whose opening date (employer-stated or board-posted) is recent. */
    openedLast7: number;
    openedLast30: number;
    eventsAllTime: number;
  };
  byLevel: Record<string, number>;
  byDiscipline: Record<string, number>;
  byRegion: Record<string, number>;
  sources: SourceHealth[];
};

export type RemovedListing = Listing & { removedAt: string };
export type RemovedFile = { version: number; listings: RemovedListing[] };
export type ListingsFile = { version: number; generatedAt: string; listings: Listing[] };
export type FeedFile = { version: number; events: FeedEvent[] };
