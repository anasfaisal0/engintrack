import type { Discipline, Level } from "./types.ts";

/**
 * Title (+ optional department / snippet) → level + disciplines. PURE, unit-tested.
 *
 * The rule that matters most (learned building the finance sibling): REQUIRE A
 * POSITIVE EARLY-CAREER SIGNAL rather than merely rejecting seniority. An ATS
 * board is the firm's entire req list, so "Analyst" alone lets in "KYC Analyst",
 * and "Engineer" alone lets in every mid-career hire. A title is kept only when
 * it names an internship / placement / graduate scheme / entry-level grade, AND
 * carries no senior marker.
 */

export type Classification = {
  level: Level;
  disciplines: Discipline[];
  chemEng: boolean;
  earlyCareer: boolean;
};

// Anything here disqualifies the title even when an early-career word is present
// ("Graduate Recruitment Manager", "Senior Process Engineer – Graduate Mentor").
const SENIOR =
  /\b(senior|snr|sr\.?|lead|principal|manager|managers|director|head of|vp|vice president|svp|evp|chief|staff engineer|experienced|executive director|managing|partner|supervisor|architect|expert|professor|lecturer|postdoc(toral)?|post-doctoral|phd|doctoral|consultant physician|registrar|nurse|midwife|teacher|cleaner|driver|warehouse operative|security officer|chef|barista|crew member|store colleague|customer assistant|team leader|foreman|superintendent|specialist ii|iii|iv|\d{1,2}\+? ?(years|yrs)( of)? experience)\b/i;

