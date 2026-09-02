import type { RawJob, Source } from "../types.ts";
import { greenhouse } from "./greenhouse.ts";
import { lever } from "./lever.ts";
import { smartrecruiters } from "./smartrecruiters.ts";
import { workable } from "./workable.ts";
import { ashby } from "./ashby.ts";
import { workday } from "./workday.ts";
import { oracle } from "./oracle.ts";
import { eightfold } from "./eightfold.ts";
import { teamtailor } from "./teamtailor.ts";
import { recruitee } from "./recruitee.ts";
import { pinpoint } from "./pinpoint.ts";
import { trackr } from "../aggregators/trackr.ts";
import { githubList } from "../aggregators/github-list.ts";
import { rssFeed } from "../aggregators/rss.ts";
import { gradcracker } from "../aggregators/gradcracker.ts";
import { employd } from "../aggregators/employd.ts";
import { themuse } from "../aggregators/themuse.ts";
import { arbeitnow } from "../aggregators/arbeitnow.ts";
import { htmlLinks } from "../aggregators/html-links.ts";
import { nextData } from "../aggregators/next-data.ts";

export type Adapter = (source: Source) => Promise<RawJob[]>;

/**
 * ATS adapters are chosen by `source.ats`; aggregators by `source.adapter`.
 * Every adapter THROWS on failure — the runner then carries the previous state
 * forward for that source and never invents "removed" events.
 */
const ATS: Record<string, Adapter> = {
  greenhouse,
  lever,
  smartrecruiters,
  workable,
  ashby,
  workday,
  oracle,
  eightfold,
  teamtailor,
  recruitee,
  pinpoint,
};

const AGGREGATORS: Record<string, Adapter> = {
  trackr,
  "github-list": githubList,
  rss: rssFeed,
  gradcracker,
  employd,
  themuse,
  arbeitnow,
  "html-links": htmlLinks,
  "next-data": nextData,
};

export function adapterFor(source: Source): Adapter | null {
  if (source.kind === "aggregator") return AGGREGATORS[source.adapter ?? ""] ?? null;
  return ATS[source.ats] ?? null;
}

export const supportedAts = Object.keys(ATS);
export const supportedAggregators = Object.keys(AGGREGATORS);
