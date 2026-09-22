/**
 * MagresView 2.0
 *
 * A web interface to visualize and interact with computed NMR data in the Magres
 * file format.
 *
 * Author: Simone Sturniolo
 *
 * Copyright 2022 Science and Technology Facilities Council
 * This software is distributed under the terms of the MIT License
 * Please refer to the file LICENSE for the text of the license
 * 
 */

import './MVSidebarEuler.css';

import { useState, useEffect } from 'react';

import MagresViewSidebar, { MVAdvancedSection } from './MagresViewSidebar';
import { useEulerInterface, useAppInterface } from '../store';
import { saveContents, copyContents } from '../../utils';

import MVSwitch from '../../controls/MVSwitch';
import MVButton from '../../controls/MVButton';
import MVIcon from '../../icons/MVIcon';
import MVCheckBox from '../../controls/MVCheckBox';
import MVModal from '../../controls/MVModal';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVCard from '../../controls/MVCard';
import MVField from '../../controls/MVField';
import MVTooltip from '../../controls/MVTooltip';
import { tooltip_pas_ordering } from './tooltip_messages';
import { FaCopy, FaDownload } from 'react-icons/fa';

const tensorIcons = {
    'ms': <MVIcon icon="ms" color='var(--ms-color-3)' />,
    'efg': <MVIcon icon="efg" color='var(--efg-color-3)' />,
    'dipolarAB': <MVIcon icon="dip" color='var(--dip-color-3)' />,
    'jcouplingAB': <MVIcon icon="jcoup" color='var(--jcoup-color-3)' />,
    'cryst': <MVIcon icon="crystal" color='var(--crystal-color-3)' />
}

// Crystal frame is always available; MS/EFG only when the model carries them;
// the A→B dipolar tensor only when two distinct atoms are picked.
function availableTensorOptions(eulint) {
    const opts = [];
    if (eulint.hasMSData) opts.push(['ms', 'Shielding']);
    if (eulint.hasEFGData) opts.push(['efg', 'EFG']);
    opts.push(['cryst', 'Crystal frame']);
    if (eulint.atomA && eulint.atomB && eulint.atomA !== eulint.atomB)
        opts.push(['dipolar', 'Dipolar (A→B)']);
    return opts;
}

const orderOptions = [
    ['haeberlen', 'Haeberlen'],
    ['increasing', 'Increasing'],
    ['decreasing', 'Decreasing'],
    ['nqr', 'NQR']
];

function OptionSelect({ options, value, onSelect }) {
    return (<MVCustomSelect selected={value} onSelect={onSelect}>
        {options.map(([v, label]) => (
            <MVCustomSelectOption key={v} icon={tensorIcons[v] || null} value={v}>{label}</MVCustomSelectOption>
        ))}
    </MVCustomSelect>);
}

// Compact axis-flip labels to keep the table narrow.
const FLIP_SHORT = { 'identity': 'id', 'flip-x': 'x', 'flip-y': 'y', 'flip-z': 'z' };
const shortFlip = (f) => FLIP_SHORT[f] ?? f;

