import React from "react";
import { inToMm, mmToIn, formatMm0_5 } from "../store/units";

export type Units = "in" | "mm";

// Round helpers
function roundToSixteenth(inches: number) {
  return Math.round(inches * 16) / 16;
}

function formatInchesDecimal(v: number) {
  const r = roundToSixteenth(v);
  // show up to 4 decimals, strip trailing zeros
  let s = r.toFixed(4);
  s = s.replace(/\.0+$/, "").replace(/(\.[0-9]*?)0+$/, "$1");
  return s;
}

// Parse inches strings: supports  
// - 24  
// - 24.5  
// - 24 1/2  
// - 1/2  
// - 24"  
function parseInchesTextToDecimal(s: string): number | undefined {
  const raw = (s || "").trim();
  if (!raw) return undefined;
  const cleaned = raw
    .toLowerCase()
    .replace(/in(ch(es)?)?$/i, "")
    .replace(/\"$/, "")
    .trim();
  // mixed like "12 3/4"
  const mixed = cleaned.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const num = parseFloat(mixed[2]);
    const den = parseFloat(mixed[3]);
    if (!isFinite(whole) || !isFinite(num) || !isFinite(den) || den === 0) return undefined;
    return whole + num / den;
  }
  // simple fraction like "3/8"
  const frac = cleaned.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const num = parseFloat(frac[1]);
    const den = parseFloat(frac[2]);
    if (!isFinite(num) || !isFinite(den) || den === 0) return undefined;
    return num / den;
  }
  // decimal or integer
  const dec = Number(cleaned);
  if (isFinite(dec)) return dec;
  return undefined;
}

// Parse a dimension string and return inches (canonical)
export function parseDimensionToInches(input: string, currentUnits: Units): number | undefined {
  if (input == null) return undefined;
  const s = String(input).trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  // explicit mm suffix
  if (/(mm|millimeter|millimetre)s?$/.test(lower)) {
    const n = Number(lower.replace(/[^0-9.\-]/g, ""));
    if (!isFinite(n)) return undefined;
    return mmToIn(n);
  }
  // explicit inch suffix or quote
  if (/(in(ch(es)?)?|\")$/.test(lower)) {
    const n = parseInchesTextToDecimal(s);
    return n;
  }
  // default to current units if no suffix
  if (currentUnits === "mm") {
    const n = Number(lower.replace(/[^0-9.\-]/g, ""));
    if (!isFinite(n)) return undefined;
    return mmToIn(n);
  }
  // default inches
  return parseInchesTextToDecimal(s);
}

type UnitInputProps = {
  valueInInches?: number;
  units: Units;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  minInches?: number;
  maxInches?: number;
  onChangeInches: (valInches: number | undefined) => void;
  // Enter key behavior:
  // - 'stay' (default): commit and keep focus/editing
  // - 'blur': commit and blur (leave the field)
  // - 'next': commit and focus next focusable element
  enterBehavior?: 'stay' | 'blur' | 'next';
};

// A text input that accepts numbers with optional unit suffixes (mm, in, ") and converts
// to canonical inches on blur or Enter. While focused, it lets the user type freely.
export default function UnitInput({
  valueInInches,
  units,
  placeholder,
  className,
  style,
  minInches,
  maxInches,
  onChangeInches,
  enterBehavior = 'stay',
}: UnitInputProps) {
  const formatDisplay = React.useCallback(
    (inches?: number): string => {
      if (inches == null || !isFinite(inches)) return "";
      if (units === "mm") return formatMm0_5(inToMm(inches));
      return formatInchesDecimal(inches);
    },
    [units]
  );

  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState<string>(formatDisplay(valueInInches));

  // keep text in sync when not editing
  React.useEffect(() => {
    if (!editing) setText(formatDisplay(valueInInches));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueInInches, units, editing]);

  const commit = React.useCallback((keepEditing: boolean = false) => {
    const parsedIn = parseDimensionToInches(text, units);
    if (parsedIn == null || !isFinite(parsedIn)) {
      // leave as-is; do not change value
      setText(formatDisplay(valueInInches));
      setEditing(keepEditing);
      return;
    }
    // clamp if needed
    let v = parsedIn;
    if (typeof minInches === "number") v = Math.max(v, minInches);
    if (typeof maxInches === "number") v = Math.min(v, maxInches);
    onChangeInches(v);
    setText(formatDisplay(v));
    setEditing(keepEditing);
  }, [text, units, minInches, maxInches, onChangeInches, valueInInches, formatDisplay]);

  return (
    <input
      type="text"
      className={className}
      style={style}
      placeholder={placeholder}
      value={editing ? text : formatDisplay(valueInInches)}
      onFocus={() => {
        setEditing(true);
        setText(formatDisplay(valueInInches));
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => commit(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const inputEl = e.currentTarget as HTMLInputElement;
          if (enterBehavior === 'stay') {
            commit(true);
          } else if (enterBehavior === 'blur') {
            commit(false);
            // defer blur to ensure state updates flush
            setTimeout(() => inputEl.blur(), 0);
          } else if (enterBehavior === 'next') {
            commit(false);
            // attempt to focus next focusable element
            setTimeout(() => {
              const focusables = Array.from(document.querySelectorAll<HTMLElement>(
                'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
              )).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
              const idx = focusables.indexOf(inputEl);
              const next = idx >= 0 && idx + 1 < focusables.length ? focusables[idx + 1] : null;
              if (next) next.focus(); else inputEl.blur();
            }, 0);
          }
        }
      }}
    />
  );
}
