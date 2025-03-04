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

import './MVSidebarEFG.css';

import MagresViewSidebar from './MagresViewSidebar';
import { useEFGInterface } from '../store';
import { chainClasses } from '../../utils';

import React from 'react';

import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import MVButton from '../../controls/MVButton';
import MVRadioButton, { MVRadioGroup } from '../../controls/MVRadioButton';
import MVCScaleBar from '../../controls/MVCScaleBar';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';

function MVSidebarEFG(props) {

    const efgint = useEFGInterface();

    console.log('[MVSidebarEFG rendered]');

    var has_efg = false;
    if (props.show) {
        has_efg = efgint.hasData;
    }

    return (<MagresViewSidebar show={props.show} title='Electric Field Gradient'>
        <div className={chainClasses('mv-sidebar-block', has_efg? '' : 'hidden')}>
             <MVCheckBox onCheck={(v) => { efgint.hasEllipsoids = v; }} checked={ efgint.hasEllipsoids } color={'var(--efg-color-2)'}>Ellipsoids</MVCheckBox>
             <MVRange min={0.1} max={10.0} step={0.05} value={efgint.ellipsoidScale} color={'var(--efg-color-2)'}
                      onChange={(s) => { efgint.ellipsoidScale = s; }} disabled={!efgint.hasEllipsoids}>Ellipsoid scale</MVRange>
             <MVButton onClick={() => { efgint.ellipsoidScale = 0; }} disabled={!efgint.hasEllipsoids}>Auto scale</MVButton>
             <MVRadioGroup label='Show labels' onSelect={(v) => { efgint.labelsMode = v; }} selected={efgint.labelsMode} name='efg_label_radio' color={'var(--efg-color-2)'}>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='Q'>Quadrupole Coupling</MVRadioButton>
                <MVRadioButton value='e_z'>Vzz (au)</MVRadioButton>
                <MVRadioButton value='aniso'>Anisotropy (au)</MVRadioButton>
                <MVRadioButton value='redaniso'>Reduced Anisotropy (au)</MVRadioButton>
                <MVRadioButton value='asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
             <MVRange min={0} max={6} step={1} value={efgint.precision} onChange={(p) => { efgint.precision = p; }} disabled={efgint.labelsMode === 'none'}>Label Precision</MVRange>
             <MVRadioGroup label='Use color scale' onSelect={(v) => { efgint.colorScaleType = v; }} selected={ efgint.colorScaleType } disabled={!efgint.colorScaleAvailable}
                           name='efg_cscale_radio' color={'var(--efg-color-2)'}>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='efg_Q'>|Quadrupole Coupling|</MVRadioButton>
                <MVRadioButton value='efg_e_z'>Vzz</MVRadioButton>
                <MVRadioButton value='efg_aniso'>Anisotropy</MVRadioButton>
                <MVRadioButton value='efg_redaniso'>Reduced Anisotropy</MVRadioButton>
                <MVRadioButton value='efg_asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
        {/* hide scalebar if msintcolorScaleType is 'none' */}
        <MVCScaleBar label={efgint.colorScaleType} 
                    hidden={efgint.colorScaleType === 'none'} 
                    lims={efgint.colorScaleLimits}
                    units={efgint.colorScaleUnits}
                    cmap={efgint.colorScaleCmap}/>
        Color map
        <MVCustomSelect onSelect={(v) => { efgint.colorScaleCmap = v; }} selected={efgint.colorScaleCmap} name='cmap_dropdown'>
                <MVCustomSelectOption value='viridis'>Viridis</MVCustomSelectOption>
                <MVCustomSelectOption value='portland'>Portland</MVCustomSelectOption>
                <MVCustomSelectOption value='RdBu'>Red-Blue</MVCustomSelectOption>
                <MVCustomSelectOption value='inferno'>Inferno</MVCustomSelectOption>
                <MVCustomSelectOption value='jet'>Jet</MVCustomSelectOption>
        </MVCustomSelect>
        {/* reset button */}
        <MVButton onClick={() => { efgint.reset(); }}>Reset options</MVButton>
        </div>
        <div className={chainClasses('mv-warning-noms', has_efg? 'hidden' : '')}>No EFG data found</div>
    </MagresViewSidebar>);
}

export default MVSidebarEFG;