// Each machine has its OWN MongoDB server and database.
export interface Field {
  key: string;
  label: string;
  unit: string;
  min: number; // used by the simulator
  max: number;
}

export interface Machine {
  id: string;
  name: string;
  uri: string;
  dbName: string;
  fields: Field[];
}

export const machines: Machine[] = [
  {
    id: "cnc",
    name: "CNC Lathe",
    uri: process.env.CNC_URI ?? "mongodb://localhost:27020",
    dbName: "cnc_lathe",
    fields: [
      { key: "rpm", label: "Spindle speed", unit: "rpm", min: 800, max: 3200 },
      { key: "temperature", label: "Temperature", unit: "°C", min: 35, max: 85 },
      { key: "vibration", label: "Vibration", unit: "mm/s", min: 0.5, max: 6 },
    ],
  },
  {
    id: "press",
    name: "Hydraulic Press",
    uri: process.env.PRESS_URI ?? "mongodb://localhost:27018",
    dbName: "hydraulic_press",
    fields: [
      { key: "pressure", label: "Pressure", unit: "bar", min: 120, max: 320 },
      { key: "force", label: "Force", unit: "kN", min: 200, max: 900 },
      { key: "cycles", label: "Cycle count", unit: "", min: 1000, max: 9000 },
    ],
  },
  {
    id: "conveyor",
    name: "Conveyor Belt",
    uri: process.env.CONVEYOR_URI ?? "mongodb://localhost:27019",
    dbName: "conveyor_belt",
    fields: [
      { key: "speed", label: "Belt speed", unit: "m/s", min: 0.2, max: 2.5 },
      { key: "load", label: "Load", unit: "kg", min: 0, max: 400 },
      { key: "motorCurrent", label: "Motor current", unit: "A", min: 2, max: 18 },
    ],
  },
];

export const STATUSES = ["running", "idle", "fault"] as const;
export const findMachine = (id: string) => machines.find((m) => m.id === id);
