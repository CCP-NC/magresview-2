/**
 * MVModeOverlay — top-left canvas overlay showing the current interaction mode
 * and a short hint. Only rendered when a model is loaded.
 */

import './MVModeOverlay.css';
import React from 'react';
import { FaMousePointer } from 'react-icons/fa';
import MVIcon from '../icons/MVIcon';
import { useAppInterface } from './store';

const modeConfig = {
    select: {
        label: 'Select Mode',
        icon: <FaMousePointer />,
        hint: 'Click atoms to select',
        color: 'var(--fwd-color-2)'
    },
    dipolar: {
        label: 'Dipolar Mode',
        icon: <MVIcon icon='dip' color='var(--dip-color-2)' />,
        hint: 'Click atom to show couplings',
        color: 'var(--dip-color-2)'
    },
    euler: {
        label: 'Euler Mode',
        icon: <MVIcon icon='euler' color='var(--mid-color-2)' />,
        hint: 'Pick atoms A and B in sidebar',
        color: 'var(--mid-color-2)'
    }
};

function MVModeOverlay() {
    const appint = useAppInterface();

    // Only show when a model is loaded
    if (!appint.currentModel) {
        return null;
    }

    const mode = appint.interactionMode || 'select';
    const config = modeConfig[mode] || modeConfig.select;

    return (
        <div className='mv-mode-overlay'>
            <div className='mv-mode-overlay-row' style={{ color: config.color }}>
                <span className='mv-mode-overlay-icon'>{config.icon}</span>
                <span className='mv-mode-overlay-label'>{config.label}</span>
            </div>
            <div className='mv-mode-overlay-hint'>{config.hint}</div>
        </div>
    );
}

export default MVModeOverlay;
