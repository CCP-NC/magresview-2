/**
 * MVModeToolbar — persistent left-side vertical toolbar for switching
 * between right-hand sidebars.
 */

import './MVModeToolbar.css';
import React from 'react';
import { FaRegFolderOpen, FaMousePointer, FaFile, FaBan } from 'react-icons/fa';
import { GiHistogram } from 'react-icons/gi';
import MVIcon from '../icons/MVIcon';
import { useAppInterface } from './store';

const sidebars = [
    {
        key: 'load',
        label: 'Load',
        title: 'Load file (1)',
        icon: <FaRegFolderOpen />,
        accentVar: '--fwd-color-2'
    },
    {
        key: 'select',
        label: 'Select',
        title: 'Select and display (2)',
        icon: <FaMousePointer />,
        accentVar: '--fwd-color-2'
    },
    {
        key: 'ms',
        label: 'MS',
        title: 'Magnetic Shielding (3)',
        icon: <MVIcon icon='ms' />,
        accentVar: '--ms-color-2'
    },
    {
        key: 'efg',
        label: 'EFG',
        title: 'Electric Field Gradient (4)',
        icon: <MVIcon icon='efg' />,
        accentVar: '--efg-color-2'
    },
    {
        key: 'dip',
        label: 'Dipolar',
        title: 'Dipolar Couplings (5)',
        icon: <MVIcon icon='dip' />,
        accentVar: '--dip-color-2'
    },
    {
        key: 'jcoup',
        label: 'J-Coup',
        title: 'J Couplings (6)',
        icon: <MVIcon icon='jcoup' />,
        accentVar: '--jcoup-color-2'
    },
    {
        key: 'euler',
        label: 'Euler',
        title: 'Euler Angles (7)',
        icon: <MVIcon icon='euler' />,
        accentVar: '--mid-color-2'
    },
    {
        key: 'plots',
        label: 'Plots',
        title: 'Spectral plots (8)',
        icon: <GiHistogram />,
        accentVar: '--ms-color-2'
    },
    {
        key: 'files',
        label: 'Files',
        title: 'Report files (9)',
        icon: <FaFile />,
        accentVar: '--fwd-color-2'
    },
    {
        key: 'none',
        label: 'Hide',
        title: 'Hide sidebar (0)',
        icon: <FaBan />,
        accentVar: '--mid-color-1'
    }
];

function MVModeToolbar() {
    const appint = useAppInterface();
    const currentSidebar = appint.sidebar || 'none';

    return (
        <div className='mv-mode-toolbar'>
            {sidebars.map(s => {
                const isActive = currentSidebar === s.key;
                return (
                    <button
                        key={s.key}
                        className={`mv-mode-btn${isActive ? ' active' : ''}`}
                        style={isActive ? { color: `var(${s.accentVar})`, borderLeftColor: `var(${s.accentVar})` } : {}}
                        title={s.title}
                        aria-label={s.label}
                        aria-pressed={isActive}
                        onClick={() => { appint.sidebar = s.key; }}
                    >
                        <span className='mv-mode-btn-icon'>{s.icon}</span>
                        <span className='mv-mode-btn-label'>{s.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default MVModeToolbar;

