import React from "react";
import styles from "../../../../styles/start.module.css";
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
