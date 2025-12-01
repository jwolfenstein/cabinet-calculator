export type Category = "SheetGoods" | "Solid" | "Hardware" | "Banding";
export type HardwareSubtype = "DrawerSlides" | "Hinges" | "HingePlates" | "Other" | undefined;

export type CostUnit =
  | "perSheet"      // SheetGoods
  | "perBoardFoot"  // Solid
  | "perRoll"       // Banding
  | "perPair"       // DrawerSlides
  | "each";         // Hinges & HingePlates & Other

export type SOMItem = {
  id: string;
  name: string;
  category: Category;
  subtype?: HardwareSubtype;

  // sizes (mm)
  thicknessMm?: number;
  widthMm?: number;
  lengthMm?: number;

  // hardware specifics (mm)
  sideClearanceMm?: number;
  bottomClearanceMm?: number;
  topClearanceMm?: number;     // DrawerSlides
  hardwareLengthMm?: number;   // DrawerSlides, Other
  hingePlateOffsetMm?: number; // HingePlates

  // pricing
  cost?: number;
  costUnit?: CostUnit;

  vendor?: string;
  sku?: string;
  specUrl?: string;
  notes?: string;
};
