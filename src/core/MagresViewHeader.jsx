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
import { FaSun, FaMoon, FaMousePointer, FaKeyboard } from 'react-icons/fa';

import React from 'react';
import MVIcon from '../icons/MVIcon';
import { useAppInterface } from './store';

const interactionModes = [
    {
        key: 'select',
        label: 'Select',
        title: 'Select mode (Q)',
        icon: <FaMousePointer />,
        colorVar: '--fwd-color-2'
    },
    {
        key: 'dipolar',
        label: 'Dipolar',
        title: 'Dipolar coupling mode (D)',
        icon: <MVIcon icon='dip' />,
        colorVar: '--dip-color-2'
    },
    {
        key: 'jcoupling',
        label: 'J-Coup',
        title: 'J-coupling mode (J)',
        icon: <MVIcon icon='jcoup' />,
        colorVar: '--jcoup-color-2'
    },
    {
        key: 'euler',
        label: 'Euler',
        title: 'Euler angles mode (E)',
        icon: <MVIcon icon='euler' />,
        colorVar: '--mid-color-2'
    }
];

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
    const currentMode = appint.interactionMode || 'select';

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
            <div className='mv-header-mode-group' role='group' aria-label='Interaction mode'>
                {interactionModes.map(m => {
                    const isActive = currentMode === m.key;
                    return (
                        <button
                            key={m.key}
                            className={`mv-header-mode-btn${isActive ? ' active' : ''}`}
                            style={isActive ? { color: `var(${m.colorVar})`, borderBottomColor: `var(${m.colorVar})` } : {}}
                            title={m.title}
                            aria-label={m.label}
                            aria-pressed={isActive}
                            onClick={() => appint.setInteractionMode(m.key)}
                        >
                            <span className='mv-header-mode-icon'>{m.icon}</span>
                            <span className='mv-header-mode-label'>{m.label}</span>
                        </button>
                    );
                })}
            </div>
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
