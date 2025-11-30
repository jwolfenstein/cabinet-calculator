import React from "react";
import TopNav from "../SOM/components/TopNav";

/* ---------- Types ---------- */
type RoomRow = {
  id: string;
  name: string;        // display name (may include “ 2”, “ 3”, …)
  baseName: string;    // original base name (e.g., “Bath”)
  finish: string;      // Painted, Stained, Melamine, …
  cabinetType: string; // e.g., Face Frame/Painted
};

/* ---------- Constants ---------- */
const DEFAULT_ROOMS = [
  "Kitchen","Pantry","Dining","Living","Family","Game",
  "Master Bath","Bath","Powder","Laundry","Service","Garage",
];

const DEFAULT_FINISH_BY_ROOM: Record<string, string> = {
  Kitchen: "Painted",
  Pantry: "Painted",
  Dining: "Stained",
  Living: "Stained",
  Family: "Stained",
  Game: "Stained",
  "Master Bath": "Painted",
  Bath: "Painted",
  Powder: "Painted",
  Laundry: "Painted",
  Service: "Melamine",
  Garage: "Melamine",
};

const JOBS_KEY = "cc.jobs.v1";
const uid = () => Math.random().toString(36).slice(2, 9);

type TabKey = "JobInfo" | "Rooms" | "Construction" | "Materials";

