import { describe, it, expect, vi } from 'vitest';
import { AppInterface } from './AppInterface';

import fixtureNMR from '../../../utils/__fixtures__/quartz.nmr.magres?raw';
import fixtureEFG from '../../../utils/__fixtures__/quartz.efg.magres?raw';

describe('AppInterface merge methods', () => {
    // Mirrors storeReducer so `type: 'call'` actions actually run their reducer.
    function makeDispatch(state) {
        const dispatch = vi.fn((action) => {
            if (action.type === 'set') {
                state[action.key] = action.value;
            } else if (action.type === 'update') {
                Object.assign(state, action.data);
            } else if (action.type === 'call') {
                Object.assign(state, action.function(state, ...action.arguments));
            }
        });
        return dispatch;
    }

    function makeInterface(stateOverrides = {}, viewerOverrides = {}) {
        const mockViewer = {
            modelList: ['quartz.nmr', 'quartz.efg'],
            _models: {
                'quartz.nmr': {
                    _atoms_base: {
                        length: () => 9,
                        get_chemical_symbols: () => ['Si', 'Si', 'Si', 'O', 'O', 'O', 'O', 'O', 'O'],
                        get_positions: () => Array(9).fill([0, 0, 0]),
                        get_cell: () => [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
                        info: {}
                    },
                    hasArray: (k) => k === 'ms'
                },
                'quartz.efg': {
                    _atoms_base: {
                        length: () => 9,
                        get_chemical_symbols: () => ['Si', 'Si', 'Si', 'O', 'O', 'O', 'O', 'O', 'O'],
                        get_positions: () => Array(9).fill([0, 0, 0]),
                        get_cell: () => [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
                        info: {}
                    },
                    hasArray: (k) => k === 'efg'
                }
            },
            _model_sources: {
                'quartz.nmr': {
                    text: '#$magres-abinitio-v1.0\n[calculation]\n[/calculation]\n[atoms]\nunits lattice Angstrom\nlattice 2 0 0 0 2 0 0 0 2\nunits atom Angstrom\natom Si Si 1 0 0 0\n[/atoms]\n[magres]\nunits ms ppm\nms Si 1 0 0 0 0 0 0 0 0 0\n[/magres]',
                    extension: 'magres'
                },
                'quartz.efg': {
                    text: '#$magres-abinitio-v1.0\n[calculation]\n[/calculation]\n[atoms]\nunits lattice Angstrom\nlattice 2 0 0 0 2 0 0 0 2\nunits atom Angstrom\natom Si Si 1 0 0 0\n[/atoms]\n[magres]\nunits efg au\nefg Si 1 0 0 0 0 0 0 0 0 0\n[/magres]',
                    extension: 'magres'
                }
            },
            _model_parameters: {},
            model: null,
            modelName: null,
            displayed: [],
            theme: {},
            loadModels: vi.fn().mockReturnValue({ quartz: 0 }),
            deleteModel: vi.fn(),
            displayModel: vi.fn(),
            centerCamera: vi.fn(),
            ...viewerOverrides
        };

        const state = {
            app_viewer: mockViewer,
            app_theme: {},
            app_model_states: {
                'quartz.nmr': { sel_selected_view: null },
                'quartz.efg': { sel_selected_view: null }
            },
            app_merge_prompt: {
                modelA: 'quartz.nmr',
                modelB: 'quartz.efg',
                mergedName: 'quartz'
            },
            ...stateOverrides
        };

        const dispatch = makeDispatch(state);
        const intf = new AppInterface(state, dispatch);
        return { intf, dispatch, mockViewer, state };
    }

    it('exposes mergePrompt from state', () => {
        const { intf } = makeInterface();
        expect(intf.mergePrompt).toEqual({
            modelA: 'quartz.nmr',
            modelB: 'quartz.efg',
            mergedName: 'quartz'
        });
    });

    it('dismisses mergePrompt by dispatching null', () => {
        const { intf, dispatch } = makeInterface();
        intf.dismissMergePrompt();
        expect(dispatch).toHaveBeenCalledWith({
            type: 'set',
            key: 'app_merge_prompt',
            value: null
        });
    });

    it('merges models: deletes unmerged models, loads combined text, displays merged model', () => {
        const { intf, mockViewer, state } = makeInterface();
        intf.mergeModels('quartz.nmr', 'quartz.efg', 'quartz');

        expect(mockViewer.deleteModel).toHaveBeenCalledWith('quartz.nmr');
        expect(mockViewer.deleteModel).toHaveBeenCalledWith('quartz.efg');

        expect(mockViewer.loadModels).toHaveBeenCalledWith(
            expect.stringContaining('units ms ppm'),
            'magres',
            'quartz',
            expect.any(Object)
        );
        expect(mockViewer.loadModels).toHaveBeenCalledWith(
            expect.stringContaining('units efg au'),
            'magres',
            'quartz',
            expect.any(Object)
        );

        expect(mockViewer.displayModel).toHaveBeenCalledWith('quartz');
        expect(state.app_merge_prompt).toBe(null);
    });

    it('drops the cached per-model state of the models it consumed', () => {
        const { intf, state } = makeInterface();
        intf.mergeModels('quartz.nmr', 'quartz.efg', 'quartz');
        expect(state.app_model_states).not.toHaveProperty('quartz.nmr');
        expect(state.app_model_states).not.toHaveProperty('quartz.efg');
    });

    it('reports a reason and leaves both models loaded when the merged file will not load', () => {
        const { intf, mockViewer, state } = makeInterface({}, {
            loadModels: vi.fn().mockReturnValue({ quartz: 1 })
        });
        intf.mergeModels('quartz.nmr', 'quartz.efg', 'quartz');

        expect(mockViewer.deleteModel).not.toHaveBeenCalled();
        expect(state.app_merge_prompt.error).toMatch(/could not be read back in/i);
    });

    it('reports a reason when a source is not a magres file', () => {
        const { intf, mockViewer, state } = makeInterface({}, {
            _model_sources: {
                'quartz.nmr': { text: '', extension: 'cif' },
                'quartz.efg': { text: '', extension: 'magres' }
            }
        });
        intf.mergeModels('quartz.nmr', 'quartz.efg', 'quartz');

        expect(mockViewer.loadModels).not.toHaveBeenCalled();
        expect(mockViewer.deleteModel).not.toHaveBeenCalled();
        expect(state.app_merge_prompt.error).toMatch(/only supported for \.magres/i);
    });

    it('tests with real CrystVis and quartz magres files', async () => {
        const { CrystVis } = await import('@ccp-nc/crystvis-js/lib/visualizer.js');
        const { Loader } = await import('@ccp-nc/crystvis-js/lib/loader.js');
        const nmrText = fixtureNMR;
        const efgText = fixtureEFG;

        const mockRenderer = {
            _disposed: false,
            clear() {},
            addNotifications() {},
            clearNotifications() {},
            resetOrbitCenter() {},
            resetCameraCenter() {},
            add() {},
            remove() {},
            getCameraState() { return { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 }, zoom: 1 }; },
            setCameraState() {},
            onCameraChange() { return () => {}; },
            Primitives: {
                BoxMesh: class { constructor() { this.color = ''; } },
                AxesMesh: class {},
                AtomMesh: class {
                    constructor() {
                        this.material = {};
                        this.geometry = { dispose() {} };
                    }
                    visible() {}
                    add() {}
                },
                BondMesh: class {
                    constructor() {
                        this.material = {};
                        this.geometry = { dispose() {} };
                    }
                    visible() {}
                },
                AuraMesh: class {
                    constructor() {
                        this.material = {};
                    }
                }
            },
            theme: { cell_line_color: '#fff' }
        };

        const vis = Object.create(CrystVis.prototype);
        vis._isDisposed = false;
        vis._renderer = mockRenderer;
        vis._loader = new Loader();
        vis._models = {};
        vis._current_model = null;
        vis._current_mname = null;
        vis._displayed = null;
        vis._selected = null;
        vis._notifications = [];
        vis._atom_click_events = {};
        vis._atom_click_defaults = {};
        vis._atom_box_event = null;
        vis._hsel = false;
        vis.cifsymtol = 1e-2;
        vis._model_sources = {};
        vis._model_parameters = {};
        vis._model_meta = {};
        vis._model_list_change_cbs = [];
        vis._display_change_cbs = [];
        vis._camera_change_cbs = [];

        const s1 = vis.loadModels(nmrText, 'magres', 'quartz.nmr');
        const s2 = vis.loadModels(efgText, 'magres', 'quartz.efg');

        expect(s1['quartz.nmr']).toBe(0);
        expect(s2['quartz.efg']).toBe(0);
        expect(vis.modelList).toEqual(['quartz.nmr', 'quartz.efg']);

        const state = {
            app_viewer: vis,
            app_theme: {},
            app_model_states: {},
            app_merge_prompt: { modelA: 'quartz.nmr', modelB: 'quartz.efg', mergedName: 'quartz' }
        };
        const intf = new AppInterface(state, makeDispatch(state));

        intf.mergeModels('quartz.nmr', 'quartz.efg', 'quartz');

        expect(state.app_merge_prompt).toBe(null);
        expect(vis.modelList).toEqual(['quartz']);
        expect(vis._models).toHaveProperty('quartz');
        expect(vis._models['quartz'].hasArray('ms')).toBe(true);
        expect(vis._models['quartz'].hasArray('efg')).toBe(true);

        // Now test calling displayModel directly
        vis.displayModel('quartz');
        expect(vis.modelName).toBe('quartz');
    });
});
