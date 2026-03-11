/**
 * MagresView 2.0 — Keyboard Shortcut Help Overlay
 *
 * Shown/hidden with the '?' hotkey (see useHotkeys.jsx).
 */

import './MVHotkeyHelp.css';
import React from 'react';
import { HOTKEY_GROUPS } from './hotkeys';

function MVHotkeyHelp({ open, onClose }) {
    if (!open) return null;

    return (
        <div className='mv-hotkey-backdrop' onMouseDown={onClose} role='dialog' aria-modal aria-label='Keyboard shortcuts'>
            <div className='mv-hotkey-panel' onMouseDown={e => e.stopPropagation()}>

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className='mv-hotkey-header'>
                    <span className='mv-hotkey-title'>
                        Keyboard&nbsp;<span className='mv-hotkey-title-accent'>Shortcuts</span>
                    </span>
                    <button className='mv-hotkey-close' onClick={onClose} aria-label='Close'>
                        &#x2715;
                    </button>
                </div>

                {/* ── Shortcut groups ─────────────────────────────────────── */}
                <div className='mv-hotkey-groups'>
                    {HOTKEY_GROUPS.map(group => (
                        <div className='mv-hotkey-group' key={group.id}>
                            <div
                                className='mv-hotkey-group-label'
                                style={{ color: group.color }}
                            >
                                {group.label}
                            </div>
                            <ul className='mv-hotkey-list'>
                                {group.shortcuts.map(shortcut => (
                                    <li className='mv-hotkey-row' key={shortcut.id}>
                                        <kbd className='mv-hotkey-key'>{shortcut.display}</kbd>
                                        <span className='mv-hotkey-desc'>{shortcut.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <div className='mv-hotkey-footer'>
                    Press <kbd className='mv-hotkey-key mv-hotkey-key--small'>?</kbd> to toggle &nbsp;·&nbsp;
                    <kbd className='mv-hotkey-key mv-hotkey-key--small'>Esc</kbd> to close
                </div>

            </div>
        </div>
    );
}

export default MVHotkeyHelp;
