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

import './MVSidebarDip.css';

import MagresViewSidebar from './MagresViewSidebar';

import React from 'react';

import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import MVButton from '../../controls/MVButton';
import { useDipInterface } from '../store';


function MVSidebarDip(props) {

    const dipint = useDipInterface();

    console.log('[MVSidebarDip rendered]');

    return (<MagresViewSidebar show={props.show} title='Dipolar couplings'>
        <div className='mv-sidebar-block'>
            <MVCheckBox color='var(--dip-color-3)' onCheck={(v) => { dipint.isOn = v; }} checked={ dipint.isOn } >Show dipolar coupling links</MVCheckBox>
        </div>
        <div className='mv-sidebar-block'>
            <p>
                Click an atom in the viewer to show its dipolar couplings within the radius below.
            </p>
             <MVRange min={1.0} max={20.0} step={0.05} value={dipint.radius} color={'var(--dip-color-3)'}
                      onChange={(s) => { dipint.radius = s; }}>Selection radius / Å</MVRange>
             <MVCheckBox color='var(--dip-color-3)' onCheck={(v) => { dipint.showSphere = v; }} checked={ dipint.showSphere } >Show selection sphere</MVCheckBox>                        
             <MVCheckBox color='var(--dip-color-3)' onCheck={(v) => { dipint.homonuclearOnly = v; }} checked={ dipint.homonuclearOnly } >Show only homonuclear couplings</MVCheckBox>                        
             <MVRange min={0} max={6} step={1} value={dipint.precision} onChange={(p) => { dipint.precision = p; }} disabled={!dipint.isOn}>Label Precision</MVRange>
             {/* reset button */}
             <MVButton onClick={() => { dipint.reset(); }}>Reset options</MVButton>
        </div>
    </MagresViewSidebar>);
}

export default MVSidebarDip;