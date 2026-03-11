/**
 * MagresView 2.0
 *
 * Session save/restore utilities.
 *
 * A session document is a plain JSON object that captures:
 *   - All serializable Redux state keys (settings, preferences, NMR vis toggles)
 *   - The raw text source + extension of every loaded model
 *   - The name of the currently active model
 *   - (Future) Camera / orientation state, once crystvis-js exposes it
 *
 * The format is intentionally plain and forward-compatible: unknown keys are
 * silently ignored on restore, and a version field allows future migrations.
 *
 * ----------------------------------------------------------------------------
 * CAMERA STATE PLACEHOLDER
 * Once crystvis-js exposes getCameraState() / setCameraState(), the session
 * save should add:
 *
 *   camera: state.app_viewer.getCameraState()  // { position, target, zoom }
 *
 * and the restore flow should call:
 *
 *   if (doc.camera && viewer.setCameraState) {
 *       viewer.setCameraState(doc.camera);
 *   }
 *
 * The `camera` field is already present in every saved document (set to null
 * for now) so that sessions saved today will be valid once the feature lands.
 * ----------------------------------------------------------------------------
 */

import { saveContents } from '../../utils';

export const SESSION_VERSION = 1;

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
    // Selections are not currently serialised because they reference atoms by
    // in-memory index inside a loaded model.
    //
    // Future: serialise as arrays of crystLabel strings so they survive reload.
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

    // ── Internal session key (not settings; stored at top-level of doc) ───────
    'app_model_sources',
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
 * Build the full session document from the current Redux state.
 *
 * The `camera` field is always written (null for now) so that once
 * crystvis-js exposes getCameraState() callers only need to pass the viewer:
 *
 *   buildSessionDocument(state, state.app_viewer)
 *
 * and this function can check `viewer?.getCameraState?.()`.
 *
 * @param {Object} state   Full Redux state (must contain app_model_sources)
 * @param {Object} viewer  CrystVis instance (optional; ready for camera capture)
 * @returns {Object}  Session document ready for JSON.stringify
 */
export function buildSessionDocument(state, viewer = null) {
    return {
        version: SESSION_VERSION,
        activeModel: viewer?.modelName ?? null,
        models: state.app_model_sources ?? {},
        settings: serializeSettings(state),

        // ── Future: camera/orientation state ──────────────────────────────────
        // Once crystvis-js exposes getCameraState(), replace null with:
        //   viewer?.getCameraState?.() ?? null
        camera: null,
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
