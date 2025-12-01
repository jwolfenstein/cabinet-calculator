import React from "react";

export type Units = "in" | "mm";

const LS_KEY_UNITS = "cc.units";

type UnitsContextValue = {
  units: Units;
  setUnits: (u: Units) => void;
};

const UnitsContext = React.createContext<UnitsContextValue | undefined>(undefined);

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnitsState] = React.useState<Units>("in");

  // hydrate from localStorage
  React.useEffect(() => {
    try {
      const stored = (localStorage.getItem(LS_KEY_UNITS) as Units | null) ?? null;
      if (stored === "in" || stored === "mm") setUnitsState(stored);
    } catch {}
  }, []);

  const setUnits = React.useCallback((u: Units) => {
    setUnitsState(u);
    try { localStorage.setItem(LS_KEY_UNITS, u); } catch {}
  }, []);

  const value = React.useMemo(() => ({ units, setUnits }), [units, setUnits]);
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = React.useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within a UnitsProvider");
  return ctx;
}

// Utility helpers
export const MM_PER_IN = 25.4;
export const inToMm = (inch: number) => inch * MM_PER_IN;
export const mmToIn = (mm: number) => mm / MM_PER_IN;
export const roundToHalfMm = (mm: number) => Math.round(mm * 2) / 2;
export const formatMm0_5 = (mm: number) => {
  const v = roundToHalfMm(mm);
  const s = v.toFixed(1);
  return s.replace(/\.0$/, "");
};
