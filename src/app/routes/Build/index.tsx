import React, { useMemo, useState } from 'react';
import TopNav from '../SOM/components/TopNav';
import { useUnits, inToMm, formatMm0_5 } from '../../store/units';
import { toFraction } from '../../utils/fractions';

type BackConstructionOption = {
  id: string;
  name: string;
  description: string;
  imagePath: string;
};

export default function Build() {
  const { units } = useUnits();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBackConstruction, setSelectedBackConstruction] = useState<string>('');
  const [currentDiagramIndex, setCurrentDiagramIndex] = useState(0);
  const [selectedCabinet, setSelectedCabinet] = useState<{
    type: string;
    style: 'frameless' | 'face-frame';
    specs: {
      width: number;
      height: number;
      depth: number;
      doorStyle: string;
      finish: string;
    };
  } | null>(null);

  // Load cabinet data from sessionStorage on component mount
  React.useEffect(() => {
    const storedData = sessionStorage.getItem('buildCabinetData');
    if (storedData) {
      try {
        const cabinetData = JSON.parse(storedData);
        setSelectedCabinet(cabinetData);
      } catch (error) {
        console.error('Error parsing cabinet data:', error);
      }
    }
  }, []);

  // Convert decimal to fraction for display


  // Back construction options with diagrams
  const backConstructionOptions: BackConstructionOption[] = [
    {
      id: 'inset-thick-back',
      name: 'Inset Thick Back',
      description: 'Thick back panel inset within the cabinet sides',
      imagePath: '/images/construction/inset-thick-back.JPG'
    },
    {
      id: 'inset-nailer-dado-back',
      name: 'Inset Nailer Dado Back',
      description: 'Nailer strip with dado joint, back panel inset',
      imagePath: '/images/construction/inset-nailer-dado-back.JPG'
    },
    {
      id: 'dado-thick-back',
      name: 'Dado Thick Back',
      description: 'Thick back panel set in dado grooves',
      imagePath: '/images/construction/dado-thick-back.JPG'
    },
    {
      id: 'inset-nailer-back',
      name: 'Inset Nailer Back',
      description: 'Nailer strip with inset back panel',
      imagePath: '/images/construction/inset-nailer-back.JPG'
    },
    {
      id: 'flush-nailer-back',
      name: 'Flush Nailer Back',
      description: 'Nailer strip with flush mounted back panel',
      imagePath: '/images/construction/flush-nailer-back.JPG'
    }
  ];

  const handleNextDiagram = () => {
    setCurrentDiagramIndex((prev) => (prev + 1) % backConstructionOptions.length);
  };

  const handlePrevDiagram = () => {
    setCurrentDiagramIndex((prev) => (prev - 1 + backConstructionOptions.length) % backConstructionOptions.length);
  };

  const handleSelectConstruction = () => {
    setSelectedBackConstruction(backConstructionOptions[currentDiagramIndex].id);
    // Move to next step
    setCurrentStep(2);
  };

  const currentOption = backConstructionOptions[currentDiagramIndex];

  const dimsDisplay = useMemo(() => {
    const s = selectedCabinet?.specs;
    if (!s) return '';
    if (units === 'in') return `${toFraction(s.width)}"W × ${toFraction(s.height)}"H × ${toFraction(s.depth)}"D`;
    const w = formatMm0_5(inToMm(s.width));
    const h = formatMm0_5(inToMm(s.height));
    const d = formatMm0_5(inToMm(s.depth));
    return `${w} mm W × ${h} mm H × ${d} mm D`;
  }, [units, selectedCabinet]);

  return (
    <>
      <TopNav active="Build" />
      
      <div className="build-container">
        <div className="build-header">
          <h1 className="section-title">Cabinet Build Process</h1>
          <p className="page-subtitle">Step {currentStep}: Back Construction Method</p>
        </div>

        {selectedCabinet && (
          <div className="selected-cabinet-info">
            <h3>Building: {selectedCabinet.type} ({selectedCabinet.style})</h3>
            <p>Dimensions: {dimsDisplay}</p>
          </div>
        )}

        <div className="construction-selection">
          <div className="diagram-viewer">
            <div className="diagram-container">
              <img 
                src={currentOption.imagePath} 
                alt={currentOption.name}
                className="construction-diagram"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = 'block';
                }}
              />
              <div className="diagram-placeholder" style={{ display: 'none' }}>
                <p>Diagram coming soon</p>
                <p>{currentOption.name}</p>
              </div>
            </div>
            
            <div className="diagram-controls">
              <button className="btn btn-secondary" onClick={handlePrevDiagram}>
                ← Previous
              </button>
              <span className="diagram-counter">
                {currentDiagramIndex + 1} of {backConstructionOptions.length}
              </span>
              <button className="btn btn-secondary" onClick={handleNextDiagram}>
                Next →
              </button>
            </div>
          </div>

          <div className="construction-info">
            <h3>{currentOption.name}</h3>
            <p>{currentOption.description}</p>
            
            <div className="construction-actions">
              <button 
                className="btn btn-success"
                onClick={handleSelectConstruction}
              >
                Select This Construction Method
              </button>
            </div>
          </div>
        </div>

        {selectedBackConstruction && (
          <div className="next-steps">
            <p>Selected: {backConstructionOptions.find(opt => opt.id === selectedBackConstruction)?.name}</p>
            <button className="btn btn-primary">
              Continue to Next Step
            </button>
          </div>
        )}
      </div>
    </>
  );
}