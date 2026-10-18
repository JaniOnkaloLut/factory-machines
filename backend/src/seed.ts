import { machines, STATUSES } from "./config.js";
import { readings, closeAll } from "./db.js";

const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

for (const m of machines) {
  const col = await readings(m);
  await col.deleteMany({});
  const now = Date.now();
  const docs = Array.from({ length: 30 }, (_, i) => {
    const doc: Record<string, unknown> = {
      timestamp: new Date(now - (29 - i) * 60_000),
      status: Math.random() < 0.8 ? "running" : STATUSES[1 + Math.floor(Math.random() * 2)],
    };
    for (const f of m.fields) doc[f.key] = rand(f.min, f.max);
    return doc;
  });
  await col.insertMany(docs);
  console.log(`Seeded ${docs.length} readings into ${m.dbName} (${m.uri})`);
}
await closeAll();
