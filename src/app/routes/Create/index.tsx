import React, { useEffect, useMemo, useState } from 'react';
// ...existing code...
import TopNav from '../SOM/components/TopNav';
import { BuildStatusItems } from './components/BuildStatusItems';
import BuildModal from './components/BuildModal';
import type { BuildResult } from './components/BuildModal';
import { useUnits, inToMm, mmToIn, formatMm0_5 } from '../../store/units';
import UnitInput from '../../components/UnitInput';
import { toFraction } from '../../utils/fractions';

interface CabinetDesign {
  id: string;
  name: string;
  cabinetType: string;
  constructionMethod: 'raised-panel' | 'ship-lap' | 'flush-inset' | 'overlay' | 'inset-panel';
  width: number;
  height: number;
  depth: number;
  doorStyle: string;
  finish: string;
  createdDate: string;
  modifiedDate: string;
}

export default function CreateCabinets() {
  // Tab state for right panel
  const [activeTab, setActiveTab] = useState(0);
  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { units, setUnits } = useUnits();
  const [cabinetStyle, setCabinetStyle] = useState<'frameless' | 'face-frame' | 'catalogue' | ''>('');
  // Cabinet type selection removed; style alone drives logic
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState<boolean>(false);
  const [isDefaultsModalOpen, setIsDefaultsModalOpen] = useState<boolean>(false);
  const [defaultsStep, setDefaultsStep] = useState<number>(1);
  const [appearanceType, setAppearanceType] = useState<string>('');
  const [ffDims, setFfDims] = useState<{
    stileLeft: number;
    stileRight: number;
    railTop: number;
    railBottom: number;
    midStile: number;
    midRail: number;
    thickness: number;
    hasMidStile: boolean;
    hasMidRails: boolean;
  }>({
    stileLeft: 1.5,
    stileRight: 1.5,
    railTop: 1.5,
    railBottom: 1.5,
    midStile: 1.5,
    midRail: 1.5,
    thickness: 0.75,
    hasMidStile: false,
    hasMidRails: false,
  });

  // Door/Drawer fronts defaults (overlays & reveals)
  const [frontDefaults, setFrontDefaults] = useState<{
    openingMode: 'overlay' | 'inset';
    doorReveal: number;     // gap around door or between adjacent doors
    drawerReveal: number;   // gap around drawer front
    doorOverlay: number;    // overlay beyond opening/frame (overlay mode)
    drawerOverlay: number;  // overlay for drawer fronts
    drawerOpenH?: number | null; // preferred opening height for drawer rows
  }>({
    openingMode: 'overlay',
    doorReveal: 1/16,
    drawerReveal: 1/16,
    doorOverlay: 0.5,
    drawerOverlay: 0.5,
    drawerOpenH: null,
  });

  // Load saved defaults when opening modal
  useEffect(() => {
    if (!isDefaultsModalOpen) return;
    try {
      const saved = localStorage.getItem('cc.defaults.faceFrame.v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFfDims((prev) => ({ ...prev, ...parsed }));
      }
      // Load front defaults depending on style
      if (cabinetStyle === 'face-frame') {
        const ffFronts = localStorage.getItem('cc.defaults.fronts.faceFrame.v1');
        if (ffFronts) setFrontDefaults(prev => ({ ...prev, ...(JSON.parse(ffFronts)) }));
      } else if (cabinetStyle === 'frameless') {
        const flFronts = localStorage.getItem('cc.defaults.fronts.frameless.v1');
        if (flFronts) setFrontDefaults(prev => ({ ...prev, ...(JSON.parse(flFronts)) }));
      }
      // Load saved appearance by style (migrating from old type-based keys if needed)
      if (cabinetStyle) {
        const styleKey = `cc.defaults.appearance.${cabinetStyle}`;
        const vStyleOnly = localStorage.getItem(styleKey);
        if (vStyleOnly) {
          setAppearanceType(vStyleOnly);
        } else {
          const legacy = [
            `cc.defaults.appearance.${cabinetStyle}.base`,
            `cc.defaults.appearance.${cabinetStyle}.upper`,
            `cc.defaults.appearance.${cabinetStyle}.wall`
          ];
          for (const k of legacy) {
            const v = localStorage.getItem(k);
            if (v) { setAppearanceType(v); break; }
          }
        }
      }
    } catch {}
  }, [isDefaultsModalOpen]);
  
  // Image catalog for appearance types by style + cabinet type
  const faceFrameImages: Record<string, { file: string; label: string }[]> = {
    base: [
      { file: '1-door-1-drawer.png', label: '1 Door / 1 Drawer' },
      { file: '2-door-1-drawer.png', label: '2 Door / 1 Drawer' },
      { file: '3-drawer.png', label: '3 Drawer Stack' }
    ],
    upper: [
      { file: 'upper-single-door.png', label: 'Upper Single Door' },
      { file: 'upper-double-doors.png', label: 'Upper Double Doors' }
    ],
    wall: [
      { file: 'wall-single-door.png', label: 'Wall Single Door' },
      { file: 'wall-double-door.png', label: 'Wall Double Doors' },
      { file: 'wall-split-single-door.png', label: 'Wall Split Single' },
      { file: 'wall-split-double-door.png', label: 'Wall Split Double' }
    ]
  };
  const framelessImages: Record<string, { file: string; label: string }[]> = {
    base: [
      { file: '1-drawer-1-door.png', label: '1 Drawer / 1 Door' },
      { file: '1-drawer-2-door.png', label: '1 Drawer / 2 Door' },
      { file: '3-drawer-stack.png', label: '3 Drawer Stack' },
      { file: 'base-blind-left.png', label: 'Base Blind Left' },
      { file: 'full-single-door.png', label: 'Full Single Door' },
      { file: 'full-2-door.png', label: 'Full Double Door' }
    ],
    upper: [
      { file: 'upper-single.png', label: 'Upper Single' },
      { file: 'upper-double.png', label: 'Upper Double' }
    ],
    wall: [
      { file: 'wall-single.png', label: 'Wall Single' },
      { file: 'wall-double.png', label: 'Wall Double' }
    ]
  };

  const appearanceOptions = useMemo(() => {
    if (cabinetStyle !== 'face-frame' && cabinetStyle !== 'frameless') return [];
    const source = cabinetStyle === 'face-frame' ? faceFrameImages : framelessImages;
    // Flatten all groups since type selection is removed
    const all: { file: string; label: string }[] = Object.values(source).flat();
    return Array.from(new Map(all.map(o => [o.file, o]))).map(v => v[1]).sort((a, b) => a.label.localeCompare(b.label));
  }, [cabinetStyle]);

  // Derive face-frame layout from selected appearance (number of mid rails, whether mid stile exists)
  const ffLayout = useMemo(() => {
    if (cabinetStyle !== 'face-frame' || !appearanceType) {
      return { midRailsCount: 0, hasMidStile: false } as const;
    }
    const fname = (appearanceType.split('/')?.pop() || '').toLowerCase();
    let midRailsCount = fname.includes('3-drawer') ? 2 : (fname.includes('1-drawer') ? 1 : 0);
    // Any wall-split cabinet should have at least one mid rail
    if (fname.includes('wall-split')) {
      midRailsCount = Math.max(midRailsCount, 1);
    }
    const hasMidStile = (
      fname.includes('2-door') ||
      fname.includes('double') ||
      fname.includes('split-double')
    );
    return { midRailsCount, hasMidStile } as const;
  }, [cabinetStyle, appearanceType]);
  
  
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
    // Hydrate previously saved build defaults per style (frameless/face-frame)
    useEffect(() => {
      if (cabinetStyle !== 'frameless' && cabinetStyle !== 'face-frame') return;
      try {
        const saved = localStorage.getItem(`cc.defaults.buildResult.${cabinetStyle}.v1`);
        if (saved) setBuildResult(JSON.parse(saved));
      } catch {}
    }, [cabinetStyle]);
  const [customSpecs, setCustomSpecs] = useState<{
    name?: string;
    width?: number;
    height?: number;
    depth?: number;
    doorStyle?: string;
    finish?: string;
  }>({});




  // Convert fraction string to decimal
  const fromFraction = (fractionStr: string): number => {
    const trimmed = fractionStr.trim();
    if (!trimmed) return 0;
    
    // Handle whole numbers
    if (!trimmed.includes('/') && !trimmed.includes(' ')) {
      return parseFloat(trimmed) || 0;
    }
    
    let whole = 0;
    let fractionPart = trimmed;
    
    // Handle mixed numbers (e.g., "24 1/2")
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(' ');
      whole = parseFloat(parts[0]) || 0;
      fractionPart = parts[1] || '';
    }
    
    // Handle fractions (e.g., "1/2")
    if (fractionPart.includes('/')) {
      const [numerator, denominator] = fractionPart.split('/');
      const fraction = (parseFloat(numerator) || 0) / (parseFloat(denominator) || 1);
      return whole + fraction;
    }
    
    return whole;
  };

  // Static defaults per cabinet "type" (Base, Upper, Wall) now displayed simultaneously.
  const staticTypeDefaults = {
    Base: { height: 34.5, width: 24, depth: 24 },
    Upper: { height: 40, width: 18, depth: 15 },
    Wall: { height: 84, width: 30, depth: 26 }
  } as const;

  // Editable type defaults state (persisted in localStorage)
  const [typeDefaults, setTypeDefaults] = useState<{
    Base: { width: number; height: number; depth: number };
    Upper: { width: number; height: number; depth: number };
    Wall: { width: number; height: number; depth: number };
  }>(() => ({
    Base: { ...staticTypeDefaults.Base },
    Upper: { ...staticTypeDefaults.Upper },
    Wall: { ...staticTypeDefaults.Wall },
  }));

  // Load persisted type defaults on mount and when page opens
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cc.defaults.typeDimensions.v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.Base && parsed.Upper && parsed.Wall) {
          setTypeDefaults(prev => ({
            Base: {
              width: Number(parsed.Base.width) || prev.Base.width,
              height: Number(parsed.Base.height) || prev.Base.height,
              depth: Number(parsed.Base.depth) || prev.Base.depth,
            },
            Upper: {
              width: Number(parsed.Upper.width) || prev.Upper.width,
              height: Number(parsed.Upper.height) || prev.Upper.height,
              depth: Number(parsed.Upper.depth) || prev.Upper.depth,
            },
            Wall: {
              width: Number(parsed.Wall.width) || prev.Wall.width,
              height: Number(parsed.Wall.height) || prev.Wall.height,
              depth: Number(parsed.Wall.depth) || prev.Wall.depth,
            },
          }));
        }
      }
    } catch {}
  }, []);

  // Persist type defaults when they change
  useEffect(() => {
    try {
      localStorage.setItem('cc.defaults.typeDimensions.v1', JSON.stringify(typeDefaults));
    } catch {}
  }, [typeDefaults]);

  // Note: Assembly defaults for a style fall back to current Base type defaults unless style-specific dims exist.

  // Get current cabinet specs (either default or custom)
  const getCurrentSpecs = () => {
    if (!cabinetStyle) return null;
    // Load style-specific defaults if saved in Build Modal; otherwise fall back to current Base defaults from this page
    let def = { width: typeDefaults.Base.width, height: typeDefaults.Base.height, depth: typeDefaults.Base.depth };
    try {
      const saved = localStorage.getItem(`cc.defaults.dimensions.${cabinetStyle}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number' && typeof parsed.depth === 'number') {
          def = { width: parsed.width, height: parsed.height, depth: parsed.depth };
        }
      }
    } catch {}
    return {
      width: customSpecs.width ?? def.width,
      height: customSpecs.height ?? def.height,
      depth: customSpecs.depth ?? def.depth,
      doorStyle: customSpecs.doorStyle ?? 'Shaker',
      finish: customSpecs.finish ?? 'Natural'
    };
  };

  const specsDisplay = useMemo(() => {
    const s = getCurrentSpecs();
    if (!s) return null;
    if (units === 'in') return {
      widthText: `${toFraction(s.width)}"`,
      heightText: `${toFraction(s.height)}"`,
      depthText: `${toFraction(s.depth)}"`,
      unitLabel: 'in',
    } as const;
    // mm display: convert inches -> mm
    const w = inToMm(s.width);
    const h = inToMm(s.height);
    const d = inToMm(s.depth);
    return {
      widthText: `${formatMm0_5(w)} mm`,
      heightText: `${formatMm0_5(h)} mm`,
      depthText: `${formatMm0_5(d)} mm`,
      unitLabel: 'mm',
    } as const;
  }, [units, customSpecs, cabinetStyle]);

  // Preview calculations for face frame openings and front sizes (placed after getCurrentSpecs definition)
  const frontPreview = useMemo(() => {
    if (cabinetStyle !== 'face-frame') return null;
    const specs = getCurrentSpecs();
    if (!specs) return null;
    const innerW = Math.max(0, (specs.width) - (ffDims.stileLeft + ffDims.stileRight));
    const totalMidRails = (ffLayout.midRailsCount || 0) * (ffDims.midRail || 0);
    const innerH = Math.max(0, (specs.height) - (ffDims.railTop + ffDims.railBottom + totalMidRails));
    const rows = Math.max(1, (ffLayout.midRailsCount || 0) + 1);
    const rowOpenH = innerH / rows; // fallback equal rows
    // Determine drawer vs door rows from appearance filename heuristics
    const fname = (appearanceType.split('/')?.pop() || '').toLowerCase();
    const drawerRows = fname.includes('3-drawer') ? 3 : (fname.includes('1-drawer') ? 1 : 0);
    const doorRows = Math.max(0, rows - drawerRows);
    const desiredDrawerOpenH = (frontDefaults.drawerOpenH ?? undefined) && (frontDefaults.drawerOpenH! > 0) ? (frontDefaults.drawerOpenH as number) : rowOpenH;
    const totalDrawerOpenH = drawerRows > 0 ? Math.min(innerH, desiredDrawerOpenH * drawerRows) : 0;
    const remainingH = Math.max(0, innerH - totalDrawerOpenH);
    const rowOpenHDrawer = drawerRows > 0 ? desiredDrawerOpenH : 0;
    const rowOpenHDoor = doorRows > 0 ? (remainingH / doorRows) : 0;
    const hasCenter = !!ffLayout.hasMidStile;
    const sideOpenW = hasCenter ? Math.max(0, (innerW - ffDims.midStile) / 2) : innerW;
    const clamp = (v: number) => Math.max(0, v);
    if (frontDefaults.openingMode === 'overlay') {
      const doorH = clamp(rowOpenHDoor + 2 * (frontDefaults.doorOverlay || 0));
      const drawerH = clamp(rowOpenHDrawer + 2 * (frontDefaults.drawerOverlay || 0));
      const doorWSingle = clamp(innerW + 2 * (frontDefaults.doorOverlay || 0));
      const doorWLeaf = clamp(sideOpenW + 2 * (frontDefaults.doorOverlay || 0));
      const drawerWSingle = clamp(innerW + 2 * (frontDefaults.drawerOverlay || 0));
      return { innerW, innerH, rows, rowOpenH, mode: 'overlay' as const, doorH, drawerH, hasCenter, doorWSingle, doorWLeaf, drawerWSingle, drawerRows, doorRows, rowOpenHDrawer, rowOpenHDoor };
    } else {
      const doorH = clamp(rowOpenHDoor - 2 * (frontDefaults.doorReveal || 0));
      const drawerH = clamp(rowOpenHDrawer - 2 * (frontDefaults.drawerReveal || 0));
      const doorWSingle = clamp(innerW - 2 * (frontDefaults.doorReveal || 0));
      const doorWLeaf = clamp(sideOpenW - 2 * (frontDefaults.doorReveal || 0));
      const drawerWSingle = clamp(innerW - 2 * (frontDefaults.drawerReveal || 0));
      return { innerW, innerH, rows, rowOpenH, mode: 'inset' as const, doorH, drawerH, hasCenter, doorWSingle, doorWLeaf, drawerWSingle, drawerRows, doorRows, rowOpenHDrawer, rowOpenHDoor };
    }
  }, [cabinetStyle, customSpecs, ffDims, ffLayout, frontDefaults, appearanceType]);

  // Handle cabinet style change
  const handleCabinetStyleChange = (style: 'frameless' | 'face-frame' | 'catalogue' | '') => {
    setCabinetStyle(style);
    setCustomSpecs({});
    setIsEditModalOpen(false);
    setAppearanceType('');
  };

  // Handle cabinet type selection
  // No cabinet type selection anymore

  const handleSaveDefaults = () => {
    try {
      if (cabinetStyle === 'face-frame') {
        localStorage.setItem('cc.defaults.faceFrame.v1', JSON.stringify(ffDims));
        localStorage.setItem('cc.defaults.fronts.faceFrame.v1', JSON.stringify(frontDefaults));
      } else if (cabinetStyle === 'frameless') {
        localStorage.setItem('cc.defaults.fronts.frameless.v1', JSON.stringify(frontDefaults));
      }
      if (cabinetStyle && appearanceType) {
        const key = `cc.defaults.appearance.${cabinetStyle}`;
        localStorage.setItem(key, appearanceType);
      }
    } catch {}
    setIsDefaultsModalOpen(false);
    setDefaultsStep(1);
  };

  // Save cabinet to catalogue
  const handleSaveCabinet = () => {
    const specs = getCurrentSpecs();
    if (!specs) return;

    const newCabinet: CabinetDesign = {
      id: `cabinet-${Date.now()}`,
      name: customSpecs.name ? customSpecs.name : (cabinetStyle ? `${cabinetStyle} Assembly` : 'Assembly'),
      cabinetType: cabinetStyle,
      constructionMethod: 'raised-panel', // Default construction method
      width: specs.width,
      height: specs.height,
      depth: specs.depth,
      doorStyle: specs.doorStyle,
      finish: specs.finish,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    // Save to localStorage catalogue
    try {
  const existingCabinets = JSON.parse(localStorage.getItem('cc.cabinet-catalogue.v1') || '[]');
  const updatedCabinets = [...existingCabinets, newCabinet];
      localStorage.setItem('cc.cabinet-catalogue.v1', JSON.stringify(updatedCabinets));
  setCatalogue(updatedCabinets);
      
  alert(`Cabinet saved to catalogue!`);
      
      // Reset form
      setCabinetStyle('');
      setIsEditModalOpen(false);
      setCustomSpecs({});
    } catch (error) {
      console.error('Error saving cabinet:', error);
      alert('Error saving cabinet to catalogue');
    }
  };

  // Catalogue state and helpers
  const [catalogue, setCatalogue] = useState<CabinetDesign[]>([]);
  const [cataloguePick, setCataloguePick] = useState<CabinetDesign | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cc.cabinet-catalogue.v1') || '[]';
      const parsed = JSON.parse(raw);
      setCatalogue(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCatalogue([]);
    }
  }, [cabinetStyle]);

  const handleUseFromCatalogue = (cab: CabinetDesign) => {
    // Set style to the saved assembly's style and populate defaults only
    const style = (cab.cabinetType === 'face-frame' || cab.cabinetType === 'frameless') ? cab.cabinetType : 'frameless';
    setCataloguePick(cab);
    setCabinetStyle(style);
    setCustomSpecs({ width: cab.width, height: cab.height, depth: cab.depth, doorStyle: cab.doorStyle, finish: cab.finish });
    // Do NOT start build process automatically
  };

  const isStandardStyle = cabinetStyle === 'frameless' || cabinetStyle === 'face-frame';


  return (
    <div className="page">
      <div className="page-header page-header-create"></div>
      <TopNav active="Create" />
      
      <div className="create-cabinets-container">
        <div className="create-cabinets-header">
          <h1 className="section-title">Assembly Creator</h1>
          <p className="page-subtitle">Create Assemblies for Cabinet Catalogue.</p>
        </div>

        <div className="cabinet-selection-grid">
          {/* Left Panel - Selection Form */}
          <div className="selection-panel">
            <div className="selection-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="selection-title" style={{ margin: 0 }}>Cabinet | Frames</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="units-select" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Units</label>
                  <select id="units-select" className="input" style={{ width: 140 }} value={units} onChange={(e)=>setUnits(e.target.value as any)}>
                    <option value="in">Inches</option>
                    <option value="mm">Millimeters</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Cabinet Style</label>
                  <select 
                    className="input cabinet-style-selector"
                    value={cabinetStyle}
                    onChange={(e) => handleCabinetStyleChange(e.target.value as 'frameless' | 'face-frame' | 'catalogue' | '')}
                  >
                    <option value="">Select Cabinet Style...</option>
                    <option value="frameless">Frameless</option>
                    <option value="face-frame">Face Frame</option>
                    <option value="catalogue">From Catalogue</option>
                  </select>
                </div>

                  {/* Cabinet Type removed intentionally */}
              </div>

              {cabinetStyle === 'catalogue' && (
                <div className="section" style={{ marginTop: 8 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Catalogue</h4>
                  {catalogue.length === 0 ? (
                    <div style={{ border: '1px dashed var(--border-primary)', borderRadius: 8, padding: 16, color: 'var(--text-muted)' }}>
                      Catalogue is empty. Use "Start Build Process" with a style and then "Save to Catalogue" to add assemblies.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                      {catalogue.map(cab => (
                        <div key={cab.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 10, background: 'var(--bg-tertiary)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{cab.name}</div>
                            <small style={{ color: 'var(--text-muted)' }}>{cab.cabinetType} • {toFraction(cab.width)}"W × {toFraction(cab.height)}"H × {toFraction(cab.depth)}"D</small>
                          </div>
                          <button className="btn btn-primary" onClick={() => handleUseFromCatalogue(cab)}>Use & Edit</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Specifications Display (always visible) */}
              <div className="specs-section">
                <div className="specs-header" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <h4 className="specs-title" style={{ margin: 0 }}>Set Default Dimensions</h4>
                  <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>Dimensions may be changed at job level.</small>
                </div>
                <div className="specs-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                  {(['Base','Upper','Wall'] as const).map(label => {
                    const mapKey = label as keyof typeof typeDefaults;
                    const d = typeDefaults[mapKey];
                    return (
                      <div key={label} className="spec-card" style={{ border:'1px solid var(--border-primary)', borderRadius:8, padding:10, background:'var(--bg-tertiary)', display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{label}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Width ({units === 'in' ? 'in' : 'mm'})</label>
                            <UnitInput
                              className="input input-narrow"
                              units={units}
                              valueInInches={d.width}
                              onChangeInches={(v)=> setTypeDefaults(prev => ({ ...prev, [mapKey]: { ...prev[mapKey], width: v ?? prev[mapKey].width } }))}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Height ({units === 'in' ? 'in' : 'mm'})</label>
                            <UnitInput
                              className="input input-narrow"
                              units={units}
                              valueInInches={d.height}
                              onChangeInches={(v)=> setTypeDefaults(prev => ({ ...prev, [mapKey]: { ...prev[mapKey], height: v ?? prev[mapKey].height } }))}
                            />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Depth ({units === 'in' ? 'in' : 'mm'})</label>
                            <UnitInput
                              className="input input-narrow"
                              units={units}
                              valueInInches={d.depth}
                              onChangeInches={(v)=> setTypeDefaults(prev => ({ ...prev, [mapKey]: { ...prev[mapKey], depth: v ?? prev[mapKey].depth } }))}
                            />
                            {isStandardStyle && (
                              <small style={{ color:'var(--text-muted)', fontSize:11, marginTop:4, display:'block' }}>
                                {cabinetStyle === 'frameless' ? 'includes door' : 'does not include door'}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <small style={{ color:'var(--text-muted)', display:'block', marginTop:8 }}>Edits save automatically. These are defaults for each cabinet type; assembly dimensions may still be customized per style in the build flow.</small>

                <div className="action-buttons">
                  <button
                    className="btn btn-primary"
                    disabled={!isStandardStyle}
                    onClick={() => setShowSaveModal(true)}
                    aria-disabled={!isStandardStyle}
                  >
                    Save to Catalogue
                  </button>
                </div>
                    {/* Save to Catalogue Modal */}
                    {showSaveModal && (
                      <div className="modal-backdrop" onClick={() => setShowSaveModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                          <h3 className="modal-title">Save to Catalogue</h3>
                          <p className="page-subtitle">Enter a name for this assembly:</p>
                          <form onSubmit={e => {
                            e.preventDefault();
                            handleSaveCabinet();
                            setShowSaveModal(false);
                          }}>
                            <input
                              type="text"
                              className="input"
                              style={{ width: 240, marginBottom: 16 }}
                              placeholder="Assembly name..."
                              value={customSpecs.name || ''}
                              onChange={e => setCustomSpecs(prev => ({ ...prev, name: e.target.value }))}
                              required
                              autoFocus
                            />
                            <div style={{ textAlign: 'right' }}>
                              <button type="button" className="btn btn-secondary" style={{ marginRight: 8 }} onClick={() => setShowSaveModal(false)}>Cancel</button>
                              <button type="submit" className="btn btn-primary" disabled={!(customSpecs.name && customSpecs.name.trim())}>Save</button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
              </div>
            </div>
          </div>

          {/* Right Panel - Tabbed Summary */}
          <div className="drawing-panel compact">
            <div className="tab-bar">
              {['Cabinet Defaults', 'Doors/Drawers', 'Face Frames'].map((tab, idx) => {
                const isFaceFrameTab = tab === 'Face Frames';
                const disabled = isFaceFrameTab && cabinetStyle !== 'face-frame';
                return (
                  <button
                    key={tab}
                    className={`tab-btn${activeTab === idx ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                    onClick={() => !disabled && setActiveTab(idx)}
                    disabled={disabled}
                  >
                    <span className="tab-label">{tab}</span>
                  </button>
                );
              })}
            </div>
            <div className="drawing-container" style={{ paddingTop: 16 }}>
              {activeTab === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'left', width: '100%' }}>
                    Set cabinet default dimensions and build processes here.
                  </div>
                  <div style={{ marginBottom: 12, textAlign: 'left' }}>
                    <button
                      className="btn btn-success"
                      disabled={!isStandardStyle}
                      onClick={() => { setIsBuildModalOpen(true); }}
                      aria-disabled={!isStandardStyle}
                    >
                      Start Build Process
                    </button>
                  </div>
                  <div style={{ width: '100%' }}>
                    <div className="build-status-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
                      <BuildStatusItems
                        cabinetStyle={cabinetStyle}
                        buildResult={buildResult}
                        getCurrentSpecs={getCurrentSpecs}
                        setBuildResult={setBuildResult}
                      />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 1 && (
                <div style={{ padding: 16, color: '#888' }}>Doors/Drawers tab content goes here.</div>
              )}
              {activeTab === 2 && cabinetStyle === 'face-frame' && (
                <div style={{ padding: 16, color: '#888' }}>Face Frames tab content goes here.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <div className="modal-container">
        {/* Door/Drawers Defaults Modal (split screen) */}
        {isDefaultsModalOpen && (
          <div className="modal-backdrop" onClick={() => { setIsDefaultsModalOpen(false); setDefaultsStep(1); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Set Door/Drawers Defaults</h3>
              <p className="page-subtitle" style={{ marginTop: 0 }}>
                {defaultsStep === 1 ? 'Select appearance and frame dimensions.' : 'Configure overlays, reveals & preview front sizing.'}
              </p>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Step {defaultsStep} of 2</div>
                <div style={{ display:'flex', gap:8 }}>
                  {Number(defaultsStep) > 1 && (
                    <button className="btn btn-secondary btn-sm" onClick={()=> setDefaultsStep(s=> Math.max(1, s-1))}>← Back</button>
                  )}
                  {Number(defaultsStep) < 2 && (
                    <button className="btn btn-secondary btn-sm" onClick={()=> setDefaultsStep(s=> Math.min(2, s+1))}>Next →</button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 16, minHeight: 420 }}>
                {/* Left side controls */}
                <div style={{ flex: '1 1 55%' }}>
                  {defaultsStep === 1 && (
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Appearance Type</label>
                    <select
                      className="input"
                      disabled={!cabinetStyle}
                      value={appearanceType}
                      onChange={(e) => setAppearanceType(e.target.value)}
                    >
                      <option value="">{cabinetStyle ? 'Select Appearance...' : 'Select Style First'}</option>
                      {appearanceOptions.map(opt => (
                        <option key={opt.file} value={`${cabinetStyle}/${opt.file}`}>{opt.label}</option>
                      ))}
                    </select>
                    {!appearanceType && !!appearanceOptions.length && (
                      <small style={{ color: 'var(--text-muted)', marginTop: 6 }}>Choose a layout to preview it.</small>
                    )}
                    {!cabinetStyle && (
                      <small style={{ color: 'var(--text-muted)', marginTop: 6 }}>Select a cabinet style first.</small>
                    )}
                    {/* Type prompt removed */}
                  </div>
                  )}
                  {Number(defaultsStep) === 1 && cabinetStyle === 'face-frame' && (
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Face Frame Dimensions</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Left Stile</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={ffDims.stileLeft}
                            onChangeInches={(v) => setFfDims(prev => ({ ...prev, stileLeft: v ?? prev.stileLeft }))}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Right Stile</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={ffDims.stileRight}
                            onChangeInches={(v) => setFfDims(prev => ({ ...prev, stileRight: v ?? prev.stileRight }))}
                          />
                        </div>

                        {/* Rails group (quantity badge removed per requirement) */}
                        <div style={{ gridColumn: '1 / 3', marginTop: 6 }}>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Rails</label>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Top Rail</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={ffDims.railTop}
                            onChangeInches={(v) => setFfDims(prev => ({ ...prev, railTop: v ?? prev.railTop }))}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Bottom Rail</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={ffDims.railBottom}
                            onChangeInches={(v) => setFfDims(prev => ({ ...prev, railBottom: v ?? prev.railBottom }))}
                          />
                        </div>

                        {/* Derived mid members based on appearance */}
                        {ffLayout.hasMidStile && (
                          <div style={{ gridColumn: '1 / 3', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Mid Stile Width</label>
                              <small style={{ color: 'var(--text-muted)' }}>x1</small>
                            </div>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={ffDims.midStile}
                              onChangeInches={(v) => setFfDims(prev => ({ ...prev, midStile: v ?? prev.midStile }))}
                            />
                          </div>
                        )}

                        {ffLayout.midRailsCount > 0 && (
                          <div style={{ gridColumn: '1 / 3' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mid Rail Width</label>
                              <small style={{ color: 'var(--text-muted)' }}>x{ffLayout.midRailsCount}</small>
                            </div>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={ffDims.midRail}
                              onChangeInches={(v) => setFfDims(prev => ({ ...prev, midRail: v ?? prev.midRail }))}
                            />
                          </div>
                        )}

                        <div style={{ gridColumn: '1 / 3', marginTop: 6 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>Frame Thickness</label>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={ffDims.thickness}
                              onChangeInches={(v) => setFfDims(prev => ({ ...prev, thickness: v ?? prev.thickness }))}
                            />
                          </div>
                        </div>
                        {/* Step 2 UI is rendered below to avoid tall modal in Step 1 */}
                      </div>
                    </div>
                  )}
                  {/* Step 2: Face Frame overlays/reveals & preview */}
                  {Number(defaultsStep) === 2 && cabinetStyle === 'face-frame' && (
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Fronts: Mode & Gaps</label>
                        <select
                          className="input"
                          style={{ width: 140 }}
                          value={frontDefaults.openingMode}
                          onChange={(e) => setFrontDefaults(prev => ({ ...prev, openingMode: e.target.value as 'overlay'|'inset' }))}
                        >
                          <option value="overlay">Overlay</option>
                          <option value="inset">Inset</option>
                        </select>
                      </div>
                      {frontDefaults.openingMode === 'overlay' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Door Overlay (H)</label>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={frontDefaults.doorOverlay}
                              onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, doorOverlay: v ?? prev.doorOverlay }))}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Drawer Overlay (H)</label>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={frontDefaults.drawerOverlay}
                              onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, drawerOverlay: v ?? prev.drawerOverlay }))}
                            />
                          </div>
                        </div>
                      )}
                      {frontDefaults.openingMode === 'inset' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Door Reveal (gap)</label>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={frontDefaults.doorReveal}
                              onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, doorReveal: v ?? prev.doorReveal }))}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Drawer Reveal (gap)</label>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={frontDefaults.drawerReveal}
                              onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, drawerReveal: v ?? prev.drawerReveal }))}
                            />
                          </div>
                        </div>
                      )}
                      {/* Drawer Opening Height - only when a layout with drawers is selected */}
                      {(() => { const fname = (appearanceType.split('/')?.pop() || '').toLowerCase(); const hasDrawers = fname.includes('drawer'); return hasDrawers; })() && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Drawer Opening Height</label>
                            <UnitInput
                              className="input"
                              units={units}
                              valueInInches={frontDefaults.drawerOpenH ?? (frontPreview ? frontPreview.rowOpenHDrawer : undefined)}
                              onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, drawerOpenH: v ?? null }))}
                            />
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Applies to drawer rows only; remaining opening height is split across door rows.</small>
                          </div>
                        </div>
                      )}
                      {frontPreview && (
                        <div style={{ marginTop: 8, padding: 8, border: '1px solid var(--border-secondary)', borderRadius: 6, background: 'var(--bg-elevated)' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Preview</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Opening Width</div>
                              <div>{units === 'in' ? `${toFraction(frontPreview.innerW)}"` : `${formatMm0_5(inToMm(frontPreview.innerW))} mm`}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Opening Height</div>
                              <div>{units === 'in' ? `${toFraction(frontPreview.innerH)}"` : `${formatMm0_5(inToMm(frontPreview.innerH))} mm`}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Drawer Rows</div>
                              <div>{frontPreview.drawerRows ?? 0}{(frontPreview.drawerRows ?? 0) > 0 ? ` × ${units === 'in' ? `${toFraction(frontPreview.rowOpenHDrawer)}"` : `${formatMm0_5(inToMm(frontPreview.rowOpenHDrawer))} mm`} open` : ''}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Door Rows</div>
                              <div>{frontPreview.doorRows ?? (frontPreview.rows)}{(frontPreview.doorRows ?? 0) > 0 ? ` × ${units === 'in' ? `${toFraction(frontPreview.rowOpenHDoor)}"` : `${formatMm0_5(inToMm(frontPreview.rowOpenHDoor))} mm`} open` : ''}</div>
                            </div>
                            {frontPreview.hasCenter ? (
                              <div>
                                <div style={{ color: 'var(--text-muted)' }}>Door Leaf Width</div>
                                <div>{units === 'in' ? `${toFraction(frontPreview.doorWLeaf)}"` : `${formatMm0_5(inToMm(frontPreview.doorWLeaf))} mm`}</div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ color: 'var(--text-muted)' }}>Door Width</div>
                                <div>{units === 'in' ? `${toFraction(frontPreview.doorWSingle)}"` : `${formatMm0_5(inToMm(frontPreview.doorWSingle))} mm`}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Door Height (per row)</div>
                              <div>{units === 'in' ? `${toFraction(frontPreview.doorH)}"` : `${formatMm0_5(inToMm(frontPreview.doorH))} mm`}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Drawer Width</div>
                              <div>{units === 'in' ? `${toFraction(frontPreview.drawerWSingle)}"` : `${formatMm0_5(inToMm(frontPreview.drawerWSingle))} mm`}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Drawer Height (per row)</div>
                              <div>{units === 'in' ? `${toFraction(frontPreview.drawerH)}"` : `${formatMm0_5(inToMm(frontPreview.drawerH))} mm`}</div>
                            </div>
                          </div>
                          {/* Compact diagram: opening split into drawer/door rows */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Diagram</div>
                            <div style={{
                              border: '1px solid var(--border-secondary)',
                              borderRadius: 6,
                              background: 'var(--bg-primary)',
                              height: 160,
                              width: '100%',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                              {/* Render drawer rows first if typical base layout places drawer on top; this is purely illustrative */}
                              {Array.from({ length: frontPreview.drawerRows || 0 }).map((_, i) => (
                                <div key={`diag-drawer-${i}`} style={{
                                  flex: `${(frontPreview.rowOpenHDrawer || 0) / (frontPreview.innerH || 1)}`,
                                  background: 'rgba(0, 170, 255, 0.15)',
                                  borderBottom: '1px solid var(--border-secondary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, color: 'var(--text-secondary)'
                                }}>
                                  Drawer {units === 'in' ? `${toFraction(frontPreview.rowOpenHDrawer)}"` : `${formatMm0_5(inToMm(frontPreview.rowOpenHDrawer))} mm`}
                                </div>
                              ))}
                              {Array.from({ length: frontPreview.doorRows || 0 }).map((_, i) => (
                                <div key={`diag-door-${i}`} style={{
                                  flex: `${(frontPreview.rowOpenHDoor || 0) / (frontPreview.innerH || 1)}`,
                                  background: 'rgba(0, 200, 0, 0.12)',
                                  borderBottom: i === (frontPreview.doorRows || 0) - 1 ? 'none' : '1px solid var(--border-secondary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, color: 'var(--text-secondary)'
                                }}>
                                  Door {units === 'in' ? `${toFraction(frontPreview.rowOpenHDoor)}"` : `${formatMm0_5(inToMm(frontPreview.rowOpenHDoor))} mm`}
                                </div>
                              ))}
                            </div>
                          </div>
                          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                            Drawer opening height is applied when drawers are present; remaining opening height is distributed across door rows.
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                  {Number(defaultsStep) === 2 && cabinetStyle === 'frameless' && (
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Front Gaps & Overlays</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Door Overlay (H)</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={frontDefaults.doorOverlay}
                            onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, doorOverlay: v ?? prev.doorOverlay }))}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Drawer Overlay (H)</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={frontDefaults.drawerOverlay}
                            onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, drawerOverlay: v ?? prev.drawerOverlay }))}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Door Reveal (gap)</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={frontDefaults.doorReveal}
                            onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, doorReveal: v ?? prev.doorReveal }))}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Drawer Reveal (gap)</label>
                          <UnitInput
                            className="input"
                            units={units}
                            valueInInches={frontDefaults.drawerReveal}
                            onChangeInches={(v)=> setFrontDefaults(prev => ({ ...prev, drawerReveal: v ?? prev.drawerReveal }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Right side preview */}
                <div style={{ flex: '1 1 45%', textAlign: 'center' }}>
                  {Number(defaultsStep) === 1 && appearanceType ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <img
                        src={`/images/cabinets/${appearanceType}`}
                        alt={appearanceType}
                        style={{ maxWidth: '220px', width: '100%', border: '1px solid var(--border-primary)', borderRadius: 8, background: 'var(--bg-tertiary)', padding: 12 }}
                      />
                      <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>{appearanceType.split('/').slice(-1)[0].replace(/[-]/g, ' ').replace(/\.png$/,'')}</small>
                    </div>
                  ) : Number(defaultsStep) === 1 ? (
                    <div style={{ border: '1px dashed var(--border-primary)', borderRadius: 8, padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>
                      No appearance selected.
                    </div>
                  ) : (
                    <div style={{ border: '1px dashed var(--border-primary)', borderRadius: 8, padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>
                      Adjust overlays, reveals & drawer opening height on the left.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-buttons">
                {Number(defaultsStep) === 2 && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setIsDefaultsModalOpen(false); setDefaultsStep(1); }}
                    >
                      Close
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveDefaults}
                    >
                      Save Defaults
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Edit Specifications Modal */}
        {isEditModalOpen && cabinetStyle && (
          <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Edit Cabinet Specifications</h3>
              <div className="form-group">
                <label>Width ({units === 'in' ? 'inches' : 'mm'})</label>
                <UnitInput
                  className="input"
                  units={units}
                  valueInInches={customSpecs.width ?? getCurrentSpecs()?.width}
                  onChangeInches={(v) => setCustomSpecs(prev => ({ ...prev, width: v }))}
                />
                {units === 'in' ? (
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {toFraction(customSpecs.width ?? getCurrentSpecs()?.width ?? 0)}"
                  </small>
                ) : (
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {formatMm0_5(inToMm(customSpecs.width ?? getCurrentSpecs()?.width ?? 0))} mm
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Height ({units === 'in' ? 'inches' : 'mm'})</label>
                <UnitInput
                  className="input"
                  units={units}
                  valueInInches={customSpecs.height ?? getCurrentSpecs()?.height}
                  onChangeInches={(v) => setCustomSpecs(prev => ({ ...prev, height: v }))}
                />
                {units === 'in' ? (
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {toFraction(customSpecs.height ?? getCurrentSpecs()?.height ?? 0)}"
                  </small>
                ) : (
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {formatMm0_5(inToMm(customSpecs.height ?? getCurrentSpecs()?.height ?? 0))} mm
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Depth ({units === 'in' ? 'inches' : 'mm'})</label>
                <UnitInput
                  className="input"
                  units={units}
                  valueInInches={customSpecs.depth ?? getCurrentSpecs()?.depth}
                  onChangeInches={(v) => setCustomSpecs(prev => ({ ...prev, depth: v }))}
                />
                {units === 'in' ? (
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {toFraction(customSpecs.depth ?? getCurrentSpecs()?.depth ?? 0)}"
                  </small>
                ) : (
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {formatMm0_5(inToMm(customSpecs.depth ?? getCurrentSpecs()?.depth ?? 0))} mm
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Door Style</label>
                <select 
                  className="input"
                  value={customSpecs.doorStyle ?? getCurrentSpecs()?.doorStyle ?? ''}
                  onChange={(e) => setCustomSpecs(prev => ({ ...prev, doorStyle: e.target.value }))}
                >
                  <option value="Shaker">Shaker</option>
                  <option value="Flat Panel">Flat Panel</option>
                  <option value="Raised Panel">Raised Panel</option>
                  <option value="Glass Insert">Glass Insert</option>
                </select>
              </div>
              <div className="form-group">
                <label>Finish</label>
                <select 
                  className="input"
                  value={customSpecs.finish ?? getCurrentSpecs()?.finish ?? ''}
                  onChange={(e) => setCustomSpecs(prev => ({ ...prev, finish: e.target.value }))}
                >
                  <option value="Natural">Natural</option>
                  <option value="Stained">Stained</option>
                  <option value="Painted White">Painted White</option>
                  <option value="Painted Color">Painted Color</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        )}        {/* Build Process Modal */}
        {isBuildModalOpen && isStandardStyle && (
          <BuildModal 
            selectedCabinet={{
              type: cabinetStyle === 'face-frame' ? 'Face-frame Assembly' : 'Frameless Assembly',
              style: cabinetStyle as 'frameless' | 'face-frame',
              specs: (cataloguePick ? { width: cataloguePick.width, height: cataloguePick.height, depth: cataloguePick.depth, doorStyle: cataloguePick.doorStyle, finish: cataloguePick.finish } : getCurrentSpecs()!)
            }}
            units={units}
            onComplete={(res) => { 
              setBuildResult(res); 
              try {
                if (cabinetStyle === 'frameless' || cabinetStyle === 'face-frame') {
                  localStorage.setItem(`cc.defaults.buildResult.${cabinetStyle}.v1`, JSON.stringify(res));
                }
              } catch {}
              if (res.specs) {
                setCustomSpecs(prev => ({ ...prev, width: res.specs!.width, height: res.specs!.height, depth: res.specs!.depth }));
              }
              try { console.log('Build complete:', res); } catch {}
              setCataloguePick(null);
            }}
            onClose={() => setIsBuildModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}