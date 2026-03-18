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

import MagresViewSidebar from './MagresViewSidebar';
import { useEulerInterface } from '../store';
import { saveContents, copyContents } from '../../utils';

import MVSwitch from '../../controls/MVSwitch';
import MVButton from '../../controls/MVButton';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import { FaCopy } from 'react-icons/fa';

function MVSidebarEuler(props) {

    const eulint = useEulerInterface();

    console.log('[MVSidebarEuler rendered]');

    const otherTensor = {
        ms: 'efg',
        efg: 'ms'
    };

    // Round values
    let a = eulint.alpha;
    let b = eulint.beta;
    let c = eulint.gamma;

    if (a !== 'N/A') {
        // It's a number
        a = a.toFixed(2);
        b = b.toFixed(2);
        c = c.toFixed(2);
    }

    const hasSel = (eulint.atomA && eulint.atomB);

    return (<MagresViewSidebar show={props.show} title='Euler angles'>
        <div className='mv-sidebar-block'>
            <p style={{margin: '0 0 0.6em', fontSize: '0.85em', color: 'var(--mid-color-2)'}}>Click a button to enter picking mode, then click an atom in the viewer.</p>
            <div className='mv-euler-pick-row'>
                <button
                    className={`mv-euler-pick-btn mv-euler-pick-a${eulint.step === 'A' ? ' active' : ''}`}
                    onClick={() => { eulint.step = 'A'; }}
                >
                    {eulint.step === 'A' && <span className='mv-euler-pick-dot'>&#9679;</span>}
                    Atom A
                </button>
                <button
                    className={`mv-euler-pick-btn mv-euler-pick-b${eulint.step === 'B' ? ' active' : ''}`}
                    onClick={() => { eulint.step = 'B'; }}
                >
                    {eulint.step === 'B' && <span className='mv-euler-pick-dot'>&#9679;</span>}
                    Atom B
                </button>
            </div>
            <div className='mv-euler-pick-labels'>
                <span className={`mv-euler-pick-label-val${eulint.atomA ? '' : ' unset'}`}>{eulint.atomLabelA}</span>
                <span className={`mv-euler-pick-label-val${eulint.atomB ? '' : ' unset'}`}>{eulint.atomLabelB}</span>
            </div>
        </div>
        <div className='mv-sidebar-block'>
            <h3>Tensor type</h3>
            <div className='mv-euler-tensors'>
                <span className='mv-euler-tensor-label'>A</span>
                <div className='mv-euler-agrid-switch' style={{flex: 1}}>
                    <span>Shielding</span>
                    <MVSwitch on={ eulint.tensorA === 'efg' } onClick={() => { eulint.tensorA = otherTensor[eulint.tensorA]; }}
                               colorFalse='var(--ms-color-2)' colorTrue='var(--efg-color-2)'/>
                    <span>EFG</span>
                </div>
            </div>
            <div className='mv-euler-tensors'>
                <span className='mv-euler-tensor-label'>B</span>
                <div className='mv-euler-agrid-switch' style={{flex: 1}}>
                    <span>Shielding</span>
                    <MVSwitch on={ eulint.tensorB === 'efg' } onClick={() => { eulint.tensorB = otherTensor[eulint.tensorB]; }}
                               colorFalse='var(--ms-color-2)' colorTrue='var(--efg-color-2)'/>
                    <span>EFG</span>
                </div>
            </div>
        </div>
        <div className='mv-sidebar-block'>
            <h3>Convention</h3>
            <MVCustomSelect selected={eulint.convention} onSelect={(v) => { eulint.convention = v; }}>
                <MVCustomSelectOption value='zyz'>ZYZ</MVCustomSelectOption>
                <MVCustomSelectOption value='zxz'>ZXZ</MVCustomSelectOption>
            </MVCustomSelect>
        </div>
        <div className='mv-sidebar-block'>
            <h3>Angles</h3>
            <table className='mv-eul-results'>
                <thead>
                    <tr>
                        <td>Alpha</td>
                        <td>Beta</td>
                        <td>Gamma</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{a}&deg;</td>
                        <td>{b}&deg;</td>
                        <td>{c}&deg;</td>
                    </tr>
                </tbody>
            </table>
        </div>
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