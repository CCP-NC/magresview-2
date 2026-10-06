/**
 * MagresView 2.0
 *
 * Export sidebar panel (unified for Report Tables and Spin System export).
 */

import './MVSidebarFiles.css';

import React, { useEffect, useState } from 'react';
import MagresViewSidebar, { MVAdvancedSection } from './MagresViewSidebar';

import MVButton from '../../controls/MVButton';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVIcon from '../../icons/MVIcon';
import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import MVSwitch from '../../controls/MVSwitch';
import MVText from '../../controls/MVText';
import MVTooltip from '../../controls/MVTooltip';
import MVModal from '../../controls/MVModal';
import {
    tooltip_files_merge,
    tooltip_files_precision,
    tooltip_files_scope,
    tooltip_files_average_groups,
} from './tooltip_messages';

import { useFilesInterface } from '../store';
import { saveContents, copyContents } from '../../utils';

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

function Section({ title, tooltip, children }) {
    return (
        <div className='mv-export-section'>
            <h3 className='mv-export-heading'>
                {title}
                {tooltip ? <MVTooltip tooltipText={tooltip} /> : null}
            </h3>
            {children}
        </div>
    );
}

/**
 * Two-way choice. Both options are always legible, with the live one
 * highlighted, so the control never relies on remembering which side is which.
 *
 * One neutral accent throughout. Orange, blue, green and pink already mean MS,
 * EFG, dipolar and J everywhere else in MagresView, so spending them on
 * unrelated toggles would read as a tensor type to anyone used to the app.
 */
function Choice({ left, right, value, onChange }) {
    const isRight = value === right.value;
    return (
        <div className='mv-export-choice'>
            <span className={isRight ? '' : 'mv-choice-active'}>{left.label}</span>
            <MVSwitch
                on={isRight}
                colorFalse='var(--spinsys-color-2)'
                colorTrue='var(--spinsys-color-2)'
                onClick={() => { onChange(isRight ? left.value : right.value); }}
            />
            <span className={isRight ? 'mv-choice-active' : ''}>{right.label}</span>
        </div>
    );
}

function LabelledField({ label, tooltip, children }) {
    return (
        <div className='mv-export-field'>
            <span className='mv-export-field-label'>
                {label}
                {tooltip ? <MVTooltip tooltipText={tooltip} /> : null}
            </span>
            {children}
        </div>
    );
}

/**
 * Warnings about the chosen settings, shown here and written verbatim into the
 * exported file so the caveats travel with it.
 */
