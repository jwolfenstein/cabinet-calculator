import React from "react";
import TopNav from "../SOM/components/TopNav";

/** Job summary stored in cc.jobs.v1 */
type JobItem = { id: string; name: string; status: "Design" | "In Progress" | "Complete" };

const uid = () => Math.random().toString(36).slice(2, 9);
const LS_KEY = "cc.jobs.v1";

function loadDetails(id: string): any | null {
  try { return JSON.parse(localStorage.getItem(`cc.job.${id}.v1`) || "null"); } catch { return null; }
}
function saveDetails(id: string, data: any) {
  try { localStorage.setItem(`cc.job.${id}.v1`, JSON.stringify(data)); } catch {}
}

/* =============== Context Menu (Edit navigates) =============== */
function ContextMenu({
  x, y, onEdit, onDelete, onClose,
}: { x: number; y: number; onEdit: () => void; onDelete: () => void; onClose: () => void; }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const clickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("keydown", esc);
    window.addEventListener("mousedown", clickAway);
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("mousedown", clickAway);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", top: y, left: x, zIndex: 1000,
        background: "#0f1720", border: "1px solid #334155", borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.35)", padding: 6, minWidth: 160,
      }}
    >
      <button className="btn transition-all" style={{ width: "100%", textAlign: "left" }} onClick={onEdit}>
        Edit
      </button>
      <button
        className="btn btn-danger transition-all"
        style={{ width: "100%", textAlign: "left", marginTop: 6 }}
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