// Level detection – checked in this order; the first hit wins.
const LEVELS: Array<[Level, RegExp]> = [
  ["apprenticeship", /\b(degree )?apprentice(ship)?s?\b/i],
  [
    "spring-week",
    /\bspring (week|weeks|insight|programme|program|internship|discovery)\b|\bspring into\b|\bfirst[- ]year (insight|programme|program|spring|discovery|experience)\b|\b(first|1st)[- ]years?\b.*\b(insight|week|programme)\b/i,
  ],
  [
    "insight",
    /\binsight (day|days|week|weeks|programme|program|event|series|scheme|experience|session)s?\b|\bdiscovery (day|days|programme|program|week)\b|\bopen day\b|\btaster\b|\bearly insight\b|\bexperience (day|days|programme|week)\b|\bwomen in (tech|technology|finance|engineering|business|investment|trading)\b|\bpre[- ]?university\b|\bwork experience\b|\bshadowing\b/i,
  ],
  [
    "placement",
    /\bindustrial placement|\byear[- ]in[- ]industry|\byii\b|\bplacement (year|student|students|programme|program|scheme|opportunity|engineer|role)|\bplacements?\b|\b(12|6)[- ]month (intern|placement|student)|\bsandwich (year|student|placement|course)|\bthick sandwich|\byear[- ]long (intern|placement)|\bundergraduate (placement|year)|\bgap year\b/i,
  ],
  [
    "internship",
    /\bintern(ship|ships)?s?\b|\bsummer (analyst|associate|programme|program|student|students|scheme|intern|placement|technical|engineer|research|associate)|\boff[- ]cycle\b|\bco-?op\b|\bvacation (scheme|student|work|programme)|\bwinter (intern|analyst)|\bindustrial trainee\b|\bstagiaire\b|\bpraktikum|\bpraktikant|\bwerkstudent|\bworking student\b|\bsummer 20\d\d\b|\bstudent (engineer|placement|programme|program|scheme|analyst|technician|position)\b/i,
  ],
  [
    "graduate",
    /\bgraduates?\b|\bgrad\b|\bnew[- ]grad(uate)?s?\b|\bearly[- ]careers?\b|\brotational\b|\bleadership (development )?(programme|program|scheme)\b|\bcampus\b|\buniversity (hire|hires|recruit|recruiting|graduate)\b|\banalyst (programme|program|scheme|development)\b|\bassociate (programme|program|scheme)\b|\btrainee\b|\bfuture leaders?\b|\bemerging talent\b|\bclass of 20\d\d\b|\bfresher\b|\bgraduate scheme\b|\bschool leaver\b|\b(masters|master's|msc|meng|beng|bsc) (graduate|programme|program)\b|\bengineer[- ]in[- ]training\b|\beit\b|\bdevelopment (programme|program|scheme)\b/i,
  ],
  [
    "entry",
    /\bentry[- ]level\b|\bjunior\b|\bjr\.?\b|\bassociate (engineer|scientist|analyst|developer|consultant)\b|\bengineer (i|1)\b|\banalyst (i|1)\b|\blevel (1|i)\b|\bl1\b|\bassistant (engineer|scientist)\b|\b(0|zero|1|one)[- ]?(to|-)?[- ]?(1|2|3) years?\b|\bearly[- ]stage\b|\bnewly qualified\b/i,
  ],
  ["event", /\bwebinar|\bnetworking (event|evening|session)|\bcareers? fair|\bopen evening|\bvirtual event|\bq&a session|\bfireside|\blive session/i],
];

const DISCIPLINES: Array<[Discipline, RegExp]> = [
  [
    "chem-eng",
    /\bchem(ical)?[- ]?(eng|engineer|engineering|process)|\bchemical engineer|\bprocess (engineer|engineers|engineering|safety|design|development|technolog|control|systems|improvement|operator|operations|technician|modelling|simulation|optimi[sz]ation|scale[- ]up)|\bprocess\b(?=.*\b(engineer|graduate|intern|placement|student|scheme|programme)\b)|\brefin(ery|eries|ing)\b|\bpetrochem|\bpolymer|\bcatalys|\bformulation|\bbiopro(cess|duction|cessing)|\bpharma(ceutical)? (manufactur|process|production|engineer|sciences|technology|technical)|\bplant engineer|\bhydrogen\b|\bcarbon capture|\bccs\b|\bccus\b|\bdistillation|\breactor|\bhse engineer|\bprocess safety|\bhazop|\btechnical safety|\bfunctional safety|\bchemicals?\b|\bdownstream|\bupstream|\bmidstream|\bpetroleum engineer|\breservoir engineer|\bdrilling engineer|\bcompletions? engineer|\bwells? engineer|\bproduction engineer|\bfacilities engineer|\bseparation|\bwater treatment|\bwastewater|\benvironmental engineer|\benergy engineer|\bfuels?\b|\bcombustion|\bheat transfer|\bfluid (dynamics|mechanics|flow)|\bcfd\b|\bunit operations|\bmass transfer|\bthermodynamics|\bpiping|\bpressure (vessel|systems|equipment)|\bplant (design|operations|performance)|\bcommissioning|\bsustainable (fuels|aviation|chemistry)|\bcarbon\b|\bemissions|\bdecarboni[sz]ation|\belectrolys|\bbattery (materials|chemistry|cell)|\bcell (chemistry|engineer)|\bbrewing|\bfood (process|technolog|engineer|manufactur|production|science)|\bdairy|\bpaper (machine|mill)|\bpulp|\bcement|\bglass (manufactur|process)|\bsteel(making)?\b|\bmetallurg|\bcoating|\bink|\bpaint|\badhesive|\bsurfactant|\blubricant|\bagrochem|\bfertili[sz]er|\bcosmetic (science|formulation)|\bconsumer (goods|products) (r&d|research|science|manufactur)|\bnuclear (engineer|graduate|chemist|fuel|waste|process|safety)|\bradiochem|\bfuel cell|\bcarbon (fibre|fiber)|\bpharmaceutical\b|\bbiotech(nology)?\b|\bapi manufactur|\bgmp\b|\bvalidation engineer|\bprocess validation|\bqa\/qc|\bquality (engineer|assurance).*(pharma|chem|manufactur)/i,
  ],
  [
    "mech",
    /\bmechanical|\bmech\b|\bhvac\b|\brotating equipment|\bstress (engineer|analysis)|\bstructural (analysis|engineer)|\bcad\b|\bsolidworks|\bdesign engineer|\baerospace|\baeronautic|\bpropulsion|\bautomotive|\bvehicle|\bturbine|\bgas turbine|\bpump|\bcompressor|\bmechatronic|\brobotic|\bthermal (engineer|systems|management)|\bfea\b|\bfinite element|\bmachine design|\bmaterials handling|\bnaval architect|\bmarine engineer/i,
  ],
  [
    "elec",
    /\belectrical|\belectronic|\be&i\b|\beic\b|\binstrumentation|\bcontrol(s)? (systems|engineer|engineering)|\bautomation|\bpower systems|\bembedded|\bfirmware|\bhardware|\brf\b|\bfpga|\basic\b|\bsemiconductor|\bvlsi|\bplc\b|\bscada|\bdcs\b|\bhigh voltage|\bpower electronics|\bsignal (processing|integrity)|\bphotonic|\boptical engineer/i,
  ],
  [
    "civil",
    /\bcivil|\bstructural\b|\bgeotechnical|\binfrastructure|\bhighways|\bbridge|\brail(way)? (engineer|systems)|\btransport planning|\bconstruction|\bbuilding services|\bsurveying|\bquantity surveyor|\btunnel|\bwater (engineer|networks|resources)|\bdrainage|\bflood|\bcoastal|\bgeo-?environmental|\btown planning|\burban design/i,
  ],
  [
    "materials",
    /\bmaterials?\b|\bmetallurg|\bcorrosion|\bcoatings?\b|\bcomposites?\b|\bpolymer|\bceramic|\bwelding|\balloy|\bnanomaterial|\bmicroscopy|\bfailure analysis/i,
  ],
  [
    "energy",
    /\benergy\b|\brenewable|\bsolar|\bwind\b|\bnuclear|\boil\b|\bgas\b|\bhydrogen|\bbattery|\bbatteries|\bgrid\b|\bpower\b|\butilities|\boffshore|\bsubsea|\bdecommissioning|\bnet[- ]zero|\bsustainab|\bclimate|\bcarbon|\bccus|\bccs\b|\belectricity|\bheat network|\bstorage|\bev charging|\btransmission|\bdistribution network/i,
  ],
  [
    "manufacturing",
    /\bmanufacturing|\bproduction (engineer|graduate|intern|placement|management|planner)|\boperations engineer|\bquality engineer|\bcontinuous improvement|\blean\b|\bsix sigma|\bmaintenance|\breliability|\bindustrial engineer|\bprocess improvement|\bplant\b|\bfactory|\bshift engineer|\bpackaging|\bassembly|\bsupply chain|\blogistics|\bprocurement|\bplanning engineer|\bproject controls|\bindustrialisation|\bindustrialization/i,
  ],
  [
    "software",
    /\bsoftware|\bdeveloper|\b(front|back|full)[- ]?(end|stack)\b|\bswe\b|\bprogrammer|\bprogramming|\bdevops|\bcloud\b|\bplatform engineer|\bsite reliability|\bsre\b|\bmobile (developer|engineer)|\bios\b|\bandroid|\bweb (developer|engineer)|\bapplication (engineer|developer)|\bqa engineer|\btest engineer|\bcyber|\bsecurity engineer|\binformation technology|\btechnology (analyst|graduate|intern|programme|program|scheme|placement)|\btech(nology)? (programme|program|scheme|graduate|intern)|\bit (graduate|intern|placement|apprentice)|\bcomputer science|\bcomputing|\bsystems engineer|\bsolutions engineer|\bsalesforce|\bsap\b|\bjava\b|\bpython|\bc\+\+|\bnetwork engineer|\binfrastructure engineer|\bdigital (graduate|intern|placement|engineer|programme)|\bgame(s)? (developer|programmer)|\bml engineer|\bai engineer|\bmachine learning engineer/i,
  ],
  [
    "data",
    /\bdata\b|\banalytics|\bmachine learning|\bml\b|\bai\b|\bartificial intelligence|\bstatistic|\bquant(itative)?\b|\bresearch scientist|\bbusiness intelligence|\bbi (analyst|developer)|\bactuar|\bmodel(l)?ing analyst|\bdata scien|\bdeep learning|\bnlp\b|\bcomputer vision|\boptimi[sz]ation (analyst|scientist)|\boperations research|\beconometric/i,
  ],
  [
    "science",
    /\bscientist|\bchemist\b|\bchemistry|\bbiolog|\bbiochem|\bmicrobiol|\blaborator|\blab\b|\br&d\b|\bresearch (assistant|associate|intern|placement|technician|scientist|student|engineer)|\banalytical|\bpharmacolog|\btoxicolog|\bphysics|\bphysicist|\bgeolog|\bgeoscien|\bgeophys|\benvironmental scien|\bclinical|\bmedicinal|\bsynthesis|\bsynthetic|\bcrystal|\bspectroscop|\bmass spec|\bhplc|\bcell (culture|biology)|\bmolecular|\bgenomic|\bbioinformatic|\bimmunolog|\bpharmac|\bdrug (discovery|development|product|safety)|\bregulatory affairs|\bscience (graduate|intern|placement|programme|scheme)|\bstem\b/i,
  ],
  [
    "finance",
    /\bfinance|\bfinancial|\binvestment|\binvesting|\bbanking|\bbank\b|\btrading|\btrader|\bmarkets\b|\bsales (and|&) trading|\basset management|\bwealth|\bprivate equity|\bventure capital|\bm&a\b|\bmergers|\bequity research|\brisk\b|\baudit|\btax\b|\baccounting|\baccountant|\bactuar|\btreasury|\bfp&a|\bcredit\b|\bcompliance|\binsurance|\bunderwrit|\bcapital markets|\bcorporate finance|\bportfolio|\bfund\b|\bhedge|\bquant\b|\bstructuring|\bfixed income|\bequities|\bderivatives|\bfx\b|\bcommodit|\bpayments|\bfintech|\bchartered|\bacca\b|\bcima\b|\bica(ew)?\b|\bcfa\b/i,
  ],
  [
    "consulting",
    /\bconsult|\bstrateg|\badvisory|\btransformation|\bmanagement (trainee|programme|program|scheme|consult)|\bbusiness analyst|\bchange (management|analyst)|\bimplementation|\bclient (services|solutions)|\badvisor\b/i,
  ],
  [
    "business",
    /\bbusiness\b|\bcommercial|\bmarketing|\bsales\b|\bhr\b|\bhuman resources|\bpeople (team|partner|graduate|intern)|\bcommunications|\bbrand\b|\bproduct (manager|management|owner|analyst|marketing)|\bproject (manager|management|coordinator|engineer|controls|planner|support)|\bplanning\b|\bprocurement|\bsupply chain|\bcategory|\bmerchandis|\bcustomer|\baccount (manager|executive|management)|\brecruit|\blegal\b|\blaw\b|\bpolicy\b|\beconomics|\beconomist|\bbuying|\bbuyer\b|\bretail|\bpr\b|\bpublic relations|\bcontent|\bsocial media|\bdesign\b|\bux\b|\bgeneral management|\bmanagement (graduate|intern|scheme|programme)|\bbid\b|\btender|\bcontract(s)? (manager|analyst|engineer)|\bestimat|\bcost engineer|\bcommercial engineer/i,
  ],
  [
    "ops",
    /\boperations\b|\bops\b|\blogistics|\bsupply chain|\bplant\b|\bsite (engineer|based|operations)|\bfield (engineer|service)|\bmaintenance|\bshift\b|\bproduction\b|\bwarehouse|\bfulfil(l)?ment|\bdistribution|\bfleet|\btransport\b|\bscheduling|\bplanner\b/i,
  ],
];

// Discipline hits that only count when the title is unambiguous; a bare "gas" or
// "power" in "Gas & Power Trading Intern" should not tag finance rows as energy.
// We keep it simple: energy/ops/manufacturing/materials are only added when a
// primary engineering or science discipline is also present OR they hit twice.
const SECONDARY: Discipline[] = ["energy", "ops", "manufacturing", "materials"];
const PRIMARY_ENG: Discipline[] = ["chem-eng", "mech", "elec", "civil", "science", "software", "data"];

export function classify(title: string, extra?: { department?: string | null; snippet?: string | null; levelHint?: Level }): Classification {
  const t = norm(title);
  const dept = norm(extra?.department ?? "");
  const text = `${t} ${dept}`.trim();

  let level: Level = "other";
  for (const [lvl, re] of LEVELS) {
    if (re.test(t)) {
      level = lvl;
      break;
    }
  }
  // Department can carry the scheme wording ("Early Careers", "Internships") when the title is bare.
  if (level === "other" && dept) {
    for (const [lvl, re] of LEVELS) {
      if (re.test(dept)) {
        level = lvl;
        break;
      }
    }
  }
  if (level === "other" && extra?.levelHint) level = extra.levelHint;

  const senior = SENIOR.test(t);
  const earlyCareer = level !== "other" && level !== "event" && !senior;

  const hits: Discipline[] = [];
  const disciplineText = `${text} ${norm(extra?.snippet ?? "")}`.trim();
  for (const [d, re] of DISCIPLINES) {
    if (re.test(disciplineText)) hits.push(d);
  }
  let disciplines = hits.filter((d) => !SECONDARY.includes(d));
  const hasPrimaryEng = disciplines.some((d) => PRIMARY_ENG.includes(d));
  // A secondary discipline (energy, ops, manufacturing, materials) rides along
  // only with a primary engineering/science discipline, or when nothing else
  // matched at all. Counting repeat hits was tried and is WRONG: "Gas & Power
  // Trading Summer Analyst" matches the energy regex twice and is a finance role.
  for (const d of hits) {
    if (!SECONDARY.includes(d)) continue;
    if (hasPrimaryEng || disciplines.length === 0) disciplines.push(d);
  }
  // "business" and "finance" are noisy on engineering titles ("Process Engineer –
  // Business Unit X"); drop them when a primary engineering discipline is present
  // and they only hit once.
  if (hasPrimaryEng) {
    for (const noisy of ["business", "ops"] as Discipline[]) {
      const idx = disciplines.indexOf(noisy);
      if (idx >= 0) {
        const re = DISCIPLINES.find(([k]) => k === noisy)![1];
        const n = (disciplineText.match(new RegExp(re.source, "gi")) ?? []).length;
        if (n < 2) disciplines.splice(idx, 1);
      }
    }
  }
  if (disciplines.length === 0) disciplines = ["general"];
  // Keep chem-eng first and dedupe.
  disciplines = [...new Set(disciplines)].sort((a, b) => (a === "chem-eng" ? -1 : b === "chem-eng" ? 1 : 0));

  return { level, disciplines, chemEng: disciplines.includes("chem-eng"), earlyCareer };
}

function norm(s: string): string {
  return s
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Workday's `postedOn` is relative English ("Posted 5 Days Ago"). Approximate it. */
export function relativePostedToIso(text: string | null | undefined, now = new Date()): string | null {
  if (!text) return null;
  const s = text.toLowerCase();
  if (/today|just now|hours? ago|minutes? ago/.test(s)) return now.toISOString().slice(0, 10);
  if (/yesterday/.test(s)) return daysAgo(now, 1);
  const m = s.match(/(\d+)\+?\s*days?/);
  if (m) {
    if (s.includes("+")) return null; // "30+ days ago" – unknown
    return daysAgo(now, Number(m[1]));
  }
  const w = s.match(/(\d+)\s*weeks?/);
  if (w) return daysAgo(now, Number(w[1]) * 7);
  const mo = s.match(/(\d+)\s*months?/);
  if (mo) return daysAgo(now, Number(mo[1]) * 30);
  return null;
}

function daysAgo(now: Date, n: number): string {
  return new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
}
