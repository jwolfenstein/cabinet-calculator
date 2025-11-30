@echo off
setlocal enableextensions

:: Root directory (argument 1) or default to C:\cabinet-calculator
set "ROOT=%~1"
if "%ROOT%"=="" set "ROOT=C:\cabinet-calculator"

set "SRC=%ROOT%\src"
set "ROUTE=%SRC%\app\routes\SOM"
set "UTIL=%ROUTE%\utils"

echo.
echo === Ensuring directories exist ===
mkdir "%SRC%" 2>nul
mkdir "%ROUTE%" 2>nul
mkdir "%UTIL%" 2>nul

echo.
echo === Updating: %ROUTE%\types.ts ===
powershell -NoProfile -Command ^
  "$c=@'
export type Category = \"SheetGoods\" | \"Solid\" | \"Hardware\" | \"Banding\";
export type HardwareSubtype = \"DrawerSlides\" | \"Hinges\" | \"HingePlates\" | \"Other\" | undefined;

export type CostUnit =
  | \"perSheet\"      // SheetGoods
  | \"perBoardFoot\"  // Solid
  | \"perRoll\"       // Banding (assumed roll pricing)
  | \"perPair\"       // DrawerSlides
  | \"each\";         // Hinges & HingePlates & Other

export type SOMItem = {
  id: string;
  name: string;
  category: Category;
  subtype?: HardwareSubtype;

  // non-hardware stock
  thicknessMm?: number;
  widthMm?: number;
  lengthMm?: number;

  // hardware specifics
  sideClearanceMm?: number;
  bottomClearanceMm?: number;
  topClearanceMm?: number;    // for DrawerSlides
  hardwareLengthMm?: number;
  hingePlateOffsetMm?: number; // for HingePlates

  // pricing
  cost?: number;               // currency (no symbol)
  costUnit?: CostUnit;

  vendor?: string;
  sku?: string;
  specUrl?: string;
  notes?: string;
};
'@; Set-Content -Path '%ROUTE%\types.ts' -Value $c -Encoding UTF8"

echo.
echo === Updating: %UTIL%\csv.ts ===
powershell -NoProfile -Command ^
  "$c=@'
import type { SOMItem } from \"../types\";

export const CSV_HEADERS = [
  \"id\",\"name\",\"category\",\"subtype\",
  \"thicknessMm\",\"widthMm\",\"lengthMm\",
  \"sideClearanceMm\",\"bottomClearanceMm\",\"topClearanceMm\",\"hardwareLengthMm\",
  \"hingePlateOffsetMm\",
  \"cost\",\"costUnit\",
  \"vendor\",\"sku\",\"specUrl\",\"notes\"
] as const;

