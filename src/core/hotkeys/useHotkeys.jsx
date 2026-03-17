/**
 * MagresView 2.0 — Keyboard Shortcuts Hook
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW ACTION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. Add a shortcut entry in hotkeys.js (see instructions there).
 *  2. Add a matching key inside the ACTIONS object below:
 *
 *       yourId: ({ appint, msint, efgint, dipint, jcint, setHelpOpen }) => {
 *           // call interface setters / methods here
 *       },
 *
 *  The ACTIONS object maps shortcut `id` strings to handler functions.
 *  Each handler receives a single `interfaces` object with every available
 *  interface instance plus `setHelpOpen` for the help overlay.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { tinykeys } from 'tinykeys';

import { ALL_SHORTCUTS } from './hotkeys';
import {
    useAppInterface,
    useMSInterface,
    useEFGInterface,
    usePlotsInterface,
} from '../store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wrap a hotkey handler so it does NOT fire when the user is typing inside
 * an <input>, <textarea>, or any contentEditable element.
 */
function ignoreInputs(fn) {
    return (e) => {
        const tag = e.target?.tagName?.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
        fn(e);
    };
}

// ─── Action Definitions ───────────────────────────────────────────────────────
//
// Each key is a shortcut `id` from hotkeys.js.
// Each value is (interfaces) => void.
//
// Add new entries here when you want to wire up a new shortcut.

const ACTIONS = {
    // ── Sidebar navigation ────────────────────────────────────────────────────
    'sidebar-load':   ({ appint }) => { appint.sidebar = 'load'; },
    'sidebar-select': ({ appint }) => { appint.sidebar = 'select'; },
    'sidebar-ms':     ({ appint }) => { appint.sidebar = 'ms'; },
    'sidebar-efg':    ({ appint }) => { appint.sidebar = 'efg'; },
    'sidebar-dip':    ({ appint }) => { appint.sidebar = 'dip'; },
    'sidebar-jcoup':  ({ appint }) => { appint.sidebar = 'jcoup'; },
    'sidebar-euler':  ({ appint }) => { appint.sidebar = 'euler'; },
    'sidebar-plots':  ({ appint }) => { appint.sidebar = 'plots'; },
    'sidebar-files':  ({ appint }) => { appint.sidebar = 'files'; },
    'sidebar-hide':   ({ appint }) => { appint.sidebar = 'none'; },

    // ── Visualisation toggles ─────────────────────────────────────────────────
    // Guard with hasData: the listener calls getSel(app) which needs a live model.
    // If no data, do nothing to avoid the toggle getting stuck in a broken state.
    'toggle-ms-ellipsoids':  ({ msint  }) => { if (msint.hasData)  msint.hasEllipsoids  = !msint.hasEllipsoids; },
    'toggle-efg-ellipsoids': ({ efgint }) => { if (efgint.hasData) efgint.hasEllipsoids = !efgint.hasEllipsoids; },
    'toggle-plots': ({ pltint }) => {
        if (!pltint.hasData) return;
        if (pltint.mode === 'none') {
            pltint.setDefaultElement();
            pltint.mode = 'line1d';
        } else {
            pltint.mode = 'none';
        }
    },

    // ── Interaction modes ─────────────────────────────────────────────────────
    // These switch the sidebar, which in turn determines the click mode.
    'mode-select':    ({ appint }) => { appint.sidebar = 'select'; },
    'mode-dipolar':   ({ appint }) => { appint.setInteractionMode('dipolar'); },
    'mode-jcoupling': ({ appint }) => { appint.setInteractionMode('jcoupling'); },
    'mode-euler':     ({ appint }) => { appint.setInteractionMode('euler'); },

    // ── Interface ─────────────────────────────────────────────────────────────
    'toggle-theme': ({ appint }) => {
        appint.themeName = appint.themeName === 'dark' ? 'light' : 'dark';
    },
    'show-help': ({ setHelpOpen }) => {
        setHelpOpen(prev => !prev);
    },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useHotkeys
 *
 * Binds all keyboard shortcuts defined in hotkeys.js to their action handlers.
 * Returns `{ helpOpen, setHelpOpen }` for driving the help overlay.
 *
 * Usage:
 *   const { helpOpen, setHelpOpen } = useHotkeys();
 */
export function useHotkeys() {
    const [helpOpen, setHelpOpen] = useState(false);

    const appint  = useAppInterface();
    const msint   = useMSInterface();
    const efgint  = useEFGInterface();
    const pltint  = usePlotsInterface();

    useEffect(() => {
        const interfaces = { appint, msint, efgint, pltint, setHelpOpen };

        // Build the tinykeys key-map from the flat shortcut list
        const keyMap = {};

        for (const { id, key } of ALL_SHORTCUTS) {
            const action = ACTIONS[id];
            if (!action) continue; // no handler registered — skip silently

            keyMap[key] = ignoreInputs((e) => {
                e.preventDefault();
                action(interfaces);
            });
        }

        // Also close help overlay on Escape
        keyMap['Escape'] = (e) => {
            if (helpOpen) {
                e.preventDefault();
                setHelpOpen(false);
            }
        };

        return tinykeys(window, keyMap);
        // Re-bind whenever any interface instance changes identity (state updates
        // produce new interface objects, so closures always capture fresh data).
    }, [appint, msint, efgint, pltint, helpOpen]);

    return { helpOpen, setHelpOpen };
}
