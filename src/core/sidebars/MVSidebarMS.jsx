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

import MagresViewSidebar, { MVAdvancedSection } from './MagresViewSidebar';
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
             draggable={true}
             onClose={props.close} onAccept={() => { msint.updateReferenceTable(refTable); props.onAccept?.(); props.close(); }}>
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
                <div className='mv-ms-btn-row'>
                    <MVButton onClick={() => { msint.ellipsoidScale = 0; }} disabled={!msint.hasEllipsoids}>Auto scale</MVButton>
                    <MVButton onClick={() => { setState({...state, showRefTable: true}) }}>Set References</MVButton>
                </div>
             <MVReferenceTable display={state.showRefTable || !!props.refTableOpen}
                 close={() => { setState({...state, showRefTable: false}); props.onRefTableClose?.(); }}/>
             <MVRadioGroup label='Show labels' onSelect={(v) => { msint.labelsMode = v; }} selected={msint.labelsMode} name='ms_label_radio'>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='iso'>Isotropy (ppm)</MVRadioButton>
                <MVRadioButton value='cs'>Chemical Shifts (ppm, uses references)</MVRadioButton>
                <MVRadioButton value='aniso'>Anisotropy (ppm)</MVRadioButton>
                <MVRadioButton value='redaniso'>Reduced Anisotropy (ppm)</MVRadioButton>
                <MVRadioButton value='asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
             <span className='sep-1' />
             <MVRadioGroup label='Use color scale' onSelect={(v) => { msint.colorScaleType = v; }} selected={msint.colorScaleType} disabled={!msint.colorScaleAvailable} name='ms_cscale_radio'>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='ms_iso'>Isotropy</MVRadioButton>
                <MVRadioButton value='ms_cs'>Chemical Shifts (uses references)</MVRadioButton>
                <MVRadioButton value='ms_aniso'>Anisotropy</MVRadioButton>
                <MVRadioButton value='ms_asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
             <MVCScaleBar label={msint.colorScaleType}
             hidden={msint.colorScaleType === 'none'}
             lims={msint.colorScaleLimits}
             cmap={msint.colorScaleCmap}
             units={msint.colorScaleUnits} />
             <MVAdvancedSection>
                 <MVRange min={0} max={6} step={1} value={msint.precision} onChange={(p) => { msint.precision = p; }} disabled={msint.labelsMode === 'none'}>Label Precision</MVRange>
                 <span className='sep-1' />
                 Color map
                 <MVCustomSelect onSelect={(v) => { msint.colorScaleCmap = v; }} selected={msint.colorScaleCmap} name='cmap_dropdown'>
                     <MVCustomSelectOption value='viridis'>Viridis</MVCustomSelectOption>
                     <MVCustomSelectOption value='portland'>Portland</MVCustomSelectOption>
                     <MVCustomSelectOption value='RdBu'>Red-Blue</MVCustomSelectOption>
                     <MVCustomSelectOption value='inferno'>Inferno</MVCustomSelectOption>
                     <MVCustomSelectOption value='jet'>Jet</MVCustomSelectOption>
                 </MVCustomSelect>
                 <span className='sep-1' />
                 <div className='mv-adv-lims'>
                     <MVCheckBox
                         checked={msint.colorScaleLimitsOverride === null}
                         onCheck={(v) => { msint.colorScaleLimitsOverride = v ? null : msint.colorScaleLimits; }}
                         disabled={msint.colorScaleType === 'none'}>
                         Auto scale limits
                     </MVCheckBox>
                     <div className='mv-adv-lims-row'>
                         Min:&nbsp;
                         <MVText size='7'
                             value={String((msint.colorScaleLimits[0] ?? 0).toFixed(3))}
                             onChange={(v) => { msint.colorScaleLimitsOverride = [parseFloat(v), (msint.colorScaleLimitsOverride ?? msint.colorScaleLimits)[1]]; }}
                             disabled={msint.colorScaleLimitsOverride === null || msint.colorScaleType === 'none'}
                             filter='[\-]*[0-9]*(?:\.[0-9]*)?' />
                         &nbsp;Max:&nbsp;
                         <MVText size='7'
                             value={String((msint.colorScaleLimits[1] ?? 1).toFixed(3))}
                             onChange={(v) => { msint.colorScaleLimitsOverride = [(msint.colorScaleLimitsOverride ?? msint.colorScaleLimits)[0], parseFloat(v)]; }}
                             disabled={msint.colorScaleLimitsOverride === null || msint.colorScaleType === 'none'}
                             filter='[\-]*[0-9]*(?:\.[0-9]*)?' />
                     </div>
                 </div>
             </MVAdvancedSection>
            {/* reset button */}
            <MVButton onClick={() => { msint.reset(); }}>Reset options</MVButton>
        </div>
        <div className={chainClasses('mv-warning-noms', has_ms? 'hidden': '')}>No MS data found</div>
    </MagresViewSidebar>);
}

export default MVSidebarMS;
export { MVReferenceTable };