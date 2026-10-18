import "./style.css";

interface Field { key: string; label: string; unit: string }
interface MachineInfo { id: string; name: string; dbName: string; fields: Field[]; statuses: string[]; online: boolean }
type Reading = { _id: string; timestamp: string; status: string } & Record<string, any>;

const app = document.getElementById("app")!;
let machines: MachineInfo[] = [];
let current: MachineInfo | null = null;
let rows: Reading[] = [];
let editingId: string | null = null;
let timer: number | undefined;

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function setMsg(text: string, isErr = false) {
  const el = document.getElementById("msg");
  if (el) { el.textContent = text; el.className = "msg" + (isErr ? " err" : ""); }
}

function renderShell() {
  app.innerHTML = `
    <main>
      <h1>Factory floor data</h1>
      <p class="sub">Each machine stores its readings in its own MongoDB database. Pick a machine to view or change its data.</p>
      <div class="tabs" id="tabs"></div>
      <section>
        <h2 id="form-title">Add a reading</h2>
        <form id="form"></form>
        <p id="msg" class="msg"></p>
      </section>
      <section>
        <div class="bar">
          <h2 id="table-title" style="margin:0"></h2>
          <button class="btn" id="refresh" type="button">Refresh</button>
        </div>
        <div class="tablewrap" id="table"></div>
      </section>
    </main>`;
  document.getElementById("refresh")!.addEventListener("click", () => loadRows());
}

function renderTabs() {
  const tabs = document.getElementById("tabs")!;
  tabs.innerHTML = machines.map((m) => `
    <button class="tab" data-id="${m.id}" aria-pressed="${m.id === current?.id}">
      <strong><span class="dot ${m.online ? "on" : ""}"></span>${esc(m.name)}</strong>
      <small>database: ${esc(m.dbName)}${m.online ? "" : " (offline)"}</small>
    </button>`).join("");
  tabs.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) =>
    b.addEventListener("click", () => selectMachine(b.dataset.id!)));
}

function renderForm(r?: Reading) {
  if (!current) return;
  const form = document.getElementById("form") as HTMLFormElement;
  document.getElementById("form-title")!.textContent = r ? "Edit reading" : "Add a reading";
  form.innerHTML = `
    <label>Time <input name="timestamp" type="datetime-local" required value="${toLocalInput(r?.timestamp ?? new Date().toISOString())}"></label>
    <label>Status
      <select name="status">${current.statuses.map((s) => `<option ${r?.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    </label>
    ${current.fields.map((f) => `
      <label>${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}
        <input name="${f.key}" type="number" step="any" required value="${r ? esc(r[f.key]) : ""}">
      </label>`).join("")}
    <div>
      <button class="btn primary" type="submit">${r ? "Save changes" : "Add reading"}</button>
      ${r ? `<button class="btn" type="button" id="cancel">Cancel</button>` : ""}
    </div>`;
  document.getElementById("cancel")?.addEventListener("click", () => { editingId = null; renderForm(); setMsg(""); });
}

function renderTable() {
  if (!current) return;
  document.getElementById("table-title")!.textContent = `${current.name} readings (latest ${rows.length})`;
  const el = document.getElementById("table")!;
  if (!rows.length) { el.innerHTML = `<div class="empty">No readings yet. Add one above or run the simulator.</div>`; return; }
  el.innerHTML = `
    <table>
      <thead><tr><th>Time</th><th>Status</th>
        ${current.fields.map((f) => `<th>${esc(f.label)}${f.unit ? ` (${esc(f.unit)})` : ""}</th>`).join("")}
        <th></th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${esc(new Date(r.timestamp).toLocaleString())}</td>
          <td class="s-${esc(r.status)}">${esc(r.status)}</td>
          ${current!.fields.map((f) => `<td>${esc(r[f.key])}</td>`).join("")}
          <td class="actions">
            <button class="btn" data-edit="${r._id}">Edit</button>
            <button class="btn danger" data-del="${r._id}">Delete</button>
          </td>
        </tr>`).join("")}</tbody>
    </table>`;
  el.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = rows.find((x) => x._id === b.dataset.edit)!;
      editingId = r._id; renderForm(r); window.scrollTo({ top: 0, behavior: "smooth" });
    }));
  el.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) =>
    b.addEventListener("click", () => deleteRow(b.dataset.del!)));
}

async function loadRows() {
  if (!current) return;
  try { rows = await api<Reading[]>(`/api/machines/${current.id}/readings?limit=50`); renderTable(); }
  catch (e: any) { setMsg(e.message, true); }
}

async function selectMachine(id: string) {
  current = machines.find((m) => m.id === id) ?? null;
  editingId = null;
  renderTabs(); renderForm(); setMsg("");
  await loadRows();
  clearInterval(timer);
  // gentle auto-refresh so live machine data shows up (paused while editing)
  timer = window.setInterval(() => { if (!editingId) loadRows(); }, 5000);
}

async function deleteRow(rid: string) {
  if (!current || !confirm("Delete this reading?")) return;
  try { await api(`/api/machines/${current.id}/readings/${rid}`, { method: "DELETE" }); setMsg("Reading deleted."); await loadRows(); }
  catch (e: any) { setMsg(e.message, true); }
}

function bindForm() {
  document.getElementById("form")!.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!current) return;
    const data = Object.fromEntries(new FormData(ev.target as HTMLFormElement).entries()) as Record<string, any>;
    data.timestamp = new Date(data.timestamp).toISOString();
    try {
      if (editingId) {
        await api(`/api/machines/${current.id}/readings/${editingId}`, { method: "PUT", body: JSON.stringify(data) });
        setMsg("Reading saved."); editingId = null;
      } else {
        await api(`/api/machines/${current.id}/readings`, { method: "POST", body: JSON.stringify(data) });
        setMsg("Reading added.");
      }
      renderForm(); await loadRows();
    } catch (e: any) { setMsg(e.message, true); }
  });
}

async function init() {
  renderShell(); bindForm();
  try {
    machines = await api<MachineInfo[]>("/api/machines");
    await selectMachine(machines[0].id);
  } catch {
    setMsg("Cannot reach the backend. Start it with: cd backend && npm run dev", true);
  }
}
init();
