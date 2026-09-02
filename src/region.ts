import type { Region } from "./types.ts";

/**
 * Location string → region. PURE.
 *
 * Order matters, and it is deliberate (a lesson from the sibling project, where a
 * naive UK city regex matched "Birmingham, AL" and "Bristol, TN"):
 *   1. an explicit UK country word wins outright;
 *   2. then an explicit US country / state code / big US city;
 *   3. only then a UK city name;
 *   4. EU country or city;
 *   5. "remote" with nothing else.
 */

const UK_COUNTRY = /\b(united kingdom|u\.?k\.?|england|scotland|wales|northern ireland|great britain|britain|gb)\b/i;

const UK_CITY =
  /\b(london|manchester|birmingham|leeds|glasgow|edinburgh|bristol|liverpool|sheffield|newcastle|nottingham|cambridge|oxford|aberdeen|reading|teesside|middlesbrough|hull|grangemouth|warrington|runcorn|derby|coventry|belfast|cardiff|swindon|southampton|portsmouth|bracknell|slough|milton keynes|stevenage|macclesfield|billingham|stockton|redcar|immingham|grimsby|pembroke|fawley|ellesmere port|stanlow|cumbria|sellafield|barrow|preston|bolton|wigan|st\.? helens|widnes|huddersfield|bradford|york|harrogate|norwich|ipswich|peterborough|leicester|northampton|luton|watford|guildford|crawley|brighton|exeter|plymouth|bath|cheltenham|gloucester|worcester|stoke|telford|shrewsbury|chester|wrexham|dundee|inverness|stirling|falkirk|livingston|basingstoke|farnborough|weybridge|welwyn|hatfield|hemel|uxbridge|hounslow|croydon|canary wharf|surrey|kent|essex|hertfordshire|hampshire|berkshire|oxfordshire|cambridgeshire|yorkshire|lancashire|cheshire|merseyside|midlands|humber|tees|derbyshire|leicestershire|nottinghamshire|lincolnshire|norfolk|suffolk|devon|cornwall|somerset|wiltshire|dorset|sussex|durham|northumberland|cumbria|fife|lothian|lanarkshire|ayrshire|glamorgan|gwent|swansea|newport|bridgend|port talbot|deeside|solihull|warwick|rugby|daventry|kettering|corby|banbury|bicester|didcot|abingdon|witney|newbury|andover|salisbury|poole|bournemouth|eastleigh|winchester|chichester|worthing|hastings|maidstone|ashford|canterbury|dover|dartford|gravesend|chelmsford|colchester|basildon|southend|harlow|bishop's stortford|st\.? albans|hitchin|letchworth|aylesbury|high wycombe|maidenhead|windsor|staines|woking|redhill|reigate|epsom|kingston|richmond upon thames|wimbledon|stratford|greenwich|barking|romford|ilford|enfield|harrow|wembley|ealing|hammersmith|paddington|westminster|shoreditch|holborn|moorgate|liverpool street|bank\b)\b/i;

const US_COUNTRY = /\b(united states|u\.?s\.?a\.?|u\.?s\.?(?![a-z])|america)\b/i;
const US_STATE_CODE =
  /(?:,|\s)\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)(?:\b(?![a-z]))/;
const US_STATE_NAME =
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i;
const US_CITY =
  /\b(new york|nyc|manhattan|brooklyn|san francisco|bay area|seattle|chicago|houston|boston|austin|los angeles|dallas|denver|atlanta|philadelphia|pittsburgh|detroit|minneapolis|phoenix|san jose|palo alto|menlo park|mountain view|sunnyvale|redmond|bellevue|cupertino|santa clara|irvine|san diego|miami|charlotte|raleigh|nashville|st\.? louis|kansas city|cincinnati|columbus|indianapolis|baltimore|portland|salt lake|las vegas|midland|baton rouge|new orleans|wilmington|newark|jersey city|stamford|greenwich|princeton|cambridge, ma|silicon valley|reston|arlington|mclean|bethesda|hartford|tampa|orlando|jacksonville|san antonio|sacramento|oakland|fremont|milwaukee|cleveland|akron|dayton|louisville|memphis|birmingham, al|huntsville|oklahoma city|tulsa|omaha|des moines|boise|albuquerque|tucson|el paso|corpus christi|beaumont|port arthur|pasadena, tx|freeport, tx|lake charles|geismar|st\.? charles|richmond, ca|torrance|long beach|anchorage|honolulu)\b/i;

/**
 * Bare abbreviations the community internship lists use as a WHOLE location
 * ("SF", "NYC", "LA", "DC"). Matched against the complete string only, never as
 * a substring — "LA" inside "Lausanne" and "DC" inside a street name must not
 * be read as the United States.
 */
const US_ABBREV = /^(sf|nyc|la|dc|nj|bay area)$/i;

const EU_COUNTRY =
  /\b(germany|deutschland|france|netherlands|the netherlands|holland|belgium|spain|italy|ireland|sweden|denmark|norway|finland|poland|austria|switzerland|portugal|czech(ia| republic)?|hungary|luxembourg|greece|romania|bulgaria|croatia|slovakia|slovenia|estonia|latvia|lithuania|iceland|malta|cyprus|europe|emea)\b/i;
const EU_CITY =
  /\b(paris|berlin|munich|münchen|frankfurt|amsterdam|rotterdam|brussels|bruxelles|dublin|cork|madrid|barcelona|milan|milano|rome|roma|zurich|zürich|geneva|genève|stockholm|copenhagen|oslo|helsinki|warsaw|vienna|wien|lisbon|prague|budapest|antwerp|eindhoven|hamburg|düsseldorf|dusseldorf|cologne|köln|stuttgart|lyon|marseille|toulouse|basel|ludwigshafen|leverkusen|the hague|den haag|utrecht|gothenburg|malmö|aarhus|bergen|stavanger|tampere|gdansk|krakow|kraków|wroclaw|graz|linz|porto|bilbao|valencia|seville|turin|bologna|naples|lausanne|bern|luxembourg|limerick|galway|leiden|delft|groningen|nijmegen|essen|dortmund|leipzig|dresden|nuremberg|hannover|bremen|mannheim|karlsruhe|heidelberg|freiburg|aachen|bochum|wolfsburg|ingolstadt|jena|marl|gelsenkirchen|dormagen|krefeld|wesseling|burghausen|schwechat|kalundborg|bergen op zoom|terneuzen|moerdijk|geleen|pernis|botlek|zeeland|grenoble|lille|nantes|strasbourg|rouen|le havre|dunkerque|fos-sur-mer|lavéra|feluy|jemeppe|zwijndrecht|tarragona|huelva|cartagena|sines|priolo|porto marghera|ferrara|ravenna|brindisi|gela)\b/i;

const REMOTE = /\b(remote|work from home|wfh|home[- ]based|anywhere|distributed)\b/i;

export function regionOf(location: string | null | undefined): Region {
  const s = (location ?? "").trim();
  if (!s) return "Other";
  if (UK_COUNTRY.test(s)) return "UK";
  if (US_ABBREV.test(s.trim())) return "US";
  if (US_COUNTRY.test(s) || US_STATE_CODE.test(s) || US_STATE_NAME.test(s) || US_CITY.test(s)) return "US";
  if (UK_CITY.test(s)) return "UK";
  if (EU_COUNTRY.test(s) || EU_CITY.test(s)) return "EU";
  if (REMOTE.test(s)) return "Remote";
  return "Other";
}
