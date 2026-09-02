import assert from "node:assert/strict";
import { classify, relativePostedToIso } from "./classify.ts";
import { regionOf } from "./region.ts";

const c = (t: string, extra?: Parameters<typeof classify>[1]) => classify(t, extra);

// ---- level + early-career gate -------------------------------------------
assert.equal(c("Graduate Process Engineer").level, "graduate");
assert.equal(c("Graduate Process Engineer").earlyCareer, true);
assert.equal(c("Chemical Engineering Summer Intern 2027").level, "internship");
assert.equal(c("Industrial Placement – Process Engineering (12 months)").level, "placement");
assert.equal(c("Spring Week 2027 – Technology").level, "spring-week");
assert.equal(c("Insight Day: Women in Engineering").level, "insight");
assert.equal(c("Degree Apprentice – Chemical Engineering").level, "apprenticeship");
assert.equal(c("Junior Process Engineer").level, "entry");
assert.equal(c("Engineer in Training – Refinery").level, "graduate");

// senior markers kill it even with an early-career word
assert.equal(c("Graduate Recruitment Manager").earlyCareer, false);
assert.equal(c("Senior Process Engineer").earlyCareer, false);
assert.equal(c("Early Careers Lead").earlyCareer, false);
assert.equal(c("Principal Chemical Engineer").earlyCareer, false);
assert.equal(c("Process Engineer (5+ years experience)").earlyCareer, false);

// the "Analyst alone" lesson – no positive signal, no row
assert.equal(c("KYC Analyst").earlyCareer, false);
assert.equal(c("Process Engineer").earlyCareer, false);
assert.equal(c("Chemical Engineer – Refining").earlyCareer, false);
assert.equal(c("Teller Part Time").earlyCareer, false);
assert.equal(c("General Labor (Seasonal)").earlyCareer, false);

// department carries the wording when the title is bare
assert.equal(c("Process Engineer", { department: "Early Careers" }).level, "graduate");
assert.equal(c("Process Engineer", { department: "Early Careers" }).earlyCareer, true);
// aggregator hint only when the title says nothing
assert.equal(c("Process Engineer", { levelHint: "internship" }).level, "internship");
assert.equal(c("Graduate Process Engineer", { levelHint: "internship" }).level, "graduate");

// events are not applications
assert.equal(c("Webinar: Life at Shell").earlyCareer, false);

// ---- disciplines ------------------------------------------------------------
assert.deepEqual(c("Graduate Chemical Engineer").disciplines[0], "chem-eng");
assert.equal(c("Graduate Chemical Engineer").chemEng, true);
assert.equal(c("Process Safety Engineer – Graduate").chemEng, true);
assert.equal(c("Refinery Summer Intern").chemEng, true);
assert.equal(c("Hydrogen Technology Placement").chemEng, true);
assert.equal(c("Software Engineer Intern").chemEng, false);
assert.ok(c("Software Engineer Intern").disciplines.includes("software"));
assert.ok(c("Summer Analyst – Investment Banking").disciplines.includes("finance"));
assert.ok(c("Graduate Mechanical Engineer").disciplines.includes("mech"));
assert.ok(c("Electrical & Instrumentation Graduate").disciplines.includes("elec"));
assert.ok(c("Graduate Civil Engineer").disciplines.includes("civil"));
assert.ok(c("Data Science Intern").disciplines.includes("data"));
assert.deepEqual(c("Graduate Programme 2027").disciplines, ["general"]);
// energy only rides with a primary engineering discipline
assert.ok(c("Graduate Engineer – Offshore Wind").disciplines.includes("energy"));
assert.ok(!c("Gas & Power Trading Summer Analyst").disciplines.includes("energy"));
// pharma manufacturing counts as chem-eng
assert.equal(c("Pharmaceutical Manufacturing Graduate").chemEng, true);
// unicode dashes / whitespace do not break matching
assert.equal(c("Graduate  Chemical Engineer – 2027").chemEng, true);

// ---- region ------------------------------------------------------------------
assert.equal(regionOf("London, United Kingdom"), "UK");
assert.equal(regionOf("Grangemouth"), "UK");
assert.equal(regionOf("Birmingham, AL"), "US");
assert.equal(regionOf("Bristol, TN, United States"), "US");
assert.equal(regionOf("Houston, TX"), "US");
assert.equal(regionOf("Ludwigshafen, Germany"), "EU");
assert.equal(regionOf("Rotterdam"), "EU");
assert.equal(regionOf("Remote"), "Remote");
assert.equal(regionOf("Remote - UK"), "UK");
assert.equal(regionOf("Singapore"), "Other");
assert.equal(regionOf(""), "Other");
assert.equal(regionOf(null), "Other");
assert.equal(regionOf("Perth, Australia"), "Other");
assert.equal(regionOf("Cambridge, MA"), "US");
assert.equal(regionOf("Cambridge"), "UK");
assert.equal(regionOf("SF"), "US");
assert.equal(regionOf("NYC"), "US");
assert.equal(regionOf("Toronto, ON, Canada"), "Other");
assert.equal(regionOf("Lausanne"), "EU", "a bare LA/DC abbreviation must not match inside a European city name");

// ---- Workday relative dates ---------------------------------------------------
const now = new Date("2026-09-02T12:00:00Z");
assert.equal(relativePostedToIso("Posted Today", now), "2026-09-02");
assert.equal(relativePostedToIso("Posted Yesterday", now), "2026-09-01");
assert.equal(relativePostedToIso("Posted 5 Days Ago", now), "2026-08-28");
assert.equal(relativePostedToIso("Posted 30+ Days Ago", now), null);
assert.equal(relativePostedToIso(null, now), null);

console.log("classify.test: all assertions passed");
