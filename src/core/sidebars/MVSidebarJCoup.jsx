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

import './MVSidebarJCoup.css';

import MagresViewSidebar from './MagresViewSidebar';

import React, { useEffect, useRef } from 'react';

import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import { useJCoupInterface } from '../store';
import { chainClasses } from '../../utils';
import MVButton from '../../controls/MVButton';


function MVSidebarJCoup(props) {

    const jcint = useJCoupInterface();

    console.log('[MVSidebarJCoup rendered]');

    const intRef = useRef();
    intRef.current = jcint;

    useEffect(() => {
        let jcint = intRef.current;

        // Only keep events bound when this sidebar is visible!
        if (props.show && jcint.isOn) {
            jcint.bind();
        }
        else {
            jcint.unbind();
        }

    }, [props.show, jcint.isOn]);

    var has_jc = false;
    if (props.show) {
        has_jc = jcint.hasData;
    }

    return (<MagresViewSidebar show={props.show} title='J couplings'>
        <div className={has_jc? '' : 'hidden'}>
            <div className='mv-sidebar-block'>
                <MVCheckBox color='var(--jcoup-color-3)' onCheck={(v) => { jcint.isOn = v; }} checked={ jcint.isOn } >Show J couplings</MVCheckBox>
            </div>
            <div className='mv-sidebar-block'>
                <p>
                    Choose Click on an atom to show all J couplings in a selected radius.
                    (Note: to avoid performance issues, changing the radius of selection has effect only from the next click)
                </p>
                 <MVRange min={1.0} max={20.0} step={0.05} value={jcint.radius} color={'var(--jcoup-color-3)'}
                          onChange={(s) => { jcint.radius = s; }}>Selection radius / Å</MVRange>
                 <MVCheckBox color='var(--jcoup-color-3)' onCheck={(v) => { jcint.showSphere = v; }} checked={ jcint.showSphere } >Show selection sphere</MVCheckBox>                        
                 <MVCheckBox color='var(--jcoup-color-3)' onCheck={(v) => { jcint.homonuclearOnly = v; }} checked={ jcint.homonuclearOnly } >Show only homonuclear couplings</MVCheckBox>                        
                 <MVRange min={0} max={6} step={1} value={jcint.precision} onChange={(p) => { jcint.precision = p; }} disabled={!jcint.isOn}>Label Precision</MVRange>
                {/* reset button */}
                <MVButton onClick={() => { jcint.reset(); }}>Reset options</MVButton>
            </div>
        </div>
         <div className={chainClasses('mv-warning-noms', has_jc? 'hidden': '')}>No J coupling data found in file (lines beginning isc)</div>
    </MagresViewSidebar>);
}

export default MVSidebarJCoup;