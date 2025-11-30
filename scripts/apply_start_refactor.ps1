$ErrorActionPreference = "Stop"

$root    = "C:\cabinet-calculator"
$src     = Join-Path $root "src"
$start   = Join-Path $src  "app\routes\Start"
$som     = Join-Path $src  "app\routes\SOM"
$scripts = Join-Path $root "scripts"

Write-Host "=== Start Page Refactor & Project Hygiene ==="

# --- Ensure route subfolders exist
$folders = @(
  (Join-Path $start "components"),
  (Join-Path $start "hooks"),
  (Join-Path $start "utils"),
  (Join-Path $start "modals"),
  (Join-Path $start "__tests__")
)
foreach ($f in $folders) {
  if (!(Test-Path $f)) { New-Item -ItemType Directory -Path $f | Out-Null }
}

# --- Backup the existing Start/index.tsx if present
$startIndex = Join-Path $start "index.tsx"
if (Test-Path $startIndex) {
  $backup = Join-Path $start "index.backup.tsx"
  Copy-Item $startIndex $backup -Force
  Write-Host "Backed up Start/index.tsx -> index.backup.tsx"
}

# --- Write Start/types.ts
$typesPath = Join-Path $start "types.ts"
@'
export type Units = "in" | "mm";
export type BuildType = "Frameless" | "FaceFrame";

export type CabinetStyle =
  | "Base: 3 Drawer Stack"
  | "Base: Sink"
  | "Base: Two Doors"
  | "Upper: Two Doors"
  | "Upper: Open Shelf"
  | "Wall: Tall Pantry";

export const STYLE_OPTIONS: CabinetStyle[] = [
  "Base: 3 Drawer Stack",
  "Base: Sink",
  "Base: Two Doors",
  "Upper: Two Doors",
  "Upper: Open Shelf",
  "Wall: Tall Pantry",
];

export const LS_KEYS = {
  units: "cc.units",
  build: "cc.buildType",
  style: "cc.lastStyle",
} as const;
'@ | Set-Content -Encoding UTF8 $typesPath

# --- Write Start/hooks/useStartPrefs.ts
$hookPath = Join-Path $start "hooks\useStartPrefs.ts"
@'
import { useEffect, useState } from "react";
import type { Units, BuildType, CabinetStyle } from "../types";
import { STYLE_OPTIONS, LS_KEYS } from "../types";

export function useStartPrefs() {
  const [units, setUnits] = useState<Units>("in");
  const [build, setBuild] = useState<BuildType>("Frameless");
  const [style, setStyle] = useState<CabinetStyle>("Base: 3 Drawer Stack");

  // hydrate
  useEffect(() => {
    try {
      const u = localStorage.getItem(LS_KEYS.units) as Units | null;
      const b = localStorage.getItem(LS_KEYS.build) as BuildType | null;
      const s = localStorage.getItem(LS_KEYS.style) as CabinetStyle | null;
      if (u) setUnits(u);
      if (b) setBuild(b);
      if (s && STYLE_OPTIONS.includes(s)) setStyle(s);
    } catch {}
  }, []);

  // persist
  useEffect(() => { try { localStorage.setItem(LS_KEYS.units, units); } catch {} }, [units]);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.build, build); } catch {} }, [build]);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.style, style); } catch {} }, [style]);

  return { units, setUnits, build, setBuild, style, setStyle };
}
'@ | Set-Content -Encoding UTF8 $hookPath

# --- Write Start/components/ControlPanel.tsx
$panelPath = Join-Path $start "components\ControlPanel.tsx"
@'
import React from "react";
import styles from "../../../styles/start.module.css";
import type { Units, BuildType, CabinetStyle } from "../types";
import { STYLE_OPTIONS } from "../types";

