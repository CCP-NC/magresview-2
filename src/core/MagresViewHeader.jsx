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

import './MagresViewHeader.css';
import logo from '../icons/logo.svg';
import { FaSun, FaMoon, FaKeyboard } from 'react-icons/fa';

import React from 'react';
import { useAppInterface } from './store';

function ThemeSwitcher() {

    const appint = useAppInterface();

    const other = {
        dark: 'light',
        light: 'dark'
    };

    return (<div id='mv-themeswitch' onClick={() => { appint.themeName = other[appint.themeName]; }}>
        <div id='mv-themeicons' className={appint.themeName}>
            <FaMoon id='mv-themedark'/>
            <FaSun id='mv-themelight'/>
        </div>
    </div>);
}

function MagresViewHeader({ onHelpOpen }) {

    const appint = useAppInterface();

    return (<header className='mv-header'>
        <div className='mv-header-left'>
            <img src={logo} alt='MagresView logo' id='mv-header-logo'></img>
            <h3 id='mv-header-title'>
                <span style={{color: 'var(--ms-color-2)'}}>M</span>agres<span style={{color: 'var(--efg-color-2)'}}>V</span>iew 2.0
            </h3>
            {appint.currentModelName &&
                <span className='mv-header-model-name' title={appint.currentModelName}>
                    {appint.currentModelName}
                </span>
            }
        </div>
        <div className='mv-header-right'>
            <button
                    className={`mv-header-adv-btn${appint.advancedMode ? ' active' : ''}`}
                    onClick={() => { appint.advancedMode = !appint.advancedMode; }}
                    title={appint.advancedMode ? 'Advanced mode on — click to disable' : 'Enable advanced mode — reveals additional options in each sidebar panel'}
                    aria-pressed={appint.advancedMode}
                >
                    Advanced mode
                </button>
            <span className='mv-hor-sep-3'></span>
            <button
                    className='mv-header-help-btn'
                    onClick={onHelpOpen}
                    title='Keyboard shortcuts (?)'
                    aria-label='Show keyboard shortcuts'
                >
                    <FaKeyboard />
                </button>
            <span className='mv-hor-sep-3'></span>
            <ThemeSwitcher />
        </div>
    </header>);
}

export default MagresViewHeader;
