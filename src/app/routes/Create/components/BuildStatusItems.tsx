import React from 'react';
import { BuildResult } from './BuildModal';
import { useUnits, inToMm, formatMm0_5 } from '../../../store/units';
import { toFraction } from '../../../utils/fractions';

interface BuildStatusItemsProps {
    cabinetStyle: string;
    buildResult: BuildResult | null;
    getCurrentSpecs: () => { width: number; height: number; depth: number; doorStyle: string; finish: string; } | null;
    setBuildResult: React.Dispatch<React.SetStateAction<BuildResult | null>>;
}

interface ItemProps {
    label: string;
    value?: string;
    ok: boolean;
}

const Item = ({ label, value, ok }: ItemProps) => (
    <div className="build-status-item">
        <span className="label">{label}</span>
        <span className={ok ? 'status-ok' : 'status-bad'}>
            {value || (ok ? 'Complete' : 'Incomplete')}
        </span>
    </div>
);

export function BuildStatusItems({ cabinetStyle, buildResult: br, getCurrentSpecs, setBuildResult }: BuildStatusItemsProps) {
    const { units } = useUnits();
    const statusItems: JSX.Element[] = [];
    // Always prepopulate defaults for all styles
    const renderBr: BuildResult = br ?? {
        units: units,
        materials: { case: { ends: '', bottom: '', tops: '', stretchers: '', fixedShelf: '', adjShelf: '', backs: '', nailers: '', toeKick: '', toeSkirt: '' }, hardware: { drawerGuides: '', hinges: '', hingePlates: '' } },
        faceFramePositioning: cabinetStyle === 'face-frame'
            ? { leftStile: { mode: 'flush-exterior' as any }, rightStile: { mode: 'flush-exterior' as any }, bottomRail: { mode: 'flush-top' as any, offsetIn: 0.25 } }
            : undefined,
        backConstruction: { id: 'full-back', name: 'Full back' },
        dados: { typeId: 'no-dados' },
        toeKick: { attached: true, heightIn: 3.5, depthIn: 3 }
    };
    // Ensure all defaults are hydrated if missing
    React.useEffect(() => {
        setBuildResult(prev => {
            if (!prev) return renderBr;
            const next = { ...prev } as BuildResult;
            if (!next.units) next.units = units;
            if (!next.materials) next.materials = { case: {}, hardware: {} } as any;
            if (cabinetStyle === 'face-frame' && !next.faceFramePositioning) {
                next.faceFramePositioning = { leftStile: { mode: 'flush-exterior' as any }, rightStile: { mode: 'flush-exterior' as any }, bottomRail: { mode: 'flush-top' as any, offsetIn: 0.25 } };
            }
            if (!next.backConstruction || !next.backConstruction.id) {
                next.backConstruction = { id: 'full-back', name: 'Full back' } as any;
            }
            if (!next.dados || !next.dados.typeId) {
                next.dados = { typeId: 'no-dados' } as any;
            }
            if (!next.toeKick || next.toeKick.attached == null) {
                next.toeKick = { attached: true, heightIn: 3.5, depthIn: 3 } as any;
            }
            return next;
        });
    }, [cabinetStyle, units, setBuildResult]);

    // Omit cabinet style and dimensions on Cabinet Defaults tab
    // Build Process Defaults (editable controls)


        // Back Construction
        statusItems.push(
            <div className="build-status-item" key="back-construction">
                <span className="label">Back construction</span>
                <span>
                        <select className="input" value={renderBr.backConstruction?.id ?? ''} title="Back construction"
                        onChange={(e)=> setBuildResult(prev => ({
                                ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                            backConstruction: {
                                id: e.target.value,
                                name: e.target.value,
                                    dadoDepthIn: (e.target.value==='dado-thick-back' || e.target.value==='inset-nailer-dado-back') ? (prev?.backConstruction?.dadoDepthIn ?? 0.25) : undefined
                            }
                        }))}
                    >
                        <option value="">Select back...</option>
                        <option value="no-back">No back</option>
                        <option value="full-back">Full back</option>
                        <option value="dado-thick-back">Dado thick back</option>
                        <option value="inset-nailer-dado-back">Inset nailer dado back</option>
                    </select>
                            {(renderBr.backConstruction?.id==='dado-thick-back' || renderBr.backConstruction?.id==='inset-nailer-dado-back') && (
                                <input className="input input-narrow" type="number" step="0.01" title="Back dado depth (in)" value={renderBr.backConstruction?.dadoDepthIn ?? 0.25}
                            onChange={(e)=> setBuildResult(prev => ({
                                    ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                    backConstruction: { ...(prev?.backConstruction ?? { id: 'dado-thick-back', name: 'Dado thick back' }), dadoDepthIn: Number(e.target.value) }
                            }))}
                        />
                    )}
                </span>
            </div>
            );

        // Dados
        const d = renderBr.dados ?? { typeId: 'no-dados' as const };
        statusItems.push(
            <div className="build-status-item" key="dados">
                <span className="label">Dados</span>
                <span>
                    <label className="mr-2">Type:
                        <select className="input ml-1" value={d.typeId} title="Dados type"
                            onChange={(e)=> setBuildResult(prev => ({
                                    ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                dados: { ...(prev?.dados ?? {}), typeId: e.target.value as any }
                            }))}
                        >
                            <option value="no-dados">No dados</option>
                            <option value="full-thickness-dados">Full-thickness dados</option>
                            <option value="step-dados">Step dados</option>
                        </select>
                    </label>
                    {(renderBr.dados?.typeId==='full-thickness-dados' || renderBr.dados?.typeId==='step-dados') && (
                        <>
                            <label className="mr-2">Depth:
                                <input className="input input-narrow ml-1" type="number" step="0.01" placeholder="Depth (in)" title="Dados depth (in)" value={renderBr.dados?.depthIn ?? 0.25}
                                onChange={(e)=> setBuildResult(prev => ({
                                        ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                        dados: { ...(prev?.dados ?? { typeId: 'full-thickness-dados' }), depthIn: Number(e.target.value) }
                                }))}
                                />
                            </label>
                            {renderBr.dados?.typeId==='step-dados' && (
                                <label className="mr-2">Rebate:
                                    <input className="input input-narrow ml-1" type="number" step="0.01" placeholder="Rebate (in)" title="Step rebate (in)" value={renderBr.dados?.stepRebateIn ?? 0.125}
                                    onChange={(e)=> setBuildResult(prev => ({
                                            ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                            dados: { ...(prev?.dados ?? { typeId: 'step-dados' }), stepRebateIn: Number(e.target.value) }
                                    }))}
                                    />
                                </label>
                            )}
                            <label className="ml-2">Blind:
                                <input type="checkbox" className="ml-1" checked={!!renderBr.dados?.blind?.enabled} title="Blind enabled"
                                onChange={(e)=> setBuildResult(prev => {
                                    const base = prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, faceFramePositioning: renderBr.faceFramePositioning, backConstruction: renderBr.backConstruction, dados: { typeId: renderBr.dados?.typeId ?? 'full-thickness-dados' }, toeKick: renderBr.toeKick } as BuildResult;
                                    return {
                                        ...base,
                                        dados: {
                                            ...(base.dados ?? { typeId: 'full-thickness-dados' }),
                                            blind: { ...(base.dados?.blind ?? { enabled: false, frontsOnly: false }), enabled: e.target.checked, frontsOnly: base.dados?.blind?.frontsOnly ?? false }
                                        }
                                    };
                                })}
                                />
                            </label>
                            {!!renderBr.dados?.blind?.enabled && (
                                <>
                                    <label className="mr-2">Blind offset:
                                        <input className="input input-narrow ml-1" type="number" step="0.01" placeholder="Blind offset (in)" title="Blind offset (in)" value={renderBr.dados?.blind?.offsetIn ?? 0.25}
                                        onChange={(e)=> setBuildResult(prev => {
                                            const base = prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, faceFramePositioning: renderBr.faceFramePositioning, backConstruction: renderBr.backConstruction, dados: { typeId: renderBr.dados?.typeId ?? 'full-thickness-dados' }, toeKick: renderBr.toeKick } as BuildResult;
                                            return {
                                                ...base,
                                                dados: {
                                                    ...(base.dados ?? { typeId: 'full-thickness-dados' }),
                                                    blind: { ...(base.dados?.blind ?? { enabled: true, frontsOnly: false }), offsetIn: Number(e.target.value), enabled: true, frontsOnly: base.dados?.blind?.frontsOnly ?? false }
                                                }
                                            };
                                        })}
                                        />
                                    </label>
                                    <label className="ml-2">Fronts only:
                                        <input type="checkbox" className="ml-1" checked={!!renderBr.dados?.blind?.frontsOnly} title="Blind fronts only"
                                        onChange={(e)=> setBuildResult(prev => {
                                            const base = prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, faceFramePositioning: renderBr.faceFramePositioning, backConstruction: renderBr.backConstruction, dados: { typeId: renderBr.dados?.typeId ?? 'full-thickness-dados' }, toeKick: renderBr.toeKick } as BuildResult;
                                            return {
                                                ...base,
                                                dados: { ...(base.dados ?? { typeId: 'full-thickness-dados' }), blind: { ...(base.dados?.blind ?? { enabled: true }), frontsOnly: e.target.checked, enabled: true } }
                                            };
                                        })}
                                        />
                                    </label>
                                </>
                            )}
                        </>
                    )}
                </span>
            </div>
            );

        // Toe Kick
        const t = renderBr.toeKick ?? { attached: null };
        statusItems.push(
            <div className="build-status-item" key="toe-kick">
                <span className="label">Toe kick attached</span>
                <span>
                    <select className="input" value={t.attached==null ? '' : (t.attached ? 'yes' : 'no')} title="Toe kick attached"
                        onChange={(e)=> setBuildResult(prev => ({
                                ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                            toeKick: { ...(prev?.toeKick ?? {}), attached: e.target.value==='' ? null : (e.target.value==='yes') }
                        }))}
                    >
                        <option value="">Select...</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                        {(renderBr.toeKick?.attached!=null) && (
                        <>
                                <input className="input input-narrow" type="number" step="0.01" placeholder="Height (in)" title="Toe kick height (in)" value={renderBr.toeKick?.heightIn ?? 3.5}
                                onChange={(e)=> setBuildResult(prev => ({
                                        ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                        toeKick: { ...(prev?.toeKick ?? { attached: true }), heightIn: Number(e.target.value) }
                                }))}
                            />
                                <input className="input input-narrow" type="number" step="0.01" placeholder="Depth (in)" title="Toe kick depth (in)" value={renderBr.toeKick?.depthIn ?? 3}
                                onChange={(e)=> setBuildResult(prev => ({
                                        ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                        toeKick: { ...(prev?.toeKick ?? { attached: true }), depthIn: Number(e.target.value) }
                                }))}
                            />
                                {(renderBr.toeKick?.attached===false) && (
                                <>
                                        <input className="input input-narrow" type="number" step="0.01" placeholder="Left setback (in)" title="Left setback (in)" value={renderBr.toeKick?.leftSetbackIn ?? 0}
                                        onChange={(e)=> setBuildResult(prev => ({
                                                ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                                toeKick: { ...(prev?.toeKick ?? { attached: false }), leftSetbackIn: Number(e.target.value) }
                                        }))}
                                    />
                                        <input className="input input-narrow" type="number" step="0.01" placeholder="Right setback (in)" title="Right setback (in)" value={renderBr.toeKick?.rightSetbackIn ?? 0}
                                        onChange={(e)=> setBuildResult(prev => ({
                                                ...(prev ?? { units: 'in', materials: { case: {} as any, hardware: {} as any }, toeKick: { attached: null } } as BuildResult),
                                                toeKick: { ...(prev?.toeKick ?? { attached: false }), rightSetbackIn: Number(e.target.value) }
                                        }))}
                                    />
                                </>
                            )}
                        </>
                    )}
                </span>
            </div>
                );
        // Face frame details are now rendered in the dedicated Face Frame tab (not here)
        // Cabinet Materials summary (after build process controls)
        const caseMat = br?.materials?.case;
        const hardware = br?.materials?.hardware;
        statusItems.push(
            <div className="build-status-item" key="cabinet-materials">
                <span className="label">Cabinet materials</span>
                <span>
                    {caseMat ? (
                        <>
                            {caseMat.ends ? `Ends: ${caseMat.ends}` : ''}
                            {caseMat.bottom ? ` • Bottom: ${caseMat.bottom}` : ''}
                            {caseMat.tops ? ` • Tops: ${caseMat.tops}` : ''}
                            {caseMat.backs ? ` • Backs: ${caseMat.backs}` : ''}
                        </>
                    ) : '—'}
                </span>
            </div>
        );
        statusItems.push(
            <div className="build-status-item" key="hardware-defaults">
                <span className="label">Hardware defaults</span>
                <span>
                    {hardware ? (
                        <>
                            {hardware.hinges ? `Hinges: ${hardware.hinges}` : ''}
                            {hardware.hingePlates ? ` • Plates: ${hardware.hingePlates}` : ''}
                            {hardware.drawerGuides ? ` • Guides: ${hardware.drawerGuides}` : ''}
                        </>
                    ) : '—'}
                </span>
            </div>
        );
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
                {statusItems.slice(0, 3)}
            </div>
            <div>
                {statusItems.slice(3)}
            </div>
        </div>
    );
}