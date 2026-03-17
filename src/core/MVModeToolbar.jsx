/**
 * MVModeToolbar — persistent left-side vertical toolbar for switching
 * between exclusive interaction modes (select, dipolar, euler).
 */

import './MVModeToolbar.css';
import React from 'react';
import { FaMousePointer } from 'react-icons/fa';
import MVIcon from '../icons/MVIcon';
import { useAppInterface } from './store';

const modes = [
    {
        key: 'select',
        label: 'Select',
        title: 'Select atoms (Q)',
        icon: <FaMousePointer />,
        accentVar: '--fwd-color-2'
    },
    {
        key: 'dipolar',
        label: 'Dipolar',
        title: 'Dipolar Couplings (D)',
        icon: <MVIcon icon='dip' />,
        accentVar: '--dip-color-2'
    },
    {
        key: 'euler',
        label: 'Euler',
        title: 'Euler Angles (R)',
        icon: <MVIcon icon='euler' />,
        accentVar: '--mid-color-2'
    }
];

function MVModeToolbar() {
    const appint = useAppInterface();
    const currentMode = appint.interactionMode || 'select';

    return (
        <div className='mv-mode-toolbar'>
            {modes.map(m => {
                const isActive = currentMode === m.key;
                return (
                    <button
                        key={m.key}
                        className={`mv-mode-btn${isActive ? ' active' : ''}`}
                        style={isActive ? { color: `var(${m.accentVar})`, borderLeftColor: `var(${m.accentVar})` } : {}}
                        title={m.title}
                        aria-label={m.label}
                        aria-pressed={isActive}
                        onClick={() => appint.setInteractionMode(m.key)}
                    >
                        <span className='mv-mode-btn-icon'>{m.icon}</span>
                        <span className='mv-mode-btn-label'>{m.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default MVModeToolbar;