export default function ControlPanel(props: {
  units: Units; setUnits: (u: Units) => void;
  build: BuildType; setBuild: (b: BuildType) => void;
  style: CabinetStyle; setStyle: (s: CabinetStyle) => void;
  onSetJob: () => void;
  onMaterials: () => void;
  onAddCabinet: () => void;
  onClearJob: () => void;
  onPrintCab: () => void;
  onPrintDoors: () => void;
}) {
  const { units, setUnits, build, setBuild, style, setStyle } = props;
  const unitsLabel = units === "in" ? "Inches" : "Millimeters";

  return (
    <div className={styles.leftCol}>
      <button className={`${styles.btn} ${styles.btnLink}`} onClick={props.onSetJob}>Set Job</button>

      <div className={styles.group}>
        <div className={styles.label}>Select Cabinet Style</div>
        <select className={styles.select} value={style} onChange={(e) => setStyle(e.target.value as CabinetStyle)}>
          {STYLE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div className={styles.stack}>
        <button className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setUnits(units === "in" ? "mm" : "in")}>
          {unitsLabel}
        </button>
        <button className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setBuild(build === "Frameless" ? "FaceFrame" : "Frameless")}>
          {build === "Frameless" ? "Frameless" : "Face Frame"}
        </button>
      </div>

      <div className={styles.stack}>
        <button className={`${styles.btn} ${styles.btnGreen}`} onClick={props.onAddCabinet}>Add Cabinet</button>
        <button className={styles.btn} onClick={props.onMaterials}>Materials</button>
        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={props.onClearJob}>Clear Job</button>
      </div>

      <div className={styles.stack}>
        <button className={styles.btn} onClick={props.onPrintCab}>Print Cab</button>
        <button className={styles.btn} onClick={props.onPrintDoors}>Print Doors</button>
      </div>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 $panelPath

# --- Write Start/components/PreviewPane.tsx
$previewPath = Join-Path $start "components\PreviewPane.tsx"
@'
import React from "react";
import styles from "../../../styles/start.module.css";
import type { Units, BuildType, CabinetStyle } from "../types";

export default function PreviewPane({
  units, build, style,
}: { units: Units; build: BuildType; style: CabinetStyle; }) {
  return (
    <div className={styles.previewCol}>
      <div className={styles.previewCard}>
        <div className={styles.previewHeader}>
          <span>{style}</span>
          <span className={styles.previewMeta}>
            {build === "Frameless" ? "Frameless" : "Face Frame"} • {units === "in" ? "Inches" : "Millimeters"}
          </span>
        </div>
        <div className={styles.previewBox}>
          <div className={styles.cabinetMock}>
            <div className={styles.case} />
            <div className={styles.drawer1} />
            <div className={styles.drawer2} />
            <div className={styles.drawer3} />
          </div>
        </div>
        <div className={styles.previewFooter}>
          Preview is illustrative only. We’ll replace with actual model previews later.
        </div>
      </div>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 $previewPath

# --- Write Start/index.tsx (small composer)
@'
import React from "react";
import styles from "../../../styles/start.module.css";
import TopNav from "../SOM/components/TopNav";

import ControlPanel from "./components/ControlPanel";
import PreviewPane from "./components/PreviewPane";
import { useStartPrefs } from "./hooks/useStartPrefs";

export default function StartPage() {
  const { units, setUnits, build, setBuild, style, setStyle } = useStartPrefs();

  function onSetJob(){ window.location.href = "/routes/Job"; }
  function onMaterials(){ window.location.href = "/routes/SOM"; }
  function onAddCabinet(){
    alert(`Add Cabinet\n\nStyle: ${style}\nUnits: ${units}\nBuild: ${build}\n\n(We will wire this later.)`);
  }
  function onClearJob(){
    if (!confirm("Clear current job selections?")) return;
    setStyle("Base: 3 Drawer Stack"); setUnits("in"); setBuild("Frameless");
  }
  function onPrintCab(){ alert("Print: Cabinet Parts (placeholder)"); }
  function onPrintDoors(){ alert("Print: Doors (placeholder)"); }

  return (
    <div className={styles.wrap}>
      <TopNav active="Start" />
      <div className={styles.grid}>
        <ControlPanel
          units={units} setUnits={setUnits}
          build={build} setBuild={setBuild}
          style={style} setStyle={setStyle}
          onSetJob={onSetJob}
          onMaterials={onMaterials}
          onAddCabinet={onAddCabinet}
          onClearJob={onClearJob}
          onPrintCab={onPrintCab}
          onPrintDoors={onPrintDoors}
        />
        <PreviewPane units={units} build={build} style={style} />
      </div>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 $startIndex

# --- ESLint config (hard cap at ~500 lines)
$eslintPath = Join-Path $root ".eslintrc.json"
@'
{
  "extends": ["eslint:recommended", "plugin:react/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "max-lines": ["error", { "max": 500, "skipComments": true, "skipBlankLines": true }],
    "max-lines-per-function": ["warn", { "max": 120, "skipComments": true, "skipBlankLines": true }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  },
  "settings": { "react": { "version": "detect" } }
}
'@ | Set-Content -Encoding UTF8 $eslintPath

# --- Add lint scripts to package.json safely
$pkgPath = Join-Path $root "package.json"
if (Test-Path $pkgPath) {
  $json = Get-Content $pkgPath -Raw | ConvertFrom-Json
  if (-not $json.scripts) { $json | Add-Member -MemberType NoteProperty -Name scripts -Value (@{}) }
  if (-not $json.scripts."lint") { $json.scripts | Add-Member -MemberType NoteProperty -Name "lint" -Value 'eslint "src/**/*.{ts,tsx}"' }
  if (-not $json.scripts."lint:fix") { $json.scripts | Add-Member -MemberType NoteProperty -Name "lint:fix" -Value 'eslint "src/**/*.{ts,tsx}" --fix' }
  ($json | ConvertTo-Json -Depth 100) | Set-Content -Encoding UTF8 $pkgPath
  Write-Host "Updated package.json scripts (lint, lint:fix)."
} else {
  Write-Warning "package.json not found; skipped adding lint scripts."
}

# --- File length checker
$checker = Join-Path $scripts "check-file-sizes.ps1"
@'
Get-ChildItem -Path "src" -Include *.ts,*.tsx -Recurse |
  ForEach-Object {
    $lines = (Get-Content $_.FullName -Raw).Split("`n").Count
    if ($lines -gt 500) {
      "{0} : {1} lines" -f $_.FullName, $lines
    }
  }
'@ | Set-Content -Encoding UTF8 $checker

Write-Host "All tasks completed."
