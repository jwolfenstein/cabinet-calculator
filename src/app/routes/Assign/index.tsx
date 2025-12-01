import React from "react";
import TopNav from "../SOM/components/TopNav";

export default function AssignPage() {
  const jobId = new URLSearchParams(window.location.search).get("jobId") ?? "";

  return (
    <div style={page}>
      <div className="page-header page-header-assign"></div>
      <div style={{ marginTop: 10, marginLeft: 10 }}>
        <TopNav active="Assign" />
      </div>

      <div style={panel}>
        <h2 style={{ marginTop: 0, color: "var(--text-primary)" }}>Assignment of Materials</h2>
        <div style={{ color: "var(--accent-assign)", marginBottom: 12 }}>Job ID: {jobId || "(none)"}</div>

        <p style={{ color: "var(--text-secondary)" }}>
          This is a placeholder. Here we'll map materials from your Schedule of Materials to specific cabinet parts
          (case, back, nailers, banding, hinges, slides, etc.) per your defaults and per cabinet.
        </p>

        <ul style={{ color: "var(--text-primary)" }}>
          <li>Read job + defaults</li>
          <li>Pick materials from SOM data</li>
          <li>Save per-job assignments (e.g., <code style={{ color: "var(--text-muted)" }}>cc.assign.{jobId}.v1</code>)</li>
        </ul>
      </div>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "var(--space-lg)" };
const panel: React.CSSProperties = { marginTop: 10, background: "var(--bg-secondary)", border: `1px solid var(--border-primary)`, borderRadius: "var(--radius-xl)", padding: "var(--space-md)" };
