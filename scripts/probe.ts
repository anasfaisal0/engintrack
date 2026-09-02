/**
 * Poll ONE source (or a few) and print what it returns, without touching data/.
 * The fastest way to check a registry row is right:
 *   npx tsx scripts/probe.ts reed-uk totaljobs-uk
 *   npx tsx scripts/probe.ts            # every enabled source
 */
import { adapterFor } from "../src/adapters/index.ts";
import { normalise } from "../src/normalise.ts";
import { readRegistry } from "../src/storage.ts";

const wanted = process.argv.slice(2);
const registry = readRegistry().filter((s) => (wanted.length ? wanted.includes(s.id) : s.enabled !== false));
if (registry.length === 0) {
  console.error(`No matching sources. Known ids:\n${readRegistry().map((s) => "  " + s.id).join("\n")}`);
  process.exit(1);
}

const now = new Date().toISOString();
for (const s of registry) {
  const adapter = adapterFor(s);
  if (!adapter) {
    console.log(`${s.id}: no adapter (ats=${s.ats}, adapter=${s.adapter ?? "-"})`);
    continue;
  }
  const t0 = Date.now();
  try {
    const raw = await adapter(s);
    const kept = normalise(s, raw, now, new Map());
    console.log(
      `\n=== ${s.id} — ${raw.length} raw, ${kept.length} early-career, ${kept.filter((l) => l.chemEng).length} chem-eng, ${Date.now() - t0}ms`,
    );
    for (const l of kept.slice(0, 6)) {
      console.log(`   ${l.employer} | ${l.title.slice(0, 62)} | ${l.location ?? "-"} | ${l.region} | ${l.level}${l.closesAt ? " | closes " + l.closesAt.slice(0, 10) : ""}`);
    }
  } catch (e) {
    console.log(`\n=== ${s.id} FAILED after ${Date.now() - t0}ms: ${(e as Error).message.slice(0, 200)}`);
  }
}
