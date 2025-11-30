import React, { useState, useEffect } from "react";
import TopNav from "../SOM/components/TopNav";
import { useUnits, inToMm, formatMm0_5 } from "../../store/units";
import UnitInput from "../../components/UnitInput";

// Import SOM types
import type { SOMItem, Category } from '../SOM/types';

type JobStatus = "Design" | "In Progress" | "Complete";
type TabKey = "JobInfo" | "Rooms" | "Construction" | "Materials";

type JobDetails = {
  id: string;
  name: string;
  status: JobStatus;

  firstName: string;
  lastName: string;

  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;

  phone: string;
  phone2: string;
  email: string;

  contact: string;
  notes: string;

  // kept for backward-compatibility, not shown
  units?: "in" | "mm";
  // optional: default construction style for new rooms to read
  constructionStyle?: string;
  measurements: {
    base: { width: number; height: number; depth: number; toeHeight: number };
    upper: { width: number; height: number; depth: number; lightRailHeight: number };
    wall: { width: number; height: number; depth: number };
    faceFrame: { leftStile: number; rightStile: number; midStile: number; topRail: number; bottomRail: number; midRail: number };
  };
};

type JobItem = { id: string; name: string; status: JobStatus };

const JOBS_KEY = "cc.jobs.v1";

// SOM data loading
function loadSOMData(): SOMItem[] {
  try {
    const raw = localStorage.getItem("somRowsV1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as SOMItem[];
      }
    }
  } catch {}
  return [];
}

// Get materials for dropdowns
function getMaterialOptions(somData: SOMItem[], categories: Category[], includeNailer: boolean = false): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [{ value: "", label: "Select Material..." }];
  
  somData
    .filter(item => categories.includes(item.category))
    .forEach(item => {
      options.push({ value: item.id, label: item.name });
    });
  
  return options;
}

// Get hardware options for specific subtypes
function getHardwareOptions(somData: SOMItem[], subtype: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [{ value: "", label: "Select Hardware..." }];
  
  somData
    .filter(item => item.category === "Hardware" && item.subtype === subtype)
    .forEach(item => {
      options.push({ value: item.id, label: item.name });
    });
  
  return options;
}

function getQueryId(): string | null {
  const usp = new URLSearchParams(window.location.search);
  return usp.get("id");
}

function getQueryTab(): TabKey | null {
  const usp = new URLSearchParams(window.location.search);
  const t = usp.get("tab");
  if (!t) return null;
  if (t === "JobInfo" || t === "Rooms" || t === "Construction" || t === "Materials") return t;
  return null;
}

function normalizeDetails(id: string, partial: any): JobDetails {
  // Migrate old construction style values
  let constructionStyle = partial?.constructionStyle ?? "Face Frame";
  if (constructionStyle === "Face Frame/Painted") {
    constructionStyle = "Face Frame";
  }

  const defaults: JobDetails = {
    id,
    name: partial?.name ?? "Untitled Job",
    status: (partial?.status as JobStatus) ?? "Design",

    firstName: partial?.firstName ?? "",
    lastName:  partial?.lastName  ?? "",

    address:  partial?.address  ?? "",
    address2: partial?.address2 ?? "",
    city:     partial?.city     ?? "",
    state:    partial?.state    ?? "",
    zip:      partial?.zip      ?? "",

    phone:  partial?.phone  ?? "",
    phone2: partial?.phone2 ?? "",
    email:  partial?.email  ?? "",

    contact: partial?.contact ?? "",
    notes:   partial?.notes   ?? "",

    units: partial?.units ?? "in",
    constructionStyle,
    measurements: {
      base: {
        width: Number(partial?.measurements?.base?.width ?? 0),
        height: Number(partial?.measurements?.base?.height ?? 34.5),
        depth: Number(partial?.measurements?.base?.depth ?? 24),
        toeHeight: Number(partial?.measurements?.base?.toeHeight ?? 4.5),
      },
      upper: {
        width: Number(partial?.measurements?.upper?.width ?? 0),
        height: Number(partial?.measurements?.upper?.height ?? 30),
        depth: Number(partial?.measurements?.upper?.depth ?? 12),
        lightRailHeight: Number(partial?.measurements?.upper?.lightRailHeight ?? 0),
      },
      wall: {
        width: Number(partial?.measurements?.wall?.width ?? 0),
        height: Number(partial?.measurements?.wall?.height ?? 36),
        depth: Number(partial?.measurements?.wall?.depth ?? 12),
      },
      faceFrame: {
        leftStile: Number(partial?.measurements?.faceFrame?.leftStile ?? 1.5),
        rightStile: Number(partial?.measurements?.faceFrame?.rightStile ?? 1.5),
        midStile: Number(partial?.measurements?.faceFrame?.midStile ?? 1.5),
        topRail: Number(partial?.measurements?.faceFrame?.topRail ?? 2.5),
        bottomRail: Number(partial?.measurements?.faceFrame?.bottomRail ?? 4.0),
        midRail: Number(partial?.measurements?.faceFrame?.midRail ?? 2.5),
      },
    },
  };
  return defaults;
}

