import express from "express";
import cors from "cors";
import { ObjectId } from "mongodb";
import { machines, findMachine, STATUSES, Machine } from "./config.js";
import { readings } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Build a clean document from request body, validating the machine's fields.
function buildDoc(machine: Machine, body: any) {
  const doc: Record<string, unknown> = {};
  doc.status = STATUSES.includes(body.status) ? body.status : "running";
  doc.timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
  if (isNaN((doc.timestamp as Date).getTime())) throw new Error("Invalid timestamp");
  for (const f of machine.fields) {
    const v = Number(body[f.key]);
    if (body[f.key] === undefined || body[f.key] === "" || Number.isNaN(v)) {
      throw new Error(`Field "${f.key}" must be a number`);
    }
    doc[f.key] = v;
  }
  return doc;
}

const wrap =
  (fn: express.RequestHandler): express.RequestHandler =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (e: any) {
      res.status(400).json({ error: e.message ?? "Request failed" });
    }
  };

function machineOr404(req: express.Request, res: express.Response) {
  const m = findMachine(req.params.id);
  if (!m) res.status(404).json({ error: "Unknown machine" });
  return m;
}

// List machines (+ whether their database is reachable)
app.get("/api/machines", wrap(async (_req, res) => {
  const out = await Promise.all(
    machines.map(async (m) => {
      let online = true;
      try { await (await readings(m)).estimatedDocumentCount(); } catch { online = false; }
      return { id: m.id, name: m.name, dbName: m.dbName, fields: m.fields, statuses: STATUSES, online };
    })
  );
  res.json(out);
}));

// READ
app.get("/api/machines/:id/readings", wrap(async (req, res) => {
  const m = machineOr404(req, res); if (!m) return;
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const docs = await (await readings(m)).find().sort({ timestamp: -1 }).limit(limit).toArray();
  res.json(docs);
}));

// CREATE (this is what a real machine would call)
app.post("/api/machines/:id/readings", wrap(async (req, res) => {
  const m = machineOr404(req, res); if (!m) return;
  const doc = buildDoc(m, req.body);
  const r = await (await readings(m)).insertOne(doc);
  res.status(201).json({ _id: r.insertedId, ...doc });
}));

// UPDATE
app.put("/api/machines/:id/readings/:rid", wrap(async (req, res) => {
  const m = machineOr404(req, res); if (!m) return;
  const doc = buildDoc(m, req.body);
  const r = await (await readings(m)).updateOne({ _id: new ObjectId(req.params.rid) }, { $set: doc });
  if (!r.matchedCount) return void res.status(404).json({ error: "Reading not found" });
  res.json({ _id: req.params.rid, ...doc });
}));

// DELETE
app.delete("/api/machines/:id/readings/:rid", wrap(async (req, res) => {
  const m = machineOr404(req, res); if (!m) return;
  const r = await (await readings(m)).deleteOne({ _id: new ObjectId(req.params.rid) });
  if (!r.deletedCount) return void res.status(404).json({ error: "Reading not found" });
  res.json({ deleted: true });
}));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Factory API listening on http://localhost:${PORT}`));
