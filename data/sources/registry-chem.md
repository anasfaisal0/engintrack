# UK Chem-Eng-Relevant Employer Registry — Chemicals / Materials / Pharma / FMCG / Food & Drink / Personal Care

Live-verified 65 employers. Verification date: 2026-09-02 (curl -k, Chrome UA, from a Windows box behind AV TLS interception).


## How to read this table

- **ats**: the discovered applicant-tracking-system vendor (or `unsupported` if no keyless machine-readable endpoint could be found in the time budget).

- **endpoint**: exact verified request (method + URL, plus JSON body for POST/Workday).

- **status/totalJobs**: live HTTP status and job count *at verification time* — counts fluctuate daily and totalJobs for Workday is often capped by the `limit` param (20) rather than the true total.

- **cycle**: ANNUAL (fixed autumn application window, typical of graduate schemes) vs ROLLING (posted/removed year-round, typical of internships and entry-level operational roles) — noted per employer below.


## Chemicals

| Employer | ATS | Endpoint | Status | Jobs | Chem-Eng | Notes |
|---|---|---|---|---|---|---|
| **AkzoNobel** | successfactors | `GET https://careers.akzonobel.com/search/?q=graduate (SAP SuccessFactors CSB, server-re...` | 200 | None | high | SuccessFactors CSB confirmed AND server-renders job titles directly in HTML (same simple template as Lubrizol/Syensqo) - reliably scrapeable with a jobTitle regex. Paints/coatings manufacturer (Dulux, International Pa... |
| **Arkema** | successfactors | `GET https://jobs.arkema.com/search/?q=graduate (SAP SuccessFactors CSB, server-rendered...` | 200 | None | high | SuccessFactors CSB confirmed (title tag 'Graduate - Arkema Jobs') and server-renders job cards, but regex matches returned generic placeholder-looking titles ('Mechanical Engineer Job', 'Blank Template Job') at verifi... |
| **BASF** | successfactors | `https://basf.jobs/search/?q=graduate (SAP SuccessFactors Career Site Builder, HTML)` | 200 | None | high | basf.jobs confirmed as SAP SuccessFactors CSB (page title 'Graduate - BASF SE Jobs'), but this instance renders the result grid via client-side JS (j2w.SearchManager/jobResultsCard), so raw HTML has no embedded job ca... |
| **Covestro** | workday | `POST https://covestro.wd3.myworkdayjobs.com/wday/cxs/covestro/cov_external/jobs  body={...` | 200 | 140 | high | Workday confirmed live, total=140 globally (searchText='graduate' returned 0 - use 'intern' instead, which matched). Mostly US/DE sites in current postings; filter by locationCountry facet for UK. Rolling internship p... |
| **CPI (Centre for Process Innovation)** | unsupported | `-` | 200 | None | high | UK Catapult centre for process/formulation scale-up (Wilton, Redcar, Sedgefield) - directly chem-eng relevant, but the careers page only embeds HubSpot forms, no ATS vendor found. Watcher should HTML-diff this page di... |
| **Croda** | unsupported | `-` | 200 | None | high | Site runs on Sitecore (VisitorIdentification.js) with a 'vacanciesListLastSearch' cookie hinting a custom vacancy widget, not any known third-party ATS (checked Workday/SuccessFactors/Greenhouse/Lever/SmartRecruiters/... |
| **Dow** | workday | `POST https://dow.wd1.myworkdayjobs.com/wday/cxs/dow/ExternalCareers/jobs  body={"applie...` | 200 | 20 | high | Workday confirmed live (200, jobPostings[] returned). totalJobs is the 'limit' cap (20) not the true total - Workday response includes a 'total' field per query; filter by location facet for UK-only roles. Global filt... |
| **DuPont** | phenom | `-` | 200 | None | high | Confirmed Phenom People platform (data-ph-id attrs, cdn.phenompeople.com assets, tenant code DUPOUS) - NOT Eightfold despite similar branding; the Eightfold-style /api/apply/v2/jobs?domain= endpoint returns 'Tenant no... |
| **Ecolab** | phenom | `-` | 200 | None | medium | Confirmed Phenom People platform (same vendor as DuPont/PPG) - no keyless JSON endpoint found in the time budget. Dedicated 'Programs for Students and Recent Grads' page confirms internship pipeline exists. 325 total ... |
| **Elementis** | unsupported | `-` | 200 | None | medium | No ATS vendor fingerprint found on the careers landing page; vacancies appear to be listed via Glassdoor/Indeed rather than a discoverable own-site job board API. |
| **Evonik** | workday | `POST https://evonik.wd3.myworkdayjobs.com/wday/cxs/evonik/External_Careers/jobs  body={...` | 200 | 11 | high | Workday confirmed live; total=11 matched searchText='graduate'. ETAD graduate programme runs ANNUAL autumn intake. |
| **Huntsman** | workday | `POST https://huntsman.wd1.myworkdayjobs.com/wday/cxs/huntsman/Huntsman/jobs  body={"app...` | 200 | 6 | high | Workday confirmed live; total=6 matched 'graduate' filter (search picks up 'intern' roles too under same query oddly - Workday's fuzzy match). Mostly non-UK sites in current postings. |
| **INEOS** | unsupported | `-` | None | None | high | careers.ineos.com is a bespoke in-house job board (URL pattern /jobs/{slug}_{id}/details); no vendor ATS fingerprint found (checked for Greenhouse/Lever/SmartRecruiters/Workable/Ashby/Workday/SuccessFactors/iCIMS/Tale... |
| **Innospec** | unsupported | `-` | 404 | None | medium | No dedicated /careers/ vacancy-list page found (404); roles surface via LinkedIn/Indeed/The Engineer Jobs/StudySmarter Talents rather than an own-site ATS. Ellesmere Port specialty chemicals site - internships/placeme... |
| **Johnson Matthey** | workday | `POST https://matthey.wd3.myworkdayjobs.com/wday/cxs/matthey/Ext_Career_Site/jobs  body=...` | 200 | 118 | high | Workday confirmed live, total=118 open reqs globally, 3 matched searchText='graduate' (incl. UK LEAD Graduate Rotational Programme). LEAD graduate scheme is ANNUAL (cohort intake each autumn: '2027 cohort' opens ~2026). |
| **Kemira** | successfactors | `GET https://career2.successfactors.eu/career?company=kemira&site=&lang=en_GB` | 200 | 15 | high | Classic SAP SuccessFactors career portal confirmed live ('15 Jobs' shown at verification); same JS-widget limitation as Nouryon - titles not present in raw HTML via simple regex. Dedicated 'Graduates' landing page exi... |
| **Lubrizol** | successfactors | `GET https://jobs.lubrizol.com/search/?q=graduate&sortColumn=referencedate&sortDirection...` | 200 | None | high | SuccessFactors CSB confirmed AND this template server-renders job titles directly in HTML (regex on class jobTitle works) - unlike BASF's JS-driven instance. Co-ops/internships mostly US-focused; check UK-specific loc... |
| **Mitsubishi Chemical Group** | unsupported | `-` | 200 | None | medium | jobs-eu.mitsubishi-chemical.com/mce/ is a custom/regional portal with no recognisable ATS vendor fingerprint in page source (checked all standard providers - none found). |
| **Nouryon** | successfactors | `GET https://career5.successfactors.eu/career?career_company=nouryonP&lang=en_GB&company...` | 200 | 15 | high | Classic SAP SuccessFactors 'career portal' (not CSB) confirmed live; page shows '15 Jobs' at verification (likely first-page count, not global total) but job titles are rendered via an internal JS widget not matched b... |
| **PPG** | phenom | `-` | 200 | None | high | Confirmed Phenom People platform (same vendor as DuPont) - no keyless JSON endpoint found in the time budget; would need Phenom widget API reverse-engineering or headless rendering. 274 open jobs shown on-site per sea... |
| **SABIC** | successfactors | `GET https://jobs.sabic.com/search/?q=graduate (SAP SuccessFactors CSB, HTML)` | 200 | None | high | SuccessFactors CSB confirmed (title tag 'Graduate - SABIC Jobs') but this instance is JS-driven like BASF's - no job cards present in raw HTML. UK site is Teesside (SABIC UK Petrochemicals). |
| **Scott Bader** | oracle-hcm | `GET https://fa-eqzr-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recr...` | 200 | 5 | medium | Oracle Cloud HCM (Fusion Recruiting) confirmed live with exactly the finder syntax specified in the brief. TotalJobsCount field in response = 5 (no graduate-labelled req at verification, but response schema fully work... |
| **Syensqo** | successfactors | `GET https://careers.syensqo.com/search/?q=graduate&locale=en_GB (SAP SuccessFactors CSB...` | 200 | None | high | 2023 Solvay specialty-chemicals spin-off. SuccessFactors CSB confirmed AND server-renders job titles in HTML like Lubrizol (regex on jobTitle works). Internships mostly EU-based (France/Belgium) - check location facet... |
| **Synthomer** | unsupported | `-` | 200 | None | high | No vendor ATS fingerprint on careers pages (checked Workday/SF/Greenhouse/Lever/SmartRecruiters/TeamTailor - none). Graduate roles currently indexed via Bright Network rather than a discoverable own-site API. Graduate... |
| **Tata Chemicals Europe** | pinpoint | `GET https://tatachemicals.pinpointhq.com/postings.json` | 200 | 0 | medium | Pinpoint ATS confirmed with a genuinely public keyless JSON endpoint (/postings.json -> {"data":[...]}); 0 open postings at verification time (page and endpoint both live/200). Runs Level 3 Science Manufacturing and 3... |
| **Thomas Swan** | unsupported | `-` | 200 | None | medium | Small family-run Consett specialty chemicals maker; careers page explicitly states 'no vacancies currently' with no ATS - vacancies are posted ad hoc on this static page. Watcher should HTML-diff this page directly; a... |

## Speciality & Materials

| Employer | ATS | Endpoint | Status | Jobs | Chem-Eng | Notes |
|---|---|---|---|---|---|---|
| **Element Six** | unsupported | `-` | 200 | None | high | De Beers Group synthetic diamond/super-materials manufacturer (Harwell/Didcot HQ, strong process/materials chem-eng relevance) - no ATS vendor fingerprint found on the careers page; roles surface via LinkedIn/Indeed/M... |
| **Morgan Advanced Materials** | icims | `-` | 405 | None | high | iCIMS confirmed (careers-morganplc.icims.com) but the standard keyless iCIMS /xmlfeed partner endpoint returns HTTP 405 with an interstitial 'Human Verification' bot-check page for this tenant - not usable without sol... |
| **Sherwin-Williams** | workday | `POST https://williams.wd5.myworkdayjobs.com/wday/cxs/williams/External/jobs  body={"app...` | 200 | 4 | medium | Workday confirmed live, total=4 matched 'graduate'. 'Accelerated' programs are the US graduate-scheme branding; mostly US postings currently, check locationCountry facet for UK (Merseyside/Chorley sites). |
| **Venator** | workday | `POST https://venator.wd3.myworkdayjobs.com/wday/cxs/venator/Venator/jobs  body={"applie...` | 200 | 3 | medium | Workday confirmed live; total=3 open reqs, 0 matched 'graduate' at verification. TiO2/pigments manufacturer (ex-Huntsman spin-off, emerged from Chapter 11 in 2024, still an independent NYSE:VNTR-lineage company, not a... |
| **Victrex** | teamtailor | `GET https://careers.victrex.com/jobs.json` | 200 | 10 | high | TeamTailor confirmed; /jobs.json returns a public JSON Feed (jsonfeed.org v1.1) with title/url/id per posting - genuinely keyless. No graduate-labelled role live at verification time; apprenticeships open annually eac... |

## Pharma / Biotech

| Employer | ATS | Endpoint | Status | Jobs | Chem-Eng | Notes |
|---|---|---|---|---|---|---|
| **AstraZeneca** | workday | `POST https://astrazeneca.wd3.myworkdayjobs.com/wday/cxs/astrazeneca/Careers/jobs  body=...` | 200 | 37 | high | Workday confirmed live first try (host/tenant/site all lowercase-obvious); total=37 matched 'graduate'. UK sites: Macclesfield, Cambridge, Speke - strong process/biopharma chem-eng relevance. Graduate programme is ANN... |
| **Bayer** | eightfold | `GET https://bayer.eightfold.ai/api/apply/v2/jobs?domain=bayer.com&query=graduate&start=...` | 200 | 10 | high | Genuine Eightfold instance confirmed exactly matching the brief's documented API shape (domain=bayer.com) - the only employer found in this whole sweep using true Eightfold rather than a Phenom/SuccessFactors lookalik... |
| **Catalent** | workday | `POST https://catalent.wd1.myworkdayjobs.com/wday/cxs/catalent/External/jobs  body={"app...` | 200 | 4 | high | Workday confirmed live; total=4 matched 'graduate', ALL FOUR were lab-intern roles - a genuinely strong early-careers signal. CDMO (contract development & manufacturing org) with a major UK site in Swindon hiring proc... |
| **Eli Lilly** | phenom | `-` | 200 | None | high | Confirmed Phenom People platform - no keyless JSON endpoint found in the time budget (same limitation as DuPont/PPG/Ecolab). Note: Lilly's internal HR system is Workday (candidate portal login references it) but the p... |
| **Fujifilm Diosynth Biotechnologies** | workday | `POST https://fujifilm.wd3.myworkdayjobs.com/wday/cxs/fujifilm/FLB_CS/jobs  body={"appli...` | 200 | 18 | high | Workday confirmed live (searchText='graduate' returned 0 - use empty/'' or 'intern' instead). Recently rebranded 'Fujifilm Biotechnologies'; separate uscareers-fujifilm.icims.com exists for a different FUJIFILM busine... |
| **GSK** | workday | `POST https://gsk.wd5.myworkdayjobs.com/wday/cxs/gsk/GSKCareers/jobs  body={"appliedFace...` | 200 | 24 | high | Workday confirmed live (note: host is wd5, not the more commonly guessed wd3); total=24 matched 'graduate'. GSK Future Leaders / graduate programme runs an ANNUAL autumn application cycle with 'register your interest'... |
| **Hikma Pharmaceuticals** | unsupported | `-` | 200 | None | medium | No ATS vendor fingerprint found on the careers page (checked all standard providers plus a Workday tenant guess 'hikma' which 500'd). British-HQ generics manufacturer; internship programme confirmed to exist per Prosp... |
| **Lonza** | workday | `POST https://lonza.wd3.myworkdayjobs.com/wday/cxs/lonza/Lonza_Careers/jobs  body={"appl...` | 200 | 680 | high | Workday confirmed live after trying several site-ID guesses (correct one is 'Lonza_Careers', not the more obvious 'External'/'LonzaCareers'). total=680 globally, 9 matched 'graduate'. Major CDMO with UK biologics manu... |
| **MSD** | workday | `POST https://msd.wd5.myworkdayjobs.com/wday/cxs/msd/SearchJobs/jobs  body={"appliedFace...` | 200 | 22 | high | Workday confirmed live; total=22 matched 'graduate'. Known internally as Merck & Co. in the US/Canada; jobs.msd.com/uk is the UK-branded landing page in front of the same Workday tenant. |
| **Novartis** | workday | `POST https://novartis.wd3.myworkdayjobs.com/wday/cxs/novartis/Novartis_Careers/jobs  bo...` | 200 | 25 | high | Workday confirmed live; total=25 matched 'graduate' filter, though sample titles returned were general roles (Sales Rep, Analyst etc.) rather than clearly-labelled grad-scheme roles at verification time - re-query clo... |
| **Novo Nordisk** | successfactors | `-` | 200 | None | high | SuccessFactors confirmed as the vendor, but the discovered public link (performancemanager.successfactors.eu/sf/careers?company=novonordisk) redirects to an SAP Identity Authentication SAML/SSO login wall rather than ... |
| **Pfizer** | workday | `POST https://pfizer.wd1.myworkdayjobs.com/wday/cxs/pfizer/PfizerCareers/jobs  body={"ap...` | 200 | 16 | high | Workday confirmed live; total=16 matched 'graduate' (fuzzy-matches internship/training-programme postings too). Grange Castle (Dublin) internship visible; check UK sites (Sandwich, Kent) via location facet. |
| **Roche** | workday | `POST https://roche.wd3.myworkdayjobs.com/wday/cxs/roche/roche-ext/jobs  body={"appliedF...` | 200 | 53 | high | Workday confirmed live; total=53 matched 'graduate' (fuzzy-matches internship postings too). Mostly Basel/EU postings in sample - filter by locationCountry facet for UK (Welwyn Garden City site). |
| **Sanofi** | workday | `POST https://sanofi.wd3.myworkdayjobs.com/wday/cxs/sanofi/SanofiCareers/jobs  body={"ap...` | 200 | 65 | high | Workday confirmed live; total=65 matched 'graduate'. Job family facet includes 'Apprentice/Intern' and 'Student' types confirming a structured early-careers pipeline; UK site Reading. |
| **Takeda** | avature | `-` | 200 | None | high | Avature confirmed (both jobs.takeda.com and the separate takeda.avature.net talent-community CRM). No keyless JSON endpoint found - Avature's public search widget typically needs a portal-specific config code not disc... |
| **Thermo Fisher Scientific** | workday | `POST https://thermofisher.wd5.myworkdayjobs.com/wday/cxs/thermofisher/thermofishercaree...` | 200 | 49 | high | Workday confirmed live; total=49 matched 'graduate' (fuzzy match on manufacturing/QC roles). Life-science tools/reagents/instruments giant with major UK manufacturing (Paisley, Renfrew, Loughborough) - strong chem-eng... |

## FMCG

| Employer | ATS | Endpoint | Status | Jobs | Chem-Eng | Notes |
|---|---|---|---|---|---|---|
| **British American Tobacco** | successfactors | `GET https://career5.successfactors.eu/career?company=C0007596015P&site=&lang=en_GB` | 200 | None | medium | Classic SAP SuccessFactors career portal confirmed live. Southampton HQ/R&D site does process/formulation chemistry for next-gen products (vapes, heated tobacco) - moderate chem-eng relevance. |
| **Procter & Gamble** | phenom | `-` | 200 | None | medium | Confirmed Phenom People platform (same vendor family as DuPont/PPG/Ecolab/Lilly/Mondelez) - no keyless JSON endpoint found in the time budget. UK site Newcastle (Gillette/Ariel/Fairy manufacturing) has process/chem-en... |
| **Reckitt** | successfactors | `GET https://career2.successfactors.eu/career?company=reckittb01` | 200 | None | medium | Classic SAP SuccessFactors career portal confirmed live (200); same JS-widget limitation as Nouryon/Kemira - titles not present in raw HTML. Hull site (Dettol/Cillit Bang/Vanish manufacturing) is chem-eng relevant. |
| **Unilever** | workday | `POST https://unilever.wd3.myworkdayjobs.com/wday/cxs/unilever/External/jobs  body={"app...` | 403 | None | high | Workday tenant/site CONFIRMED correct (unilever/External on wd3) via a Workday-internal redirect trace ('wd3.myworkday.com/wday/drs/outage?t=unilever&s=external') even though the site itself returned 403/S22 'permissi... |

## Food & Drink

| Employer | ATS | Endpoint | Status | Jobs | Chem-Eng | Notes |
|---|---|---|---|---|---|---|
| **Associated British Foods** | unsupported | `-` | 200 | None | medium | No ATS vendor fingerprint found - ABF is a diversified holding company (British Sugar, Twinings, Primark) and recruitment is likely devolved to each operating business's own careers site rather than a group-wide ATS. ... |
| **British Sugar** | successfactors | `GET https://career2.successfactors.eu/career?company=britishsugar&site=&lang=en_GB` | 200 | None | high | Classic SAP SuccessFactors career portal confirmed live (same career2.successfactors.eu shard as Kemira). Sugar refining/processing (Wissington, Bury St Edmunds, Cantley, Newark) is highly chem-eng relevant - ABF subs... |
| **Coca-Cola Europacific Partners** | unsupported | `-` | 200 | None | medium | No ATS vendor fingerprint found on the careers landing page in the time budget. UK bottling sites (Wakefield - Europe's largest soft drinks plant) are chem-eng/process relevant; worth a deeper follow-up check. |
| **Diageo** | workday | `POST https://diageo.wd3.myworkdayjobs.com/wday/cxs/diageo/Diageo_Careers/jobs  body={"a...` | 200 | 8 | medium | Workday confirmed live; total=8 matched 'graduate'. Scotch whisky distilling (multiple Scotland sites) is process/chem-eng relevant; no clearly-labelled graduate scheme role live at verification. |
| **Heineken UK** | successfactors | `GET https://career5.successfactors.eu/careers?company=C0000032666P` | 200 | None | medium | Classic SAP SuccessFactors career portal confirmed live (company code is an opaque C-number, not a readable slug). Same JS-widget limitation as Nouryon/Kemira/Reckitt - titles not present in raw HTML. UK breweries (Ma... |
| **Kraft Heinz** | eightfold | `-` | 200 | None | medium | Eightfold confirmed as the vendor (page source), but the standard public API path returned {"message":"Not authorized for PCSX"} (403) for domain=kraftheinz.com - this tenant has locked down the normally-keyless Eight... |
| **Mars** | phenom | `-` | 200 | None | medium | Confirmed Phenom People platform - no keyless JSON endpoint found in the time budget. UK confectionery/pet-food/food-science sites (Slough HQ, various factories). |
| **Mondelez International** | phenom | `-` | 200 | None | medium | Confirmed Phenom People platform (page source) - contrary to commonly-repeated claims that Mondelez uses SmartRecruiters, no SmartRecruiters fingerprint was found live. No keyless JSON endpoint found in the time budge... |
| **Nestle** | unsupported | `-` | 200 | None | medium | www.nestle.com and www.nestle.co.uk both 403 to curl/WebFetch (bot-walled); the working nestlejobs.com hub page references BOTH 'avature' and 'successfactors' strings, suggesting a mixed/regional ATS landscape (differ... |
| **PepsiCo** | avature | `-` | 200 | None | medium | Avature confirmed as primary vendor (a talent-community link resolves to 'sandboxpepsi.avature.net' - unusual tenant name but genuinely linked from the live production site); page also references iCIMS, suggesting a s... |
| **Tate & Lyle** | phenom | `-` | 200 | None | high | Confirmed Phenom People platform - no keyless JSON endpoint found in the time budget. Food ingredients/sweeteners processing (former sugar refiner) - high chem-eng relevance. |

## Personal Care

| Employer | ATS | Endpoint | Status | Jobs | Chem-Eng | Notes |
|---|---|---|---|---|---|---|
| **Boots** | unsupported | `-` | 200 | None | medium | No ATS vendor fingerprint found on the main careers hub (a deeper /search-and-apply path 404'd). Walgreens Boots Alliance subsidiary; No7/Boots Labs product formulation (Nottingham) is the chem-eng-relevant part of th... |
| **Haleon** | unsupported | `-` | 200 | None | high | No ATS vendor fingerprint found; Workday tenant guesses (haleon.wd3/wd5 with several site-ID variants) all returned generic 422s indicating wrong host entirely, not just wrong site. 2022 GSK Consumer Healthcare spin-o... |
| **L'Oreal** | avature | `-` | 200 | None | high | Avature confirmed (same vendor as Takeda/PepsiCo) - no keyless JSON endpoint found in the time budget. Cosmetics/formulation chemistry R&D (UK site in Manchester) is highly chem-eng relevant. L'Oreal runs a well-known... |


## Unsupported / no keyless endpoint found

These employers were live-checked but no keyless machine-readable jobs endpoint could be confirmed in the time budget (custom in-house boards, JS-only SPA career sites, or ATS platforms — e.g. Phenom, some SuccessFactors instances — that require either an API key or headless-browser rendering). The watcher should fall back to periodic HTML diffing of the `careersUrl`/`earlyCareersUrl` for these.

| Employer | ATS (best guess) | careersUrl |
|---|---|---|
| INEOS | unsupported | https://www.ineos.com/careers/ |
| Croda | unsupported | https://www.croda.com/en-gb/careers |
| Synthomer | unsupported | https://www.synthomer.com/careers/ |
| Mitsubishi Chemical Group | unsupported | https://eu.mitsubishi-chemical.com/careers/ |
| Innospec | unsupported | https://innospec.com/about-us/working-at-innospec/ |
| Elementis | unsupported | https://www.elementis.com/careers/ |
| Thomas Swan | unsupported | https://thomas-swan.com/about-us/careers/ |
| Element Six | unsupported | https://www.e6.com/en/about/careers |
| Hikma Pharmaceuticals | unsupported | https://www.hikma.com/careers/roles-at-hikma/ |
| CPI (Centre for Process Innovation) | unsupported | https://www.uk-cpi.com/careers |
| Nestle | unsupported | https://www.nestlejobs.com/ |
| Coca-Cola Europacific Partners | unsupported | https://www.cocacolaep.com/company/careers/ |
| Associated British Foods | unsupported | https://www.abf.co.uk/careers |
| Haleon | unsupported | https://www.haleon.com/careers |
| Boots | unsupported | https://www.boots.jobs/ |