export default function JobPage() {
  const { units, setUnits } = useUnits();
  const id = React.useMemo(() => getQueryId(), []);
  const detailKey = id ? `cc.job.${id}.v1` : null;

  const [details, setDetails] = React.useState<JobDetails | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [tab, setTab] = React.useState<TabKey>(() => getQueryTab() ?? "JobInfo");
  
  // Load SOM data for material dropdowns
  const [somData, setSomData] = React.useState<SOMItem[]>([]);
  
  // Door type selection state
  const [doorType, setDoorType] = React.useState<string>("");

  // jobs list for Name dropdown
  const [jobs, setJobs] = React.useState<JobItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(JOBS_KEY) || "[]"); } catch { return []; }
  });

  React.useEffect(() => {
    if (!id || !detailKey) { setNotFound(true); return; }
    try {
      const raw = localStorage.getItem(detailKey);
      if (raw) {
        setDetails(normalizeDetails(id, JSON.parse(raw)));
      } else {
        const list: JobItem[] = (() => { try { return JSON.parse(localStorage.getItem(JOBS_KEY) || "[]"); } catch { return []; } })();
        setJobs(list);
        const summary = list.find(j => j.id === id);
        if (!summary) { setNotFound(true); return; }
        const init = normalizeDetails(id, { name: summary.name, status: summary.status });
        setDetails(init);
        localStorage.setItem(detailKey, JSON.stringify(init));
      }
    } catch { setNotFound(true); }
  }, [id, detailKey]);

  // Load SOM data on component mount
  React.useEffect(() => {
    setSomData(loadSOMData());
  }, []);

  // Sync global units from saved job when loading
  useEffect(() => {
    if (details?.units && details.units !== units) {
      setUnits(details.units);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details]);

  // Persist global units into job details state
  useEffect(() => {
    if (details && details.units !== units) {
      setDetails({ ...details, units });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  function saveAll() {
    if (!details || !detailKey) return;
    try {
      localStorage.setItem(detailKey, JSON.stringify(details));
      // sync summary
      const list: JobItem[] = (() => { try { return JSON.parse(localStorage.getItem(JOBS_KEY) || "[]"); } catch { return []; } })();
      const idx = list.findIndex(j => j.id === details.id);
      const row: JobItem = { id: details.id, name: details.name, status: details.status };
      if (idx >= 0) list[idx] = row; else list.unshift(row);
      localStorage.setItem(JOBS_KEY, JSON.stringify(list));
      setJobs(list);
      alert("Saved.");
    } catch { alert("Failed to save."); }
  }
  function deleteJob() {
    if (!details || !detailKey) return;
    if (!confirm(`Delete job "${details.name}"? This removes job details too.`)) return;
    try {
      localStorage.removeItem(detailKey);
      const list: JobItem[] = (() => { try { return JSON.parse(localStorage.getItem(JOBS_KEY) || "[]"); } catch { return []; } })();
      const next = list.filter(j => j.id !== details.id);
      localStorage.setItem(JOBS_KEY, JSON.stringify(next));
      setJobs(next);
    } catch {}
    window.location.href = "/";
  }
  function cancel() { window.history.length > 1 ? window.history.back() : (window.location.href = "/"); }

  function gotoAssign() { if (details) window.location.href = `/routes/Assign?jobId=${encodeURIComponent(details.id)}`; }
  // Navigate to Rooms (kept single implementation)
  function gotoRooms() {
    if (!details) return;
    // ⬇️ PICK THE PATH THAT MATCHES YOUR FOLDER NAME
    // If your folder is src/app/routes/Rooms/ use:
    window.location.href = `/routes/Rooms?jobId=${encodeURIComponent(details.id)}`;

    // If your folder is src/app/routes/Room/ (singular), use this instead:
    // window.location.href = `/routes/Room?jobId=${encodeURIComponent(details.id)}`;
  }



  function onTabClick(next: "JobInfo"|"Rooms"|"Construction"|"Materials") {
  if (!details) return;
  if (next === "Rooms")     { gotoRooms(); return; }
  setTab(next);
}


  function onSelectJob(targetId: string) {
    if (!targetId || targetId === id) return;
    window.location.href = `/routes/Job?id=${encodeURIComponent(targetId)}`;
  }

  if (notFound) {
    return (
      <div style={page}>
        <div className="page-header page-header-job"></div>
        <div style={{ marginTop: 10, marginLeft: 10 }}><TopNav active="Job" /></div>
        <div style={{ padding: 24, color: "var(--text-primary)" }}>Job not found.</div>
      </div>
    );
  }
  if (!details) {
    return (
      <div style={page}>
        <div className="page-header page-header-job"></div>
        <div style={{ marginTop: 10, marginLeft: 10 }}><TopNav active="Job" /></div>
        <div style={{ padding: 24, color: "var(--text-primary)" }}>Loading…</div>
      </div>
    );
  }

  // Debug log to check construction style
  console.log("Construction Style:", details.constructionStyle);
  console.log("Face Frame check:", details.constructionStyle === "Face Frame");
  console.log("Construction Style length:", details.constructionStyle?.length);
  console.log("Construction Style trimmed:", details.constructionStyle?.trim());

  // Prepare material options for dropdowns
  const caseOptions = getMaterialOptions(somData, ["SheetGoods"]);
  const nailerOptions = getMaterialOptions(somData, ["SheetGoods", "Solid"]);
  const drawerOptions = getMaterialOptions(somData, ["SheetGoods"]);
  
  // Hardware options from SOM
  const drawerGuidesOptions = getHardwareOptions(somData, "DrawerSlides");
  const hingesOptions = getHardwareOptions(somData, "Hinges");
  const hingePlatesOptions = getHardwareOptions(somData, "HingePlates");
  
  // Door material options based on type
  const solidOptions = getMaterialOptions(somData, ["Solid"]);
  const sheetGoodsOptions = getMaterialOptions(somData, ["SheetGoods"]);
  const panelOptions = getMaterialOptions(somData, ["Solid", "SheetGoods"]); // Both for Shaker panels

  return (
    <div style={page}>
      <div className="page-header page-header-job"></div>
      <div style={{ marginTop: 10, marginLeft: 10 }}>
        <TopNav active="Job" />
      </div>

      <div style={panel}>
        {/* Tabs row */}
        <div style={tabRow}>
          <TabBtn active={tab === "JobInfo"} onClick={() => onTabClick("JobInfo")}>Job Info</TabBtn>
          <TabBtn active={false} onClick={() => onTabClick("Rooms")}>Rooms</TabBtn>
          <TabBtn active={tab === "Construction"} onClick={() => onTabClick("Construction")}>Construction</TabBtn>
          <TabBtn active={tab === "Materials"} onClick={() => onTabClick("Materials")}>Materials</TabBtn>
        </div>

        {/* Title (no ID) */}
        <div style={titleRow}>
          <div style={{ fontWeight: 700 }}>Job</div>
          <div />
        </div>

        {/* Tab contents */}
        <div style={{ paddingTop: 8 }}>
          {tab === "JobInfo" && (
            <div>
              {/* Job selector dropdown */}
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <Labeled label="Switch to Job">
                  <select
                    style={select}
                    value={details.id}
                    onChange={(e) => onSelectJob(e.target.value)}
                    title="Select a different job to view/edit"
                  >
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </Labeled>
              </div>
              
              <h2 className="section-title">Job Information</h2>
              
              {/* Status field */}
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <Labeled label="Status">
                  <select style={select} value={details.status} onChange={(e)=>setDetails({ ...details, status: e.target.value as JobStatus })}>
                    <option value="Design">Design</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </Labeled>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", columnGap: 24, rowGap: 14 }}>
                {/* Job Name field */}
                <Labeled label="Job Name">
                  <input 
                    className="input transition-all"
                    style={input} 
                    value={details.name} 
                    onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    placeholder="Enter job name"
                  />
                </Labeled>

                <Labeled label="First Name">
                  <input style={input} value={details.firstName} onChange={(e)=>setDetails({ ...details, firstName: e.target.value })} />
                </Labeled>

                <Labeled label="Last Name">
                  <input style={input} value={details.lastName} onChange={(e)=>setDetails({ ...details, lastName: e.target.value })} />
                </Labeled>

              <Labeled label="Address 1">
                <input style={input} value={details.address} onChange={(e)=>setDetails({ ...details, address: e.target.value })} />
              </Labeled>
              <Labeled label="Address 2">
                <input style={input} value={details.address2} onChange={(e)=>setDetails({ ...details, address2: e.target.value })} />
              </Labeled>

              <Labeled label="City">
                <input style={input} value={details.city} onChange={(e)=>setDetails({ ...details, city: e.target.value })} />
              </Labeled>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", columnGap: 16 }}>
                <Labeled label="State">
                  <input style={{ ...input, width: "100%" }} value={details.state} onChange={(e)=>setDetails({ ...details, state: e.target.value })} />
                </Labeled>
                <Labeled label="Zip">
                  <input style={input} value={details.zip} onChange={(e)=>setDetails({ ...details, zip: e.target.value })} />
                </Labeled>
              </div>

              <Labeled label="Phone 1">
                <input style={input} value={details.phone} onChange={(e)=>setDetails({ ...details, phone: e.target.value })} />
              </Labeled>
              <Labeled label="Phone 2">
                <input style={input} value={details.phone2} onChange={(e)=>setDetails({ ...details, phone2: e.target.value })} />
              </Labeled>

              <Labeled label="Email">
                <input style={input} value={details.email} onChange={(e)=>setDetails({ ...details, email: e.target.value })} />
              </Labeled>
              <Labeled label="Contact Person">
                <input style={input} value={details.contact} onChange={(e)=>setDetails({ ...details, contact: e.target.value })} />
              </Labeled>

              <div style={{ gridColumn: "1 / span 4" }}>
                <Labeled label="Notes">
                  <textarea style={textarea} rows={5} value={details.notes} onChange={(e)=>setDetails({ ...details, notes: e.target.value })} />
                </Labeled>
              </div>
              </div>
            </div>
          )}

          {tab === "Construction" && (
            <div>
              <h2 className="section-title">Construction Details</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 24, rowGap: 16 }}>
              
              {/* Left Column */}
              <div>
                {/* Cabinet Defaults Section */}
                <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Cabinet Defaults</h3>
                  
                  <div style={{ display: "grid", rowGap: "var(--space-sm)" }}>
                    <Labeled label="Cabinet Style">
                      <select 
                        style={select}
                        value={details.constructionStyle}
                        onChange={(e) => setDetails({ ...details, constructionStyle: e.target.value })}
                      >
                        <option value="Face Frame">Face Frame</option>
                        <option value="Frameless">Frameless</option>
                        <option value="Inset">Inset</option>
                      </select>
                    </Labeled>
                    
                    <Labeled label="Measurement Units (global)">
                      <select 
                        style={select}
                        value={units}
                        onChange={(e) => setUnits(e.target.value as "in" | "mm")}
                      >
                        <option value="in">Inches</option>
                        <option value="mm">Millimeters</option>
                      </select>
                    </Labeled>
                  </div>
                </div>

                {/* Cabinet Dimensions Section */}
                <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Cabinet Dimensions ({units === 'in' ? 'in' : 'mm'})</h3>
                  
                  <Labeled label={`Base Cabinet (${units === 'in' ? 'in' : 'mm'})`}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", columnGap: "var(--space-xs)", marginBottom: "var(--space-sm)" }}>
                      <UnitInput
                        style={{ ...input, fontSize: "12px", height: "24px" }}
                        className="input"
                        units={units}
                        valueInInches={details.measurements.base.width}
                        onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, base: { ...details.measurements.base, width: v ?? details.measurements.base.width } } })}
                      />
                      <UnitInput
                        style={{ ...input, fontSize: "12px", height: "24px" }}
                        className="input"
                        units={units}
                        valueInInches={details.measurements.base.height}
                        onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, base: { ...details.measurements.base, height: v ?? details.measurements.base.height } } })}
                      />
                      <UnitInput
                        style={{ ...input, fontSize: "12px", height: "24px" }}
                        className="input"
                        units={units}
                        valueInInches={details.measurements.base.depth}
                        onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, base: { ...details.measurements.base, depth: v ?? details.measurements.base.depth } } })}
                      />
                    </div>
                  </Labeled>
                  
                  <Labeled label={`Toe Height (${units === 'in' ? 'in' : 'mm'})`}>
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.base.toeHeight}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, base: { ...details.measurements.base, toeHeight: v ?? details.measurements.base.toeHeight } } })}
                    />
                  </Labeled>
                </div>

                {/* Upper Dimensions Section */}
                <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Upper Dimensions ({units === 'in' ? 'in' : 'mm'})</h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "var(--space-xs)", rowGap: "var(--space-xs)" }}>
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.upper.width}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, upper: { ...details.measurements.upper, width: v ?? details.measurements.upper.width } } })}
                    />
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.upper.height}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, upper: { ...details.measurements.upper, height: v ?? details.measurements.upper.height } } })}
                    />
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.upper.depth}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, upper: { ...details.measurements.upper, depth: v ?? details.measurements.upper.depth } } })}
                    />
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.upper.lightRailHeight}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, upper: { ...details.measurements.upper, lightRailHeight: v ?? details.measurements.upper.lightRailHeight } } })}
                    />
                  </div>
                </div>

                {/* Wall Cabinet Dimensions Section */}
                <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)" }}>
                  <h3 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Wall Cabinet Dimensions ({units === 'in' ? 'in' : 'mm'})</h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", columnGap: "var(--space-xs)" }}>
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.wall.width}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, wall: { ...details.measurements.wall, width: v ?? details.measurements.wall.width } } })}
                    />
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.wall.height}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, wall: { ...details.measurements.wall, height: v ?? details.measurements.wall.height } } })}
                    />
                    <UnitInput
                      style={{ ...input, fontSize: "12px", height: "24px" }}
                      className="input"
                      units={units}
                      valueInInches={details.measurements.wall.depth}
                      onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, wall: { ...details.measurements.wall, depth: v ?? details.measurements.wall.depth } } })}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Face Frames Dimensions Section - Only visible for Face Frame and Inset styles */}
                {(details.constructionStyle === "Face Frame" || details.constructionStyle === "Inset" || !details.constructionStyle) && (
                  <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)" }}>
                    <h3 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Face Frames Dimensions ({units === 'in' ? 'in' : 'mm'})</h3>
                    
                    <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                      <Labeled label={`Left Stile (${units === 'in' ? 'in' : 'mm'})`}>
                        <UnitInput
                          style={{ ...input, fontSize: "12px", height: "24px" }}
                          className="input"
                          units={units}
                          valueInInches={details.measurements.faceFrame.leftStile}
                          onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, faceFrame: { ...details.measurements.faceFrame, leftStile: v ?? details.measurements.faceFrame.leftStile } } })}
                        />
                      </Labeled>
                      
                      <Labeled label={`Right Stile (${units === 'in' ? 'in' : 'mm'})`}>
                        <UnitInput
                          style={{ ...input, fontSize: "12px", height: "24px" }}
                          className="input"
                          units={units}
                          valueInInches={details.measurements.faceFrame.rightStile}
                          onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, faceFrame: { ...details.measurements.faceFrame, rightStile: v ?? details.measurements.faceFrame.rightStile } } })}
                        />
                      </Labeled>
                      
                      <Labeled label={`Mid Stile (${units === 'in' ? 'in' : 'mm'})`}>
                        <UnitInput
                          style={{ ...input, fontSize: "12px", height: "24px" }}
                          className="input"
                          units={units}
                          valueInInches={details.measurements.faceFrame.midStile}
                          onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, faceFrame: { ...details.measurements.faceFrame, midStile: v ?? details.measurements.faceFrame.midStile } } })}
                        />
                      </Labeled>
                      
                      <Labeled label={`Top Rail (${units === 'in' ? 'in' : 'mm'})`}>
                        <UnitInput
                          style={{ ...input, fontSize: "12px", height: "24px" }}
                          className="input"
                          units={units}
                          valueInInches={details.measurements.faceFrame.topRail}
                          onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, faceFrame: { ...details.measurements.faceFrame, topRail: v ?? details.measurements.faceFrame.topRail } } })}
                        />
                      </Labeled>
                      
                      <Labeled label={`Bottom Rail (${units === 'in' ? 'in' : 'mm'})`}>
                        <UnitInput
                          style={{ ...input, fontSize: "12px", height: "24px" }}
                          className="input"
                          units={units}
                          valueInInches={details.measurements.faceFrame.bottomRail}
                          onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, faceFrame: { ...details.measurements.faceFrame, bottomRail: v ?? details.measurements.faceFrame.bottomRail } } })}
                        />
                      </Labeled>
                      
                      <Labeled label={`Mid Rail (${units === 'in' ? 'in' : 'mm'})`}>
                        <UnitInput
                          style={{ ...input, fontSize: "12px", height: "24px" }}
                          className="input"
                          units={units}
                          valueInInches={details.measurements.faceFrame.midRail}
                          onChangeInches={(v)=> setDetails({ ...details, measurements: { ...details.measurements, faceFrame: { ...details.measurements.faceFrame, midRail: v ?? details.measurements.faceFrame.midRail } } })}
                        />
                      </Labeled>
                    </div>
                  </div>
                )}

                {/* Show a message when Frameless is selected */}
                {details.constructionStyle === "Frameless" && (
                  <div style={{ 
                    background: "var(--bg-tertiary)", 
                    border: `1px solid var(--border-primary)`, 
                    borderRadius: "var(--radius-lg)", 
                    padding: "var(--space-md)",
                    textAlign: "center",
                    color: "var(--text-muted)"
                  }}>
                    <h3 style={{ marginTop: 0, marginBottom: "var(--space-sm)", color: "var(--text-primary)", fontSize: "16px" }}>Frameless Construction</h3>
                    <p style={{ margin: 0, fontSize: "14px" }}>No face frame dimensions needed for frameless construction.</p>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {tab === "Materials" && (
            <div>
              <h2 className="section-title">Material Assignment</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 24, rowGap: 16 }}>
                
                {/* Left Column */}
                <div>
                  {/* Case Section */}
                  <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                    <h4 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Case</h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "var(--space-md)", rowGap: "var(--space-xs)" }}>
                      {/* Left Column of Case */}
                      <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                        <Labeled label="Ends">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Bottom">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Tops">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Stretchers">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Fixed Shelf">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                      </div>
                      
                      {/* Right Column of Case */}
                      <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                        <Labeled label="Adj Shelf">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Backs">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Nailers">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {nailerOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Toe Kick">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Toe Skirt">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Section */}
                  <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)" }}>
                    <h4 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Hardware</h4>
                    
                    <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                      <Labeled label="Drawer Guides">
                        <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                          {drawerGuidesOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </Labeled>
                      
                      {/* Hinges and Hinge Plates in two columns */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "var(--space-md)" }}>
                        <Labeled label="Hinges">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {hingesOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Hinge Plates">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {hingePlatesOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  {/* Drawers Section */}
                  <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "16px" }}>Drawers</h4>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", color: "var(--text-secondary)", fontSize: "14px" }}>
                        <input type="checkbox" style={{ margin: 0 }} />
                        Vendor Constructed
                      </label>
                    </div>
                    
                    <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                      {/* Top row: Fronts/Backs and Faces */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "var(--space-md)" }}>
                        <Labeled label="Fronts/Backs">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {drawerOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                        
                        <Labeled label="Faces">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            <option value="">Select Face Type...</option>
                            <option value="MDF Panel">MDF Panel</option>
                            <option value="Shaker">Shaker</option>
                            <option value="Solid">Solid</option>
                          </select>
                        </Labeled>
                      </div>
                      
                      {/* Full width fields below */}
                      <Labeled label="Bottoms">
                        <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                          {drawerOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </Labeled>
                      
                      <Labeled label="Sides">
                        <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                          {drawerOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </Labeled>
                    </div>
                  </div>

                  {/* Doors Section */}
                  <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)", marginBottom: "var(--space-md)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "16px" }}>Doors</h4>
                      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", color: "var(--text-secondary)", fontSize: "14px" }}>
                        <input type="checkbox" style={{ margin: 0 }} />
                        Vendor Constructed
                      </label>
                    </div>
                    
                    <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                      <Labeled label="Door Type">
                        <select 
                          style={{ ...select, fontSize: "12px", height: "24px" }}
                          value={doorType}
                          onChange={(e) => setDoorType(e.target.value)}
                        >
                          <option value="">Select Door Type...</option>
                          <option value="MDF Panel">MDF Panel</option>
                          <option value="Shaker">Shaker</option>
                          <option value="Solid">Solid</option>
                        </select>
                      </Labeled>
                      
                      {doorType === "Shaker" && (
                        <>
                          <Labeled label="Rails/Stiles">
                            <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                              {solidOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </Labeled>
                          
                          <Labeled label="Panels">
                            <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                              {panelOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </Labeled>
                        </>
                      )}
                      
                      {doorType === "Solid" && (
                        <Labeled label="Material">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {solidOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                      )}
                      
                      {doorType === "MDF Panel" && (
                        <Labeled label="Material">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            {sheetGoodsOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </Labeled>
                      )}
                    </div>
                  </div>

                  {/* Face Frames Section - Only visible for Face Frame and Inset styles */}
                  {(details.constructionStyle === "Face Frame" || details.constructionStyle === "Inset" || !details.constructionStyle) && (
                    <div style={{ background: "var(--bg-tertiary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-lg)", padding: "var(--space-md)" }}>
                      <h4 style={{ marginTop: 0, marginBottom: "var(--space-md)", color: "var(--text-primary)", fontSize: "16px" }}>Face Frames</h4>
                      
                      <div style={{ display: "grid", rowGap: "var(--space-xs)" }}>
                        <Labeled label="Stiles/Rails">
                          <select style={{ ...select, fontSize: "12px", height: "24px" }}>
                            <option>Select Material...</option>
                          </select>
                        </Labeled>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar (Save, Cancel, Delete on the left) */}
      <div style={footer}>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-success transition-all" onClick={saveAll}>
            Save
          </button>
          <button className="btn transition-all" onClick={cancel}>
            Cancel
          </button>
          <button
            className="btn btn-danger transition-all"
            onClick={deleteJob}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* helpers */
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: "0 12px", borderRadius: 6,
        border: active ? "1px solid #93c5fd" : "1px solid #2a3a51",
        background: active ? "#1b2433" : "#121a25",
        color: "#e2e8f0", cursor: "pointer", fontWeight: 600, marginRight: 6,
      }}
    >
      {children}
    </button>
  );
}

/* styles */
const page: React.CSSProperties   = { minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "var(--space-lg)", paddingBottom: 72 };
const panel: React.CSSProperties  = { marginTop: 10, background: "var(--bg-secondary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-xl)", padding: "var(--space-md)" };
const titleRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-sm)", marginBottom: "var(--space-sm)" };

