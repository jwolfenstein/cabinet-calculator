import React, { useState, useEffect } from 'react';
import TopNav from '../SOM/components/TopNav';

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

interface CabinetTypePreset {
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  category: 'base' | 'upper' | 'wall' | 'specialty';
}

export default function CreateCabinets() {
  const [selectedCabinetType, setSelectedCabinetType] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cabinetNumber, setCabinetNumber] = useState<number>(1);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [customSpecs, setCustomSpecs] = useState<{
    width?: number;
    height?: number;
    depth?: number;
    doorStyle?: string;
    finish?: string;
  }>({});

  // Default cabinet type presets from your list
  const cabinetTypePresets: CabinetTypePreset[] = [
    // Base Cabinets (Frameless)
    { name: '1 Drawer/1 Door', defaultWidth: 18, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    { name: '1 Drawer/2 Door', defaultWidth: 24, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    { name: 'Full Single Door', defaultWidth: 15, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    { name: 'Full 2 Door', defaultWidth: 30, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    { name: '3 Drawer Stack', defaultWidth: 18, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    
    // Upper Cabinets (Frameless)
    { name: 'Upper Single', defaultWidth: 15, defaultHeight: 30, defaultDepth: 12, category: 'upper' },
    { name: 'Upper Double', defaultWidth: 30, defaultHeight: 30, defaultDepth: 12, category: 'upper' },
    
    // Wall Cabinets (Frameless)
    { name: 'Wall Single', defaultWidth: 15, defaultHeight: 36, defaultDepth: 12, category: 'wall' },
    { name: 'Wall Double', defaultWidth: 30, defaultHeight: 36, defaultDepth: 12, category: 'wall' },
    
    // Face Frame (FF) Base Cabinets
    { name: 'FF 3 Drawer', defaultWidth: 18, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    { name: 'FF 1 Door 1 Drawer', defaultWidth: 18, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    { name: 'FF 2 Door 1 Drawer', defaultWidth: 24, defaultHeight: 34.5, defaultDepth: 24, category: 'base' },
    
    // Face Frame (FF) Upper Cabinets
    { name: 'FF Upper Single Door', defaultWidth: 15, defaultHeight: 30, defaultDepth: 12, category: 'upper' },
    { name: 'FF Upper Double Doors', defaultWidth: 30, defaultHeight: 30, defaultDepth: 12, category: 'upper' },
    
    // Face Frame (FF) Wall Cabinets
    { name: 'FF Wall Single Door', defaultWidth: 15, defaultHeight: 36, defaultDepth: 12, category: 'wall' },
    { name: 'FF Wall Double Door', defaultWidth: 30, defaultHeight: 36, defaultDepth: 12, category: 'wall' },
    { name: 'FF Wall Split Single Door', defaultWidth: 15, defaultHeight: 42, defaultDepth: 12, category: 'wall' },
    { name: 'FF Wall Split Double Door', defaultWidth: 30, defaultHeight: 42, defaultDepth: 12, category: 'wall' }
  ];

  // Get current cabinet specs (either default or custom)
  const getCurrentSpecs = () => {
    const preset = cabinetTypePresets.find(p => p.name === selectedCabinetType);
    if (!preset) return null;
    
    return {
      width: customSpecs.width ?? preset.defaultWidth,
      height: customSpecs.height ?? preset.defaultHeight,
      depth: customSpecs.depth ?? preset.defaultDepth,
      doorStyle: customSpecs.doorStyle ?? 'Shaker',
      finish: customSpecs.finish ?? 'Natural'
    };
  };

  // Handle cabinet type selection
  const handleCabinetTypeChange = (typeName: string) => {
    setSelectedCabinetType(typeName);
    setCustomSpecs({}); // Reset custom specs when changing type
    setIsEditing(false);
  };

  // Save cabinet to catalogue
  const handleSaveCabinet = () => {
    const specs = getCurrentSpecs();
    if (!specs) return;

    const newCabinet: CabinetDesign = {
      id: `cabinet-${Date.now()}`,
      name: selectedCabinetType,
      cabinetType: selectedCabinetType,
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
      
      alert(`Cabinet "${selectedCabinetType}" saved to catalogue!`);
      
      // Reset form
      setSelectedCabinetType('');
      setQuantity(1);
      setCabinetNumber(1);
      setIsEditing(false);
      setCustomSpecs({});
    } catch (error) {
      console.error('Error saving cabinet:', error);
      alert('Error saving cabinet to catalogue');
    }
  };

  // Construction method options with descriptions
  const constructionMethods = [
    { value: 'raised-panel', label: 'Raised Panel Back', description: 'Traditional raised panel construction' },
    { value: 'ship-lap', label: 'Ship-Lap Back', description: 'Overlapping horizontal boards' },
    { value: 'flush-inset', label: 'Flush Inset', description: 'Doors sit flush with frame' },
    { value: 'overlay', label: 'Overlay Construction', description: 'Doors overlay the frame' },
    { value: 'inset-panel', label: 'Inset Panel', description: 'Recessed panel design' }
  ];

  // Render catalogue view
  if (catalogueMode === 'view') {
    return (
      <>
        <div className="page-header page-header-create"></div>
        <TopNav active="Create" />
        <div className="page-container">
          <div className="page-header">
            <h1 className="section-title">Cabinet Catalogue</h1>
            <button 
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              Create New Cabinet
          </button>
        </div>

        <div className="content-grid">
          {cabinets.length === 0 ? (
            <div className="empty-state">
              <p>No cabinets in your catalogue yet.</p>
              <button 
                className="btn btn-primary"
                onClick={handleCreateNew}
              >
                Create Your First Cabinet
              </button>
            </div>
          ) : (
            <div className="cabinet-grid">
              {cabinets.map(cabinet => (
                <div key={cabinet.id} className="cabinet-card">
                  <div className="cabinet-preview">
                    <div className="construction-preview">
                      {cabinet.constructionMethod.replace('-', ' ')}
                    </div>
                  </div>
                  
                  <div className="cabinet-info">
                    <h3 className="cabinet-name">{cabinet.name}</h3>
                    <div className="cabinet-specs">
                      <span><strong>Type:</strong> {cabinet.cabinetType}</span>
                      <span><strong>Size:</strong> {cabinet.width}"W × {cabinet.height}"H × {cabinet.depth}"D</span>
                      <span><strong>Style:</strong> {cabinet.doorStyle} • {cabinet.finish}</span>
                      <span><strong>Construction:</strong> {cabinet.constructionMethod.replace('-', ' ')}</span>
                    </div>
                    <div className="cabinet-dates">
                      <small>Modified: {new Date(cabinet.modifiedDate).toLocaleDateString()}</small>
                    </div>
                  </div>

                  <div className="cabinet-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditCabinet(cabinet)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteCabinet(cabinet.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // Render create/edit form
  return (
    <>
      <div className="page-header page-header-create"></div>
      <TopNav active="Create" />
      <div className="page-container">
      <div className="page-header">
        <h1 className="section-title">
          {catalogueMode === 'create' ? 'Create New Cabinet' : 'Edit Cabinet'}
        </h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setCatalogueMode('view');
              setEditingCabinet({});
              setSelectedCabinet(null);
            }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSaveCabinet}
          >
            {catalogueMode === 'create' ? 'Save Cabinet' : 'Update Cabinet'}
          </button>
        </div>
      </div>

      <div className="form-container">
        <div className="form-section">
          <h2 className="subsection-title">Cabinet Type</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Select Cabinet Type</label>
              <select 
                className="input"
                value={editingCabinet.cabinetType || ''}
                onChange={(e) => handleCabinetTypeChange(e.target.value)}
              >
                <option value="">Choose a cabinet type...</option>
                
                <optgroup label="Base Cabinets">
                  {cabinetTypePresets.filter(p => p.category === 'base').map(preset => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} ({preset.defaultWidth}"W × {preset.defaultHeight}"H × {preset.defaultDepth}"D)
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Upper Cabinets">
                  {cabinetTypePresets.filter(p => p.category === 'upper').map(preset => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} ({preset.defaultWidth}"W × {preset.defaultHeight}"H × {preset.defaultDepth}"D)
                    </option>
                  ))}
                </optgroup>
                
                <optgroup label="Wall Cabinets">
                  {cabinetTypePresets.filter(p => p.category === 'wall').map(preset => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name} ({preset.defaultWidth}"W × {preset.defaultHeight}"H × {preset.defaultDepth}"D)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label>Custom Name (optional)</label>
              <input 
                type="text"
                className="input"
                value={editingCabinet.name || ''}
                onChange={(e) => setEditingCabinet(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Leave blank to use cabinet type name"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="subsection-title">Dimensions</h2>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Width (inches)</label>
              <input 
                type="number"
                className="input"
                value={editingCabinet.width || ''}
                onChange={(e) => setEditingCabinet(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label>Height (inches)</label>
              <input 
                type="number"
                className="input"
                value={editingCabinet.height || ''}
                onChange={(e) => setEditingCabinet(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label>Depth (inches)</label>
              <input 
                type="number"
                className="input"
                value={editingCabinet.depth || ''}
                onChange={(e) => setEditingCabinet(prev => ({ ...prev, depth: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="subsection-title">Construction Method</h2>
          <div className="construction-selector">
            {constructionMethods.map(method => (
              <div 
                key={method.value}
                className={`construction-option ${editingCabinet.constructionMethod === method.value ? 'selected' : ''}`}
                onClick={() => setEditingCabinet(prev => ({ ...prev, constructionMethod: method.value as any }))}
              >
                <div className="construction-visual">
                  {/* Visual diagram placeholder - will be enhanced with your actual diagrams */}
                  <div className="construction-diagram">
                    {method.label}
                  </div>
                </div>
                <div className="construction-info">
                  <h4>{method.label}</h4>
                  <p>{method.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h2 className="subsection-title">Style & Finish</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Door Style</label>
              <select 
                className="input"
                value={editingCabinet.doorStyle || ''}
                onChange={(e) => setEditingCabinet(prev => ({ ...prev, doorStyle: e.target.value }))}
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
                value={editingCabinet.finish || ''}
                onChange={(e) => setEditingCabinet(prev => ({ ...prev, finish: e.target.value }))}
              >
                <option value="Natural">Natural</option>
                <option value="Stained">Stained</option>
                <option value="Painted White">Painted White</option>
                <option value="Painted Color">Painted Color</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}