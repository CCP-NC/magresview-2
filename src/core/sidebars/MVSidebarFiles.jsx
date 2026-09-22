/**
 * MagresView 2.0
 *
 * Export sidebar panel (unified for Report Tables and Spin System export).
 */

import './MVSidebarFiles.css';

import React, { useEffect } from 'react';
import MagresViewSidebar, { MVAdvancedSection } from './MagresViewSidebar';

import MVButton from '../../controls/MVButton';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVIcon from '../../icons/MVIcon';
import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import MVText from '../../controls/MVText';
import MVRadioButton, { MVRadioGroup } from '../../controls/MVRadioButton';
import MVTooltip from '../../controls/MVTooltip';
import { tooltip_files_merge, tooltip_files_precision } from './tooltip_messages';

import { useFilesInterface } from '../store';
import { saveContents } from '../../utils';

// Hilbert space dimension grows as 2^N, so a few dozen spins overflow into
// twenty-digit integers that nobody can read at a glance.
function formatDimension(d) {
    if (!Number.isFinite(d)) return '\u221e';
    return d >= 1e6 ? d.toExponential(2) : d.toLocaleString();
}

// Past a few thousand spin-1/2 the dimension itself overflows to Infinity, so
// fall back to counting the sites we would have multiplied.
function formatSpinHalf(n, digits = 1) {
    return Number.isFinite(n) ? n.toFixed(digits) : '\u221e';
}

function selectFileFormat(fileint) {
    return (
        <div className='mv-sidebar-grid'>
            <h4>File format:</h4>
            <MVCustomSelect title='File type' zorder={3} selected={fileint.fileFormat} onSelect={(v) => { fileint.fileFormat = v; }}>
                <MVCustomSelectOption value='csv'>CSV</MVCustomSelectOption>
                <MVCustomSelectOption value='fixed'>Fixed width</MVCustomSelectOption>
                <MVCustomSelectOption value='tsv'>Tab separated</MVCustomSelectOption>
            </MVCustomSelect>
        </div>
    );
}

function selectQuadOrder(fileint) {
    return (
        <div className='mv-sidebar-grid' style={{ marginTop: '0.4em' }}>
            <h4>Quadrupole order:</h4>
            <MVCustomSelect selected={fileint.spinSysQuadrupoleOrder} onSelect={(v) => { fileint.spinSysQuadrupoleOrder = v; }}>
                <MVCustomSelectOption value={0}>0 (off)</MVCustomSelectOption>
                <MVCustomSelectOption value={1}>1 (first order)</MVCustomSelectOption>
                <MVCustomSelectOption value={2}>2 (second order)</MVCustomSelectOption>
            </MVCustomSelect>
        </div>
    );
}

function setPrecision(fileint) {
    return (
        <MVRange
            min={0}
            max={8}
            step={1}
            value={fileint.precision}
            tooltip={tooltip_files_precision}
            onChange={(p) => { fileint.precision = p; }}
        >
            Precision
        </MVRange>
    );
}