/* =============== Start Page =============== */
export default function StartPage() {
  // Seed if empty / malformed / empty array
  const [jobs, setJobs] = React.useState<JobItem[]>(() => {
    const SEED: JobItem[] = [
      { id: uid(), name: "Smith Kitchen",  status: "Design" },
      { id: uid(), name: "Jonnes Pantry",  status: "Complete" },
      { id: uid(), name: "Barnes Laundry", status: "In Progress" },
    ];
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) { localStorage.setItem(LS_KEY, JSON.stringify(SEED)); return SEED; }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(LS_KEY, JSON.stringify(SEED)); return SEED;
      }
      return parsed as JobItem[];
    } catch {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED)); return SEED;
    }
  });

  // Persist on change
  React.useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(jobs)); } catch {} }, [jobs]);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<{ x: number; y: number; id: string } | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>("");

  function openJob(id: string) { window.location.href = `/routes/Job?id=${encodeURIComponent(id)}`; }

  function onNewJob() {
    const id = uid();
    const newItem: JobItem = { id, name: "Untitled Job", status: "Design" };
    const next = [newItem, ...jobs];
    setJobs(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    // initialize details record so Job page has something to load
    saveDetails(id, {
      id, name: newItem.name, status: newItem.status,
      firstName: "", lastName: "", address: "", address2: "", city: "", state: "", zip: "",
      phone: "", phone2: "", email: "", contact: "", notes: "", units: "in",
    });
    openJob(id);
  }

  function deleteJob(id: string) {
    const next = jobs.filter((j) => j.id !== id);
    setJobs(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    try { localStorage.removeItem(`cc.job.${id}.v1`); } catch {}
    setMenu(null);
    if (selectedId === id) setSelectedId(null);
  }

  // Inline status change keeps both lists and details in sync
  function changeStatus(id: string, status: JobItem["status"]) {
    setJobs(prev => {
      const next = prev.map(j => j.id === id ? { ...j, status } : j);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      // sync detail record if exists
      const det = loadDetails(id);
      if (det) { det.status = status; saveDetails(id, det); }
      return next;
    });
  }

  // Edit job name functions
  function startEditingName(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  function saveJobName(id: string) {
    if (!editingName.trim()) return;
    setJobs(prev => {
      const next = prev.map(j => j.id === id ? { ...j, name: editingName.trim() } : j);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      // sync detail record if exists
      const det = loadDetails(id);
      if (det) { det.name = editingName.trim(); saveDetails(id, det); }
      return next;
    });
    setEditingId(null);
    setEditingName("");
  }

  function cancelEditingName() {
    setEditingId(null);
    setEditingName("");
  }

  return (
    <div style={page}>
      {/* Page identifier - Start page header */}
      <div className="page-header page-header-start"></div>
      
      {/* TopNav nudged down/right by ~10px */}
      <div style={{ marginTop: 10, marginLeft: 10 }}>
        <TopNav active="Start" />
      </div>

      <div style={canvas}>
        {/* Left column block */}
        <div style={leftColumn}>
          {/* half-width primary button that opens Job page */}
          <button className="btn btn-primary transition-all" style={{ width: 160 }} onClick={onNewJob}>
            New Job
          </button>

          <div style={tableWrap}>
            <div style={tableHeader}>
              <div style={{ ...thCell, width: 170 }}>Job Name</div>
              <div style={{ ...thCell, width: 160 }}>Status</div>
            </div>

            <div>
              {jobs.map((j) => {
                const selected = selectedId === j.id;
                return (
                  <div
                    key={j.id}
                    className={`table-row transition-colors ${selected ? 'selected' : ''}`}
                    style={{ 
                      ...row, 
                      background: selected ? "rgba(59, 130, 246, 0.1)" : "var(--bg-secondary)",
                    }}
                    onClick={() => setSelectedId(j.id)}
                    onDoubleClick={() => openJob(j.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedId(j.id);
                      setMenu({ x: e.clientX, y: e.clientY, id: j.id });
                    }}
                    title="Double-click to open • Right-click for options"
                  >
                    <div style={{ ...tdCell, width: 170 }}>
                      {editingId === j.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveJobName(j.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveJobName(j.id);
                            if (e.key === "Escape") cancelEditingName();
                          }}
                          className="input transition-all"
                          style={{
                            width: "100%",
                            fontSize: "14px",
                            height: "28px"
                          }}
                          autoFocus
                        />
                      ) : (
                        <div 
                          style={{ cursor: "pointer", padding: "2px 6px" }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingName(j.id, j.name);
                          }}
                          onDoubleClick={() => openJob(j.id)}
                          title="Click to edit name • Double-click to open job"
                        >
                          {j.name}
                        </div>
                      )}
                    </div>

                    {/* Inline Status dropdown */}
                    <div style={{ ...tdCell, width: 160 }}>
                      <select
                        value={j.status}
                        onChange={(e) => changeStatus(j.id, e.target.value as JobItem["status"])}
                        style={{
                          width: "100%", 
                          height: 26, 
                          borderRadius: "var(--radius-md)",
                          border: `1px solid var(--border-primary)`, 
                          background: "var(--bg-quaternary)",
                          color: "var(--text-primary)", 
                          padding: "0 var(--space-xs)",
                        }}
                        title="Change status"
                      >
                        <option value="Design">Design</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </div>
                  </div>
                );
              })}
              {jobs.length === 0 && (
                <div style={{ padding: 8, color: "#94a3b8" }}>No jobs yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Center logo */}
        <div style={centerTitle}>
          <img 
            src="/Cabinet%20Logo.jpg" 
            alt="Old Guy Cabinet Calculator 1.0" 
            style={{
              maxWidth: "800px",
              maxHeight: "400px",
              width: "auto",
              height: "auto",
              objectFit: "contain"
            }}
            onError={(e) => {
              // Fallback to text if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div style="font-size: 22px; color: var(--text-primary); font-weight: 600;">Old Guy Cabinet Calculator 1.0</div>';
            }}
          />
        </div>
      </div>

      {/* Context Menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onEdit={() => { openJob(menu.id); setMenu(null); }}
          onDelete={() => {
            const job = jobs.find((j) => j.id === menu.id);
            if (!job) return setMenu(null);
            if (confirm(`Delete job "${job.name}"?`)) deleteJob(menu.id);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

/* ---------- layout styles (inline) ---------- */
const page: React.CSSProperties   = { minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" };
const canvas: React.CSSProperties = { position: "relative", padding: "var(--space-xl)" };
const leftColumn: React.CSSProperties = { position: "absolute", left: "var(--space-2xl)", top: 48, display: "grid", gap: "var(--space-sm)", width: 340 };
const centerTitle: React.CSSProperties = { 
  textAlign: "center", 
  marginTop: 80, 
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center" 
};

/* table look */
const tableWrap: React.CSSProperties   = { width: 340, border: `1px solid var(--border-primary)`, background: "var(--bg-secondary)", boxShadow: `inset 0 0 0 1px var(--border-muted)`, borderRadius: "var(--radius-lg)" };
const tableHeader: React.CSSProperties = { display: "flex", background: "var(--bg-tertiary)", borderBottom: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" };
const thCell: React.CSSProperties      = { padding: "var(--space-xs) var(--space-sm)", fontWeight: 700, borderRight: `1px solid var(--border-primary)`, color: "var(--text-primary)" };
const row: React.CSSProperties         = { display: "flex", cursor: "pointer", transition: "background 0.15s ease" };
const tdCell: React.CSSProperties      = { padding: "var(--space-xs) var(--space-sm)", borderTop: `1px solid var(--border-muted)`, borderRight: `1px solid var(--border-muted)`, color: "var(--text-primary)" };

/* buttons */
const btn: React.CSSProperties        = { height: 32, padding: "0 var(--space-md)", borderRadius: "var(--radius-md)", border: `1px solid var(--border-primary)`, background: "var(--button-secondary-bg)", cursor: "pointer", color: "var(--text-primary)", fontWeight: 500, transition: "all 0.15s ease" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent-start)", borderColor: "var(--accent-start)", color: "var(--text-inverse)", fontWeight: 700 };

/* inline select for status */
const selectInline: React.CSSProperties = {
  width: "100%", height: 26, borderRadius: "var(--radius-md)",
  border: `1px solid var(--border-primary)`, background: "var(--bg-quaternary)",
  color: "var(--text-primary)", padding: "0 var(--space-xs)",
};
