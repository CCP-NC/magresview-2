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

import MagresViewSidebar from './MagresViewSidebar';
import { useEulerInterface } from '../store';
import { saveContents, copyContents } from '../../utils';

import MVSwitch from '../../controls/MVSwitch';
import MVButton from '../../controls/MVButton';
import MVCheckBox from '../../controls/MVCheckBox';
import MVModal from '../../controls/MVModal';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import { FaCopy } from 'react-icons/fa';

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
            <MVCustomSelectOption key={v} value={v}>{label}</MVCustomSelectOption>
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
                    <td>#</td><td>A</td><td>B</td>
                    <td>&alpha;</td><td>&beta;</td><td>&gamma;</td>
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

function AnglesBlock({ eulint, onShowAll }) {
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
                <tr><td>&alpha;</td><td>&beta;</td><td>&gamma;</td></tr>
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
        <MVButton onClick={onShowAll}>Show all {configs.length} sets</MVButton>
        {eulint.gaugeNote && <p className='mv-euler-msg'>{eulint.gaugeNote}</p>}
    </>);
}

function MVSidebarEuler(props) {

    const eulint = useEulerInterface();
    const [showTable, setShowTable] = useState(false);

    const hasSel = (eulint.atomA && eulint.atomB);
    const configs = eulint.configs;
    const tensorOptions = availableTensorOptions(eulint);

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
        <div className='mv-sidebar-block'>
            <p style={{margin: '0 0 0.6em', fontSize: '0.85em', color: 'var(--mid-color-2)'}}>
                <b>left-click</b> to set atom A and <b>right-click</b> to set atom B.
            </p>
            <div className='mv-euler-pick-labels'>
                <span className={`mv-euler-pick-label-val${eulint.atomA ? '' : ' unset'}`}>A: {eulint.atomLabelA}</span>
                <span className={`mv-euler-pick-label-val${eulint.atomB ? '' : ' unset'}`}>B: {eulint.atomLabelB}</span>
            </div>
            <div className='mv-euler-swap-row'>
                <MVButton onClick={() => eulint.swapAB()} disabled={!hasSel}>&#8646; Swap A and B</MVButton>
            </div>
        </div>
        <div className='mv-sidebar-block'>
            <h3>Tensor &amp; ordering</h3>
            <div className='mv-euler-tensors'>
                <span className='mv-euler-tensor-label'>A</span>
                <OptionSelect options={tensorOptions} value={eulint.tensorA} onSelect={(v) => { eulint.setTensor('A', v); }} />
                <OptionSelect options={orderOptions} value={eulint.orderA} onSelect={(v) => { eulint.orderA = v; }} />
            </div>
            <div className='mv-euler-tensors'>
                <span className='mv-euler-tensor-label'>B</span>
                <OptionSelect options={tensorOptions} value={eulint.tensorB} onSelect={(v) => { eulint.setTensor('B', v); }} />
                <OptionSelect options={orderOptions} value={eulint.orderB} onSelect={(v) => { eulint.orderB = v; }} />
            </div>
        </div>
        <div className='mv-sidebar-block'>
            <h3>Euler convention</h3>
            <div className='mv-euler-agrid-switch'>
                <MVCustomSelect selected={eulint.sequence} onSelect={(v) => { eulint.sequence = v; }}>
                    <MVCustomSelectOption value='zyz'>ZYZ</MVCustomSelectOption>
                    <MVCustomSelectOption value='zxz'>ZXZ</MVCustomSelectOption>
                </MVCustomSelect>
                <span>Passive</span>
                <MVSwitch on={eulint.active} onClick={() => { eulint.active = !eulint.active; }} />
                <span>Active</span>
            </div>
        </div>
        <div className='mv-sidebar-block'>
            <MVCheckBox checked={eulint.disksOn} onCheck={(v) => { eulint.disksOn = v; }}>Show Euler disks</MVCheckBox>
        </div>
        <div className='mv-sidebar-block'>
            <h3>Euler angles</h3>
            <AnglesBlock eulint={eulint} onShowAll={() => setShowTable(true)} />
        </div>

        {showTable &&
            <MVModal title={`All ${configs.length} equivalent Euler angle sets`}
                     display={true} hasOverlay={true} draggable={true} noFooter={true}
                     onClose={() => setShowTable(false)}>
                <FullTable configs={configs} />
                <div className='mv-euler-cycle-row' style={{marginTop: '0.6em'}}>
                    <MVButton onClick={() => { copyContents(eulint.csvTable()); }}><FaCopy />&nbsp;Copy CSV</MVButton>
                    <MVButton onClick={() => { saveContents('data:,' + eulint.csvTable(), 'euler_angles.csv'); }}>Download CSV</MVButton>
                </div>
            </MVModal>}

        <span className='sep-1' />
        <div className='mv-sidebar-block'>
            <MVButton onClick={() => { copyContents(eulint.txtReport()); }} disabled={!hasSel}><FaCopy />&nbsp;Copy to clipboard</MVButton>            
        </div>
        <div className='mv-sidebar-block'>
            <MVButton onClick={() => { saveContents('data:,' + eulint.txtSelfAngleTable(), 'eulerTable.txt'); }}  disabled={!(eulint.hasMSData && eulint.hasEFGData)}>
                Download table of MS-to-EFG angles
            </MVButton>            
        </div>

    </MagresViewSidebar>);
}

export default MVSidebarEuler;
