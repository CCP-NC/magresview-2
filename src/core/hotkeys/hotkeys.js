/**
 * MagresView 2.0 — Keyboard Shortcuts Definitions
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW SHORTCUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. Add a group entry to HOTKEY_GROUPS below. If a suitable group already
 *     exists, add the shortcut to its `shortcuts` array.
 *
 *  2. Each shortcut needs:
 *
 *       id      : unique string used to wire the shortcut to an action in
 *                 useHotkeys.jsx
 *       key     : tinykeys key sequence (see https://github.com/jamiebuilds/tinykeys)
 *       display : human-readable version shown in the help dialog
 *       description: short explanation shown in the help dialog
 *
 *  3. Add a matching handler in useHotkeys.jsx ACTIONS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Shortcut groups, in the order they appear in the help dialog. */
export const HOTKEY_GROUPS = [
    {
        id:    'sidebar',
        label: 'Sidebar',
        color: 'var(--ms-color-1)',
        shortcuts: [
            { id: 'sidebar-load',   key: 'l', display: 'L', description: 'Open load files sidebar' },
            { id: 'sidebar-select', key: 's', display: 'S', description: 'Open select sidebar' },
            { id: 'sidebar-ms',     key: 'm', display: 'M', description: 'Open MS sidebar' },
            { id: 'sidebar-efg',    key: 'f', display: 'F', description: 'Open EFG sidebar' },
            { id: 'sidebar-dip',    key: 'd', display: 'D', description: 'Open Dipolar sidebar' },
            { id: 'sidebar-jcoup',  key: 'j', display: 'J', description: 'Open J-Coupling sidebar' },
            { id: 'sidebar-euler',  key: 'e', display: 'E', description: 'Open Euler sidebar' },
            { id: 'sidebar-plots',  key: 'p', display: 'P', description: 'Open Plots sidebar' },
            { id: 'sidebar-files',  key: 'o', display: 'O', description: 'Open Files sidebar' },
            { id: 'sidebar-hide',   key: 'Escape', display: 'Esc', description: 'Close sidebar' },
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
        id:    'structures',
        label: 'Structures',
        color: 'var(--jc-color-1)',
        shortcuts: [
            { id: 'model-prev', key: '[', display: '[', description: 'Previous structure' },
            { id: 'model-next', key: ']', display: ']', description: 'Next structure' },
        ],
    },
    {
        id:    'interface',
        label: 'Interface',
        color: 'var(--efg-color-1)',
        shortcuts: [
            { id: 'toggle-theme',    key: 't',       display: 'T',        description: 'Toggle dark / light theme' },
            { id: 'show-ref-table', key: 'r',       display: 'R',        description: 'Set chemical shift references' },
            { id: 'show-iso-modal',    key: 'i',       display: 'I',  description: 'Open isotope setter' },
            { id: 'save-session',   key: '$mod+s',  display: 'Ctrl+S',   description: 'Save session' },
            // tinykeys matches on event.key. Shift+/ produces event.key='?' so bind as 'Shift+'.
            { id: 'show-help',      key: 'Shift+?', display: '?',        description: 'Show / hide this help' },
        ],
    },
];

/** Flat array of every shortcut definition — useful for iteration. */
export const ALL_SHORTCUTS = HOTKEY_GROUPS.flatMap(g => g.shortcuts);