/* ---------- Single default export ---------- */
export default function RoomsPage() {
  const jobId = new URLSearchParams(window.location.search).get("jobId") ?? "";
  if (!jobId) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "var(--space-lg)" }}>
        <div className="page-header page-header-rooms"></div>
        <div style={{ marginTop: 10, marginLeft: 10 }}><TopNav active="Rooms" /></div>
        <div style={{ padding: "var(--space-md)" }}>No job selected. Open a job from Start and choose Rooms.</div>
      </div>
    );
  }

  const roomsKey = `cc.rooms.${jobId}.v1`;
  const jobDetailKey = `cc.job.${jobId}.v1`;

  // Header job name
  const jobName = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(JOBS_KEY);
      if (!raw) return "(Job)";
      const list = JSON.parse(raw) as Array<{ id: string; name: string }>;
      return list.find(j => j.id === jobId)?.name || "(Job)";
    } catch { return "(Job)"; }
  }, [jobId]);

  // Default cabinet type from Job details
  const defaultCabType = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(jobDetailKey);
      if (!raw) return "Face Frame/Painted";
      const d = JSON.parse(raw);
      return d?.constructionStyle || "Face Frame/Painted";
    } catch { return "Face Frame/Painted"; }
  }, [jobDetailKey]);

  // Rooms state
  const [rows, setRows] = React.useState<RoomRow[]>(() => {
    try {
      const raw = localStorage.getItem(roomsKey);
      return raw ? (JSON.parse(raw) as RoomRow[]) : [];
    } catch { return []; }
  });
  // Auto-seed defaults ONCE if empty — re-evaluate when defaultCabType changes or rows length is zero
  React.useEffect(() => {
    if (rows.length === 0) {
      const seeded = DEFAULT_ROOMS.map(base => ({
        id: uid(),
        name: base,
        baseName: base,
        finish: DEFAULT_FINISH_BY_ROOM[base] || "Painted",
        cabinetType: defaultCabType,
      }));
      setRows(seeded);
      try { localStorage.setItem(roomsKey, JSON.stringify(seeded)); } catch {}
    }
  }, [roomsKey, defaultCabType, rows.length]);

  // Persist on change
  React.useEffect(() => {
    try { localStorage.setItem(roomsKey, JSON.stringify(rows)); } catch {}
  }, [rows, roomsKey]);

  // UI state (add controls + context menu)
  const [addName, setAddName] = React.useState<string>(DEFAULT_ROOMS[0]);
  const [qty, setQty] = React.useState<number>(1);
  const [menu, setMenu] = React.useState<{x:number;y:number;id:string}|null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const lastFocusRef = React.useRef<HTMLElement | null>(null);
  const deleteBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [announce, setAnnounce] = React.useState<string | null>(null);
  // undo state: holds last deleted item and its previous index
  const [deleted, setDeleted] = React.useState<{ item: RoomRow; index: number } | null>(null);
  const undoTimerRef = React.useRef<number | null>(null);

  /* ---------- Helpers ---------- */
  function nextDisplayName(base: string, existing: RoomRow[]): string {
    const taken = new Set(existing.map(r => r.name));
    if (!taken.has(base)) return base;
    let k = 2;
    while (taken.has(`${base} ${k}`)) k++;
    return `${base} ${k}`;
  }

  function addRoomsFromDefault() {
    const base = addName.trim() || DEFAULT_ROOMS[0];
    const count = Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;
    setRows(prev => {
      const next = [...prev];
      for (let i = 0; i < count; i++) {
        const name = nextDisplayName(base, next);
        next.push({
          id: uid(),
          name,
          baseName: base,
          finish: DEFAULT_FINISH_BY_ROOM[base] || "Painted",
          cabinetType: defaultCabType,
        });
      }
      return next;
    });
  }

  function onChangeField(id: string, patch: Partial<RoomRow>) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRoom(id: string) {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const removed = prev[idx];
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      // set deleted for undo
      setDeleted({ item: removed, index: idx });
      setAnnounce(`${removed.name} deleted. Undo available.`);
      // clear any existing timer
      if (undoTimerRef.current) { window.clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
      // auto-dismiss undo after 5s
      undoTimerRef.current = window.setTimeout(() => { setDeleted(null); undoTimerRef.current = null; setAnnounce(null); }, 5000);
      // after removing, focus next row input (defer to next frame)
      requestAnimationFrame(() => {
        const newRows = next;
        if (newRows.length === 0) return;
        const targetIndex = Math.min(idx, newRows.length - 1);
        const targetId = newRows[targetIndex].id;
        const rowEl = document.getElementById(`room-row-${targetId}`);
        const inputEl = rowEl?.querySelector('input') as HTMLElement | null;
        try { inputEl?.focus(); } catch {}
      });
      return next;
    });
    setMenu(null);
  }

  function undoDelete() {
    if (!deleted) return;
    // clear timer
    if (undoTimerRef.current) { window.clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    const { item, index } = deleted;
    setRows(prev => {
      const i = Math.max(0, Math.min(index, prev.length));
      const next = prev.slice(0, i).concat([item], prev.slice(i));
      // focus the restored row after render
      requestAnimationFrame(() => {
        const rowEl = document.getElementById(`room-row-${item.id}`);
        const inputEl = rowEl?.querySelector('input') as HTMLElement | null;
        try { inputEl?.focus(); } catch {}
      });
      return next;
    });
    setAnnounce(`${item.name} restored`);
    setDeleted(null);
    // clear announcement after short time
    window.setTimeout(() => setAnnounce(null), 1200);
  }

  // Tabs behavior — match Job page locations
  function onTabClick(next: TabKey) {
    if (next === "Rooms") return; // already here
    if (next === "JobInfo") {
      window.location.href = `/routes/Job?id=${encodeURIComponent(jobId)}`;
      return;
    }
    if (next === "Construction") {
      window.location.href = `/routes/Job?id=${encodeURIComponent(jobId)}&tab=Construction`;
      return;
    }
    if (next === "Materials") {
      window.location.href = `/routes/Assign?jobId=${encodeURIComponent(jobId)}`;
      return;
    }
  }

  // close context menu on esc / clickaway
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };

    const onKey = (e: KeyboardEvent) => {
      // allow Delete / Enter to activate delete when menu open
      if (!menu) return;
      if (e.key === "Delete" || e.key === "Enter") {
        if (menu) deleteRoom(menu.id);
      }
    };

    const onNavKey = (e: KeyboardEvent) => {
      if (!menu) return;
      // basic navigation support (single item menu but keep pattern)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // focus the delete button
        deleteBtnRef.current?.focus();
      }
    };

    const down = (e: MouseEvent) => {
      // if there's no menu, nothing to do
      if (!menu) return;
      // if click is inside the menu, don't close
      const node = menuRef.current;
      if (node && (e.target instanceof Node) && node.contains(e.target)) return;
      setMenu(null);
    };

    window.addEventListener("keydown", esc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onNavKey);
    window.addEventListener("mousedown", down);
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onNavKey);
      window.removeEventListener("mousedown", down);
    };
  }, [menu]);

  // restore focus when the menu closes
  React.useEffect(() => {
    if (menu) {
      // when the menu opens, focus the delete button shortly after render
      requestAnimationFrame(() => { deleteBtnRef.current?.focus(); });
      return;
    }
    // menu closed: restore last focused element if available
    const prev = lastFocusRef.current;
    if (prev) {
      try { prev.focus(); } catch {}
    }
    lastFocusRef.current = null;
  }, [menu]);

  /* ---------- Render ---------- */
  return (
    <div style={page}>
      <div className="page-header page-header-rooms"></div>
      <div style={{ marginTop: 10, marginLeft: 10 }}>
        <TopNav active="Rooms" />
      </div>

      <div style={panel}>
        {/* Tabs row — same location/style as Job page */}
        <div style={tabRow}>
          <TabBtn active={false} onClick={() => onTabClick("JobInfo")}>Job Info</TabBtn>
          <TabBtn active={true}  onClick={() => onTabClick("Rooms")}>Rooms</TabBtn>
          <TabBtn active={false} onClick={() => onTabClick("Construction")}>Construction</TabBtn>
          <TabBtn active={false} onClick={() => onTabClick("Materials")}>Materials</TabBtn>
        </div>

        <div style={titleRow}>
          <div style={{ fontWeight: 700 }}>Rooms • {jobName}</div>
        </div>

        {/* Controls (no Seed Defaults button) */}
        <div style={controlsRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={label}>Add:</span>
                <select aria-label="Base room to add" style={select} value={addName} onChange={e=>setAddName(e.target.value)}>
              {DEFAULT_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={label}>Qty</span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                style={{ 
                  height: 28, 
                  borderRadius: "var(--radius-md) 0 0 var(--radius-md)", 
                  border: "1px solid var(--border-primary)", 
                  borderRight: "none",
                  background: "var(--bg-quaternary)", 
                  color: "var(--text-primary)", 
                  padding: "0 var(--space-sm)",
                  width: 40, 
                  textAlign: "center"
                }}
                type="text"
                value={qty}
                onChange={e => {
                  const v = parseInt(e.target.value || "1", 10);
                  const next = Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1;
                  setQty(next);
                }}
                onKeyDown={e => { if (e.key === "Enter") addRoomsFromDefault(); }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button
                  style={{
                    width: "20px",
                    height: "14px",
                    background: "var(--button-primary-bg)",
                    border: "1px solid var(--border-secondary)",
                    borderRadius: "0 var(--radius-md) 0 0",
                    color: "var(--text-inverse)",
                    cursor: "pointer",
                    fontSize: "10px",
                    lineHeight: "1",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.15s ease"
                  }}
                  onClick={() => setQty(prev => prev + 1)}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--button-primary-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--button-primary-bg)"}
                >
                  ▲
                </button>
                <button
                  style={{
                    width: "20px",
                    height: "14px",
                    background: "var(--button-primary-bg)",
                    border: "1px solid var(--border-secondary)",
                    borderTop: "none",
                    borderRadius: "0 0 var(--radius-md) 0",
                    color: "var(--text-inverse)",
                    cursor: "pointer",
                    fontSize: "10px",
                    lineHeight: "1",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.15s ease"
                  }}
                  onClick={() => setQty(prev => Math.max(1, prev - 1))}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--button-primary-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--button-primary-bg)"}
                >
                  ▼
                </button>
              </div>
            </div>
            <button 
              data-testid="add-rooms-btn"
              style={{
                height: "32px", 
                padding: "0 12px", 
                borderRadius: "6px", 
                border: "1px solid #6b7280", 
                backgroundColor: "#9ca3af", 
                color: "#111827", 
                cursor: "pointer",
                fontWeight: "700"
              }}
              onClick={addRoomsFromDefault}
            >
              Add Room(s)
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={tableWrap}>
          <div style={tableHeader}>
            <div style={{ ...thCell, width: 220 }}>Room Name</div>
            <div style={{ ...thCell, width: 160 }}>Finish</div>
            <div style={{ ...thCell, width: 220 }}>Cabinet Type</div>
          </div>

          {rows.map(r => (
            <div
              id={`room-row-${r.id}`}
              key={r.id}
              style={row}
              onContextMenu={(e) => {
                e.preventDefault();
                // save last focused element so we can restore focus when the menu closes
                try { lastFocusRef.current = document.activeElement as HTMLElement | null; } catch {}
                setMenu({ x: e.clientX, y: e.clientY, id: r.id });
              }}
              title="Right-click to delete"
            >
              <div style={{ ...tdCell, width: 220 }}>
                <input
                  style={input}
                  aria-label={`Room name for ${r.name}`}
                  value={r.name}
                  onChange={e => onChangeField(r.id, { name: e.target.value })}
                />
              </div>

              <div style={{ ...tdCell, width: 160 }}>
                <select
                  style={select}
                  value={r.finish}
                  aria-label={`Finish for ${r.name}`}
                  onChange={e => onChangeField(r.id, { finish: e.target.value })}
                >
                  <option>Painted</option>
                  <option>Stained</option>
                  <option>Melamine</option>
                  <option>Laminate</option>
                  <option>Veneer</option>
                </select>
              </div>

              <div style={{ ...tdCell, width: 220 }}>
                <select
                  style={select}
                  value={r.cabinetType}
                  aria-label={`Cabinet type for ${r.name}`}
                  onChange={e => onChangeField(r.id, { cabinetType: e.target.value })}
                >
                  <option>Frameless/Painted</option>
                  <option>Frameless/Stained</option>
                  <option>Face Frame/Painted</option>
                  <option>Face Frame/Stained</option>
                </select>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div style={{ padding: 10, color: "#94a3b8" }}>
              No rooms yet. Use the controls above to add rooms.
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {menu && (() => {
        // keep menu inside viewport (simple clamp)
        const clampX = Math.max(8, Math.min(menu.x, (window.innerWidth || 1024) - 170));
        const clampY = Math.max(8, Math.min(menu.y, (window.innerHeight || 768) - 90));
        return (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Room context menu"
            style={{
              position: "fixed", top: clampY, left: clampX, zIndex: 60,
              background: "#0f1720", border: "1px solid #334155", borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,.35)", padding: 6, minWidth: 160,
            }}
          >
            <button
              role="menuitem"
              aria-label="Delete room"
              ref={deleteBtnRef}
              tabIndex={0}
              style={{ ...btn, width: "100%", textAlign: "left", background: "#7f1d1d", borderColor: "#b91c1c", color: "#fff" }}
              onClick={() => { deleteRoom(menu.id); setAnnounce('Room deleted'); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); deleteRoom(menu.id); setAnnounce('Room deleted'); } }}
            >
              Delete
            </button>
          </div>
        );
      })()}
      {/* live region for announcements */}
      <div aria-live="polite" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>{announce}</div>
      {/* Undo toast */}
      {deleted && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 80 }}>
          <div style={{ background: '#0b1220', border: '1px solid #334155', color: '#e5e7eb', padding: 10, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>{deleted.item.name} deleted</div>
            <button style={{ ...btn, background: '#0b662f', borderColor: '#10b981', color: '#fff' }} onClick={undoDelete}>Undo</button>
            <button style={btn} onClick={() => { setDeleted(null); if (undoTimerRef.current) { window.clearTimeout(undoTimerRef.current); undoTimerRef.current = null; } }}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- styles ---------- */
const page: React.CSSProperties   = { 
  minHeight: "100vh", 
  background: "var(--bg-primary)", 
  color: "var(--text-primary)", 
  padding: "var(--space-lg)" 
};

const panel: React.CSSProperties  = { 
  marginTop: 10, 
  background: "var(--bg-secondary)", 
  border: "1px solid var(--border-primary)", 
  borderRadius: "var(--radius-xl)", 
  padding: "var(--space-md)" 
};

const tabRow: React.CSSProperties = { 
  display: "flex", 
  gap: "var(--space-xs)", 
  padding: "4px 4px 10px 4px", 
  borderBottom: "1px solid var(--border-muted)" 
};

const titleRow: React.CSSProperties = { 
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  marginTop: "var(--space-sm)", 
  marginBottom: "var(--space-sm)" 
};

const controlsRow: React.CSSProperties = {
  display: "flex", 
  alignItems: "center", 
  gap: "var(--space-md)", 
  marginBottom: 10, 
  flexWrap: "wrap",
};

const tableWrap: React.CSSProperties   = { 
  border: "1px solid var(--border-primary)", 
  background: "var(--bg-quaternary)", 
  borderRadius: "var(--radius-md)", 
  overflow: "hidden" 
};

const tableHeader: React.CSSProperties = { 
  display: "flex", 
  background: "var(--bg-tertiary)", 
  borderBottom: "1px solid var(--border-primary)" 
};

const thCell: React.CSSProperties = { 
  padding: "var(--space-xs) var(--space-sm)", 
  fontWeight: 700, 
  borderRight: "1px solid var(--border-primary)",
  color: "var(--text-primary)"
};

const row: React.CSSProperties = { 
  display: "flex", 
  borderTop: "1px solid var(--border-muted)" 
};

const tdCell: React.CSSProperties = { 
  padding: "var(--space-sm)", 
  display: "flex", 
  alignItems: "center", 
  gap: "var(--space-xs)" 
};

const input: React.CSSProperties = { 
  height: 28, 
  borderRadius: "var(--radius-md)", 
  border: "1px solid var(--border-primary)", 
  background: "var(--bg-quaternary)", 
  color: "var(--text-primary)", 
  padding: "0 var(--space-sm)" 
};

const select: React.CSSProperties = { 
  height: 28, 
  borderRadius: "var(--radius-md)", 
  border: "1px solid var(--border-primary)", 
  background: "var(--bg-quaternary)", 
  color: "var(--text-primary)", 
  padding: "0 var(--space-sm)" 
};

const btn: React.CSSProperties = { 
  height: 32, 
  padding: "0 var(--space-md)", 
  borderRadius: "var(--radius-md)", 
  border: "1px solid var(--border-primary)", 
  background: "var(--button-secondary-bg)", 
  color: "var(--text-primary)", 
  cursor: "pointer",
  fontWeight: 500,
  transition: "all 0.15s ease"
};

const btnPrimary: React.CSSProperties = { 
  ...btn, 
  background: "var(--button-primary-bg)", 
  color: "var(--text-inverse)", 
  borderColor: "var(--border-secondary)", 
  fontWeight: 700 
};

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, 
        padding: "0 var(--space-md)", 
        borderRadius: "var(--radius-md)",
        border: active ? "1px solid var(--focus-ring)" : "1px solid var(--border-muted)",
        background: active ? "var(--bg-tertiary)" : "var(--bg-quaternary)",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer", 
        fontWeight: active ? 600 : 500,
        marginRight: "var(--space-xs)",
        transition: "all 0.15s ease"
      }}
    >
      {children}
    </button>
  );
}

const label: React.CSSProperties = { fontSize: 12, color: "#cbd5e1" };
