import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    SESSION_VERSION,
    buildSessionDocument,
    parseSessionDocument,
    autosaveSession,
    downloadSession,
} from './session';

vi.mock('../../utils', () => ({
    saveContents: vi.fn(),
}));

import { saveContents } from '../../utils';

function makeViewer(overrides = {}) {
    return {
        modelList: ['model_a', 'model_b'],
        modelName: 'model_a',
        getModelSource: vi.fn((name) => ({ text: `${name}-text`, extension: 'magres' })),
        getModelParameters: vi.fn((name) => ({ supercell: [3, 3, 3], name })),
        getCameraState: vi.fn(() => ({ position: [1, 2, 3], target: [0, 0, 0], zoom: 1 })),
        ...overrides,
    };
}

function makeState(overrides = {}) {
    return {
        app_viewer: makeViewer(),
        app_theme_name: 'dark',
        app_sidebar: 'ms',
        app_advanced_mode: true,
        app_autosave_enabled: true,
        app_autosave_warning: false,
        ms_has_ellipsoids: true,
        sel_selected_view: {
            toLabels: vi.fn(() => ['H1', 'C2']),
        },
        dip_central_atom: { crystLabel: 'H1' },
        jc_central_atom: { crystLabel: 'C2' },
        // Non-serializable keys should be excluded
        app_viewer_ref: { not: 'serializable' },
        ...overrides,
    };
}

describe('buildSessionDocument', () => {
    it('includes the correct version and active model', () => {
        const state = makeState();
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.version).toBe(SESSION_VERSION);
        expect(doc.activeModel).toBe('model_a');
    });

    it('collects model sources and parameters from the viewer', () => {
        const state = makeState();
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.models).toEqual({
            model_a: { source: { text: 'model_a-text', extension: 'magres' }, params: { supercell: [3, 3, 3], name: 'model_a' } },
            model_b: { source: { text: 'model_b-text', extension: 'magres' }, params: { supercell: [3, 3, 3], name: 'model_b' } },
        });
    });

    it('serializes settings but excludes non-serializable keys', () => {
        const state = makeState();
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.settings.app_theme_name).toBe('dark');
        expect(doc.settings.ms_has_ellipsoids).toBe(true);
        expect(doc.settings.app_viewer).toBeUndefined();
        expect(doc.settings.sel_selected_view).toBeUndefined();
        expect(doc.settings.dip_central_atom).toBeUndefined();
    });

    it('stores atom references as crystLabel strings', () => {
        const state = makeState();
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.atomRefs).toEqual({
            dip_central_atom: 'H1',
            jc_central_atom: 'C2',
        });
    });

    it('stores the selection as crystLabel strings', () => {
        const state = makeState();
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.selections.sel_selected).toEqual(['H1', 'C2']);
    });

    it('stores null selection when there is no selection', () => {
        const state = makeState({ sel_selected_view: null });
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.selections.sel_selected).toBeNull();
    });

    it('stores camera state from the viewer', () => {
        const state = makeState();
        const doc = buildSessionDocument(state, state.app_viewer);

        expect(doc.camera).toEqual({ position: [1, 2, 3], target: [0, 0, 0], zoom: 1 });
    });
});

describe('parseSessionDocument', () => {
    it('accepts a valid session document', () => {
        const doc = {
            version: SESSION_VERSION,
            activeModel: 'model_a',
            models: { model_a: { source: { text: 'x', extension: 'magres' }, params: {} } },
            settings: { app_theme_name: 'dark' },
            atomRefs: {},
            selections: {},
            camera: null,
        };

        expect(parseSessionDocument(JSON.stringify(doc))).toEqual(doc);
    });

    it('rejects invalid JSON', () => {
        expect(() => parseSessionDocument('not json')).toThrow(/valid JSON/);
    });

    it('rejects missing version', () => {
        const doc = { models: {}, settings: {} };
        expect(() => parseSessionDocument(JSON.stringify(doc))).toThrow(/version/);
    });

    it('rejects mismatched version', () => {
        const doc = { version: 999, models: {}, settings: {} };
        expect(() => parseSessionDocument(JSON.stringify(doc))).toThrow(/format v999/);
    });

    it('rejects missing models', () => {
        const doc = { version: SESSION_VERSION, settings: {} };
        expect(() => parseSessionDocument(JSON.stringify(doc))).toThrow(/models field/);
    });

    it('rejects missing settings', () => {
        const doc = { version: SESSION_VERSION, models: {} };
        expect(() => parseSessionDocument(JSON.stringify(doc))).toThrow(/settings field/);
    });
});

describe('autosaveSession', () => {
    let storeMock;

    beforeEach(() => {
        storeMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        };
        vi.stubGlobal('localStorage', storeMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function makeStore(state) {
        return {
            getState: () => state,
            dispatch: vi.fn(),
        };
    }

    it('saves to localStorage when enabled and models exist', () => {
        const state = makeState();
        const store = makeStore(state);

        autosaveSession(store);

        expect(storeMock.setItem).toHaveBeenCalledTimes(1);
        const [key, value] = storeMock.setItem.mock.calls[0];
        expect(key).toBe('magresview2_autosave');
        const doc = JSON.parse(value);
        expect(doc.version).toBe(SESSION_VERSION);
        expect(doc.activeModel).toBe('model_a');
    });

    it('skips when autosave is disabled', () => {
        const state = makeState({ app_autosave_enabled: false });
        const store = makeStore(state);

        autosaveSession(store);

        expect(storeMock.setItem).not.toHaveBeenCalled();
    });

    it('skips when no models are loaded', () => {
        const state = makeState();
        state.app_viewer.modelList = [];
        const store = makeStore(state);

        autosaveSession(store);

        expect(storeMock.setItem).not.toHaveBeenCalled();
    });

    it('sets warning flag on quota exceeded and stops retrying', () => {
        const state = makeState();
        const store = makeStore(state);
        storeMock.setItem.mockImplementationOnce(() => {
            const err = new DOMException('Quota exceeded', 'QuotaExceededError');
            throw err;
        });

        autosaveSession(store);
        expect(store.dispatch).toHaveBeenCalledWith({ type: 'set', key: 'app_autosave_warning', value: true });

        autosaveSession(store);
        expect(storeMock.setItem).toHaveBeenCalledTimes(1);
    });
});

describe('downloadSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('downloads a .mvsession file named after the active model', () => {
        const state = makeState();
        state.app_viewer.modelList = ['model_a'];
        const store = { getState: () => state };

        downloadSession(store);

        expect(saveContents).toHaveBeenCalledTimes(1);
        const [data, filename] = saveContents.mock.calls[0];
        expect(filename).toBe('model_a.mvsession');

        const doc = JSON.parse(data);
        expect(doc.version).toBe(SESSION_VERSION);
        expect(doc.activeModel).toBe('model_a');
    });

    it('sanitises special characters in the model name', () => {
        const state = makeState();
        state.app_viewer.modelName = 'a/b:c?d|e';
        state.app_viewer.modelList = ['a/b:c?d|e'];
        const store = { getState: () => state };

        downloadSession(store);

        const [, filename] = saveContents.mock.calls[0];
        expect(filename).toBe('a_b_c_d_e.mvsession');
    });

    it('uses a generic filename when multiple models are loaded', () => {
        const state = makeState();
        state.app_viewer.modelList = ['model_a', 'model_b'];
        const store = { getState: () => state };

        downloadSession(store);

        const [, filename] = saveContents.mock.calls[0];
        expect(filename).toBe('session.mvsession');
    });
});
