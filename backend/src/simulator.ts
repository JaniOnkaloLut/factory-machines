// Pretends to be the 3 machines: each one POSTs a new reading every few seconds.
import { machines, STATUSES } from "./config.js";

const API = process.env.API ?? "http://localhost:3000";
const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

async function send(id: string) {
  const m = machines.find((x) => x.id === id)!;
  const body: Record<string, unknown> = {
    status: Math.random() < 0.9 ? "running" : STATUSES[1 + Math.floor(Math.random() * 2)],
  };
  for (const f of m.fields) body[f.key] = rand(f.min, f.max);
  try {
    const res = await fetch(`${API}/api/machines/${id}/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(`[${m.name}]`, res.status, JSON.stringify(body));
  } catch (e) {
    console.error(`[${m.name}] backend not reachable`);
  }
}

machines.forEach((m, i) => setInterval(() => send(m.id), 3000 + i * 700));
console.log("Machine simulator running (Ctrl+C to stop)");