function MVSidebarFiles(props) {
    const fileint = useFilesInterface();

    // Reset mergeByLabel if structure carries no CIF labels
    useEffect(() => {
        if (!fileint.hasCIFLabels && fileint.mergeByLabel) {
            fileint.mergeByLabel = false;
        }
    }, [fileint.hasCIFLabels, fileint.mergeByLabel]);

    const isTables = fileint.mode === 'tables';

    return (
        <MagresViewSidebar title='Export' show={props.show}>
            <div className='mv-sidebar-block'>
                <p>
                    Export report tables or spin-dynamics simulation files.
                    Tables cover the selected atoms, or every displayed atom if
                    nothing is selected. Spin systems are built from an explicit
                    selection only, and couplings are computed for selections of
                    up to {fileint.maxCoupledAtoms} atoms.
                </p>

                {/* Mode Switch */}
                <div style={{ marginBottom: '1.2em' }}>
                    <MVRadioGroup
                        label='Export type:'
                        selected={fileint.mode}
                        onSelect={(v) => { fileint.mode = v; }}
                    >
                        <MVRadioButton value='tables'>Report tables</MVRadioButton>
                        <MVRadioButton value='spinsys'>Spin system</MVRadioButton>
                    </MVRadioGroup>
                </div>

                {isTables ? (
                    /* ── Report Tables Mode ── */
                    <>
                        <h3>Table:</h3>
                        <MVCustomSelect selected={fileint.fileType} onSelect={(v) => { fileint.fileType = v; }}>
                            <MVCustomSelectOption value='ms' icon={<MVIcon icon='ms' color='var(--ms-color-3)' />}>
                                Magnetic shielding (MS)
                            </MVCustomSelectOption>
                            <MVCustomSelectOption value='efg' icon={<MVIcon icon='efg' color='var(--efg-color-3)' />}>
                                Electric field gradient (EFG)
                            </MVCustomSelectOption>
                            <MVCustomSelectOption value='dip' icon={<MVIcon icon='dip' color='var(--dip-color-3)' />}>
                                Dipolar coupling
                            </MVCustomSelectOption>
                            <MVCustomSelectOption value='isc' icon={<MVIcon icon='jcoup' color='var(--jcoup-color-3)' />}>
                                J coupling
                            </MVCustomSelectOption>
                        </MVCustomSelect>

                        <div style={{ marginTop: '0.8em' }}>
                            <MVCheckBox
                                checked={fileint.includeEuler}
                                onCheck={(v) => { fileint.includeEuler = v; }}
                            >
                                Include Euler angles
                            </MVCheckBox>

                            {fileint.hasCIFLabels && (
                                <MVCheckBox
                                    checked={fileint.mergeByLabel}
                                    onCheck={(v) => { fileint.mergeByLabel = v; }}
                                >
                                    Remove symmetry-equivalent nuclei &nbsp;
                                    <MVTooltip tooltipText={tooltip_files_merge} />
                                </MVCheckBox>
                            )}
                        </div>

                        <MVAdvancedSection>
                            {setPrecision(fileint)}
                        </MVAdvancedSection>

                        {selectFileFormat(fileint)}

                        <div style={{ marginTop: '1.2em' }}>
                            <MVButton
                                onClick={() => {
                                    saveContents(fileint.generateFile(), fileint.fileName);
                                }}
                                disabled={!fileint.fileValid}
                                style={{ width: '100%' }}
                            >
                                Save report table
                            </MVButton>
                        </div>
                    </>
                ) : (
                    /* ── Spin System Mode ── */
                    <>
                        <h3>Simulator target:</h3>
                        <MVRadioGroup
                            selected={fileint.spinsysTarget}
                            onSelect={(v) => { fileint.spinsysTarget = v; }}
                        >
                            <MVRadioButton value='simpson'>SIMPSON (.spinsys)</MVRadioButton>
                            <MVRadioButton value='mrsimulator'>mrsimulator (JSON)</MVRadioButton>
                        </MVRadioGroup>

                        <h3 style={{ marginTop: '1em' }}>Interactions:</h3>
                        <MVCheckBox
                            checked={fileint.includeMS}
                            onCheck={(v) => { fileint.includeMS = v; }}
                            disabled={!fileint.hasMSData}
                        >
                            Magnetic shielding (MS)
                        </MVCheckBox>

                        <MVCheckBox
                            checked={fileint.includeEFG}
                            onCheck={(v) => { fileint.includeEFG = v; }}
                            disabled={!fileint.hasEFGData}
                        >
                            Electric field gradient (EFG)
                        </MVCheckBox>

                        <MVCheckBox
                            checked={fileint.includeD}
                            onCheck={(v) => { fileint.includeD = v; }}
                        >
                            Dipolar couplings
                        </MVCheckBox>

                        <MVCheckBox
                            checked={fileint.includeJ}
                            onCheck={(v) => { fileint.includeJ = v; }}
                            disabled={!fileint.hasISCData}
                        >
                            J couplings
                        </MVCheckBox>

                        {fileint.spinsysTarget === 'simpson' && (
                            <>
                                <MVCheckBox
                                    checked={fileint.includeCrossTerms}
                                    onCheck={(v) => { fileint.includeCrossTerms = v; }}
                                >
                                    Second-order cross-terms
                                </MVCheckBox>
                                {fileint.includeEFG && selectQuadOrder(fileint)}
                            </>
                        )}

                        <h3 style={{ marginTop: '1em' }}>Tensor options:</h3>
                        <MVCheckBox
                            checked={fileint.includeAngles}
                            onCheck={(v) => { fileint.includeAngles = v; }}
                        >
                            Include tensor orientations (Euler angles)
                        </MVCheckBox>

                        <MVCheckBox
                            checked={fileint.msIsotropic}
                            onCheck={(v) => { fileint.msIsotropic = v; }}
                        >
                            Treat magnetic shielding as isotropic
                        </MVCheckBox>

                        {fileint.hasCIFLabels && (
                            <MVCheckBox
                                checked={fileint.mergeByLabel}
                                onCheck={(v) => { fileint.mergeByLabel = v; }}
                            >
                                Remove symmetry-equivalent nuclei &nbsp;
                                <MVTooltip tooltipText={tooltip_files_merge} />
                            </MVCheckBox>
                        )}

                        {fileint.includeD && (
                            <div style={{ marginTop: '0.4em' }}>
                                <MVCheckBox
                                    checked={fileint.dipolarHomonuclear}
                                    onCheck={(v) => { fileint.dipolarHomonuclear = v; }}
                                >
                                    Homonuclear dipolar only
                                </MVCheckBox>
                            </div>
                        )}

                        <div style={{ marginTop: '0.8em' }}>
                            <label style={{ fontSize: '0.9em', display: 'block', marginBottom: '0.3em' }}>
                                Average groups (e.g. CH3, NH2):
                            </label>
                            <MVText
                                value={fileint.averageGroups}
                                onChange={(v) => { fileint.averageGroups = v; }}
                            />
                            <span style={{ fontSize: '0.8em', color: 'var(--color-text-dim, #888)', display: 'block', marginTop: '0.2em' }}>
                                Internal couplings within average groups are dropped.
                            </span>
                        </div>

                        {fileint.availableIsotopes.length > 0 && (
                            <div style={{ marginTop: '0.8em' }}>
                                <label style={{ fontSize: '0.9em', display: 'block', marginBottom: '0.3em' }}>
                                    Observed nucleus:
                                </label>
                                <MVCustomSelect
                                    selected={fileint.observedNucleus}
                                    onSelect={(v) => { fileint.observedNucleus = v; }}
                                >
                                    <MVCustomSelectOption value=''>Auto (default)</MVCustomSelectOption>
                                    {fileint.availableIsotopes.map(iso => (
                                        <MVCustomSelectOption key={iso} value={iso}>{iso}</MVCustomSelectOption>
                                    ))}
                                </MVCustomSelect>
                            </div>
                        )}

                        {/* Feasibility Indicator */}
                        {fileint.hasUsableSelection ? (
                            <div className='mv-spinsys-dim-box'>
                                <div>
                                    <strong>System dimension: </strong>
                                    {formatDimension(fileint.dimension)} ({formatSpinHalf(fileint.spinHalfEquivalent)} spins-½ equivalent)
                                </div>
                                {fileint.selectionStatus === 'couplings_too_large' && (
                                    <div className='mv-dim-warning'>
                                        {fileint.selectedCount} atoms selected, past the
                                        {' '}{fileint.maxCoupledAtoms}-atom limit for computing
                                        couplings. Turn couplings off, or select fewer atoms, to
                                        save a single file. The split archive is unaffected: it
                                        writes one uncoupled file per site.
                                    </div>
                                )}
                                {fileint.feasibility === 'slow' && (
                                    <div className='mv-dim-notice'>
                                        Notice: Simulation will be slow (~{formatSpinHalf(fileint.spinHalfEquivalent, 0)} spins-½).
                                    </div>
                                )}
                                {fileint.feasibility === 'warning' && (
                                    <div className='mv-dim-warning'>
                                        Warning: simulation may be intractable
                                        {fileint.spinsysTarget === 'mrsimulator'
                                            ? '. The largest coupled group exceeds dimension 4096.'
                                            : '. The spin system exceeds dimension 4096.'}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className='mv-spinsys-dim-box'>
                                {fileint.selectionStatus === 'none' && (
                                    <div className='mv-dim-notice'>
                                        No atoms selected. Select the atoms you want in the
                                        spin system.
                                    </div>
                                )}
                                {fileint.selectionStatus === 'model_mismatch' && (
                                    <div className='mv-dim-notice'>
                                        Selection does not belong to the active model. Select atoms in the current model.
                                    </div>
                                )}
                                {fileint.selectionStatus === 'no_model' && (
                                    <div>No model loaded.</div>
                                )}
                            </div>
                        )}

                        {/* Shielding Reference Hard Block (ADR-0010) */}
                        {fileint.missingReferences.length > 0 && (
                            <div className='mv-reference-block-error'>
                                <strong>Export blocked:</strong> Missing shielding reference for element(s):{' '}
                                <strong>{fileint.missingReferences.join(', ')}</strong>.<br />
                                Set references in the MS tab before exporting.
                            </div>
                        )}

                        <MVAdvancedSection>
                            {setPrecision(fileint)}
                        </MVAdvancedSection>

                        <div style={{ marginTop: '1.2em' }}>
                            <MVButton
                                onClick={() => {
                                    saveContents(fileint.generateFile(), fileint.fileName);
                                }}
                                disabled={!fileint.fileValid}
                                style={{ width: '100%' }}
                            >
                                Save spin system ({fileint.fileName})
                            </MVButton>

                            {fileint.spinsysTarget === 'simpson' && (
                                <MVButton
                                    onClick={() => {
                                        const zipData = fileint.generateSplitZip();
                                        if (zipData) {
                                            saveContents(zipData, fileint.splitFileName, 'application/zip');
                                        }
                                    }}
                                    disabled={!fileint.splitZipValid}
                                    style={{ width: '100%', marginTop: '0.5em' }}
                                >
                                    Save split archive (.zip)
                                </MVButton>
                            )}
                        </div>
                    </>
                )}
            </div>
        </MagresViewSidebar>
    );
}

export default MVSidebarFiles;
