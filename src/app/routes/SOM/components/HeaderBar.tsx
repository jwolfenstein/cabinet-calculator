import React from "react";
import styles from "../../../../styles/som.module.css";

export default function HeaderBar(props: {
  onNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <div className={styles.headerBar}>
      <div className={styles.headerLeft}>
        <button className={`${styles.btn} ${styles.btnGreen}`} onClick={props.onNew}>New</button>
        <button className={`${styles.btn} ${styles.btnYellow}`} onClick={props.onEdit}>Edit</button>
        <button className={`${styles.btn} ${styles.btnRed}`} onClick={props.onDelete}>Delete</button>
      </div>
      <div className={styles.headerRight}>
        <button className={styles.btn} onClick={props.onImport}>Import CSV</button>
        <button className={styles.btn} onClick={props.onExport}>Export CSV</button>
      </div>
    </div>
  );
}
