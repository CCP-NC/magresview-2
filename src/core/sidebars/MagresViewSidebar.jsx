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

import './MagresViewSidebar.css';

import React, { useState } from 'react';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

import { chainClasses } from '../../utils';
import { useAppInterface } from '../store';

function MagresViewSidebar(props) {

    const appint = useAppInterface();

    return (<div className={chainClasses('mv-sidebar', props.show? 'open' : '')}>
        <div className='mv-sidebar-title'>
            {props.title? <h2>{props.title}</h2> : null}            
            <button className='mv-sidebar-close' onClick={() => { appint.sidebar = 'none'; }} title='Close panel'>
                <FaChevronRight />
            </button>
        </div>
        {props.children}
    </div>);
}

/**
 * Collapsible advanced-options disclosure block.
 * Forced open when the global advanced mode is active;
 * otherwise toggled locally by the user.
 */
function MVAdvancedSection({ children }) {
    const appint = useAppInterface();
    const [localOpen, setLocalOpen] = useState(false);
    const show = appint.advancedMode || localOpen;

    return (
        <div className='mv-advanced-section'>
            <button
                className={`mv-advanced-toggle${show ? ' open' : ''}`}
                onClick={() => { if (!appint.advancedMode) setLocalOpen(o => !o); }}
                aria-expanded={show}
                title={appint.advancedMode ? 'Advanced mode is on globally' : (show ? 'Collapse advanced options' : 'Expand advanced options')}
            >
                <span className='mv-advanced-chevron'>
                    {show ? <FaChevronDown /> : <FaChevronRight />}
                </span>
                Advanced
            </button>
            {show && (
                <div className='mv-advanced-content'>
                    {children}
                </div>
            )}
        </div>
    );
}

export default MagresViewSidebar;
export { MVAdvancedSection };