function simplificationWarnings(fileint) {
    const warnings = fileint.simplificationWarnings;
    if (warnings.length === 0) return null;

    return (
        <div className='mv-warning-block'>
            {warnings.map((w, i) => (
                <div key={i} className={w.level === 'warning' ? 'mv-warning-item' : 'mv-notice-item'}>
                    <strong>{w.level === 'warning' ? 'Warning: ' : 'Note: '}</strong>
                    {w.text}
                </div>
            ))}
        </div>
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

    // Reset fileType if selected table type has no data in current model
    useEffect(() => {
        const typeAvailable = {
            ms: fileint.hasMSData,
            efg: fileint.hasEFGData,
            dip: true,
            isc: fileint.hasISCData,
        };
        if (!typeAvailable[fileint.fileType]) {
            fileint.fileType = fileint.hasMSData ? 'ms' : (fileint.hasEFGData ? 'efg' : 'dip');
        }
    }, [fileint.hasMSData, fileint.hasEFGData, fileint.hasISCData, fileint.fileType]);

    const isTables = fileint.mode === 'tables';
    const perSite = fileint.perSite;
    const isSimpson = fileint.spinsysTarget === 'simpson';
    const [showPreview, setShowPreview] = useState(false);
    const previewText = showPreview ? fileint.generatePreviewText() : '';

    return (
        <MagresViewSidebar title='Export' show={props.show}>
            <div className='mv-sidebar-block mv-export'>
                <Choice
                    left={{ value: 'tables', label: 'Report tables' }}
                    right={{ value: 'spinsys', label: 'Spin system' }}
                    value={fileint.mode}
                    onChange={(v) => { fileint.mode = v; }}
                />

                {isTables ? (
                    /* ── Report Tables Mode ── */
                    <>
                        <p className='mv-export-intro'>
                            Tables cover the selected atoms, or every displayed atom if
                            nothing is selected.
                        </p>

                        <Section title='Table'>
                            <MVCustomSelect selected={fileint.fileType} onSelect={(v) => { fileint.fileType = v; }}>
                                <MVCustomSelectOption value='ms' disabled={!fileint.hasMSData} icon={<MVIcon icon='ms' color='var(--ms-color-3)' />}>
                                    Magnetic shielding (MS)
                                </MVCustomSelectOption>
                                <MVCustomSelectOption value='efg' disabled={!fileint.hasEFGData} icon={<MVIcon icon='efg' color='var(--efg-color-3)' />}>
                                    Electric field gradient (EFG)
                                </MVCustomSelectOption>
                                <MVCustomSelectOption value='dip' icon={<MVIcon icon='dip' color='var(--dip-color-3)' />}>
                                    Dipolar coupling
                                </MVCustomSelectOption>
                                <MVCustomSelectOption value='isc' disabled={!fileint.hasISCData} icon={<MVIcon icon='jcoup' color='var(--jcoup-color-3)' />}>
                                    J coupling
                                </MVCustomSelectOption>
                            </MVCustomSelect>

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
                                    Remove symmetry-equivalent nuclei
                                    <MVTooltip tooltipText={tooltip_files_merge} />
                                </MVCheckBox>
                            )}
                        </Section>

                        <Section title='File format'>
                            <MVCustomSelect title='File type' zorder={3} selected={fileint.fileFormat} onSelect={(v) => { fileint.fileFormat = v; }}>
                                <MVCustomSelectOption value='csv'>CSV</MVCustomSelectOption>
                                <MVCustomSelectOption value='fixed'>Fixed width</MVCustomSelectOption>
                                <MVCustomSelectOption value='tsv'>Tab separated</MVCustomSelectOption>
                            </MVCustomSelect>
                        </Section>

                        <MVAdvancedSection>
                            <MVRange
                                min={0} max={8} step={1}
                                value={fileint.precision}
                                tooltip={tooltip_files_precision}
                                onChange={(p) => { fileint.precision = p; }}
                            >
                                Precision
                            </MVRange>
                        </MVAdvancedSection>

                        <div className='mv-export-save'>
                            <MVButton
                                onClick={() => setShowPreview(true)}
                                disabled={!fileint.fileValid}
                                style={{ width: '100%', marginBottom: '0.6em' }}
                            >
                                Preview report table
                            </MVButton>
                            <MVButton
                                onClick={() => {
                                    saveContents(fileint.generateFile(), fileint.fileName, fileint.mimeType);
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
                        <p className='mv-export-intro'>
                            Built from the selected atoms. Couplings are computed for
                            selections of up to {fileint.maxCoupledAtoms} atoms.
                        </p>

                        {/*
                          * Scope first: it decides which of the options below can mean
                          * anything. An isolated site has nothing to couple to and no
                          * relative orientation to preserve, so those controls vanish
                          * rather than sitting there inviting a nonsense combination.
                          */}
                        <Section title='Simulation type' tooltip={tooltip_files_scope}>
                            <Choice
                                left={{ value: 'system', label: 'Full spin system' }}
                                right={{ value: 'site', label: 'One file per site' }}
                                value={fileint.spinsysScope}
                                onChange={(v) => { fileint.spinsysScope = v; }}
                            />
                        </Section>

                        <Section title='Simulator'>
                            <Choice
                                left={{ value: 'simpson', label: 'SIMPSON' }}
                                right={{ value: 'mrsimulator', label: 'mrsimulator' }}
                                value={fileint.spinsysTarget}
                                onChange={(v) => { fileint.spinsysTarget = v; }}
                            />
                        </Section>

                        <Section title='Interactions'>
                            <MVCheckBox
                                checked={fileint.includeMS}
                                onCheck={(v) => { fileint.includeMS = v; }}
                                disabled={!fileint.hasMSData}
                                color='var(--ms-color-2)'
                            >
                                Magnetic shielding (MS)
                            </MVCheckBox>
                            {fileint.includeMS && fileint.hasMSData && (
                                <div className='mv-suboption'>
                                    <MVCheckBox
                                        checked={fileint.msIsotropic}
                                        onCheck={(v) => { fileint.msIsotropic = v; }}
                                    >
                                        Isotropic shift only
                                    </MVCheckBox>
                                </div>
                            )}

                            <MVCheckBox
                                checked={fileint.includeEFG}
                                onCheck={(v) => { fileint.includeEFG = v; }}
                                disabled={!fileint.hasQuadrupolarNuclei}
                                color='var(--efg-color-2)'
                            >
                                Quadrupolar (EFG)
                            </MVCheckBox>
                            {/*
                              * Order is the only quadrupole sub-choice. Second-order
                              * cross-terms follow from order 2 and are never offered
                              * separately: they are second-order objects, and SIMPSON
                              * hard-errors if they outlive the quadrupole lines.
                              */}
                            {fileint.includeEFG && fileint.hasEFGData && isSimpson && (
                                <div className='mv-suboption'>
                                    <Choice
                                        left={{ value: 1, label: 'First order' }}
                                        right={{ value: 2, label: 'Second order' }}
                                        value={fileint.spinSysQuadrupoleOrder}
                                        onChange={(v) => { fileint.spinSysQuadrupoleOrder = v; }}
                                    />
                                    {fileint.spinSysQuadrupoleOrder === 2 && (
                                        <span className='mv-export-hint'>
                                            Includes quadrupolar cross-terms.
                                        </span>
                                    )}
                                </div>
                            )}

                            {!perSite && (
                                <>
                                    <MVCheckBox
                                        checked={fileint.includeD}
                                        onCheck={(v) => { fileint.includeD = v; }}
                                        color='var(--dip-color-2)'
                                    >
                                        Dipolar couplings
                                    </MVCheckBox>
                                    {fileint.includeD && (
                                        <div className='mv-suboption'>
                                            <MVCheckBox
                                                checked={fileint.dipolarHomonuclear}
                                                onCheck={(v) => { fileint.dipolarHomonuclear = v; }}
                                            >
                                                Homonuclear only
                                            </MVCheckBox>
                                        </div>
                                    )}

                                    <MVCheckBox
                                        checked={fileint.includeJ}
                                        onCheck={(v) => { fileint.includeJ = v; }}
                                        disabled={!fileint.hasISCData}
                                        color='var(--jcoup-color-2)'
                                    >
                                        J couplings
                                    </MVCheckBox>
                                </>
                            )}
                        </Section>

                        <Section title='Sites'>
                            {fileint.hasCIFLabels && (
                                <MVCheckBox
                                    checked={fileint.mergeByLabel}
                                    onCheck={(v) => { fileint.mergeByLabel = v; }}
                                >
                                    Remove symmetry-equivalent nuclei
                                    <MVTooltip tooltipText={tooltip_files_merge} />
                                </MVCheckBox>
                            )}

                            <LabelledField label='Average groups' tooltip={tooltip_files_average_groups}>
                                <MVText
                                    value={fileint.averageGroups}
                                    onChange={(v) => { fileint.averageGroups = v; }}
                                />
                                <span className='mv-export-hint'>Comma separated, e.g. CH3, NH2</span>
                            </LabelledField>

                            {fileint.availableIsotopes.length > 0 && (
                                <LabelledField label='Observed nucleus'>
                                    <MVCustomSelect
                                        selected={fileint.observedNucleus}
                                        onSelect={(v) => { fileint.observedNucleus = v; }}
                                    >
                                        <MVCustomSelectOption value=''>Auto</MVCustomSelectOption>
                                        {fileint.availableIsotopes.map(iso => (
                                            <MVCustomSelectOption key={iso} value={iso}>{iso}</MVCustomSelectOption>
                                        ))}
                                    </MVCustomSelect>
                                </LabelledField>
                            )}
                        </Section>

                        {/* Feasibility Indicator */}
                        {fileint.hasUsableSelection ? (
                            <div className='mv-spinsys-dim-box'>
                                {/*
                                  * Per site, each file is one nucleus, so the product
                                  * over every site is not what anything will cost.
                                  */}
                                {perSite ? (
                                    <div>
                                        <strong>{fileint.siteCount} files</strong>, largest dimension{' '}
                                        {formatDimension(fileint.largestSiteDimension)}
                                    </div>
                                ) : (
                                    <div>
                                        <strong>System dimension: </strong>
                                        {formatDimension(fileint.dimension)} ({formatSpinHalf(fileint.spinHalfEquivalent)} spins-½ equivalent)
                                    </div>
                                )}
                                {fileint.selectionStatus === 'couplings_too_large' && (
                                    <div className='mv-dim-warning'>
                                        {fileint.selectedCount} atoms selected, past the
                                        {' '}{fileint.maxCoupledAtoms}-atom limit for computing
                                        couplings. Turn couplings off, select fewer atoms, or
                                        switch to one file per site, which is unaffected: it
                                        writes one uncoupled file per site.
                                    </div>
                                )}
                                {!perSite && fileint.feasibility === 'slow' && (
                                    <div className='mv-dim-notice'>
                                        Notice: Simulation will be slow (~{formatSpinHalf(fileint.spinHalfEquivalent, 0)} spins-½).
                                    </div>
                                )}
                                {!perSite && fileint.feasibility === 'warning' && (
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

                        {simplificationWarnings(fileint)}

                        {/* Shielding Reference Hard Block (ADR-0010) */}
                        {fileint.missingReferences.length > 0 && (
                            <div className='mv-reference-block-error'>
                                <strong>Export blocked:</strong> Missing shielding reference for element(s):{' '}
                                <strong>{fileint.missingReferences.join(', ')}</strong>.<br />
                                Set references in the MS tab before exporting.
                            </div>
                        )}

                        <MVAdvancedSection>
                            <MVRange
                                min={0} max={8} step={1}
                                value={fileint.precision}
                                tooltip={tooltip_files_precision}
                                onChange={(p) => { fileint.precision = p; }}
                            >
                                Precision
                            </MVRange>
                            {/*
                              * Orientations are only optional where dropping them is
                              * defensible: a single isolated spin. In a coupled system
                              * zeroing every Euler angle aligns all tensors with the lab
                              * frame and the answer is simply wrong.
                              */}
                            {perSite && (
                                <MVCheckBox
                                    checked={fileint.includeAngles}
                                    onCheck={(v) => { fileint.includeAngles = v; }}
                                >
                                    Include tensor orientations
                                </MVCheckBox>
                            )}
                        </MVAdvancedSection>

                        <div className='mv-export-save'>
                            <MVButton
                                onClick={() => setShowPreview(true)}
                                disabled={!fileint.hasUsableSelection}
                                style={{ width: '100%', marginBottom: '0.6em' }}
                            >
                                Preview spin system
                            </MVButton>
                            <MVButton
                                onClick={() => {
                                    const data = fileint.generateFile();
                                    if (data) {
                                        saveContents(data, fileint.fileName, fileint.mimeType);
                                    }
                                }}
                                disabled={!fileint.fileValid}
                                style={{ width: '100%' }}
                            >
                                {/*
                                  * mrsimulator represents independent sites natively, so
                                  * per-site there is still one file. Only SIMPSON needs a
                                  * file each.
                                  */}
                                {perSite
                                    ? (fileint.isZipExport ? 'Save one file per site' : 'Save uncoupled sites')
                                    : 'Save spin system'}
                                <span className='mv-export-filename'>{fileint.fileName}</span>
                            </MVButton>
                        </div>
                    </>
                )}
            </div>

            {showPreview && (
                <MVModal
                    title={isTables ? `Report table preview (${fileint.fileName})` : `Spin system preview (${fileint.fileName})`}
                    display={showPreview}
                    hasOverlay={false}
                    draggable={true}
                    resizable={true}
                    onClose={() => setShowPreview(false)}
                    noFooter={true}
                >
                    <div className='mv-export-preview-content'>
                        <pre className='mv-export-preview-pre'>{previewText}</pre>
                    </div>
                    <div className='mv-export-preview-footer'>
                        <span className='mv-export-preview-hint'>
                            Live preview &mdash; updates as options change
                        </span>
                        <div style={{ display: 'flex', gap: '0.5em' }}>
                            <MVButton
                                onClick={() => copyContents(previewText)}
                                disabled={!previewText}
                            >
                                Copy
                            </MVButton>
                            <MVButton onClick={() => setShowPreview(false)}>
                                Close
                            </MVButton>
                        </div>
                    </div>
                </MVModal>
            )}
        </MagresViewSidebar>
    );
}

export default MVSidebarFiles;
