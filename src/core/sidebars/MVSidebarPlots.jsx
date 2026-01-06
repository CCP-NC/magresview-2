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

import './MVSidebarPlots.css';

import MagresViewSidebar from './MagresViewSidebar';

// import MVFile from '../../controls/MVFile';
import MVButton from '../../controls/MVButton';
import MVCheckBox from '../../controls/MVCheckBox';
import MVText from '../../controls/MVText';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVRange from '../../controls/MVRange';
import MVSwitch from '../../controls/MVSwitch';
import MVTooltip from '../../controls/MVTooltip';
import { tooltip_lorentzian_broadening, tooltip_plots_shifts, tooltip_plots_elements } from './tooltip_messages';
import React, { useEffect, useRef} from 'react';



import { usePlotsInterface } from '../store';
import { chainClasses } from '../../utils';


const otherOnOff = {
    none: 'line1d',
    line1d: 'none'
};

function MVSidebarPlots(props) {

    const pltint = usePlotsInterface();
    // const formats = '.png,.jpg,.jpeg';

    function setMinX(v) {
        pltint.setRange(v);
    }

    function setMaxX(v) {
        pltint.setRange(null, v);
    }

    let has_ms = false;
    if (props.show) {
        has_ms = pltint.hasData;
    }

    const pltRef = useRef();
    pltRef.current = pltint;

    useEffect(() => {
        if (!props.show) return;

        let pltint = pltRef.current;
        if (pltint.hasData) {
            pltint.mode = 'line1d';
        }
    }, [props.show, pltint.app]); // The dependency on app guarantees this is executed AFTER the app itself is loaded

    // get options for the dropdown menu with elements
    const elements = has_ms? pltint.elements : [];
    const options = elements.map((el, i) => {
        return (<MVCustomSelectOption key={i} value={el}>{el}</MVCustomSelectOption>);
    });

    return (<MagresViewSidebar show={props.show} title="Spectral plots">
        <div className={chainClasses('mv-sidebar-block', has_ms? '' : 'hidden')}>
            <div className='mv-plots-agrid-switch'>
                <span>Off</span>
                <MVSwitch on={ pltint.mode === 'line1d' } onClick={() => { pltint.mode = otherOnOff[pltint.mode]; }} 
                            colorFalse='var(--bkg-color-1)' colorTrue='var(--ms-color-2)'/>
                <span>On</span>
            </div>
            <span className='sep-1' />
            <div className='mv-sidebar-tooltip-grid'>
                Element <MVTooltip tooltipText={tooltip_plots_elements} />
                <MVCustomSelect onSelect={(v) => { pltint.element = v; }} selected={pltint.element} name='element_dropdown'>
                    {options}
                </MVCustomSelect>
            </div>
            <span className='sep-1' />
            <div className='mv-plots-agrid-switch'>
                <span>Shielding</span>
                <MVSwitch on={ pltint.useRefTable} onClick={() => { pltint.useRefTable = !pltint.useRefTable; }} 
                            colorFalse='var(--bkg-color-1)' colorTrue='var(--ms-color-2)'/>
                <span>Shift (use references)</span>
                <MVTooltip tooltipText={tooltip_plots_shifts} />
            </div>
            <span className='sep-1' />
            {/* <div className='mv-sidebar-block'>
                Background spectrum image
                <MVFile filetypes={formats} onSelect={(f) => { pltint.loadBkgImage(f); }} notext={false} multiple={false}/>
                <MVButton onClick={() => { pltint.clearBkgImage(); }}>Clear image</MVButton>
            </div> */}
            <div className='mv-sidebar-grid'>
                <MVCheckBox checked={pltint.showAxes} onCheck={(v) => { pltint.showAxes = v; }}>Show axes</MVCheckBox>
                <MVCheckBox checked={pltint.showGrid} onCheck={(v) => { pltint.showGrid = v; }}>Show grid</MVCheckBox>
                <MVCheckBox checked={pltint.showLabels} onCheck={(v) => { pltint.showLabels = v; }}>Show labels</MVCheckBox>
            </div>
            <span className='sep-1' />
            <div className='mv-sidebar-row' style={{alignItems: 'center'}}>
            X range: &nbsp;
                <MVText size='5' value={pltint.rangeX[0]} onChange={setMinX} filter='[\-]*[0-9]*(?:\.[0-9]*)?' /> &nbsp; to &nbsp; 
                <MVText size='5' value={pltint.rangeX[1]} onChange={setMaxX} filter='[\-]*[0-9]*(?:\.[0-9]*)?' />
                <MVCheckBox checked={pltint.autoScaleX} onCheck={(v) => { pltint.autoScaleX = v; }}>Auto</MVCheckBox>
            </div>
            <span className='sep-1' />
            <div className='mv-sidebar-row' style={{alignItems: 'center'}}>
                Peak width: &nbsp;
                <MVRange min={0} max={5} step={0.1} value={pltint.peakW} onChange={(v) => { pltint.peakW = v; }} />
                &nbsp; ppm 
                <MVTooltip tooltipText={tooltip_lorentzian_broadening} />
            </div>
            <span className='sep-1' />
            <div className='mv-sidebar-row' style={{alignItems: 'center'}}>
            X steps: &nbsp;
                <MVText size='3' value={pltint.xSteps} onChange={(v) => { pltint.xSteps = v; }} filter='[\-]*[0-9]*(?:\.[0-9]*)?' />
            </div>
            <span className='sep-1' />
            <div className='mv-sidebar-grid'>
                {/* download svg */}
                {/* disable if pltint.mode is none */}
                <MVButton onClick={() => { pltint.downloadSVG(); }} disabled={pltint.mode === 'none'}>Download SVG</MVButton>
                {/* download data */}
                {/* disable if pltint.mode is none */}
                <MVButton onClick={() => { pltint.downloadData(); }} disabled={pltint.mode === 'none'}>Download data (.csv)</MVButton>
            </div>
        </div>
        <div className={chainClasses('mv-warning-noms', has_ms? 'hidden': '')}>No MS data found</div>
    </MagresViewSidebar>);
}

export default MVSidebarPlots;
