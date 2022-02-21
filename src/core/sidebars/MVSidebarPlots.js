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

import MVFile from '../../controls/MVFile';
import MVButton from '../../controls/MVButton';

import { usePlotsInterface } from '../store';

import { MVPlot1D } from '../plot';

function MVSidebarPlots(props) {

    const pltint = usePlotsInterface();
    const formats = '.png,.jpg,.jpeg';

    return (<MagresViewSidebar show={props.show} title="Spectral plots">
        
        <div className='mv-sidebar-block'>
            <MVButton onClick={() => { pltint.show = true; }}>Show 1D plot</MVButton>

            Background spectrum image
            <MVFile filetypes={formats} onSelect={(f) => { pltint.loadBkgImage(f); }} notext={false} multiple={false}/>
        </div>

        <MVPlot1D display={pltint.show} />
    </MagresViewSidebar>);
}

export default MVSidebarPlots;