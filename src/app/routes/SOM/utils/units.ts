// ===== Rounding rules =====
// - Inches input: display as mixed fraction, floor to 1/16".
// - mm storage: floor to 0.5 mm.

const SIXTEENTH = 1 / 16;
export const MM_PER_IN = 25.4;

export function floorToHalfMm(mm?: number | null): number | undefined {
  if (mm == null || !isFinite(mm)) return undefined;
  return Math.floor(mm * 2) / 2;
}

export function displayMm0_5(mm?: number | null): string {
  if (mm == null || !isFinite(mm)) return "";
  const v = floorToHalfMm(mm)!;
  return (Math.round(v * 2) / 2).toFixed(1).replace(/\.0$/, "");
}

// Convert mm -> inches (decimal)
function mmToIn(mm?: number | null): number | undefined {
  if (mm == null || !isFinite(mm)) return undefined;
  return mm / MM_PER_IN;
}

// Format mm as mixed inches floored to 1/16"
export function formatInchesMixed(mm?: number | null): string {
  const dec = mmToIn(mm);
  if (dec == null) return "";
  const floored = Math.floor(dec / SIXTEENTH) * SIXTEENTH + 0; // floor to 1/16
  const whole = Math.floor(floored + 1e-9);
  const frac = floored - whole;
  const num16 = Math.round(frac / SIXTEENTH); // already floored above
  if (num16 <= 0) return `${whole}`;
  if (whole === 0) return `${num16}/16`.replace(/^(\d+)\/16$/, (_m, n) => simplifyFraction(Number(n), 16));
  return `${whole} ${String(num16)}/16`.replace(/(\d+)\/16$/, (_m, n) => simplifyFractionText(Number(n), 16));
}

function simplifyFractionText(n: number, d: number): string {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
}
function simplifyFraction(n: number, d: number): string {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
}
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

// Parse inches input: "1 3/4", "3/8", "1.5", ".75"
export function parseInchesTextToDecimal(s: string): number | undefined {
  if (!s) return undefined;
  const t = s.trim();
  // 1) Mixed "W N/D"
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (mixed) {
    const whole = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]) || 1;
    if (d === 0) return undefined;
    return whole + n / d;
  }
  // 2) Simple fraction "N/D"
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) {
    const n = Number(frac[1]);
    const d = Number(frac[2]) || 1;
    if (d === 0) return undefined;
    return n / d;
  }
  // 3) Decimal ".75" or "1.5"
  const dec = /^-?\d*\.?\d+$/.exec(t);
  if (dec) return Number(t);
  return undefined;
}

// Normalize a user-entered inches string to floored 1/16" formatting
export function normalizeInchesTextFloor16(s: string): string {
  const dec = parseInchesTextToDecimal(s);
  if (dec == null) return s.trim();
  const floored = Math.floor(dec / SIXTEENTH) * SIXTEENTH;
  const whole = Math.floor(floored + 1e-9);
  const frac = floored - whole;
  const num16 = Math.round(frac / SIXTEENTH);
  if (num16 <= 0) return `${whole}`;
  const simp = simplifyFractionText(num16, 16);
  return whole === 0 ? simp : `${whole} ${simp}`;
}

// Format mm as feet with 2 decimals
export function formatFeet(mm?: number | null): string {
  if (mm == null || !isFinite(mm)) return "";
  const ft = (mm / MM_PER_IN) / 12;
  return `${ft.toFixed(2)} ft`;
}
