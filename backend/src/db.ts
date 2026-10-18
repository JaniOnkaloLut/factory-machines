import { MongoClient, Collection, Document } from "mongodb";
import { machines, Machine } from "./config.js";

const clients = new Map<string, MongoClient>();

export async function readings(machine: Machine): Promise<Collection<Document>> {
  let client = clients.get(machine.id);
  if (!client) {
    client = new MongoClient(machine.uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    clients.set(machine.id, client);
  }
  return client.db(machine.dbName).collection("readings");
}

export async function closeAll() {
  await Promise.all([...clients.values()].map((c) => c.close()));
}

export { machines };