const tabRow: React.CSSProperties = { display: "flex", gap: "var(--space-xs)", padding: "var(--space-xs) var(--space-xs) 10px var(--space-xs)", borderBottom: `1px solid var(--border-muted)` };

const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-xs)" };
const input: React.CSSProperties     = { width: "100%", height: 28, borderRadius: "var(--radius-md)", border: `1px solid var(--border-primary)`, background: "var(--bg-quaternary)", color: "var(--text-primary)", padding: "0 var(--space-sm)" };
const textarea: React.CSSProperties  = { width: "100%", borderRadius: "var(--radius-lg)", border: `1px solid var(--border-primary)`, background: "var(--bg-quaternary)", color: "var(--text-primary)", padding: "var(--space-sm)", resize: "vertical" };
const select: React.CSSProperties    = { height: 28, borderRadius: "var(--radius-md)", border: `1px solid var(--border-primary)`, background: "var(--bg-quaternary)", color: "var(--text-primary)", padding: "0 var(--space-sm)" };

const footer: React.CSSProperties = {
  position: "fixed", left: 0, right: 0, bottom: 0,
  background: "rgba(11, 15, 20, 0.9)", borderTop: `1px solid var(--border-muted)`,
  display: "flex", justifyContent: "flex-start", alignItems: "center",
  padding: "10px var(--space-lg)", gap: 10, backdropFilter: "blur(4px)",
};

const btn: React.CSSProperties        = { height: 32, padding: "0 var(--space-md)", borderRadius: "var(--radius-md)", border: `1px solid var(--border-primary)`, background: "var(--button-secondary-bg)", cursor: "pointer", color: "var(--text-primary)", fontWeight: 500, transition: "all 0.15s ease" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--accent-job)", borderColor: "var(--accent-job)", color: "var(--text-inverse)", fontWeight: 700 };