function FullTable({ configs }) {
    const anySingular = configs.some((c) => c.singular);
    return (<div className='mv-eul-fulltable-wrap'>
        <table className='mv-eul-results mv-eul-fulltable'>
            <thead>
                <tr>
                    <th>#</th><th>A</th><th>B</th>
                    <th>&alpha;</th><th>&beta;</th><th>&gamma;</th>
                </tr>
            </thead>
            <tbody>
                {configs.map((c) => (
                    <tr key={c.id} className={c.active ? 'mv-euler-row-active' : ''}>
                        <td>{c.index + 1}</td>
                        <td>{shortFlip(c.aFlip)}</td>
                        <td>{shortFlip(c.bFlip)}</td>
                        <td>{c.alpha.toFixed(2)}&deg;{c.singular ? '*' : ''}</td>
                        <td>{c.beta.toFixed(2)}&deg;</td>
                        <td>{c.gamma.toFixed(2)}&deg;{c.singular ? '*' : ''}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <p className='mv-euler-msg mv-euler-flipkey'>A/B flip: <b>id</b>=identity, <b>x/y/z</b>=180&deg; axis flip.</p>
        {anySingular &&
            <p className='mv-euler-msg'>* &beta;&asymp;0/180&deg;: &alpha; and &gamma; are undefined; only their
                combined twist is physical (&gamma; set to 0).</p>}
    </div>);
}

function AnglesBlock({ eulint, onShowAll, onShowMatrix }) {
    const cls = eulint.orientationClass;

    if (cls === 'indeterminate')
        return <p className='mv-euler-msg'>A tensor is isotropic — the relative orientation is undefined.</p>;
    if (cls === 'continuous')
        return <p className='mv-euler-msg mv-euler-warn'>{eulint.gaugeWarning ??
            'One tensor is axially symmetric under the chosen ordering; the geometry is drawn statically.'}</p>;

    const configs = eulint.configs;
    if (configs.length === 0) {
        if (eulint.atomA && eulint.atomB)
            return <p className='mv-euler-msg'>The selected tensor data is not available on these atoms —
                choose a different tensor or load a file that contains it.</p>;
        return <p className='mv-euler-msg'>Pick two atoms with tensor data to compute Euler angles.</p>;
    }

    const cur = configs[eulint.activeConfig];

    return (<>
        <table className='mv-eul-results'>
            <thead>
                <tr><th>&alpha;</th><th>&beta;</th><th>&gamma;</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>{cur.alpha.toFixed(2)}&deg;{cur.singular ? '*' : ''}</td>
                    <td>{cur.beta.toFixed(2)}&deg;</td>
                    <td>{cur.gamma.toFixed(2)}&deg;{cur.singular ? '*' : ''}</td>
                </tr>
            </tbody>
        </table>
        <div className='mv-euler-cycle-row'>
            <MVButton onClick={() => eulint.cycleConfig(-1)}>&#9664; Prev</MVButton>
            <span className='mv-euler-cycle-count'>{eulint.activeConfig + 1} / {configs.length}</span>
            <MVButton onClick={() => eulint.cycleConfig(1)}>Next &#9654;</MVButton>
        </div>
        <MVButton onClick={onShowAll} style={{ width: '100%' }}>Show all {configs.length} sets</MVButton>
        <MVButton onClick={onShowMatrix} style={{ width: '100%', marginTop: '0.4em' }}>View Rotation Matrix…</MVButton>
        <div style={{ marginTop: '0.6em', width: '100%' }}>
            <MVCheckBox checked={eulint.disksOn} onCheck={(v) => { eulint.disksOn = v; }}>Show Euler disks</MVCheckBox>
        </div>
        {eulint.gaugeNote && <p className='mv-euler-msg'>{eulint.gaugeNote}</p>}
    </>);
}

function EigenTable({ evecs, evals, title }) {
    if (!evecs || !Array.isArray(evecs)) {
        return null;
    }

    const copyPAS = () => {
        const text = evecs.map((row, i) =>
            `v${i + 1} = (${row.map((x) => x.toFixed(6)).join(', ')})${evals && evals[i] !== undefined ? `, lambda_${i + 1} = ${evals[i].toFixed(6)}` : ''}`
        ).join('\n');
        copyContents(text);
    };

    return (
        <div className='mv-euler-matrix-card'>
            <div className='mv-euler-matrix-header'>{title}</div>
            <div className='mv-euler-pas-list'>
                {evecs.map((eigenvector, index) => (
                    <div key={index} className='mv-euler-pas-row'>
                        <span className='mv-euler-pas-vec'>
                            v<sub>{index + 1}</sub> = (
                            {eigenvector.map((val, i) => (
                                <span key={i} className='mv-fixed-width'>
                                    {val >= 0 ? ` ${val.toFixed(4)}` : val.toFixed(4)}
                                    {i < eigenvector.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                            )
                        </span>
                        {evals && evals[index] !== undefined && (
                            <span className='mv-euler-pas-eval'>
                                &lambda;<sub>{index + 1}</sub> ={' '}
                                <span className='mv-fixed-width'>{evals[index].toFixed(4)}</span>
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <MVButton onClick={copyPAS} style={{ fontSize: '0.82em', marginTop: '0.2em' }}>
                <FaCopy />&nbsp;Copy PAS to Clipboard
            </MVButton>
        </div>
    );
}

function RotationMatrixModal({ eulint, onClose }) {
    const R = eulint.currentRotationMatrix;
    const reportText = eulint.txtRotationMatrixReport();

    const orderLabelA = orderOptions.find(([v]) => v === eulint.orderA)?.[1] ?? eulint.orderA;
    const orderLabelB = orderOptions.find(([v]) => v === eulint.orderB)?.[1] ?? eulint.orderB;
    const tensorOptions = availableTensorOptions(eulint);
    const tensorLabelA = tensorOptions.find(([v]) => v === eulint.tensorA)?.[1] ?? eulint.tensorA;
    const tensorLabelB = tensorOptions.find(([v]) => v === eulint.tensorB)?.[1] ?? eulint.tensorB;

    const curConfig = eulint.configs[eulint.activeConfig];
    const seq = (eulint.sequence || 'zyz').toUpperCase();
    const sense = eulint.active ? 'Active' : 'Passive';

    const pasA = eulint.pasA;
    const pasB = eulint.pasB;

    const titleA = `Principal Axis System A: ${eulint.atomLabelA} (${tensorLabelA}, ${orderLabelA})`;
    const titleB = `Principal Axis System B: ${eulint.atomLabelB} (${tensorLabelB}, ${orderLabelB})`;

    return (
        <MVModal
            title='Principal Axis Systems & Rotation Matrix'
            display={true}
            hasOverlay={false}
            draggable={true}
            noFooter={true}
            onClose={onClose}
        >
            <div className='mv-euler-matrix-modal-body'>
                <div className='mv-euler-matrix-meta'>
                    <div><b>Atom A:</b> {eulint.atomLabelA} ({tensorLabelA}, {orderLabelA})</div>
                    <div><b>Atom B:</b> {eulint.atomLabelB} ({tensorLabelB}, {orderLabelB})</div>
                    <div><b>Convention:</b> Sequence {seq} · Rotation {sense}</div>
                    {curConfig && (
                        <div><b>Active Set:</b> {eulint.activeConfig + 1} of {eulint.configs.length} (A flip: {curConfig.aFlip}, B flip: {curConfig.bFlip})</div>
                    )}
                    {curConfig && (
                        <div><b>Euler Angles:</b> &alpha; = {curConfig.alpha.toFixed(2)}&deg;, &beta; = {curConfig.beta.toFixed(2)}&deg;, &gamma; = {curConfig.gamma.toFixed(2)}&deg;</div>
                    )}
                    {eulint.gaugeNote && (
                        <div style={{ marginTop: '0.3em', color: 'var(--mid-color-2)', fontStyle: 'italic' }}>
                            Note: {eulint.gaugeNote}
                        </div>
                    )}
                </div>

                <EigenTable evecs={pasA?.evecs} evals={pasA?.evals} title={titleA} />
                <EigenTable evecs={pasB?.evecs} evals={pasB?.evals} title={titleB} />

                <div className='mv-euler-matrix-card'>
                    <div className='mv-euler-matrix-header'>
                        Rotation Matrix R ({sense}, PAS A &rarr; PAS B)
                    </div>
                    {R ? (
                        <>
                            <table className='mv-euler-matrix-table'>
                                <tbody>
                                    {R.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((val, j) => (
                                                <td key={j}>{val >= 0 ? ` ${val.toFixed(6)}` : val.toFixed(6)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <MVButton
                                onClick={() => {
                                    const text = R.map((row) => row.map((v) => v.toFixed(6)).join(', ')).join('\n');
                                    copyContents(text);
                                }}
                                style={{ fontSize: '0.82em', marginTop: '0.2em' }}
                            >
                                <FaCopy />&nbsp;Copy Matrix to Clipboard
                            </MVButton>
                        </>
                    ) : (
                        <p className='mv-euler-msg'>No active rotation matrix available.</p>
                    )}
                </div>

                <div className='mv-euler-matrix-actions'>
                    <MVButton onClick={() => copyContents(reportText)}>
                        <FaCopy />&nbsp;Copy Report &amp; All Data to Clipboard
                    </MVButton>
                </div>
            </div>
        </MVModal>
    );
}

function MVSidebarEuler(props) {

    const eulint = useEulerInterface();
    const appint = useAppInterface();
    const [showTable, setShowTable] = useState(false);
    const [showMatrixModal, setShowMatrixModal] = useState(false);
    const [conventionOpen, setConventionOpen] = useState(false);
    const [pasOpenA, setPasOpenA] = useState(false);
    const [pasOpenB, setPasOpenB] = useState(false);

    const hasSel = (eulint.atomA && eulint.atomB);
    const configs = eulint.configs;
    const tensorOptions = availableTensorOptions(eulint);

    const orderLabelA = orderOptions.find(([v]) => v === eulint.orderA)?.[1] ?? eulint.orderA;
    const orderLabelB = orderOptions.find(([v]) => v === eulint.orderB)?.[1] ?? eulint.orderB;
    const showConvention = appint.advancedMode || conventionOpen;
    const showPasA = appint.advancedMode || pasOpenA;
    const showPasB = appint.advancedMode || pasOpenB;

    // Keep the A/B tensor selections valid for the loaded model: if a chosen
    // tensor type isn't present (e.g. default 'ms' on an EFG-only file), fall
    // back to the first available option so the selector never shows blank.
    const availValues = tensorOptions.map((o) => o[0]);
    useEffect(() => {
        if (!eulint.hasModel) return;
        if (!availValues.includes(eulint.tensorA)) eulint.setTensor('A', availValues[0]);
        if (!availValues.includes(eulint.tensorB)) eulint.setTensor('B', availValues[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eulint.hasMSData, eulint.hasEFGData, eulint.tensorA, eulint.tensorB, eulint.atomA, eulint.atomB]);

    return (<MagresViewSidebar show={props.show} title='Euler angles'>
        {/* Atom A Card */}
        <MVCard title='Atom A' badge={{ text: eulint.atomLabelA, unset: !eulint.atomA }}>
            <MVField label='Tensor' className='mv-euler-prominent-field'>
                <OptionSelect options={tensorOptions} value={eulint.tensorA} onSelect={(v) => { eulint.setTensor('A', v); }} />
            </MVField>
            {!showPasA ? (
                <div className='mv-euler-pas-indicator' onClick={() => setPasOpenA(true)} title='Click to set PAS ordering'>
                    <span>PAS ordering: <b>{orderLabelA}</b></span>
                    <span className='mv-euler-indicator-edit'>Edit ▾</span>
                </div>
            ) : (
                <div className='mv-euler-pas-expanded'>
                    <MVField label={
                        <div className='mv-euler-field-header'>
                            <span>PAS Ordering</span>
                            <MVTooltip tooltipText={tooltip_pas_ordering} />
                        </div>
                    }>
                        <OptionSelect options={orderOptions} value={eulint.orderA} onSelect={(v) => { eulint.orderA = v; }} />
                    </MVField>
                    {!appint.advancedMode && (
                        <button className='mv-euler-pas-collapse' onClick={() => setPasOpenA(false)}>
                            Close ▴
                        </button>
                    )}
                </div>
            )}
        </MVCard>

        {/* Swap A & B */}
        <div className='mv-euler-swap-row'>
            <MVButton onClick={() => eulint.swapAB()} disabled={!hasSel} style={{ width: '100%' }}>
                &#8646; Swap Atom A and B
            </MVButton>
        </div>

        {/* Atom B Card */}
        <MVCard title='Atom B' badge={{ text: eulint.atomLabelB, unset: !eulint.atomB }}>
            <MVField label='Tensor' className='mv-euler-prominent-field'>
                <OptionSelect options={tensorOptions} value={eulint.tensorB} onSelect={(v) => { eulint.setTensor('B', v); }} />
            </MVField>
            {!showPasB ? (
                <div className='mv-euler-pas-indicator' onClick={() => setPasOpenB(true)} title='Click to set PAS ordering'>
                    <span>PAS ordering: <b>{orderLabelB}</b></span>
                    <span className='mv-euler-indicator-edit'>Edit ▾</span>
                </div>
            ) : (
                <div className='mv-euler-pas-expanded'>
                    <MVField label={
                        <div className='mv-euler-field-header'>
                            <span>PAS Ordering</span>
                            <MVTooltip tooltipText={tooltip_pas_ordering} />
                        </div>
                    }>
                        <OptionSelect options={orderOptions} value={eulint.orderB} onSelect={(v) => { eulint.orderB = v; }} />
                    </MVField>
                    {!appint.advancedMode && (
                        <button className='mv-euler-pas-collapse' onClick={() => setPasOpenB(false)}>
                            Close ▴
                        </button>
                    )}
                </div>
            )}
        </MVCard>

        {/* Euler Convention Section */}
        <div className='mv-sidebar-block'>
            <h3>Euler convention</h3>
            {!showConvention ? (
                <div
                    className='mv-euler-convention-indicator'
                    onClick={() => setConventionOpen(true)}
                    title='Click to set Euler convention options'
                >
                    <span className='mv-euler-indicator-badge'>{(eulint.sequence || 'zyz').toUpperCase()}</span>
                    <span className='mv-euler-indicator-badge'>{eulint.active ? 'Active' : 'Passive'}</span>
                    <span className='mv-euler-indicator-edit'>Edit ▾</span>
                </div>
            ) : (
                <div className='mv-euler-convention-expanded'>
                    <MVField label='Sequence'>
                        <MVCustomSelect selected={eulint.sequence} onSelect={(v) => { eulint.sequence = v; }}>
                            <MVCustomSelectOption value='zyz'>ZYZ</MVCustomSelectOption>
                            <MVCustomSelectOption value='zxz'>ZXZ</MVCustomSelectOption>
                        </MVCustomSelect>
                    </MVField>
                    <MVField label='Rotation sense'>
                        <div className='mv-euler-switch-row'>
                            <span>Passive</span>
                            <MVSwitch on={eulint.active} onClick={() => { eulint.active = !eulint.active; }} />
                            <span>Active</span>
                        </div>
                    </MVField>
                    {!appint.advancedMode && (
                        <button className='mv-euler-pas-collapse' onClick={() => setConventionOpen(false)}>
                            Close ▴
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Angle Results Section */}
        <div className='mv-sidebar-block'>
            <h3>Relative orientation</h3>
            <AnglesBlock
                eulint={eulint}
                onShowAll={() => setShowTable(true)}
                onShowMatrix={() => setShowMatrixModal(true)}
            />
        </div>

        {showMatrixModal &&
            <RotationMatrixModal
                eulint={eulint}
                onClose={() => setShowMatrixModal(false)}
            />}

        {showTable &&
            <MVModal title={`All ${configs.length} equivalent Euler angle sets`}
                     display={true} hasOverlay={false} draggable={true} noFooter={true}
                     onClose={() => setShowTable(false)}>
                <FullTable configs={configs} />
                <div className='mv-euler-cycle-row' style={{marginTop: '0.8em'}}>
                    <MVButton onClick={() => { copyContents(eulint.csvTable()); }}><FaCopy />&nbsp;Copy CSV</MVButton>
                    <MVButton onClick={() => { saveContents(eulint.csvTable(), 'euler_angles.csv'); }}><FaDownload />&nbsp;Download CSV</MVButton>
                </div>
            </MVModal>}

        <span className='sep-1' />

        {/* Export Reports Section */}
        <div className='mv-sidebar-block'>
            <MVButton onClick={() => { copyContents(eulint.txtReport()); }} disabled={!hasSel} style={{ width: '100%' }}>
                <FaCopy />&nbsp;Copy report to clipboard
            </MVButton>
            <MVButton onClick={() => { saveContents(eulint.txtSelfAngleTable(), 'eulerTable.txt'); }} disabled={!(eulint.hasMSData && eulint.hasEFGData)} style={{ width: '100%', marginTop: '0.4em' }}>
                <FaDownload />&nbsp;Download table of MS-to-EFG angles
            </MVButton>
        </div>

    </MagresViewSidebar>);
}

export default MVSidebarEuler;
