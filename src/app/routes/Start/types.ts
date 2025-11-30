export type Units = "in" | "mm";
export type BuildType = "Frameless" | "FaceFrame";

export type CabinetStyle =
  | "Base: 3 Drawer Stack"
  | "Base: Sink"
  | "Base: Two Doors"
  | "Upper: Two Doors"
  | "Upper: Open Shelf"
  | "Wall: Tall Pantry";

export const STYLE_OPTIONS: CabinetStyle[] = [
  "Base: 3 Drawer Stack",
  "Base: Sink",
  "Base: Two Doors",
  "Upper: Two Doors",
  "Upper: Open Shelf",
  "Wall: Tall Pantry",
];

export const LS_KEYS = {
  units: "cc.units",
  build: "cc.buildType",
  style: "cc.lastStyle",
} as const;
