import React from "react";
import styles from "../../../../styles/start.module.css";

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
            {build === "Frameless" ? "Frameless" : "Face Frame"} â€¢ {units === "in" ? "Inches" : "Millimeters"}
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
          Preview is illustrative only. Weâ€™ll replace with actual model previews later.
        </div>
      </div>
    </div>
  );
}
