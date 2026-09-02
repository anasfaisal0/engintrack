import { classify } from "./classify.ts";
import { regionOf } from "./region.ts";
import type { Listing, RawJob, Source } from "./types.ts";

/**
 * RawJob → Listing. Applies the early-career gate: a row that does not name an
 * internship / placement / graduate scheme / entry grade is DROPPED here, which
 * is what keeps a 3,000-req Workday board down to the handful we care about.
 */
export function normalise(source: Source, rows: RawJob[], now: string, firstSeen: Map<string, string>): Listing[] {
  const out: Listing[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    if (!r.title || !r.url) continue;
    const c = classify(r.title, { department: r.department, snippet: r.snippet, levelHint: r.levelHint });
    if (!c.earlyCareer) continue;

    const id = `${source.id}:${r.externalId}`;
    if (seen.has(id)) continue;
    seen.add(id);

    // Region comes from the listing's own location. When a row carries none,
    // fall back to the SOURCE's region — a UK-only board (Reed, Totaljobs,
    // Gradcracker) advertising a row with no location string is still a UK row,
    // and reporting it as "Other" would hide it from every regional filter.
    // Only a source pinned to one real region may do this; a global board stays
    // honest and reports Other.
    let region = regionOf(r.location);
    if (region === "Other" && !r.location && (source.region === "UK" || source.region === "US" || source.region === "EU")) {
      region = source.region;
    }
    // The source's own filter is evidence in its own right: a row on
    // Gradcracker's chemical-process feed is one the EMPLOYER said accepts
    // chemical/process students. Fold that in as a discipline, but keep the
    // strict `chemEng` claim tied to the title text.
    const disciplines = [...c.disciplines];
    if (source.disciplineTag && !disciplines.includes(source.disciplineTag as never)) {
      disciplines.push(source.disciplineTag as never);
      if (disciplines.length > 1) {
        const i = disciplines.indexOf("general");
        if (i >= 0) disciplines.splice(i, 1);
      }
    }

    out.push({
      id,
      source: source.id,
      sourceName: source.name,
      sourceKind: source.kind,
      employer: (r.employer ?? source.name).trim(),
      sector: source.sector,
      title: r.title.replace(/\s+/g, " ").trim(),
      url: r.url,
      location: r.location?.replace(/\s+/g, " ").trim() || null,
      region,
      level: c.level,
      disciplines,
      chemEng: c.chemEng,
      acceptsChemEng: c.chemEng || source.acceptsChemEng === true,
      postedAt: iso(r.postedAt),
      closesAt: iso(r.closesAt ?? null),
      opensAt: iso(r.opensAt ?? null),
      firstSeenAt: firstSeen.get(id) ?? now,
      lastSeenAt: now,
    });
  }
  return out;
}

function iso(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  // Guard against obviously wrong epochs (a 0 or a far-future placeholder).
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2100) return null;
  return d.toISOString();
}
