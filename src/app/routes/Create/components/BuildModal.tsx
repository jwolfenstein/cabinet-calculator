import React, { useMemo, useState } from 'react';
import { useUnits, inToMm, formatMm0_5 } from '../../../store/units';
import UnitInput from '../../../components/UnitInput';
import type { SOMItem, Category } from '../../../routes/SOM/types';
import { toFraction } from '../../../utils/fractions';

type BackConstructionOption = {
  id: string;
  name: string;
  description: string;
  imagePath: string;
};

export type BuildResult = {
  units: 'in' | 'mm';
  specs?: { width: number; height: number; depth: number };
  faceFramePositioning?: {
    leftStile: { mode: 'flush-exterior' | 'flush-interior' | 'offset'; offsetIn?: number };
    rightStile: { mode: 'flush-exterior' | 'flush-interior' | 'offset'; offsetIn?: number };
    bottomRail: { mode: 'flush-bottom' | 'flush-top' | 'offset'; offsetIn?: number };
  };
  materials: {
    case: {
      ends: string;     // SOM item ID
      bottom: string;
      tops: string;
      stretchers: string;
      fixedShelf: string;
      adjShelf: string;
      backs: string;
      nailers: string;
      toeKick: string;
      toeSkirt: string;
    };
    hardware: {
      drawerGuides: string;
      hinges: string;
      hingePlates: string;
    };
  };
  backConstruction?: {
    id: string;
    name: string;
    dadoDepthIn?: number; // inches, when applicable
  };
  dados?: {
    typeId: 'no-dados' | 'full-thickness-dados' | 'step-dados' | '';
    depthIn?: number;
    stepRebateIn?: number;
    blind?: {
      enabled: boolean;
      frontsOnly: boolean;
      offsetIn?: number;
    };
  };
  toeKick: {
    attached: boolean | null;
    heightIn?: number;
    depthIn?: number;
    leftSetbackIn?: number;
    rightSetbackIn?: number;
  };
}

interface BuildModalProps {
  selectedCabinet: {
    type: string;
    style: 'frameless' | 'face-frame';
    specs: {
      width: number;
      height: number;
      depth: number;
      doorStyle: string;
      finish: string;
    };
  };
  onClose: () => void;
  units?: 'in' | 'mm';
  onComplete?: (result: BuildResult) => void;
}

// Load SOM data for material dropdowns
function loadSOMData(): SOMItem[] {
  try {
    const raw = localStorage.getItem("somRowsV1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as SOMItem[];
      }
    }
  } catch {}
  return [];
}

// Get material options for dropdowns
function getMaterialOptions(somData: SOMItem[], categories: Category[]): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [{ value: "", label: "Select Material..." }];
  
  somData
    .filter(item => categories.includes(item.category))
    .forEach(item => {
      options.push({ value: item.id, label: item.name });
    });
  
  return options;
}

