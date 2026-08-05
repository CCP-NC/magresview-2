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

import './MVSidebarHF.css';

import MagresViewSidebar, { MVAdvancedSection } from './MagresViewSidebar';
import { useHFInterface } from '../store';
import { chainClasses } from '../../utils';

import React, { useState } from 'react';

import MVCheckBox from '../../controls/MVCheckBox';
import MVRange from '../../controls/MVRange';
import MVButton from '../../controls/MVButton';
import MVRadioButton, { MVRadioGroup } from '../../controls/MVRadioButton';
import MVCScaleBar from '../../controls/MVCScaleBar';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVText from '../../controls/MVText';
import MVTensorTable from '../../controls/MVTensorTable';

// Render the per-species gyromagnetic ratios parsed from the file (or nothing
// if the file did not contain them).
function GammaRatioTable({ ratios }) {
    if (!ratios || Object.keys(ratios).length === 0) {
        return null;
    }

    return (
        <div className='mv-hf-gamma-block'>
            <div className='mv-hf-gamma-title'>Gyromagnetic ratios (from file)</div>
            <table>
                <tbody>
                    {Object.entries(ratios).map(([species, info]) => (
                        <tr key={species}>
                            <td>{species}</td>
                            <td>{info.gamma.toExponential(4)} rad&nbsp;T⁻¹&nbsp;s⁻¹</td>
                            <td>{info.isotope !== null && info.isotope !== undefined ? `isotope ${info.isotope}` : 'user defined'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MVSidebarHF(props) {

    const hfint = useHFInterface();

    const [tableOpen, setTableOpen] = useState(false);

    var has_hf = false;
    let gammaRatios = null;
    if (props.show) {
        has_hf = hfint.hasData;
        gammaRatios = hfint.gyromagneticRatios;
    }

    return (<MagresViewSidebar show={props.show} title='Hyperfine Tensor'>
        <div className={chainClasses('mv-sidebar-block', has_hf? '' : 'hidden')}>
             <MVCheckBox onCheck={(v) => { hfint.hasEllipsoids = v; }} checked={ hfint.hasEllipsoids } color={'var(--hf-color-2)'}>Ellipsoids</MVCheckBox>
             <MVRange min={0.1} max={10.0} step={0.05} value={hfint.ellipsoidScale} color={'var(--hf-color-2)'}
                      onChange={(s) => { hfint.ellipsoidScale = s; }} disabled={!hfint.hasEllipsoids}>Ellipsoid scale</MVRange>
             <MVButton onClick={() => { hfint.ellipsoidScale = 0; }} disabled={!hfint.hasEllipsoids}>Auto scale</MVButton>
             <MVRadioGroup label='Show labels' onSelect={(v) => { hfint.labelsMode = v; }} selected={hfint.labelsMode} name='hf_label_radio' color={'var(--hf-color-2)'}>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='iso'>A_iso (MHz)</MVRadioButton>
                <MVRadioButton value='aniso'>A_aniso (MHz)</MVRadioButton>
                <MVRadioButton value='asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
             <MVButton onClick={() => { setTableOpen(true); }}>Tensor details table</MVButton>
             <MVTensorTable
                 display={tableOpen}
                 onClose={() => { setTableOpen(false); }}
                 app={hfint.app}
                 tensorType='hf'
                 units='MHz'
                 precision={hfint.precision}
                 title='Hyperfine tensor details (selected sites)' />
             <GammaRatioTable ratios={gammaRatios} />
             <div className='mv-hf-note'>
                Hyperfine values are shown in MHz, computed using the gyromagnetic ratios listed above
                (as parsed from the file). If those ratios differ from your intended isotope, the values
                may need rescaling.
             </div>
             <MVRadioGroup label='Use color scale' onSelect={(v) => { hfint.colorScaleType = v; }} selected={ hfint.colorScaleType } disabled={!hfint.colorScaleAvailable}
                           name='hf_cscale_radio' color={'var(--hf-color-2)'}>
                <MVRadioButton value='none'>None</MVRadioButton>
                <MVRadioButton value='hf_iso'>A_iso</MVRadioButton>
                <MVRadioButton value='hf_aniso'>A_aniso</MVRadioButton>
                <MVRadioButton value='hf_asymm'>Asymmetry</MVRadioButton>
             </MVRadioGroup>
        <MVCScaleBar label={hfint.colorScaleType}
                    hidden={hfint.colorScaleType === 'none'}
                    lims={hfint.colorScaleLimits}
                    units={hfint.colorScaleUnits}
                    cmap={hfint.colorScaleCmap}/>
        <MVAdvancedSection>
            <MVRange min={0} max={6} step={1} value={hfint.precision} onChange={(p) => { hfint.precision = p; }} disabled={hfint.labelsMode === 'none'}>Label Precision</MVRange>
            <span className='sep-1' />
            Color map
            <MVCustomSelect onSelect={(v) => { hfint.colorScaleCmap = v; }} selected={hfint.colorScaleCmap} name='cmap_dropdown'>
                    <MVCustomSelectOption value='viridis'>Viridis</MVCustomSelectOption>
                    <MVCustomSelectOption value='portland'>Portland</MVCustomSelectOption>
                    <MVCustomSelectOption value='RdBu'>Red-Blue</MVCustomSelectOption>
                    <MVCustomSelectOption value='inferno'>Inferno</MVCustomSelectOption>
                    <MVCustomSelectOption value='jet'>Jet</MVCustomSelectOption>
            </MVCustomSelect>
            <span className='sep-1' />
            <div className='mv-adv-lims'>
                <MVCheckBox
                    checked={hfint.colorScaleLimitsOverride === null}
                    onCheck={(v) => { hfint.colorScaleLimitsOverride = v ? null : hfint.colorScaleLimits; }}
                    disabled={hfint.colorScaleType === 'none'}>
                    Auto scale limits
                </MVCheckBox>
                <div className='mv-adv-lims-row'>
                    Min:&nbsp;
                    <MVText size='7'
                        value={String((hfint.colorScaleLimits[0] ?? 0).toFixed(3))}
                        onChange={(v) => { hfint.colorScaleLimitsOverride = [parseFloat(v), (hfint.colorScaleLimitsOverride ?? hfint.colorScaleLimits)[1]]; }}
                        disabled={hfint.colorScaleLimitsOverride === null || hfint.colorScaleType === 'none'}
                        filter='[\-]*[0-9]*(?:\.[0-9]*)?' />
                    &nbsp;Max:&nbsp;
                    <MVText size='7'
                        value={String((hfint.colorScaleLimits[1] ?? 1).toFixed(3))}
                        onChange={(v) => { hfint.colorScaleLimitsOverride = [(hfint.colorScaleLimitsOverride ?? hfint.colorScaleLimits)[0], parseFloat(v)]; }}
                        disabled={hfint.colorScaleLimitsOverride === null || hfint.colorScaleType === 'none'}
                        filter='[\-]*[0-9]*(?:\.[0-9]*)?' />
                </div>
            </div>
        </MVAdvancedSection>
        {/* reset button */}
        <MVButton onClick={() => { hfint.reset(); }}>Reset options</MVButton>
        </div>
        <div className={chainClasses('mv-warning-noms', has_hf? 'hidden' : '')}>No HF data found</div>
    </MagresViewSidebar>);
}

export default MVSidebarHF;
