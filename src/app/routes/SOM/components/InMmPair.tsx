import React from "react";
import styles from "../../../../styles/som.module.css";

export default function InMmPair({ inches, mm }: { inches?: string; mm?: string; }) {
  if (!inches && !mm) return <span>-</span>;
  return (
    <span className={styles.inMmPair}>
      <span className={styles.inVal}>{inches || "-"}</span>
      <span className={styles.sep}> | </span>
      <span className={styles.mmVal}>{mm || "-"}</span>
    </span>
  );
}
