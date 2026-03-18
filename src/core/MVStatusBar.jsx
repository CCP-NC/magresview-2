/**
 * MVStatusBar — persistent bottom status bar showing current interaction mode,
 * interaction hint, and selection count.
 */

import './MVStatusBar.css';
import React from 'react';
import { FaMousePointer } from 'react-icons/fa';
import MVIcon from '../icons/MVIcon';
import { useAppInterface, useSelInterface } from './store';
import useDipInterface from './store/interfaces/DipInterface';
import useEulerInterface from './store/interfaces/EulerInterface';

const modeConfig = {
    select: {
        label: 'Select',
        icon: <FaMousePointer />,
        hint: 'Click to select · Shift+click to add/remove · Right-click for menu',
        color: 'var(--fwd-color-2)'
    },
    dipolar: {
        label: 'Dipolar',
        icon: <MVIcon icon='dip' color='var(--dip-color-2)' />,
        hint: 'Click atom to show couplings',
        color: 'var(--dip-color-2)'
    },
    jcoupling: {
        label: 'J-Coupling',
        icon: <MVIcon icon='jcoup' color='var(--jcoup-color-2)' />,
        hint: 'Click atom to set central atom',
        color: 'var(--jcoup-color-2)'
    },
    euler: {
        label: 'Euler Angles',
        icon: <MVIcon icon='euler' color='var(--mid-color-2)' />,
        hint: 'Pick Atom A/B, then click in viewer',
        color: 'var(--mid-color-2)'
    }
};

function MVStatusBar() {
    const appint = useAppInterface();
    const selint = useSelInterface();
    const dipint = useDipInterface();
    const eulint = useEulerInterface();

    const mode = appint.interactionMode || 'select';
    const config = modeConfig[mode] || modeConfig.select;
    const count = selint.selectionCount;

    // Mode-specific context string
    let context = null;
    if (mode === 'dipolar') {
        const ca = dipint.centralAtom;
        context = ca ? `Central: ${ca.crystLabel}` : 'No atom selected';
    } else if (mode === 'euler') {
        const la = eulint.atomLabelA;
        const lb = eulint.atomLabelB;
        context = `A: ${la}  ·  B: ${lb}`;
    }

    return (
        <div className='mv-status-bar' style={{ '--mode-color': config.color }}>
            <div className='mv-status-mode' style={{ color: config.color }}>
                <span className='mv-status-mode-icon'>{config.icon}</span>
                <span className='mv-status-mode-label'>{config.label}</span>
            </div>
            <span className='mv-status-sep'>|</span>
            <span className='mv-status-hint'>{config.hint}</span>
            {context && <>
                <span className='mv-status-sep'>|</span>
                <span className='mv-status-context' style={{ color: config.color }}>{context}</span>
            </>}
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
