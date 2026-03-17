/**
 * MagresView 2.0
 *
 * Session save/restore utilities.
 *
 * A session document is a plain JSON object that captures:
 *   - All serializable Redux state keys (settings, preferences, NMR vis toggles)
 *   - The raw text source + loading parameters of every loaded model
 *     (obtained from the viewer via getModelSource() / getModelParameters())
 *   - The name of the currently active model
 *   - Camera orientation (position, target, zoom) via getCameraState()
 *   - Atom selection state (sel_selected_view) as crystLabel strings via toLabels()
 *
 * The format is intentionally plain and forward-compatible: unknown keys are
 * silently ignored on restore, and a version field allows future migrations.
 */

import { saveContents } from '../../utils';

export const SESSION_VERSION = 2;

/**
 * File extension used when saving session files.
 */
export const SESSION_EXTENSION = 'mvsession';

/**
 * State keys that hold live objects, ModelView instances, computed data, or
 * transient dispatch state.  These are excluded from the serialized blob.
 *
 * Any key NOT in this set whose value is JSON-serializable will be included
 * automatically.  Adding new plain-value state to any interface requires no
 * changes here unless it is non-serializable (i.e. contains object references).
 */
export const NON_SERIALIZABLE_KEYS = new Set([
    // ── Live objects ──────────────────────────────────────────────────────────
    'app_viewer',           // CrystVis WebGL instance
    'app_click_handler',    // ClickHandler with DOM references

    // ── Redundant / reconstructed on restore ─────────────────────────────────
    // app_theme is derived from app_theme_name; both are in the store but only
    // the name is stored so that themes can be upgraded without breaking sessions.
    'app_theme',

    // ── Transient dispatch state ──────────────────────────────────────────────
    'app_model_queued',     // In-flight display request
    'listen_update',        // Queued listener events

    // ── ModelView instances (atom selections) ─────────────────────────────────
    // These reference atoms by in-memory index inside a loaded model, so they
    // cannot be JSON.stringified directly.
    //
    // sel_selected_view is serialised separately as an array of crystLabel
    // strings in doc.selections.sel_selected (via ModelView.toLabels()), and
    // reconstructed after load with model.viewFromLabels().
    //
    // The remaining views are all derived from other settings and are fully
    // rebuilt by the listener events fired at the end of restoreSession().
    'app_default_displayed',
    'sel_selected_view',
    'sel_displayed_view',
    'sel_ghosts_requests',
    'sel_sites_view',
    'cscale_view',
    'cscale_displ',
    'ms_view',
    'efg_view',
    'dip_view',
    'jc_view',

    // ── Computed/derived values (rebuilt by listeners after restore) ───────────
    'dip_link_names',
    // dip_central_atom and jc_central_atom are atom objects — they cannot be
    // JSON-serialized. They are saved separately as crystLabel strings in the
    // top-level `atomRefs` field of the session document and re-resolved into
    // live atom objects in AppInterface.restoreSession() after the model loads.
    'dip_central_atom',
    'jc_link_names',
    'jc_central_atom',
    'eul_atom_A',
    'eul_newatom_A',
    'eul_atom_B',
    'eul_newatom_B',
    'eul_results',
    'plots_data',

    // ── Background image (blob URLs don't survive serialisation) ─────────────
    // Future: encode as base64 data URL.
    'plots_bkg_img_url',
    'plots_bkg_img_w',
    'plots_bkg_img_h',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Serialisation helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all serializable settings from a Redux state snapshot.
 *
 * @param {Object} state  Full Redux state object
 * @returns {Object}  Plain-JS object safe for JSON.stringify
 */
export function serializeSettings(state) {
    const settings = {};
    for (const [key, value] of Object.entries(state)) {
        if (!NON_SERIALIZABLE_KEYS.has(key)) {
            settings[key] = value;
        }
    }
    return settings;
}

/**
 * Build the full session document from the current Redux state and the live
 * CrystVis viewer instance.
 *
 * Model sources and parameters are read directly from the viewer via
 * getModelSource() / getModelParameters() — no Redux state required beyond
 * the modelList.
 *
 * @param {Object} state   Full Redux state
 * @param {Object} viewer  CrystVis instance
 * @returns {Object}  Session document ready for JSON.stringify
 */
export function buildSessionDocument(state, viewer) {
    // Collect model source text + loading parameters from the viewer.
    // getModelSource(name) → { text, extension }
    // getModelParameters(name) → { supercell, molecularCrystal, … }
    const models = {};
    for (const name of (viewer?.modelList ?? [])) {
        models[name] = {
            source: viewer.getModelSource(name),
            params: viewer.getModelParameters(name),
        };
    }

    // Serialize the current atom selection as crystLabel strings so it
    // survives the model reload on restore.  An empty or null view is stored
    // as null (no selection to restore).
    const selLabels = state.sel_selected_view?.toLabels?.() ?? null;

    return {
        version: SESSION_VERSION,
        activeModel: viewer?.modelName ?? null,
        models,
        settings: serializeSettings(state),

        // Atom references: atom objects cannot be JSON-serialized, so we store
        // their crystLabel strings and re-resolve them after the model reloads.
        // eul_atom_A / eul_atom_B omitted here because EulerInterface resets
        // them when the sidebar is re-opened; they are interaction-driven.
        atomRefs: {
            dip_central_atom: state.dip_central_atom?.crystLabel ?? null,
            jc_central_atom:  state.jc_central_atom?.crystLabel  ?? null,
        },

        // Atom selection views serialised as crystLabel string arrays.
        // On restore, model.viewFromLabels() reconstructs the live ModelView.
        selections: {
            sel_selected: selLabels?.length > 0 ? selLabels : null,
        },

        // Camera orientation: position, target, and zoom captured from the
        // current OrbitControls state via getCameraState().
        camera: viewer?.getCameraState?.() ?? null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Deserialisation / validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse and validate a session JSON string, returning the session document.
 * Throws a descriptive Error if the format is invalid or too new.
 *
 * @param {string} json  Raw JSON text from a .mvsession file
 * @returns {Object}  Validated session document
 */
export function parseSessionDocument(json) {
    let doc;
    try {
        doc = JSON.parse(json);
    } catch (e) {
        throw new Error('Session file is not valid JSON: ' + e.message);
    }

    if (typeof doc !== 'object' || doc === null) {
        throw new Error('Session file has unexpected top-level type.');
    }

    if (!doc.version) {
        throw new Error('Session file is missing a version field.');
    }
    if (typeof doc.models !== 'object' || doc.models === null) {
        throw new Error('Session file is missing the models field.');
    }
    if (typeof doc.settings !== 'object' || doc.settings === null) {
        throw new Error('Session file is missing the settings field.');
    }

    if (doc.version > SESSION_VERSION) {
        throw new Error(
            `Session file was saved with a newer version of MagresView ` +
            `(format v${doc.version}, this application supports up to v${SESSION_VERSION}). ` +
            `Please upgrade MagresView.`
        );
    }

    return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Autosave (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const AUTOSAVE_KEY = 'magresview2_autosave';

// Module-level guard: once quota is exceeded we stop attempting subsequent
// autosaves for the lifetime of the page (re-trying would just fail again
// every dispatch burst and produce repeated error dispatches).
let _quotaExceeded = false;

/**
 * Serialize the current state and write it to localStorage.
 * A no-op when the viewer has no models loaded, when localStorage is
 * unavailable (private-browsing quota, iframe sandbox, etc.), or after a
 * QuotaExceededError has already been signalled this session.
 *
 * On QuotaExceededError the function dispatches app_autosave_warning=true so
 * the UI can prompt the user to save manually.
 *
 * @param {Object} store  The Redux store (magresStore)
 */
export function autosaveSession(store) {
    if (_quotaExceeded) return;
    try {
        const state = store.getState();
        const viewer = state.app_viewer;
        if (!viewer || !(viewer.modelList?.length > 0)) return;
        const doc = buildSessionDocument(state, viewer);
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            _quotaExceeded = true;
            store.dispatch({ type: 'set', key: 'app_autosave_warning', value: true });
        } else {
            console.warn('[MagresView] Autosave failed:', e);
        }
    }
}

/**
 * Load and validate the autosaved session document from localStorage.
 * Returns the parsed document, or null if nothing was saved or the stored
 * data is invalid / incompatible.
 *
 * @returns {Object|null}
 */
export function loadAutosavedSession() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        return parseSessionDocument(raw);
    } catch (e) {
        return null;
    }
}

/**
 * Remove the autosaved session from localStorage.
 */
export function clearAutosavedSession() {
    try {
        localStorage.removeItem(AUTOSAVE_KEY);
    } catch (e) {
        // Ignore — localStorage may be unavailable.
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level convenience
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize the current application state and trigger a browser download of
 * the resulting .mvsession file.
 *
 * Call this with the singleton magresStore from the UI layer:
 *
 *   import magresStore from '../store';
 *   import { downloadSession } from '../store/session';
 *   ...
 *   downloadSession(magresStore);
 *
 * @param {Object} store  The Redux store (magresStore)
 */
export function downloadSession(store) {
    const state = store.getState();
    const viewer = state.app_viewer;
    const doc = buildSessionDocument(state, viewer);
    // Use the active model name when only one model is loaded, otherwise fall
    // back to a generic name so the filename is not misleadingly specific.
    const modelList = viewer?.modelList ?? [];
    const stem = modelList.length === 1 ? (viewer?.modelName ?? 'session') : 'session';
    const filename = `${stem}.${SESSION_EXTENSION}`;
    saveContents(JSON.stringify(doc, null, 2), filename);
}
