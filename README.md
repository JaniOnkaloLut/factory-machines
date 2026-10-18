# Ai statement

 This project is coded using AI

# Factory floor: 3 machines, 3 MongoDB databases

| Machine         | MongoDB server        | Database          | Data it sends                      |
|-----------------|-----------------------|-------------------|------------------------------------|
| CNC Lathe       | localhost:27020       | `cnc_lathe`       | rpm, temperature, vibration        |
| Hydraulic Press | localhost:27018       | `hydraulic_press` | pressure, force, cycle count       |
| Conveyor Belt   | localhost:27019       | `conveyor_belt`   | belt speed, load, motor current    |

Backend: Node + Express + TypeScript. Frontend: Vite + TypeScript (no framework).

## Run it

Requirements: Node 18+ and Docker (or three local mongod instances on the ports above).

```bash
# 1. start the 3 databases
docker compose up -d

# 2. backend (API on :3000) + dummy data
cd backend
npm install
npm run seed        # 30 dummy readings per machine
npm run dev

# 3. frontend (new terminal)
cd frontend
npm install
npm run dev         # open http://localhost:5173

# 4. optional: simulate live machines sending data every few seconds (new terminal)
cd backend
npm run simulate
```

## API

- `GET    /api/machines`                       list machines and fields
- `GET    /api/machines/:id/readings`          read (latest 50)
- `POST   /api/machines/:id/readings`          create (what a machine would call)
- `PUT    /api/machines/:id/readings/:rid`     update
- `DELETE /api/machines/:id/readings/:rid`     delete

`:id` is `cnc`, `press` or `conveyor`. Add a machine by adding an entry in `backend/src/config.ts`.
