import React from "react";
import styles from "../../../../styles/som.module.css";
import { useUnits } from "../../../store/units";

export default function TopNav({ active }: { active?: string }) {
  const { units, setUnits } = useUnits();
  // Function to get the first available job ID for Job page navigation
  function getFirstJobId(): string | null {
    try {
      const jobs = JSON.parse(localStorage.getItem("cc.jobs.v1") || "[]");
      return jobs.length > 0 ? jobs[0].id : null;
    } catch {
      return null;
    }
  }

  // Handle Job navigation - need a job ID
  function handleJobClick(e: React.MouseEvent) {
    e.preventDefault();
    const firstJobId = getFirstJobId();
    if (firstJobId) {
      window.location.href = `/routes/Job?id=${encodeURIComponent(firstJobId)}`;
    } else {
      // No jobs available, redirect to Start page to create one
      alert("No jobs available. Please create a job first from the Start page.");
      window.location.href = "/";
    }
  }

const items = [
  { key: "Start", label: "Start", href: "/" },              // <-- root
  { key: "SOM", label: "SOM", href: "/routes/SOM" },
  { key: "Job", label: "Job", href: "/routes/Job", onClick: handleJobClick },
  { key: "Assign", label: "Assign Materials", href: "/routes/Assign" },
  { key: "Create", label: "Assembly Creator", href: "/routes/Create" },
  { key: "Build", label: "Cabinet Build", href: "/routes/Build" },
];

  return (
    <div className={styles.topnav}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {items.map((it) => (
          <a
            key={it.key}
            className={`${styles.navbtn} ${active === it.key ? styles.navbtnActive : ""}`}
            href={it.href}
            onClick={it.onClick}
          >
            {it.label}
          </a>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="nav-units" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Units</label>
        <select id="nav-units" className={styles.navbtn} style={{ padding: '6px 10px' }} value={units} onChange={(e)=>setUnits(e.target.value as any)}>
          <option value="in">Inches</option>
          <option value="mm">Millimeters</option>
        </select>
      </div>
    </div>
  );
}
