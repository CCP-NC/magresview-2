/**
 * MagresView 2.0 — Keyboard Shortcut Definitions
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW SHORTCUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. Add an entry in the appropriate group below (or create a new group).
 *     Each shortcut needs:
 *       id          — a unique camelCase string that links to an action handler
 *       key         — the tinykeys key string (see tinykeys docs for sequences)
 *       display     — human-readable key label shown in the help overlay
 *       description — one-line description shown in the help overlay
 *
 *  2. In useHotkeys.jsx, add a matching entry to the ACTIONS object:
 *       yourId: (interfaces) => { ... call interface methods here ... }
 *
 * Key string format (tinykeys):
 *   - Single characters: 'm', 'e', '1'
 *   - With modifier:     '$mod+k'  (Ctrl on Win/Linux, Cmd on macOS)
 *   - Special keys:      'Escape', 'ArrowLeft', 'ArrowRight'
 *   - Shift combos:      '?' is '$mod+/' on some layouts; prefer using
 *                        'Shift+/' or just '?' — tinykeys handles it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const HOTKEY_GROUPS = [
    {
        id:    'panels',
        label: 'Panels',
        color: 'var(--fwd-color-2)',
        shortcuts: [
            { id: 'sidebar-load',   key: '1', display: '1', description: 'Load file' },
            { id: 'sidebar-select', key: '2', display: '2', description: 'Select & display' },
            { id: 'sidebar-ms',     key: '3', display: '3', description: 'Magnetic shielding' },
            { id: 'sidebar-efg',    key: '4', display: '4', description: 'Electric field gradient' },
            { id: 'sidebar-dip',    key: '5', display: '5', description: 'Dipolar couplings' },
            { id: 'sidebar-jcoup',  key: '6', display: '6', description: 'J-couplings' },
            { id: 'sidebar-euler',  key: '7', display: '7', description: 'Euler angles' },
            { id: 'sidebar-plots',  key: '8', display: '8', description: 'Spectral plots' },
            { id: 'sidebar-files',  key: '9', display: '9', description: 'Report files' },
            { id: 'sidebar-hide',   key: '0', display: '0', description: 'Hide sidebar' },
        ],
    },
    {
        id:    'visualisation',
        label: 'Visualisation',
        color: 'var(--ms-color-1)',
        shortcuts: [
            { id: 'toggle-ms-ellipsoids',  key: 'm', display: 'M', description: 'Toggle MS ellipsoids' },
            { id: 'toggle-efg-ellipsoids', key: 'f', display: 'F', description: 'Toggle EFG ellipsoids' },
            { id: 'toggle-plots',          key: 'p', display: 'P', description: 'Toggle spectral plot' },
        ],
    },
    {
        id:    'modes',
        label: 'Interaction Modes',
        color: 'var(--dip-color-1)',
        shortcuts: [
            { id: 'mode-select',    key: 'q', display: 'Q', description: 'Switch to Select mode' },
            { id: 'mode-dipolar',  key: 'd', display: 'D', description: 'Switch to Dipolar mode' },
            { id: 'mode-jcoupling', key: 'j', display: 'J', description: 'Switch to J-Coupling mode' },
            { id: 'mode-euler',    key: 'e', display: 'E', description: 'Switch to Euler Angles mode' },
        ],
    },
    {
        id:    'interface',
        label: 'Interface',
        color: 'var(--efg-color-1)',
        shortcuts: [
            { id: 'toggle-theme',    key: 't',       display: 'T',  description: 'Toggle dark / light theme' },
            { id: 'show-ref-table',    key: 'r',       display: 'R',  description: 'Open chemical shift references' },
            { id: 'show-iso-modal',    key: 'i',       display: 'I',  description: 'Open isotope setter' },
            // tinykeys matches on event.key. Shift+/ produces event.key='?' so bind as 'Shift+?'.
            { id: 'show-help',      key: 'Shift+?', display: '?',  description: 'Show / hide this help' },
        ],
    },
];

/** Flat array of every shortcut definition — useful for iteration. */
export const ALL_SHORTCUTS = HOTKEY_GROUPS.flatMap(g => g.shortcuts);