export default function BuildModal({ selectedCabinet, onClose, units = 'in', onComplete }: BuildModalProps) {
  const unitsCtx = (() => { try { return useUnits(); } catch { return { units, setUnits: (_: any)=>{} } as any; } })();
  const curUnits: 'in' | 'mm' = unitsCtx.units ?? units;
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBackConstruction, setSelectedBackConstruction] = useState<string>('');
  const [currentDiagramIndex, setCurrentDiagramIndex] = useState(0);
  const [dadoDepth, setDadoDepth] = useState<number>(0.25); // Default to 1/4"

  // Face-frame positioning (Step 5 for face-frame only)
  const [leftStileMode, setLeftStileMode] = useState<'flush-exterior' | 'flush-interior' | 'offset'>('flush-exterior');
  const [rightStileMode, setRightStileMode] = useState<'flush-exterior' | 'flush-interior' | 'offset'>('flush-exterior');
  const [bottomRailMode, setBottomRailMode] = useState<'flush-bottom' | 'flush-top' | 'offset'>('flush-top');
  const [leftStileOffset, setLeftStileOffset] = useState<number>(0.75);
  const [rightStileOffset, setRightStileOffset] = useState<number>(0.75);
  const [bottomRailOffset, setBottomRailOffset] = useState<number>(0.25);
  const [ffSection, setFfSection] = useState<'left' | 'right' | 'bottom'>('left');
  const ffSections: Array<'left' | 'right' | 'bottom'> = ['left', 'right', 'bottom'];
  const nextFfSection = () => {
    const idx = ffSections.indexOf(ffSection);
    setFfSection(ffSections[(idx + 1) % ffSections.length]);
  };
  const prevFfSection = () => {
    const idx = ffSections.indexOf(ffSection);
    setFfSection(ffSections[(idx - 1 + ffSections.length) % ffSections.length]);
  };

  // Load SOM data for materials
  const [somData, setSomData] = React.useState<SOMItem[]>(() => loadSOMData());
  
  // Material options - case parts should only use SheetGoods
  const caseOptions = useMemo(() => getMaterialOptions(somData, ["SheetGoods"]), [somData]);
  const nailerOptions = caseOptions; // Nailers also use sheet goods
  const drawerGuidesOptions = useMemo(() => getMaterialOptions(somData.filter(item => 
    item.category === "Hardware" && item.subtype === "DrawerSlides"), ["Hardware"]), [somData]);
  const hingesOptions = useMemo(() => getMaterialOptions(somData.filter(item => 
    item.category === "Hardware" && item.subtype === "Hinges"), ["Hardware"]), [somData]);
  const hingePlatesOptions = useMemo(() => getMaterialOptions(somData.filter(item => 
    item.category === "Hardware" && item.subtype === "HingePlates"), ["Hardware"]), [somData]);

  // Materials state
  const defaultMaterials: Required<BuildResult>["materials"] = {
    case: {
      ends: "",
      bottom: "",
      tops: "",
      stretchers: "",
      fixedShelf: "",
      adjShelf: "",
      backs: "",
      nailers: "",
      toeKick: "",
      toeSkirt: "",
    },
    hardware: {
      drawerGuides: "",
      hinges: "",
      hingePlates: "",
    }
  };
  const [materials, setMaterials] = useState<BuildResult["materials"]>(defaultMaterials);
  
  // Step 2: Dado construction options
  const [hasDados, setHasDados] = useState<boolean | null>(null);
  const [selectedDadoType, setSelectedDadoType] = useState<string>('');
  const [showBlindDadoPrompt, setShowBlindDadoPrompt] = useState<boolean>(false);
  const [useBlindDados, setUseBlindDados] = useState<boolean | null>(null);
  const [blindDadoFrontsOnly, setBlindDadoFrontsOnly] = useState<boolean>(true); // Default to fronts only
  const [dadoDepthStep2, setDadoDepthStep2] = useState<number>(0.375); // Default to 3/8"
  const [stepDadoRebate, setStepDadoRebate] = useState<number>(0.125); // Default to 1/8" rebate for step dados
  const [blindDadoOffset, setBlindDadoOffset] = useState<number>(0.5); // Default to 1/2"
  const [currentDadoDiagramIndex, setCurrentDadoDiagramIndex] = useState(0);

  // Step 5: Toe kick configuration state
  const [toeAttached, setToeAttached] = useState<boolean | null>(true);
  const [toeHeight, setToeHeight] = useState<number>(4.0);  // default 4"
  const [toeDepth, setToeDepth] = useState<number>(2.0);   // default 2"
  const [toeLeftSetback, setToeLeftSetback] = useState<number>(1.0);  // default 1"
  const [toeRightSetback, setToeRightSetback] = useState<number>(1.0); // default 1"

  // Step 6: Update the selected materials
  const updateCaseMaterial = (field: keyof BuildResult["materials"]["case"], value: string) => {
    setMaterials(prev => ({
      ...defaultMaterials,
      case: { ...prev.case, [field]: value },
      hardware: prev.hardware
    }));
  };

  const updateHardware = (field: keyof BuildResult["materials"]["hardware"], value: string) => {
    setMaterials(prev => ({
      ...defaultMaterials,
      case: prev.case,
      hardware: { ...prev.hardware, [field]: value }
    }));
  };



  // Back construction options with diagrams (All PNG - v4 updated)
  const backConstructionOptions: BackConstructionOption[] = [
    {
      id: 'inset-thick-back',
      name: 'Inset Thick Back',
      description: 'Thick back panel inset within the cabinet sides',
      imagePath: '/images/construction/inset-thick-back.png?v=4'
    },
    {
      id: 'inset-nailer-dado-back',
      name: 'Inset Nailer Dado Back',
      description: 'Nailer strip with dado joint, back panel inset',
      imagePath: '/images/construction/inset-nailer-dado-back.png?v=4'
    },
    {
      id: 'dado-thick-back',
      name: 'Dado Thick Back',
      description: 'Thick back panel set in dado grooves',
      imagePath: '/images/construction/dado-thick-back.png?v=4'
    },
    {
      id: 'inset-nailer-back',
      name: 'Inset Nailer Back',
      description: 'Nailer strip with inset back panel',
      imagePath: '/images/construction/inset-nailer-back.png?v=4'
    },
    {
      id: 'flush-nailer-back',
      name: 'Flush Nailer Back',
      description: 'Nailer strip with flush mounted back panel',
      imagePath: '/images/construction/flush-nailer-back.png?v=4'
    }
  ];

  // Dado construction options with diagrams (All PNG - v4 updated)
  const dadoConstructionOptions: BackConstructionOption[] = [
    {
      id: 'no-dados',
      name: 'No Dados',
      description: 'Traditional construction without dado joints - proceed to toe kicks',
      imagePath: '/images/construction/no-dado.png?v=4'
    },
    {
      id: 'full-thickness-dados',
      name: 'Full Thickness Dados',
      description: 'Dado width matches the thickness of the inserted part',
      imagePath: '/images/construction/full-thickness-dado.png?v=4'
    },
    {
      id: 'step-dados',
      name: 'Step Dados',
      description: 'Dados that stop at a specific depth with notch',
      imagePath: '/images/construction/step-dado.png?v=4'
    }
  ];

  // Blind dado option (separate - PNG v4 updated)
  const blindDadoOption: BackConstructionOption = {
    id: 'blind-dados',
    name: 'Blind Dados',
    description: 'Applied to full or step dados - stops before front edge',
    imagePath: '/images/construction/blind-dado.png?v=4'
  };

  const handleNextDiagram = () => {
    setCurrentDiagramIndex((prev) => (prev + 1) % backConstructionOptions.length);
  };

  const handlePrevDiagram = () => {
    setCurrentDiagramIndex((prev) => (prev - 1 + backConstructionOptions.length) % backConstructionOptions.length);
  };

  const handleSelectConstruction = () => {
    setSelectedBackConstruction(backConstructionOptions[currentDiagramIndex].id);
    setCurrentStep(2);
  };

  // Dado construction handlers
  const handleNextDadoDiagram = () => {
    setCurrentDadoDiagramIndex((prev) => (prev + 1) % dadoConstructionOptions.length);
  };

  const handlePrevDadoDiagram = () => {
    setCurrentDadoDiagramIndex((prev) => (prev - 1 + dadoConstructionOptions.length) % dadoConstructionOptions.length);
  };

  const handleSelectDados = () => {
    const selectedOption = dadoConstructionOptions[currentDadoDiagramIndex];
    setSelectedDadoType(selectedOption.id);
    setHasDados(selectedOption.id !== 'no-dados');
    
    // If "No Dados" is selected, skip to toe kicks (step 5)
    if (selectedOption.id === 'no-dados') {
      setCurrentStep(5); // Skip to toe kicks
    } else if (selectedOption.id === 'full-thickness-dados' || selectedOption.id === 'step-dados') {
      // Show blind dado prompt for full thickness or step dados
      setShowBlindDadoPrompt(true);
      setCurrentStep(3); // Go to blind dado prompt
    }
  };

  const handleBlindDadoSelection = (useBlind: boolean) => {
    setUseBlindDados(useBlind);
    if (useBlind) {
      setCurrentStep(4); // Go to blind dado configuration
    } else {
      setCurrentStep(5); // Skip to toe kicks
    }
  };

  const handleBlindDadoConfig = () => {
    setCurrentStep(5); // Continue to toe kicks
  };

  const currentOption = backConstructionOptions[currentDiagramIndex];
  const currentDadoOption = dadoConstructionOptions[currentDadoDiagramIndex];

  // Check if current option requires dado depth input
  const requiresDadoDepth = currentOption.id === 'dado-thick-back' || currentOption.id === 'inset-nailer-dado-back';

  // Check if current dado option requires parameters
  const requiresDadoParams = currentDadoOption.id !== 'no-dados';
  const isBlindDado = useBlindDados === true;
  const isStepDado = selectedDadoType === 'step-dados';
  const isCurrentlyViewingStepDados = currentDadoOption.id === 'step-dados';
  
  // Determine if step dados are relevant (only if full or step dados haven't been selected)
  const showStepDados = currentDadoDiagramIndex === 0 || currentDadoDiagramIndex === 2;

  const dimsDisplay = useMemo(() => {
    const s = { width: selectedCabinet.specs.width, height: selectedCabinet.specs.height, depth: selectedCabinet.specs.depth };
    if (curUnits === 'in') {
      return `${toFraction(s.width)}"W × ${toFraction(s.height)}"H × ${toFraction(s.depth)}"D`;
    }
    const w = formatMm0_5(inToMm(s.width));
    const h = formatMm0_5(inToMm(s.height));
    const d = formatMm0_5(inToMm(s.depth));
    return `${w} mm W × ${h} mm H × ${d} mm D`;
  }, [curUnits, selectedCabinet.specs.width, selectedCabinet.specs.height, selectedCabinet.specs.depth]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="build-modal" onClick={(e) => e.stopPropagation()}>
        <div className="build-modal-header">
          <h2>Cabinet Build Process</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="build-modal-content">
          <p className="build-step-title">
            Step {currentStep}: {
              selectedCabinet.style === 'face-frame'
                ? (
                  currentStep === 1 ? 'Back Construction Method' :
                  currentStep === 2 ? 'Dado Construction' :
                  currentStep === 3 ? 'Blind Dado Option' :
                  currentStep === 4 ? 'Blind Dado Configuration' :
                  currentStep === 5 ? 'Face Frame Positioning' :
                  currentStep === 6 ? 'Toe Kicks' :
                  'Materials'
                )
                : (
                  currentStep === 5 ? 'Toe Kicks' :
                  'Materials'
                )
            }
          </p>
          
          <div className="selected-cabinet-summary" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
            <strong>Building: {selectedCabinet.type} ({selectedCabinet.style})</strong>
            {selectedBackConstruction && (
              <span>Back Construction: {backConstructionOptions.find(opt => opt.id === selectedBackConstruction)?.name}</span>
            )}
            {selectedDadoType && (
              <span>Dado Type: {dadoConstructionOptions.find(opt => opt.id === selectedDadoType)?.name}</span>
            )}
          </div>

          {/* Removed: Dimension editor (no editing of width/height/depth in Build modal) */}

          {/* Step 1: Back Construction */}
          {currentStep === 1 && (
            <div className="build-construction-selection">
              <div className="build-diagram-viewer">
                <div className="build-diagram-container">
                  <img 
                    src={currentOption.imagePath} 
                    alt={currentOption.name}
                    className="build-construction-diagram"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'block';
                    }}
                  />
                  <div className="build-diagram-placeholder" style={{ display: 'none' }}>
                    <p>Diagram coming soon</p>
                    <p>{currentOption.name}</p>
                  </div>
                </div>
                
                <div className="build-diagram-controls">
                  <button className="btn btn-secondary" onClick={handlePrevDiagram}>
                    ← Previous
                  </button>
                  <span className="build-diagram-counter">
                    {currentDiagramIndex + 1} of {backConstructionOptions.length}
                  </span>
                  <button className="btn btn-secondary" onClick={handleNextDiagram}>
                    Next →
                  </button>
                </div>
              </div>

              <div className="build-construction-info">
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>{currentOption.name}</h4>
                <p>{currentOption.description}</p>
                
                {requiresDadoDepth && (
                  <div className="dado-depth-input">
                    <label>Dado Depth ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                    <UnitInput
                      className="input"
                      units={curUnits}
                      valueInInches={dadoDepth}
                      minInches={0.125}
                      maxInches={0.75}
                      onChangeInches={(v: number | undefined)=> setDadoDepth((v ?? 0.25))}
                    />
                    {curUnits === 'in' ? (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {toFraction(dadoDepth)}"
                      </small>
                    ) : (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {formatMm0_5(inToMm(dadoDepth))} mm
                      </small>
                    )}
                  </div>
                )}
                
                <button 
                  className="btn btn-success"
                  onClick={handleSelectConstruction}
                >
                  Select This Construction Method
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Dado Construction */}
          {currentStep === 2 && (
            <div className="build-construction-selection">
              <div className="build-diagram-viewer">
                <div className="build-diagram-container">
                  <img 
                    src={currentDadoOption.imagePath} 
                    alt={currentDadoOption.name}
                    className="build-construction-diagram"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'block';
                    }}
                  />
                  <div className="build-diagram-placeholder" style={{ display: 'none' }}>
                    <p>Diagram coming soon</p>
                    <p>{currentDadoOption.name}</p>
                  </div>
                </div>
                
                <div className="build-diagram-controls">
                  <button className="btn btn-secondary" onClick={handlePrevDadoDiagram}>
                    ← Previous
                  </button>
                  <span className="build-diagram-counter">
                    {currentDadoDiagramIndex + 1} of {dadoConstructionOptions.length}
                  </span>
                  <button className="btn btn-secondary" onClick={handleNextDadoDiagram}>
                    Next →
                  </button>
                </div>
              </div>

              <div className="build-construction-info">
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>{currentDadoOption.name}</h4>
                <p>{currentDadoOption.description}</p>
                
                {requiresDadoParams && (
                  <div className="dado-parameters">
                    <div className="dado-depth-input">
                      <label>Dado Depth ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                      <UnitInput
                        className="input"
                        units={curUnits}
                        valueInInches={dadoDepthStep2}
                        minInches={0.125}
                        maxInches={1.0}
                        onChangeInches={(v: number | undefined)=> setDadoDepthStep2((v ?? 0.375))}
                      />
                      {curUnits === 'in' ? (
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          = {toFraction(dadoDepthStep2)}"
                        </small>
                      ) : (
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          = {formatMm0_5(inToMm(dadoDepthStep2))} mm
                        </small>
                      )}
                    </div>

                    {isCurrentlyViewingStepDados && (
                      <div className="dado-depth-input">
                        <label>Step Dado Rebate ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                        <UnitInput
                          className="input"
                          units={curUnits}
                          valueInInches={stepDadoRebate}
                          minInches={0.0625}
                          maxInches={1.0}
                          onChangeInches={(v: number | undefined)=> setStepDadoRebate((v ?? 0.125))}
                        />
                        {curUnits === 'in' ? (
                          <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            = {toFraction(stepDadoRebate)}"
                          </small>
                        ) : (
                          <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            = {formatMm0_5(inToMm(stepDadoRebate))} mm
                          </small>
                        )}
                      </div>
                    )}

                    {isBlindDado && (
                      <div className="dado-depth-input">
                        <label>Blind Dado Offset ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                        <UnitInput
                          className="input"
                          units={curUnits}
                          valueInInches={blindDadoOffset}
                          minInches={0.0625}
                          maxInches={2.0}
                          onChangeInches={(v: number | undefined)=> setBlindDadoOffset((v ?? 0.5))}
                        />
                        {curUnits === 'in' ? (
                          <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            = {toFraction(blindDadoOffset)}"
                          </small>
                        ) : (
                          <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            = {formatMm0_5(inToMm(blindDadoOffset))} mm
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <button 
                  className="btn btn-success"
                  onClick={handleSelectDados}
                >
                  Select Dado Construction
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Blind Dado Prompt */}
          {currentStep === 3 && (
            <div className="build-construction-selection">
              <div className="build-diagram-viewer">
                <div className="build-diagram-container">
                  <img 
                    src={blindDadoOption.imagePath} 
                    alt={blindDadoOption.name}
                    className="build-construction-diagram"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'block';
                    }}
                  />
                  <div className="build-diagram-placeholder" style={{ display: 'none' }}>
                    <p>Diagram coming soon</p>
                    <p>{blindDadoOption.name}</p>
                  </div>
                </div>
              </div>

              <div className="build-construction-info">
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Blind Dado Option</h4>
                <p>Do you want to use blind dados for your {selectedDadoType === 'full-thickness-dados' ? 'full thickness' : 'step'} dados?</p>
                <p><em>Blind dados stop before the front edge, hiding the joint from the front view.</em></p>
                
                <div className="blind-dado-choices">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleBlindDadoSelection(true)}
                  >
                    Yes - Use Blind Dados
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleBlindDadoSelection(false)}
                  >
                    No - Use Standard Dados
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Blind Dado Configuration */}
          {currentStep === 4 && useBlindDados && (
            <div className="build-construction-selection">
              <div className="build-diagram-viewer">
                <div className="build-diagram-container">
                  <img 
                    src={blindDadoOption.imagePath} 
                    alt={blindDadoOption.name}
                    className="build-construction-diagram"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'block';
                    }}
                  />
                  <div className="build-diagram-placeholder" style={{ display: 'none' }}>
                    <p>Diagram coming soon</p>
                    <p>{blindDadoOption.name}</p>
                  </div>
                </div>
              </div>

              <div className="build-construction-info">
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Blind Dado Configuration</h4>
                
                <div className="dado-parameters">
                  <div className="dado-depth-input">
                    <label>Blind Dado Offset/Rebate ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                    <UnitInput
                      className="input"
                      units={curUnits}
                      valueInInches={blindDadoOffset}
                      minInches={0.0625}
                      maxInches={2.0}
                      onChangeInches={(v: number | undefined)=> setBlindDadoOffset((v ?? 0.5))}
                    />
                    {curUnits === 'in' ? (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {toFraction(blindDadoOffset)}"
                      </small>
                    ) : (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {formatMm0_5(inToMm(blindDadoOffset))} mm
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={blindDadoFrontsOnly}
                        onChange={(e) => setBlindDadoFrontsOnly(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Blind dados for fronts only
                    </label>
                  </div>
                </div>
                
                <button 
                  className="btn btn-success"
                  onClick={handleBlindDadoConfig}
                >
                  Complete Blind Dado Configuration
                </button>
              </div>
            </div>
          )}

          {/* Step 5 (Face-Frame): Positioning for stiles and bottom rail */}
          {currentStep === 5 && selectedCabinet.style === 'face-frame' && (
            <div className="build-construction-selection">
              {/* Left: Controls and finalize stacked, matching mock */}
              <div className="build-diagram-viewer">
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Face Frame Positioning</h4>

                <div style={{ display: 'flex', gap: 6, margin: '6px 0 12px', alignItems: 'center', flexWrap: 'nowrap' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={prevFfSection}>←</button>
                  <button type="button" className={`btn ${ffSection === 'left' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 8px' }} onClick={()=> setFfSection('left')}>Left Stile</button>
                  <button type="button" className={`btn ${ffSection === 'right' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 8px' }} onClick={()=> setFfSection('right')}>Right Stile</button>
                  <button type="button" className={`btn ${ffSection === 'bottom' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 8px' }} onClick={()=> setFfSection('bottom')}>Bottom Rail</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={nextFfSection}>→</button>
                </div>

                {/* Control row only (no diagram here) */}
                {ffSection === 'left' && (
                  <div className="section" style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: '8px 0' }}>Left Stile</h4>
                    <div style={{ minWidth: 260, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                      <select
                        className="input"
                        value={leftStileMode}
                        onChange={(e)=> setLeftStileMode(e.target.value as any)}
                        style={{ height: 32 }}
                      >
                        <option value="flush-exterior">flush exterior</option>
                        <option value="flush-interior">flush interior</option>
                        <option value="offset">offset</option>
                      </select>
                      {leftStileMode === 'offset' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <UnitInput className="input" units={curUnits} valueInInches={leftStileOffset} minInches={0} maxInches={2} onChangeInches={(v)=> setLeftStileOffset(v ?? 0.25)} style={{ width: 100 }} />
                          {curUnits === 'in' ? (
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>= {toFraction(leftStileOffset)}"</small>
                          ) : (
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>= {formatMm0_5(inToMm(leftStileOffset))} mm</small>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ffSection === 'right' && (
                  <div className="section" style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: '8px 0' }}>Right Stile</h4>
                    <div style={{ minWidth: 260, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                      <select
                        className="input"
                        value={rightStileMode}
                        onChange={(e)=> setRightStileMode(e.target.value as any)}
                        style={{ height: 32 }}
                      >
                        <option value="flush-exterior">flush exterior</option>
                        <option value="flush-interior">flush interior</option>
                        <option value="offset">offset</option>
                      </select>
                      {rightStileMode === 'offset' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <UnitInput className="input" units={curUnits} valueInInches={rightStileOffset} minInches={0} maxInches={2} onChangeInches={(v)=> setRightStileOffset(v ?? 0.25)} style={{ width: 100 }} />
                          {curUnits === 'in' ? (
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>= {toFraction(rightStileOffset)}"</small>
                          ) : (
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>= {formatMm0_5(inToMm(rightStileOffset))} mm</small>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ffSection === 'bottom' && (
                  <div className="section" style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: '8px 0' }}>Bottom Rail</h4>
                    <div style={{ minWidth: 260, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                      <select
                        className="input"
                        value={bottomRailMode}
                        onChange={(e)=> setBottomRailMode(e.target.value as any)}
                        style={{ height: 32 }}
                      >
                        <option value="flush-top">flush top</option>
                        <option value="flush-bottom">flush bottom</option>
                        <option value="offset">offset</option>
                      </select>
                      {bottomRailMode === 'offset' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <UnitInput className="input" units={curUnits} valueInInches={bottomRailOffset} minInches={0} maxInches={2} onChangeInches={(v)=> setBottomRailOffset(v ?? 0.25)} style={{ width: 100 }} />
                          {curUnits === 'in' ? (
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>= {toFraction(bottomRailOffset)}"</small>
                          ) : (
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>= {formatMm0_5(inToMm(bottomRailOffset))} mm</small>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Finalize in left column */}
                <div className="section" style={{ marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Finalize Positioning</h4>
                  <p>Review your positioning selections, then continue.</p>
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setCurrentStep(4)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => setCurrentStep(6)}>Continue to Toe Kicks →</button>
                  </div>
                </div>
              </div>

              {/* Right: Diagram only, switches by section/mode */}
              <div className="build-construction-info">
                <div className="build-diagram-container">
                  <img
                    src={
                      ffSection === 'left'
                        ? (leftStileMode === 'flush-exterior' ? '/images/construction/LSFlExt.jpg' : leftStileMode === 'flush-interior' ? '/images/construction/LSFlInt.jpg' : '/images/construction/LSOff.jpg')
                        : ffSection === 'right'
                          ? (rightStileMode === 'flush-exterior' ? '/images/construction/RSFlExt.jpg' : rightStileMode === 'flush-interior' ? '/images/construction/RSFlInt.jpg' : '/images/construction/RSOff.jpg')
                          : (bottomRailMode === 'flush-bottom' ? '/images/construction/BRFlBottom.jpg' : bottomRailMode === 'flush-top' ? '/images/construction/BRFlTop.jpg' : '/images/construction/BROff.jpg')
                    }
                    alt={
                      ffSection === 'left' ? 'Left stile positioning' : ffSection === 'right' ? 'Right stile positioning' : 'Bottom rail positioning'
                    }
                    className="build-construction-diagram"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'block';
                    }}
                  />
                  <div className="build-diagram-placeholder" style={{ display: 'none' }}>
                    <p>Diagram coming soon</p>
                    <p>{ffSection === 'left' ? `Left Stile: ${leftStileMode}` : ffSection === 'right' ? `Right Stile: ${rightStileMode}` : `Bottom Rail: ${bottomRailMode}`}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toe Kicks step: Step 5 (frameless) or Step 6 (face-frame) */}
          {(currentStep === 5 && selectedCabinet.style !== 'face-frame') || (currentStep === 6 && selectedCabinet.style === 'face-frame') ? (
            <div className="build-construction-selection">
              {/* Left: Toe kick form */}
              <div className="build-diagram-viewer">
                <h3 style={{ marginTop: 0 }}>Toe Kick Configuration</h3>
                <p>Configure toe kick attachment and dimensions.</p>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Attached to cabinet?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name="toe-attach-modal"
                        checked={toeAttached === true}
                        onChange={() => setToeAttached(true)}
                      />
                      Attached
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name="toe-attach-modal"
                        checked={toeAttached === false}
                        onChange={() => setToeAttached(false)}
                      />
                      Not attached
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Toe Kick Height ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                    <UnitInput
                      className="input"
                      units={curUnits}
                      valueInInches={toeHeight}
                      minInches={0}
                      maxInches={8}
                      onChangeInches={(v)=> setToeHeight(v ?? 4.0)}
                    />
                    {curUnits === 'in' ? (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {toFraction(toeHeight)}"
                      </small>
                    ) : (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {formatMm0_5(inToMm(toeHeight))} mm
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Toe Kick Depth ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                    <UnitInput
                      className="input"
                      units={curUnits}
                      valueInInches={toeDepth}
                      minInches={0}
                      maxInches={8}
                      onChangeInches={(v)=> setToeDepth(v ?? 2.0)}
                    />
                    {curUnits === 'in' ? (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {toFraction(toeDepth)}"
                      </small>
                    ) : (
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        = {formatMm0_5(inToMm(toeDepth))} mm
                      </small>
                    )}
                  </div>
                </div>

                {toeAttached === false && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Left Setback ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                      <UnitInput
                        className="input"
                        units={curUnits}
                        valueInInches={toeLeftSetback}
                        minInches={0}
                        maxInches={12}
                        onChangeInches={(v)=> setToeLeftSetback(v ?? 1.0)}
                      />
                      {curUnits === 'in' ? (
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          = {toFraction(toeLeftSetback)}"
                        </small>
                      ) : (
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          = {formatMm0_5(inToMm(toeLeftSetback))} mm
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Right Setback ({curUnits === 'in' ? 'inches' : 'mm'})</label>
                      <UnitInput
                        className="input"
                        units={curUnits}
                        valueInInches={toeRightSetback}
                        minInches={0}
                        maxInches={12}
                        onChangeInches={(v)=> setToeRightSetback(v ?? 1.0)}
                      />
                      {curUnits === 'in' ? (
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          = {toFraction(toeRightSetback)}"
                        </small>
                      ) : (
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          = {formatMm0_5(inToMm(toeRightSetback))} mm
                        </small>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Finalize actions */}
              <div className="build-construction-info">
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Finalize</h4>
                <p>Review your selections and complete the build.</p>
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setCurrentStep(selectedCabinet.style === 'face-frame' ? 5 : 4)}>← Back</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setCurrentStep(selectedCabinet.style === 'face-frame' ? 7 : 6)}
                  >
                    Continue to Materials →
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Materials step: Step 6 (frameless) or Step 7 (face-frame) */}
          {(currentStep === 6 && selectedCabinet.style !== 'face-frame') || (currentStep === 7 && selectedCabinet.style === 'face-frame') ? (
            <div className="build-material-step">
              <div className="material-selections" style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
                {/* Case Materials Section */}
                <div className="section" style={{ marginBottom: 32 }}>
                  <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, borderBottom: '1px solid var(--border-primary)', paddingBottom: 6 }}>
                    Case Materials
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                    Select sheet goods for cabinet case components.
                  </p>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 500, fontSize: 14 }}>Default Case Material</label>
                    <select
                      className="input"
                      value={materials.case.ends}
                      onChange={e => {
                        const value = e.target.value;
                        setMaterials(prev => ({
                          ...prev,
                          case: {
                            ends: value,
                            bottom: value,
                            tops: value,
                            stretchers: value,
                            fixedShelf: value,
                            adjShelf: value,
                            backs: value,
                            nailers: value,
                            toeKick: value,
                            toeSkirt: value,
                          },
                          hardware: prev.hardware
                        }));
                      }}
                    >
                      {caseOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="material-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 12 }}>
                    {/* Left Column */}
                    <div className="grid-col" style={{ display: 'grid', rowGap: 12 }}>
                      {Object.entries({
                        ends: 'Ends',
                        bottom: 'Bottom',
                        tops: 'Tops',
                        stretchers: 'Stretchers',
                        fixedShelf: 'Fixed Shelf',
                      }).map(([key, label]) => (
                        <label key={key} className="form-group">
                          <span style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'block' }}>
                            {label}
                          </span>
                          <select 
                            className="select-sm"
                            value={materials.case[key as keyof typeof materials.case]}
                            onChange={(e) => updateCaseMaterial(key as keyof typeof materials.case, e.target.value)}
                            style={{ height: 32 }}
                          >
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    
                    {/* Right Column */}
                    <div className="grid-col" style={{ display: 'grid', rowGap: 12 }}>
                      {Object.entries({
                        adjShelf: 'Adjustable Shelf',
                        backs: 'Backs',
                        nailers: 'Nailers',
                        toeKick: 'Toe Kick',
                        toeSkirt: 'Toe Skirt'
                      }).map(([key, label]) => (
                        <label key={key} className="form-group">
                          <span style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'block' }}>
                            {label}
                          </span>
                          <select 
                            className="select-sm"
                            value={materials.case[key as keyof typeof materials.case]}
                            onChange={(e) => updateCaseMaterial(key as keyof typeof materials.case, e.target.value)}
                            style={{ height: 32 }}
                          >
                            {caseOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hardware Section */}
                <div className="section">
                  <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, borderBottom: '1px solid var(--border-primary)', paddingBottom: 6 }}>
                    Hardware
                  </h4>
                  <div className="hardware-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 12 }}>
                    <div className="grid-col" style={{ display: 'grid', rowGap: 12 }}>
                      <label className="form-group">
                        <span style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'block' }}>
                          Drawer Guides
                        </span>
                        <select 
                          className="select-sm"
                          value={materials.hardware.drawerGuides}
                          onChange={(e) => updateHardware('drawerGuides', e.target.value)}
                          style={{ height: 32 }}
                        >
                          {drawerGuidesOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid-col" style={{ display: 'grid', rowGap: 12 }}>
                      <label className="form-group">
                        <span style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'block' }}>
                          Hinges
                        </span>
                        <select 
                          className="select-sm"
                          value={materials.hardware.hinges}
                          onChange={(e) => updateHardware('hinges', e.target.value)}
                          style={{ height: 32 }}
                        >
                          {hingesOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="form-group">
                        <span style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'block' }}>
                          Hinge Plates
                        </span>
                        <select 
                          className="select-sm"
                          value={materials.hardware.hingePlates}
                          onChange={(e) => updateHardware('hingePlates', e.target.value)}
                          style={{ height: 32 }}
                        >
                          {hingePlatesOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="actions" style={{ marginTop: 32, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setCurrentStep(selectedCabinet.style === 'face-frame' ? 6 : 5)}>← Back</button>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      const result: BuildResult = {
                        units: curUnits,
                        specs: { width: selectedCabinet.specs.width, height: selectedCabinet.specs.height, depth: selectedCabinet.specs.depth },
                        faceFramePositioning: selectedCabinet.style === 'face-frame' ? {
                          leftStile: { mode: leftStileMode, offsetIn: leftStileMode === 'offset' ? leftStileOffset : undefined },
                          rightStile: { mode: rightStileMode, offsetIn: rightStileMode === 'offset' ? rightStileOffset : undefined },
                          bottomRail: { mode: bottomRailMode, offsetIn: bottomRailMode === 'offset' ? bottomRailOffset : undefined },
                        } : undefined,
                        materials: materials || defaultMaterials,
                        backConstruction: selectedBackConstruction ? {
                          id: selectedBackConstruction,
                          name: backConstructionOptions.find(o => o.id === selectedBackConstruction)?.name || selectedBackConstruction,
                          dadoDepthIn: (selectedBackConstruction === 'dado-thick-back' || selectedBackConstruction === 'inset-nailer-dado-back') ? dadoDepth : undefined,
                        } : undefined,
                        dados: selectedDadoType ? {
                          typeId: selectedDadoType as any,
                          depthIn: hasDados ? dadoDepthStep2 : undefined,
                          stepRebateIn: selectedDadoType === 'step-dados' ? stepDadoRebate : undefined,
                          blind: (useBlindDados != null) ? {
                            enabled: !!useBlindDados,
                            frontsOnly: !!blindDadoFrontsOnly,
                            offsetIn: useBlindDados ? blindDadoOffset : undefined,
                          } : undefined,
                        } : undefined,
                        toeKick: {
                          attached: toeAttached,
                          heightIn: toeHeight,
                          depthIn: toeDepth,
                          leftSetbackIn: toeAttached === false ? toeLeftSetback : undefined,
                          rightSetbackIn: toeAttached === false ? toeRightSetback : undefined,
                        }
                      };
                      onComplete?.(result);
                      onClose();
                    }}
                  >
                    Complete Build
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}