export function toCsv(rows: SOMItem[]): string {
  const esc = (v: any) => {
    if (v == null) return \"\";
    const s = String(v);
    return s.includes(\",\") || s.includes('\"') || s.includes(\"\\n\")
      ? '\"' + s.replace(/\"/g, '\"\"') + '\"'
      : s;
  };
  const header = CSV_HEADERS.join(\",\");
  const lines = rows.map((r) => CSV_HEADERS.map((h) => esc((r as any)[h])).join(\",\"));
  return [header, ...lines].join(\"\\n\");
}

export function parseCsv(text: string): SOMItem[] {
  const lines = text.replace(/\\r\\n?/g, \"\\n\").split(\"\\n\").filter(Boolean);
  const [header, ...rows] = lines;
  const cols = header.split(\",\");

  const parseLine = (line: string) => {
    const out: string[] = []; let cur = \"\", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '\"' && line[i+1] === '\"') { cur+='\"'; i++; }
        else if (ch === '\"') { inQ = false; }
        else cur += ch;
      } else {
        if (ch === \",\") { out.push(cur); cur=\"\"; }
        else if (ch === '\"') { inQ = true; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  return rows.map((line) => {
    const vals = parseLine(line);
    const obj: any = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));

    [
      \"thicknessMm\",\"widthMm\",\"lengthMm\",
      \"sideClearanceMm\",\"bottomClearanceMm\",\"topClearanceMm\",\"hardwareLengthMm\",
      \"hingePlateOffsetMm\",\"cost\"
    ].forEach((k) => {
      obj[k] = obj[k] !== \"\" && obj[k] != null ? Number(obj[k]) : undefined;
    });

    if (!obj.id) obj.id = Math.random().toString(36).slice(2, 9);
    return obj as SOMItem;
  });
}
'@; Set-Content -Path '%UTIL%\csv.ts' -Value $c -Encoding UTF8"

echo.
echo === Updating: %ROUTE%\index.tsx ===
powershell -NoProfile -Command ^
  "$c=@'
import React, { useEffect, useMemo, useRef, useState } from \"react\";
import styles from \"../../../styles/som.module.css\";

import type { Category, HardwareSubtype, SOMItem, CostUnit } from \"./types\";
import { parseCsv, toCsv } from \"./utils/csv\";
import {
  formatFeet,
  formatInchesMixed,
  parseInchesTextToDecimal,
  normalizeInchesTextFloor16,
  floorToHalfMm,
  displayMm0_5,
} from \"./utils/units\";
import TopNav from \"./components/TopNav\";
import HeaderBar from \"./components/HeaderBar\";
import InMmPair from \"./components/InMmPair\";

const uid = () => Math.random().toString(36).slice(2, 9);

function inferCostUnit(item: SOMItem): CostUnit {
  if (item.category === \"SheetGoods\") return \"perSheet\";
  if (item.category === \"Solid\") return \"perBoardFoot\";
  if (item.category === \"Banding\") return \"perRoll\";
  if (item.category === \"Hardware\") {
    if (item.subtype === \"DrawerSlides\") return \"perPair\";
    return \"each\";
  }
  return \"each\";
}
function costUnitLabel(u?: CostUnit): string {
  switch (u) {
    case \"perSheet\": return \"Cost per sheet\";
    case \"perBoardFoot\": return \"Cost per board foot\";
    case \"perRoll\": return \"Cost per roll\";
    case \"perPair\": return \"Cost per pair\";
    case \"each\": return \"Cost (each)\";
    default: return \"Cost\";
  }
}

function useOutsideClose(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      onClose();
    }
    window.addEventListener(\"mousedown\", handler);
    return () => window.removeEventListener(\"mousedown\", handler);
  }, [ref, onClose]);
}

function ContextMenu({
  x, y, onEdit, onDelete, onClose,
}: { x: number; y: number; onEdit: () => void; onDelete: () => void; onClose: () => void; }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, onClose);
  useEffect(() => {
    const onEsc = (ev: KeyboardEvent) => ev.key === \"Escape\" && onClose();
    window.addEventListener(\"keydown\", onEsc);
    return () => window.removeEventListener(\"keydown\", onEsc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: \"fixed\",
        top: y,
        left: x,
        background: \"#121821\",
        border: \"1px solid #283241\",
        borderRadius: 8,
        boxShadow: \"0 8px 24px rgba(0,0,0,.35)\",
        padding: 6,
        zIndex: 100,
        minWidth: 180,
      }}
    >
      <button className={styles.btn} style={{ width: \"100%\", textAlign: \"left\" }} onClick={onEdit}>Edit</button>
      <button className={`${styles.btn} ${styles.btnRed}`} style={{ width: \"100%\", textAlign: \"left\", marginTop: 6 }} onClick={onDelete}>Delete</button>
    </div>
  );
}

function SOMModal({
  initial, onSave, onCancel, defaultCategory,
}: {
  initial: Partial<SOMItem>;
  onSave: (v: SOMItem) => void;
  onCancel: () => void;
  defaultCategory: Category;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  const [v, setV] = useState<SOMItem>({
    id: initial.id || uid(),
    name: initial.name || \"\",
    category: (initial.category as Category) || defaultCategory,
    subtype: initial.subtype,

    thicknessMm: initial.thicknessMm,
    widthMm: initial.widthMm,
    lengthMm: initial.lengthMm,

    sideClearanceMm: initial.sideClearanceMm,
    bottomClearanceMm: initial.bottomClearanceMm,
    topClearanceMm: initial.topClearanceMm,
    hardwareLengthMm: initial.hardwareLengthMm,
    hingePlateOffsetMm: initial.hingePlateOffsetMm,

    cost: initial.cost ?? undefined,
    costUnit: initial.costUnit ?? inferCostUnit({ ...(initial as SOMItem), category: (initial.category as Category) || defaultCategory }),

    vendor: initial.vendor || \"\",
    sku: initial.sku || \"\",
    specUrl: initial.specUrl || \"\",
    notes: initial.notes || \"\",
  });

  const [widthInStr, setWidthInStr] = useState<string>(v.widthMm != null ? formatInchesMixed(v.widthMm) : \"\");
  const [lengthInStr, setLengthInStr] = useState<string>(v.lengthMm != null ? formatInchesMixed(v.lengthMm) : \"\");
  const [thicknessInStr, setThicknessInStr] = useState<string>(v.thicknessMm != null ? formatInchesMixed(v.thicknessMm) : \"\");
  const [sideInStr, setSideInStr] = useState<string>(v.sideClearanceMm != null ? formatInchesMixed(v.sideClearanceMm) : \"\");
  const [bottomInStr, setBottomInStr] = useState<string>(v.bottomClearanceMm != null ? formatInchesMixed(v.bottomClearanceMm) : \"\");
  const [topInStr, setTopInStr] = useState<string>(v.topClearanceMm != null ? formatInchesMixed(v.topClearanceMm) : \"\");
  const [hLenInStr, setHLenInStr] = useState<string>(v.hardwareLengthMm != null ? formatInchesMixed(v.hardwareLengthMm) : \"\");
  const [offsetInStr, setOffsetInStr] = useState<string>(v.hingePlateOffsetMm != null ? formatInchesMixed(v.hingePlateOffsetMm) : \"\");
  const [bandingFeetStr, setBandingFeetStr] = useState<string>(v.category === \"Banding\" && v.lengthMm != null ? String(Math.round((v.lengthMm / 304.8) * 100) / 100) : \"\");

  function handleWidthInChange(s: string) { setWidthInStr(s); const dec = parseInchesTextToDecimal(s); setV((cur)=>({ ...cur, widthMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleWidthMmChange(raw: string) { const num = raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((cur)=>({ ...cur, widthMm:mm })); setWidthInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleWidthInBlur() { setWidthInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleLengthInChange(s: string) { setLengthInStr(s); const dec = parseInchesTextToDecimal(s); setV((cur)=>({ ...cur, lengthMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleLengthMmChange(raw: string) { const num = raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((cur)=>({ ...cur, lengthMm:mm })); setLengthInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleLengthInBlur() { setLengthInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleBandingFeetChange(s: string) {
    setBandingFeetStr(s);
    const num = s === \"\" ? NaN : Number(s);
    const mm = isFinite(num) ? Math.max(0, num) * 304.8 : undefined;
    setV((cur) => ({ ...cur, lengthMm: mm == null ? undefined : floorToHalfMm(mm) }));
  }

  function handleThicknessInChange(s: string) { setThicknessInStr(s); const dec=parseInchesTextToDecimal(s); const mm = dec==null?undefined:dec*25.4; setV((cur)=>({ ...cur, thicknessMm: mm==null?undefined:floorToHalfMm(mm) })); }
  function handleThicknessMmChange(raw: string) { const num=raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((cur)=>({ ...cur, thicknessMm:mm })); setThicknessInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleThicknessInBlur() { setThicknessInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleSideInChange(s: string) { setSideInStr(s); const dec=parseInchesTextToDecimal(s); setV((c)=>({ ...c, sideClearanceMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleSideMmChange(raw: string) { const num=raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((c)=>({ ...c, sideClearanceMm:mm })); setSideInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleSideInBlur() { setSideInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleBottomInChange(s: string) { setBottomInStr(s); const dec=parseInchesTextToDecimal(s); setV((c)=>({ ...c, bottomClearanceMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleBottomMmChange(raw: string) { const num=raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((c)=>({ ...c, bottomClearanceMm:mm })); setBottomInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleBottomInBlur() { setBottomInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleTopInChange(s: string) { setTopInStr(s); const dec=parseInchesTextToDecimal(s); setV((c)=>({ ...c, topClearanceMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleTopMmChange(raw: string) { const num=raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((c)=>({ ...c, topClearanceMm:mm })); setTopInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleTopInBlur() { setTopInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleHLenInChange(s: string) { setHLenInStr(s); const dec=parseInchesTextToDecimal(s); setV((c)=>({ ...c, hardwareLengthMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleHLenMmChange(raw: string) { const num=raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((c)=>({ ...c, hardwareLengthMm:mm })); setHLenInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleHLenInBlur() { setHLenInStr((s)=>normalizeInchesTextFloor16(s)); }

  function handleOffsetInChange(s: string) { setOffsetInStr(s); const dec=parseInchesTextToDecimal(s); setV((c)=>({ ...c, hingePlateOffsetMm: dec==null?undefined:floorToHalfMm(dec*25.4) })); }
  function handleOffsetMmChange(raw: string) { const num=raw?Number(raw):NaN; const mm=isFinite(num)?floorToHalfMm(num):undefined; setV((c)=>({ ...c, hingePlateOffsetMm:mm })); setOffsetInStr(mm==null?\"\":formatInchesMixed(mm)); }
  function handleOffsetInBlur() { setOffsetInStr((s)=>normalizeInchesTextFloor16(s)); }

  useEffect(() => { setV((cur) => ({ ...cur, costUnit: inferCostUnit(cur) })); }, [v.category, v.subtype]); // eslint-disable-line

  useEffect(() => {
    const first = modalRef.current?.querySelector<HTMLElement>('input:not([type=\"hidden\"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    first?.focus();
  }, []);
  function onKeyDownAdvance(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.ctrlKey || e.metaKey) && (e.key === \"s\" || e.key === \"S\")) { e.preventDefault(); saveBtnRef.current?.click(); return; }
    if (e.key === \"Escape\") { e.preventDefault(); return onCancel(); }
    if (e.key !== \"Enter\") return;
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === \"textarea\" && e.shiftKey) return;
    e.preventDefault();
    const focusables = Array.from(
      modalRef.current?.querySelectorAll<HTMLElement>('input:not([type=\"hidden\"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])') ?? []
    ).filter((el) => el.offsetParent !== null);
    const idx = focusables.findIndex((el) => el === target);
    const next = focusables[idx + 1];
    next ? next.focus() : saveBtnRef.current?.click();
  }

  const isHardware = v.category === \"Hardware\";
  const isSlides = isHardware && v.subtype === \"DrawerSlides\";
  const isHinges = isHardware && v.subtype === \"Hinges\";
  const isPlates = isHardware && v.subtype === \"HingePlates\";

  return (
    <div className={styles.modalBg} onClick={onCancel}>
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDownAdvance}
        style={{ maxHeight: \"80vh\", overflow: \"auto\" }}
      >
        <div className={styles.modalTitle}>{initial.id ? \"Edit Material\" : \"New Material\"}</div>

        {!isHardware ? (
          <div className={styles.formGrid}>
            <label className={`${styles.label} ${styles.span2}`}>
              Name
              <input className={styles.input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
            </label>
            <label className={`${styles.label} ${styles.span2}`}>
              Category
              <select className={styles.select} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as Category })}>
                <option>SheetGoods</option><option>Solid</option><option>Hardware</option><option>Banding</option>
              </select>
            </label>

            <label className={`${styles.label} ${styles.span2}`}>
              Vendor
              <input className={styles.input} value={v.vendor ?? ''} onChange={(e) => setV({ ...v, vendor: e.target.value })} />
            </label>
            <label className={`${styles.label} ${styles.span2}`}>
              SKU
              <input className={styles.input} value={v.sku ?? ''} onChange={(e) => setV({ ...v, sku: e.target.value })} />
            </label>

            <label className={styles.label}>
              Thickness (in)
              <input className={styles.input} placeholder=\"e.g. 3/4, 0.75\" value={thicknessInStr}
                     onChange={(e) => handleThicknessInChange(e.target.value)} onBlur={handleThicknessInBlur}/>
              <small>(floors to 1/16″ display, 0.5 mm storage)</small>
            </label>
            <label className={styles.label}>
              Thickness (mm)
              <input className={styles.input} type=\"number\" step={0.5} value={v.thicknessMm ?? ''}
                     onChange={(e) => handleThicknessMmChange(e.target.value)} onBlur={(e)=>handleThicknessMmChange(e.target.value)} />
            </label>

            <label className={styles.label}>
              Width (in)
              <input className={styles.input} placeholder=\"24, 24.5, 24 1/2\" value={widthInStr}
                     onChange={(e)=>handleWidthInChange(e.target.value)} onBlur={handleWidthInBlur}/>
              <small>Width (mm): {displayMm0_5(v.widthMm) || '-'}</small>
            </label>
            <label className={styles.label}>
              Width (mm)
              <input className={styles.input} type=\"number\" value={v.widthMm ?? ''} onChange={(e)=>handleWidthMmChange(e.target.value)} />
            </label>

            {v.category === \"Banding\" ? (
              <>
                <label className={styles.label}>
                  Length (ft)
                  <input className={styles.input} type=\"number\" step=\"0.1\" placeholder=\"e.g. 328\"
                         value={bandingFeetStr} onChange={(e) => handleBandingFeetChange(e.target.value)} />
                  <small>Length (mm): {displayMm0_5(v.lengthMm) || '-'}</small>
                </label>
                <label className={styles.label}>
                  Length (mm)
                  <input className={styles.input} type=\"number\" value={v.lengthMm ?? ''} onChange={(e) => handleLengthMmChange(e.target.value)} />
                </label>
              </>
            ) : (
              <>
                <label className={styles.label}>
                  Length (in)
                  <input className={styles.input} placeholder=\"96, 96.25, 96 1/4\" value={lengthInStr}
                         onChange={(e)=>handleLengthInChange(e.target.value)} onBlur={handleLengthInBlur}/>
                  <small>Length (mm): {displayMm0_5(v.lengthMm) || '-'}</small>
                </label>
                <label className={styles.label}>
                  Length (mm)
                  <input className={styles.input} type=\"number\" value={v.lengthMm ?? ''} onChange={(e)=>handleLengthMmChange(e.target.value)} />
                </label>
              </>
            )}

            <label className={styles.label}>
              {costUnitLabel(v.costUnit)}
              <input className={styles.input} type=\"number\" step=\"0.01\" placeholder=\"e.g. 59.95\"
                     value={v.cost ?? ''} onChange={(e) => setV({ ...v, cost: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
            <label className={styles.label}>
              Unit
              <select className={styles.select} value={v.costUnit} onChange={(e) => setV({ ...v, costUnit: e.target.value as any })}>
                <option value=\"perSheet\">per sheet</option>
                <option value=\"perBoardFoot\">per board foot</option>
                <option value=\"perRoll\">per roll</option>
                <option value=\"perPair\">per pair</option>
                <option value=\"each\">each</option>
              </select>
            </label>

            <label className={`${styles.label} ${styles.full}`}>
              Notes
              <textarea className={styles.textarea} rows={2} value={v.notes ?? ''} onChange={(e) => setV({ ...v, notes: e.target.value })} />
            </label>
          </div>
        ) : (
          <div className={styles.formGrid}>
            <label className={`${styles.label} ${styles.span2}`}>
              Name
              <input className={styles.input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
            </label>
            <label className={`${styles.label} ${styles.span2}`}>
              Hardware Type
              <select className={styles.select} value={v.subtype} onChange={(e) => setV({ ...v, subtype: e.target.value as HardwareSubtype })}>
                <option value=\"DrawerSlides\">Drawer Slides</option>
                <option value=\"Hinges\">Hinges</option>
                <option value=\"HingePlates\">Hinge Plates</option>
                <option value=\"Other\">Other</option>
              </select>
            </label>

            <label className={`${styles.label} ${styles.span2}`}>
              Vendor
              <input className={styles.input} value={v.vendor ?? ''} onChange={(e) => setV({ ...v, vendor: e.target.value })} />
            </label>
            <label className={`${styles.label} ${styles.span2}`}>
              SKU
              <input className={styles.input} value={v.sku ?? ''} onChange={(e) => setV({ ...v, sku: e.target.value })} />
            </label>

            { (v.subtype === 'DrawerSlides') && (
              <>
                <label className={styles.label}>
                  Side Clearance (in)
                  <input className={styles.input} placeholder=\"e.g. 1/2\" value={sideInStr}
                         onChange={(e)=>handleSideInChange(e.target.value)} onBlur={()=>handleSideInBlur()} />
                  <small>= {displayMm0_5(v.sideClearanceMm)} mm</small>
                </label>
                <label className={styles.label}>
                  Side Clearance (mm)
                  <input className={styles.input} type=\"number\" value={v.sideClearanceMm ?? ''} onChange={(e)=>handleSideMmChange(e.target.value)} />
                </label>

                <label className={styles.label}>
                  Bottom Clearance (in)
                  <input className={styles.input} placeholder=\"e.g. 3/16\" value={bottomInStr}
                         onChange={(e)=>handleBottomInChange(e.target.value)} onBlur={()=>handleBottomInBlur()} />
                  <small>= {displayMm0_5(v.bottomClearanceMm)} mm</small>
                </label>
                <label className={styles.label}>
                  Bottom Clearance (mm)
                  <input className={styles.input} type=\"number\" value={v.bottomClearanceMm ?? ''} onChange={(e)=>handleBottomMmChange(e.target.value)} />
                </label>

                <label className={styles.label}>
                  Top Clearance (in)
                  <input className={styles.input} placeholder=\"e.g. 1/8\" value={topInStr}
                         onChange={(e)=>handleTopInChange(e.target.value)} onBlur={()=>handleTopInBlur()} />
                  <small>= {displayMm0_5(v.topClearanceMm)} mm</small>
                </label>
                <label className={styles.label}>
                  Top Clearance (mm)
                  <input className={styles.input} type=\"number\" value={v.topClearanceMm ?? ''} onChange={(e)=>handleTopMmChange(e.target.value)} />
                </label>

                <label className={styles.label}>
                  Length (in)
                  <input className={styles.input} placeholder='e.g. 21, 21 3/4' value={hLenInStr}
                         onChange={(e)=>handleHLenInChange(e.target.value)} onBlur={()=>handleHLenInBlur()} />
                  <small>= {displayMm0_5(v.hardwareLengthMm)} mm</small>
                </label>
                <label className={styles.label}>
                  Length (mm)
                  <input className={styles.input} type=\"number\" value={v.hardwareLengthMm ?? ''} onChange={(e)=>handleHLenMmChange(e.target.value)} />
                </label>
              </>
            )}

            { (v.subtype === 'HingePlates') && (
              <>
                <label className={styles.label}>
                  Offset (in)
                  <input className={styles.input} placeholder=\"e.g. 3/32\" value={offsetInStr}
                         onChange={(e) => handleOffsetInChange(e.target.value)} onBlur={handleOffsetInBlur}/>
                  <small>= {displayMm0_5(v.hingePlateOffsetMm)} mm</small>
                </label>
                <label className={styles.label}>
                  Offset (mm)
                  <input className={styles.input} type=\"number\" value={v.hingePlateOffsetMm ?? ''} onChange={(e) => handleOffsetMmChange(e.target.value)} />
                </label>
              </>
            )}

            <label className={styles.label}>
              {costUnitLabel(v.costUnit)}
              <input className={styles.input} type=\"number\" step=\"0.01\" placeholder=\"e.g. 19.95\"
                     value={v.cost ?? ''} onChange={(e) => setV({ ...v, cost: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
            <label className={styles.label}>
              Unit
              <select className={styles.select} value={v.costUnit} onChange={(e) => setV({ ...v, costUnit: e.target.value as any })}>
                <option value=\"perPair\">per pair</option>
                <option value=\"each\">each</option>
              </select>
            </label>

            <label className={styles.label}>
              Spec URL
              <input className={styles.input} value={v.specUrl ?? ''} onChange={(e) => setV({ ...v, specUrl: e.target.value })} />
            </label>

            <label className={`${styles.label} ${styles.full}`}>
              Notes
              <textarea className={styles.textarea} rows={2} value={v.notes ?? ''} onChange={(e) => setV({ ...v, notes: e.target.value })} />
            </label>
          </div>
        )}

        <div style={{ display:\"flex\", justifyContent:\"end\", gap: 8, marginTop: 8 }}>
          <button className={styles.btn} onClick={onCancel}>Cancel</button>
          <button
            ref={saveBtnRef}
            className={`${styles.btn} ${styles.btnGreen}`}
            onClick={() => {
              const t = v.thicknessMm;
              onSave({ ...v, thicknessMm: t == null ? t : floorToHalfMm(t) });
            }}
          >Save</button>
        </div>
      </div>
    </div>
  );
}

export default function SOMPage() {
  const [rows, setRows] = useState<SOMItem[]>(
    [
      { id: uid(), category: \"SheetGoods\", name: \"Maple Plywood 3/4\", vendor: \"Generic\", sku: \"PLY-MAPLE-34\", thicknessMm: 19.05, widthMm: 1219.2, lengthMm: 2438.4, cost: 65.00, costUnit: \"perSheet\" },
      { id: uid(), category: \"SheetGoods\", name: \"Maple Plywood 1/2\", vendor: \"Generic\", sku: \"PLY-MAPLE-12\", thicknessMm: 12.7,  widthMm: 1219.2, lengthMm: 2438.4, cost: 52.00, costUnit: \"perSheet\" },
      { id: uid(), category: \"SheetGoods\", name: \"Maple Plywood 1/4 (Back)\", vendor: \"Generic\", sku: \"PLY-MAPLE-14\", thicknessMm: 6.35, widthMm: 1219.2, lengthMm: 2438.4, cost: 28.00, costUnit: \"perSheet\" },
      { id: uid(), category: \"SheetGoods\", name: \"White Melamine 3/4\", vendor: \"Generic\", sku: \"MEL-WHT-34\", thicknessMm: 19.05, widthMm: 1219.2, lengthMm: 2438.4, cost: 45.50, costUnit: \"perSheet\" },

      { id: uid(), category: \"Solid\", name: \"Maple Solid 3/4 × 1-1/2 (FF Stile/Rail)\", vendor: \"Generic\", sku: \"SOL-MAPLE-34x1.5\", thicknessMm: 19.05, widthMm: 38.1, lengthMm: 2438.4, cost: 6.75, costUnit: \"perBoardFoot\" },
      { id: uid(), category: \"Solid\", name: \"Maple Solid 3/4 × 2 (Nailer/Trim)\", vendor: \"Generic\", sku: \"SOL-MAPLE-34x2\", thicknessMm: 19.05, widthMm: 50.8, lengthMm: 2438.4, cost: 6.75, costUnit: \"perBoardFoot\" },
      { id: uid(), category: \"Solid\", name: \"Maple Solid 3/4 × 2-1/2 (Wide Rail)\", vendor: \"Generic\", sku: \"SOL-MAPLE-34x2.5\", thicknessMm: 19.05, widthMm: 63.5, lengthMm: 2438.4, cost: 6.75, costUnit: \"perBoardFoot\" },
      { id: uid(), category: \"Solid\", name: \"Poplar Solid 3/4 × 1-1/2 (Paint-Grade FF)\", vendor: \"Generic\", sku: \"SOL-POPLAR-34x1.5\", thicknessMm: 19.05, widthMm: 38.1, lengthMm: 2438.4, cost: 4.25, costUnit: \"perBoardFoot\" },

      { id: uid(), category: \"Banding\", name: \"PVC Edgeband 0.5mm × 22mm (White)\", vendor: \"Generic\", sku: \"EB-PVC-0.5x22-WHT\", thicknessMm: 0.5, widthMm: 22, lengthMm: 100000, cost: 24.00, costUnit: \"perRoll\" },
      { id: uid(), category: \"Banding\", name: \"PVC Edgeband 1.0mm × 22mm (White)\", vendor: \"Generic\", sku: \"EB-PVC-1.0x22-WHT\", thicknessMm: 1.0, widthMm: 22, lengthMm: 100000, cost: 29.00, costUnit: \"perRoll\" },
      { id: uid(), category: \"Banding\", name: \"PVC Edgeband 2.0mm × 28mm (Color-Matched)\", vendor: \"Generic\", sku: \"EB-PVC-2.0x28-CM\", thicknessMm: 2.0, widthMm: 28, lengthMm: 100000, cost: 39.00, costUnit: \"perRoll\" },
      { id: uid(), category: \"Banding\", name: \"Maple Veneer Banding 0.5mm × 22mm (Pre-glued)\", vendor: \"Generic\", sku: \"EB-VEN-MAPLE-0.5x22\", thicknessMm: 0.5, widthMm: 22, lengthMm: 76200, cost: 36.00, costUnit: \"perRoll\" },

      { id: uid(), category: \"Hardware\", subtype: \"DrawerSlides\", name: 'Blum TANDEM 563H 21\"', vendor: \"Blum\", sku: \"563H5330B\", sideClearanceMm: 12.7, bottomClearanceMm: 4.7625, topClearanceMm: 0, hardwareLengthMm: 533.4, cost: 27.50, costUnit: \"perPair\" },
      { id: uid(), category: \"Hardware\", subtype: \"DrawerSlides\", name: 'Blum TANDEM 563H 18\"', vendor: \"Blum\", sku: \"563H4570B\", sideClearanceMm: 12.7, bottomClearanceMm: 4.7625, topClearanceMm: 0, hardwareLengthMm: 457.2, cost: 24.75, costUnit: \"perPair\" },

      { id: uid(), category: \"Hardware\", subtype: \"Hinges\", name: \"CLIP top BLUMOTION 110°\", vendor: \"Blum\", sku: \"71B3550\", cost: 3.95, costUnit: \"each\" },
      { id: uid(), category: \"Hardware\", subtype: \"Hinges\", name: \"CLIP top 110° (no BLUMOTION)\", vendor: \"Blum\", sku: \"71T5550\", cost: 2.85, costUnit: \"each\" },

      { id: uid(), category: \"Hardware\", subtype: \"HingePlates\", name: \"Hinge Plate 0mm\", vendor: \"Blum\", sku: \"173L6100\", hingePlateOffsetMm: 0, cost: 0.95, costUnit: \"each\" },
      { id: uid(), category: \"Hardware\", subtype: \"HingePlates\", name: \"Hinge Plate 3mm\", vendor: \"Blum\", sku: \"173H7100\", hingePlateOffsetMm: 3, cost: 0.95, costUnit: \"each\" },
    ]
  );

  const [sel, setSel] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === sel) || null;

  const [activeSomTab, setActiveSomTab] = useState<Category>('SheetGoods');
  const [sub, setSub] = useState<HardwareSubtype>('DrawerSlides');

  const [sortBy, setSortBy] = useState<string>('name');
  useEffect(() => {
    if (activeSomTab === 'Banding') {
      if (!['thickness','width','all'].includes(sortBy)) setSortBy('thickness');
    } else if (activeSomTab === 'Hardware' && sub === 'DrawerSlides') {
      if (!['hardwareLength','vendor','all'].includes(sortBy)) setSortBy('hardwareLength');
    } else {
      if (!['name','category'].includes(sortBy)) setSortBy('name');
    }
  }, [activeSomTab, sub]); // eslint-disable-line

  useEffect(() => { try { const raw = localStorage.getItem('somRowsV1'); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) setRows(p); } } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('somRowsV1', JSON.stringify(rows)); } catch {} }, [rows]);

  const filtered = useMemo(() => {
    let list = rows.slice().filter((r) => r.category === activeSomTab);
    if (activeSomTab === 'Hardware' && sub) list = list.filter((r) => r.subtype === sub);

    if (activeSomTab === 'Banding') {
      if (sortBy === 'thickness') list.sort((a,b)=>(a.thicknessMm??0)-(b.thicknessMm??0));
      else if (sortBy === 'width') list.sort((a,b)=>(a.widthMm??0)-(b.widthMm??0));
    } else if (activeSomTab === 'Hardware' && sub === 'DrawerSlides') {
      if (sortBy === 'hardwareLength') list.sort((a,b)=>(a.hardwareLengthMm??0)-(b.hardwareLengthMm??0));
      else if (sortBy === 'vendor') list.sort((a,b)=>(a.vendor??'').localeCompare(b.vendor??''));
    } else {
      if (sortBy === 'name') list.sort((a,b)=>(a.name??'').localeCompare(b.name??''));
      else if (sortBy === 'category') {
        const byCat = (a.category??'').localeCompare(b.category??'');
        if (byCat !== 0) list.sort((a,b)=>byCat);
        else list.sort((a,b)=>(a.name??'').localeCompare(b.name??''));
      }
    }
    return list;
  }, [rows, activeSomTab, sub, sortBy]);

  function onExport() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'som.csv'; a.click();
    URL.revokeObjectURL(url);
  }
  function onImport() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = async () => {
      const file = inp.files?.[0]; if (!file) return;
      const text = await file.text();
      try { const items = parseCsv(text).map((v)=>({ id: v.id || uid(), ...v })); setRows(items); }
      catch { alert('CSV parse error'); }
    };
    inp.click();
  }

  const [showModal, setShowModal] = useState<null | Partial<SOMItem>>(null);
  const [menu, setMenu] = useState<{ x:number; y:number; id:string } | null>(null);
  function onNew(){ setShowModal({ category: activeSomTab, costUnit: undefined }); }
  function onEdit(){ if (selected) setShowModal(selected); }
  function onDelete(){ if(!selected) return; if(confirm('Delete selected material?')) setRows(rows.filter((r)=>r.id!==selected.id)); }

  function headerFor() {
    if (activeSomTab === 'Hardware') {
      return (
        <tr>
          <th className={styles.th}>Name</th>
          <th className={styles.th}>Subtype</th>
          <th className={styles.th}>SKU</th>
          <th className={styles.th}>Vendor</th>
          <th className={styles.th}>Side Clr (in/mm)</th>
          <th className={styles.th}>Bottom Clr (in/mm)</th>
          <th className={styles.th}>Len/Offset (in/mm)</th>
          <th className={styles.th}>Cost</th>
        </tr>
      );
    }
    return (
      <tr>
        <th className={styles.th}>Material</th>
        <th className={styles.th}>SKU</th>
        <th className={styles.th}>Width</th>
        <th className={styles.th}>Length</th>
        <th className={styles.th}>Thick</th>
        <th className={styles.th}>WidthM</th>
        <th className={styles.th}>LengthM</th>
        <th className={styles.th}>ThickM</th>
        <th className={styles.th}>Cost</th>
      </tr>
    );
  }

  function renderCost(r: SOMItem) {
    const u = r.costUnit ?? inferCostUnit(r);
    const val = r.cost != null ? r.cost.toFixed(2) : '';
    switch (u) {
      case 'perSheet': return `$${val}/sheet`;
      case 'perBoardFoot': return `$${val}/bf`;
      case 'perRoll': return `$${val}/roll`;
      case 'perPair': return `$${val}/pair`;
      case 'each': default: return `$${val}/ea`;
    }
  }

  function renderRow(r: SOMItem) {
    if (r.category === 'Hardware') {
      return (
        <>
          <td className={styles.td}>{r.name}</td>
          <td className={styles.td}>{r.subtype ?? ''}</td>
          <td className={styles.td}>{r.sku ?? ''}</td>
          <td className={styles.td}>{r.vendor ?? ''}</td>
          <td className={styles.td}>{r.subtype === 'DrawerSlides' ? <InMmPair inches={formatInchesMixed(r.sideClearanceMm)} mm={displayMm0_5(r.sideClearanceMm)} /> : '-'}</td>
          <td className={styles.td}>{r.subtype === 'DrawerSlides' ? <InMmPair inches={formatInchesMixed(r.bottomClearanceMm)} mm={displayMm0_5(r.bottomClearanceMm)} /> : '-'}</td>
          <td className={styles.td}>{r.subtype === 'HingePlates' ? <InMmPair inches={formatInchesMixed(r.hingePlateOffsetMm)} mm={displayMm0_5(r.hingePlateOffsetMm)} /> : <InMmPair inches={formatInchesMixed(r.hardwareLengthMm)} mm={displayMm0_5(r.hardwareLengthMm)} />}</td>
          <td className={styles.td}>{renderCost(r)}</td>
        </>
      );
    }
    return (
      <>
        <td className={styles.td}>{r.name}</td>
        <td className={styles.td}>{r.sku ?? ''}</td>
        <td className={styles.td}>{formatInchesMixed(r.widthMm)}</td>
        <td className={styles.td}>{r.category==='Banding' ? formatFeet(r.lengthMm) : formatInchesMixed(r.lengthMm)}</td>
        <td className={styles.td}>{formatInchesMixed(r.thicknessMm)}</td>
        <td className={styles.td}>{displayMm0_5(r.widthMm)}</td>
        <td className={styles.td}>{displayMm0_5(r.lengthMm)}</td>
        <td className={styles.td}>{displayMm0_5(r.thicknessMm)}</td>
        <td className={styles.td}>{renderCost(r)}</td>
      </>
    );
  }

  return (
    <div className={styles.wrap}>
      <TopNav active=\"SOM\" />

      <div className={styles.card}>
        <HeaderBar onNew={onNew} onEdit={onEdit} onDelete={onDelete} onExport={onExport} onImport={onImport} />

        <div className={styles.filters}>
          <div className={styles.chips}>
            {[\"SheetGoods\",\"Solid\",\"Hardware\",\"Banding\"] as const).map((c) => (
              <button key={c} className={`${styles.chip} ${activeSomTab===c?styles.chipActive:''}`}
                onClick={() => { setActiveSomTab(c); if (c!=='Hardware') setSub(undefined); }}>
                {c==='SheetGoods'?'Sheet Goods':c}
              </button>
            ))}
          </div>

          {activeSomTab==='Hardware' && (
            <div className={styles.filterItem}>
              <span>Hardware Type</span>
              <select className={styles.select} value={sub} onChange={(e)=>setSub(e.target.value as any)}>
                <option value=\"DrawerSlides\">Drawer Slides</option>
                <option value=\"Hinges\">Hinges</option>
                <option value=\"HingePlates\">Hinge Plates</option>
                <option value=\"Other\">Other</option>
              </select>
            </div>
          )}

          <div className={styles.filterItem}>
            <span>Sort By</span>
            <select className={styles.select} value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              {activeSomTab==='Banding' ? (
                <>
                  <option value=\"thickness\">Thickness</option>
                  <option value=\"width\">Width</option>
                  <option value=\"all\">No Sort</option>
                </>
              ) : activeSomTab==='Hardware' && sub==='DrawerSlides' ? (
                <>
                  <option value=\"hardwareLength\">Length</option>
                  <option value=\"vendor\">Vendor</option>
                  <option value=\"all\">No Sort</option>
                </>
              ) : (
                <>
                  <option value=\"name\">Name</option>
                  <option value=\"category\">Category</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>{headerFor()}</thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`${styles.row} ${styles.rowHover} ${sel===r.id?styles.rowSelected:''}`}
                  onClick={()=>setSel(r.id)}
                  onDoubleClick={()=>setShowModal(r)}
                  onContextMenu={(e)=>{ e.preventDefault(); setSel(r.id); setMenu({ x:e.clientX, y:e.clientY, id:r.id }); }}>
                  {renderRow(r)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <SOMModal
          initial={showModal}
          defaultCategory={activeSomTab}
          onCancel={() => setShowModal(null)}
          onSave={(itm) => {
            const t = itm.thicknessMm;
            const finalItem = { ...itm, costUnit: itm.costUnit ?? inferCostUnit(itm), thicknessMm: t == null ? t : floorToHalfMm(t) };
            setShowModal(null);
            setRows((prev) => {
              const i = prev.findIndex((p) => p.id === finalItem.id);
              if (i >= 0) { const copy=[...prev]; copy[i]=finalItem; return copy; }
              return [finalItem, ...prev];
            });
          }}
        />
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onEdit={() => { const row = rows.find((r)=>r.id===menu.id); if (row) setShowModal(row); setMenu(null); }}
          onDelete={() => { const row = rows.find((r)=>r.id===menu.id); setMenu(null); if(!row) return; if(confirm(`Delete “${row.name}”?`)) setRows(rows.filter((r)=>r.id!==row.id)); }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
'@; Set-Content -Path '%ROUTE%\index.tsx' -Value $c -Encoding UTF8"

echo.
echo === Done ===
echo Updated: types.ts, utils\csv.ts, routes\SOM\index.tsx
echo If dev server is running, restart:  npm run dev
echo.

endlocal
