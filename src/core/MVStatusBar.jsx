/**
 * MVStatusBar — persistent bottom status bar showing current interaction mode,
 * interaction hint, and selection count.
 */

import './MVStatusBar.css';
import React from 'react';
import { FaMousePointer } from 'react-icons/fa';
import MVIcon from '../icons/MVIcon';
import { useAppInterface, useSelInterface } from './store';

const modeConfig = {
    select: {
        label: 'Select',
        icon: <FaMousePointer />,
        hint: 'Click to select · Shift+click to add or remove',
        color: 'var(--fwd-color-2)'
    },
    dipolar: {
        label: 'Dipolar',
        icon: <MVIcon icon='dip' color='var(--dip-color-2)' />,
        hint: 'Click atom to show dipolar couplings within radius',
        color: 'var(--dip-color-2)'
    },
    jcoupling: {
        label: 'J-Coupling',
        icon: <MVIcon icon='jcoup' color='var(--jcoup-color-2)' />,
        hint: 'Click atom to set it as the central atom for J-coupling',
        color: 'var(--jcoup-color-2)'
    },
    euler: {
        label: 'Euler Angles',
        icon: <MVIcon icon='euler' color='var(--bkg-color-3)' />,
        hint: 'Click “Select Atom A/B” button, then click an atom in the viewer',
        color: 'var(--mid-color-2)'
    }
};

function MVStatusBar() {
    const appint = useAppInterface();
    const selint = useSelInterface();

    const mode = appint.interactionMode || 'select';
    const config = modeConfig[mode] || modeConfig.select;
    const count = selint.selectionCount;

    return (
        <div className='mv-status-bar'>
            <div className='mv-status-mode' style={{ color: config.color }}>
                <span className='mv-status-mode-icon'>{config.icon}</span>
                <span className='mv-status-mode-label'>{config.label}</span>
            </div>
            <span className='mv-status-sep'>|</span>
            <span className='mv-status-hint'>{config.hint}</span>
            <span className='mv-status-sep'>|</span>
            <span className='mv-status-count'>
                {count > 0
                    ? `${count} atom${count === 1 ? '' : 's'} selected`
                    : 'No selection'}
            </span>
        </div>
    );
}

export default MVStatusBar;
