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

import './MVSidebarMS.css';

import _ from 'lodash';
import React, { useState, useEffect, useRef } from 'react';

import MagresViewSidebar from './MagresViewSidebar';
import { useMSInterface } from '../store';
import { chainClasses } from '../../utils';

import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import MVButton from '../../controls/MVButton';
import MVRadioButton, { MVRadioGroup } from '../../controls/MVRadioButton';
import MVModal from '../../controls/MVModal';
import MVText from '../../controls/MVText';
import MVCScaleBar from '../../controls/MVCScaleBar';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';

function MVReferenceTable(props) {

    const msint = useMSInterface();
    const [ refTable, setRefTable ] = useState(msint.referenceTable);

    // We store a copy of the reference list internally; it only gets set on
    // the interface once we click OK. This is to avoid needless expensive 
    // operations when typing text in the fields, especially if the CS labels
    // are on.
    
    const intRef = useRef();
    intRef.current = msint;

    useEffect(() => {
        setRefTable(intRef.current.referenceTable);
    }, [props.display]);

    const elements = _.keys(refTable).sort();

    return (
    <MVModal title='References for chemical shifts, by element (ppm)' display={props.display} hasOverlay={true}
             onClose={props.close} onAccept={() => { msint.updateReferenceTable(refTable); props.close(); }}>
        <div className='mv-msref-table'>
            {elements.map((el, i) => {
                const ref = refTable[el];

                return (<div key={i} className='mv-msref-table-row'>
                            <div className='mv-msref-table-el'>{el}</div>
                            <div className='mv-msref-table-ref'>
                                <MVText value={ref} onChange={(v) => { setRefTable({...refTable, [el]: v}) }} size={5}/>
                            </div>
                        </div>);
            })}
        </div>
    </MVModal>);
}


function MVSidebarMS(props) {

    const [ state, setState ] = useState({
        showRefTable: false
    });

    const msint = useMSInterface();

    console.log('[MVSidebarMS rendered]');

    var has_ms = false;
    if (props.show) {
        has_ms = msint.hasData;
    }


    return (<MagresViewSidebar show={props.show} title='Magnetic Shielding'>
        <div className={chainClasses('mv-sidebar-block', has_ms? '' : 'hidden')}>
             <MVCheckBox onCheck={(v) => { msint.hasEllipsoids = v; }} checked={msint.hasEllipsoids}>Ellipsoids</MVCheckBox>
             <MVRange min={0.01} max={0.5} step={0.005} value={msint.ellipsoidScale}
                      onChange={(s) => { msint.ellipsoidScale = s; }} disabled={!msint.hasEllipsoids}>Ellipsoid scale</MVRange>
             <MVButton onClick={() => { msint.ellipsoidScale = 0; }} disabled={!msint.hasEllipsoids}>Auto scale</MVButton>
             <MVButton onClick={() => { setState({...state, showRefTable: true}) }}>Set References</MVButton>
             <MVReferenceTable display={state.showRefTable} close={() => { setState({...state, showRefTable: false}) }}/>
             <MVRadioGroup label='Show labels' onSelect={(v) => { msint.labelsMode = v; }} selected={msint.labelsMode} name='ms_label_radio'>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='iso'>Isotropy (ppm)</MVRadioButton>
                <MVRadioButton value='cs'>Chemical Shifts (ppm, uses references)</MVRadioButton>
                <MVRadioButton value='aniso'>Anisotropy (ppm)</MVRadioButton>
                <MVRadioButton value='redaniso'>Reduced Anisotropy (ppm)</MVRadioButton>
                <MVRadioButton value='asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
             <MVRange min={0} max={6} step={1} value={msint.precision} onChange={(p) => { msint.precision = p; }} disabled={msint.labelsMode === 'none'}>Label Precision</MVRange>
             <MVRadioGroup label='Use color scale' onSelect={(v) => { msint.colorScaleType = v; }} selected={msint.colorScaleType} disabled={!msint.colorScaleAvailable} name='ms_cscale_radio'>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='ms_iso'>Isotropy</MVRadioButton>
                <MVRadioButton value='ms_cs'>Chemical Shifts (uses references)</MVRadioButton>
                <MVRadioButton value='ms_aniso'>Anisotropy</MVRadioButton>
                <MVRadioButton value='ms_asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
             {/* hide scalebar if msintcolorScaleType is 'none' */}
             <MVCScaleBar label={msint.colorScaleType} 
             hidden={msint.colorScaleType === 'none'}  
             lims={msint.colorScaleLimits} 
             cmap={msint.colorScaleCmap}
             units={msint.colorScaleUnits} />
             Color map
            <MVCustomSelect onSelect={(v) => { msint.colorScaleCmap = v; }} selected={msint.colorScaleCmap} name='cmap_dropdown'>
                <MVCustomSelectOption value='viridis'>Viridis</MVCustomSelectOption>
                <MVCustomSelectOption value='portland'>Portland</MVCustomSelectOption>
                <MVCustomSelectOption value='RdBu'>Red-Blue</MVCustomSelectOption>
                <MVCustomSelectOption value='inferno'>Inferno</MVCustomSelectOption>
                <MVCustomSelectOption value='jet'>Jet</MVCustomSelectOption>
            </MVCustomSelect>
            {/* reset button */}
            <MVButton onClick={() => { msint.reset(); }}>Reset options</MVButton>
        </div>
        <div className={chainClasses('mv-warning-noms', has_ms? 'hidden': '')}>No MS data found</div>
    </MagresViewSidebar>);
}

export default MVSidebarMS;