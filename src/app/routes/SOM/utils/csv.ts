import type { SOMItem } from "../types";

export const CSV_HEADERS = [
  "id","name","category","subtype",
  "thicknessMm","widthMm","lengthMm",
  "sideClearanceMm","bottomClearanceMm","topClearanceMm","hardwareLengthMm",
  "hingePlateOffsetMm",
  "cost","costUnit",
  "vendor","sku","specUrl","notes"
] as const;

export function toCsv(rows: SOMItem[]): string {
  const esc = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const header = CSV_HEADERS.join(",");
  const lines = rows.map((r) => CSV_HEADERS.map((h) => esc((r as any)[h])).join(","));
  return [header, ...lines].join("\n");
}

export function parseCsv(text: string): SOMItem[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter(Boolean);
  const [header, ...rows] = lines;
  const cols = header.split(",");

  const parseLine = (line: string) => {
    const out: string[] = []; let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i+1] === '"') { cur+='"'; i++; }
        else if (ch === '"') { inQ = false; }
        else cur += ch;
      } else {
        if (ch === ",") { out.push(cur); cur=""; }
        else if (ch === '"') { inQ = true; }
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
      "thicknessMm","widthMm","lengthMm",
      "sideClearanceMm","bottomClearanceMm","topClearanceMm","hardwareLengthMm",
      "hingePlateOffsetMm","cost"
    ].forEach((k) => {
      obj[k] = obj[k] !== "" && obj[k] != null ? Number(obj[k]) : undefined;
    });

    if (!obj.id) obj.id = Math.random().toString(36).slice(2, 9);
    return obj as SOMItem;
  });
}
