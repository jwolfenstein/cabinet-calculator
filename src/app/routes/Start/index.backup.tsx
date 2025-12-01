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
