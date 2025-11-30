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
