/**
 * MagresView 2.0
 *
 * A web interface to visualize and interact with computed NMR data in the Magres
 * file format.
 *
 * Author: Simone Sturniolo
 *
 * Copyright 2022 Science and Technology Facilities Council
 * This software is distributed under the terms of the MIT License
 * Please refer to the file LICENSE for the text of the license
 * 
 */

import _ from 'lodash';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';

import { makeSelector, BaseInterface } from '../utils';
import { CallbackMerger, ClickHandler, centerDisplayed } from '../../../utils';

import { initialSelState } from './SelInterface';
import { initialCScaleState } from './CScaleInterface';
import { initialMSState } from './MSInterface';
import { initialEFGState } from './EFGInterface';
import { initialDipState } from './DipInterface';
import { initialJCoupState } from './JCoupInterface';
import { initialEulerState } from './EulerInterface';

import { Events } from '../listeners';

import CrystVis from '@ccp-nc/crystvis-js';

import { themes } from '../../themes';

const initialAppState = {
    app_viewer: null,
    app_click_handler: null,
    app_theme_name: 'dark',
    app_theme: themes.dark,
    app_sidebar: 'load',
    app_default_displayed: null,
    app_model_queued: null,
    app_load_as_mol: null, // crystvis-js will try to figure out what's appropriate...
    app_use_nmr_isos: true,
    app_vdw_scaling: 1.0,
    // Raw source text for every loaded model, keyed by model name.
    // Used to save/restore sessions without external file references.
    // Future: replace or supplement with crystvis-js getModelSource(name).
    app_model_sources: {},
};

// Functions meant to operate on the app alone.
// These exist outside of the AppInterface because they will be invoked
// directly from inside the reducer as special actions
function appDisplayModel(state, m) {
    let app = state.app_viewer;
    let cm = app.model;

    let data = {};
    if (cm) {
        // We turn visualizations off
        data = {
            ...initialSelState,
            ...initialCScaleState,
            ...initialMSState,
            ...initialEFGState,
            ...initialDipState,
            ...initialJCoupState,
            ...initialEulerState
        };
    }

    // Return data for dispatch
    return {
        ...data,
        app_model_queued: m,
        listen_update: [Events.SEL_LABELS, Events.CSCALE,
                        Events.MS_ELLIPSOIDS, Events.MS_LABELS,
                        Events.EFG_ELLIPSOIDS, Events.EFG_LABELS, 
                        Events.DIP_LINKS, Events.JC_LINKS]
    };
}

function appReloadModel(state, m) {
    let app = state.app_viewer;
    app.reloadModel(m, {
        supercell: [3, 3, 3],
        molecularCrystal: state.app_load_as_mol,
        useNMRActiveIsotopes: state.app_use_nmr_isos,
        vdwScaling: state.app_vdw_scaling
    });

    let data = {};

    // We turn visualizations off
    data = {
        ...initialSelState,
        ...initialCScaleState,
        ...initialMSState,
        ...initialEFGState,
        ...initialDipState,
        ...initialJCoupState,
        ...initialEulerState
    };

    // Return data for dispatch
    return {
        ...data,
        app_model_queued: m,
        listen_update: [Events.SEL_LABELS, Events.CSCALE,
                        Events.MS_ELLIPSOIDS, Events.MS_LABELS,
                        Events.EFG_ELLIPSOIDS, Events.EFG_LABELS, 
                        Events.DIP_LINKS, Events.JC_LINKS]
    };
}

function appDeleteModel(state, m) {
    
    let app = state.app_viewer;
    let data = {};

    // Delete a model
    app.deleteModel(m);

    // Remove the stored source text for the deleted model
    const newSources = { ...state.app_model_sources };
    delete newSources[m];
    data.app_model_sources = newSources;

    let models = app.modelList;

    if (!app.model && models.length > 0) {
        // Let's display a different one
        data = { ...data, ...appDisplayModel(state, models[0]) };
    }

    return data;
}

class AppInterface extends BaseInterface {

    get initialised() {
        return this.viewer !== null;
    }

    get viewer() {
        return this.state.app_viewer;
    }

    get models() {
        let models = [];

        if (this.initialised) {
            models = this.viewer.modelList;
        }

        return models;
    }

    get currentModel() {
        let model = null;

        if (this.initialised) {
            model = this.viewer.model;
        }

        return model;
    }

    get currentModelName() {
        let model_name = null;

        if (this.initialised) {
            model_name = this.viewer.modelName;
        }

        return model_name;
    }

    get themeName() {
        return this.state.app_theme_name;
    }

    set themeName(v) {
        this.dispatch({
            type: 'update',
            data: {
                app_theme_name: v,
                app_theme: themes[v],
                listen_update: [
                    Events.SEL_LABELS, Events.CSCALE,
                    Events.MS_ELLIPSOIDS, Events.MS_LABELS,
                    Events.EFG_ELLIPSOIDS, Events.EFG_LABELS,
                    Events.DIP_LINKS, Events.JC_LINKS
                ]
            }
        });
    }


    get theme() {
        return themes[this.themeName];
    }

    get sidebar() {
        return this.state.app_sidebar;
    }

    set sidebar(v) {
        this.dispatch({
            type: 'set',
            key: 'app_sidebar',
            value: v
        });
    }

    get loadAsMol() {
        return this.state.app_load_as_mol;
    }
    // if null, crystvis-js will check if the model constains C and H atoms and 
    // if so, will consider it a molecular crystal. Otherwise a boolean. 
    set loadAsMol(v) {
        this.dispatch({
            type: 'set',
            key: 'app_load_as_mol',
            value: v
        });
    }

    get useNMRIsotopes() {
        return this.state.app_use_nmr_isos;
    }

    set useNMRIsotopes(v) {
        this.dispatch({
            type: 'set',
            key: 'app_use_nmr_isos',
            value: v
        });
    }

    get vdwScaling() {
        return this.state.app_vdw_scaling;
    }

    set vdwScaling(v) {
        this.dispatch({
            type: 'set',
            key: 'app_vdw_scaling',
            value: v
        });
    }


    initialise(elem) {
        console.log('Initialising CrystVis app on element ' + elem);
        // Initialise app but only if it's not already there
        const vis = new CrystVis(elem, 0, 0, {preserveDrawingBuffer: true});
        vis.highlightSelected = true; // Our default
        
        const handler = new ClickHandler(vis, [
            CrystVis.LEFT_CLICK,
            CrystVis.LEFT_CLICK + CrystVis.SHIFT_BUTTON,
            CrystVis.LEFT_CLICK + CrystVis.CTRL_BUTTON,
            CrystVis.RIGHT_CLICK
        ]);

        if (!this.initialised) {
            this.dispatch({
                type: 'update',
                data: {
                    app_viewer: vis,
                    app_click_handler: handler
                }
            });
        }
    }

    load(files, cback=null) {

        /* Load from a list of files, running a callback with the aggregate
        dictionary that reports the success for each of them */

        if (!this.initialised) {
            return;
        }

        let cbm = new CallbackMerger(files.length, cback);
        let app = this.viewer;
        let intf = this;
        let params = {
            supercell: [3, 3, 3],
            molecularCrystal: this.loadAsMol,
            useNMRActiveIsotopes: this.useNMRIsotopes,
            vdwScaling: this.vdwScaling
        };

        // Callback for each file after the FileReader is done
        function onLoad(contents, name, extension) {
            var success = app.loadModels(contents, extension, name, params);

            // Find a valid model name and capture source text for all that loaded
            var to_display = null;
            var newSources = { ...intf.state.app_model_sources };
            _.map(success, (v, n) => {
                if (v === 0) {                 
                    to_display = n;
                    // Store the raw source text so the session can be saved later.
                    // Future: replace with crystvis-js getModelSource(n) once available.
                    newSources[n] = { text: contents, extension };
                }
            });

            // Persist sources – dispatch before display so the state is up to date
            if (Object.keys(newSources).length !== Object.keys(intf.state.app_model_sources).length) {
                intf.dispatch({ type: 'set', key: 'app_model_sources', value: newSources });
            }

            if (to_display) {
                intf.display(to_display);
            }

            if (cback) {
                cbm.call(success);
            }
        }

        // Function that loads each individual file
        function parseOne(f) {
            
            let reader = new FileReader();
            // Extension and file name
            let name = f.name.split('.')[0];
            let extension = f.name.split('.').pop();

            reader.onload = ((e) => { onLoad(e.target.result, name, extension) });
            reader.readAsText(f);
        }

        _.forEach(files, parseOne);
    }

    display(m) {
        this.dispatch({
            type: 'call',
            function: appDisplayModel,
            arguments: [m]
        });
    }

    reload(m) {
        this.dispatch({
            type: 'call',
            function: appReloadModel,
            arguments: [m]
        });
    }

    delete(m) {
        this.dispatch({
            type: 'call',
            function: appDeleteModel,
            arguments: [m]
        });
    }

    /**
     * Load all models from a parsed session document and then restore all
     * serialized settings in one atomic dispatch.
     *
     * The two-phase approach (load → restore) is required because model loading
     * is asynchronous (FileReader) while Redux dispatch is synchronous. We load
     * all files first, then in the merged callback we display the active model
     * directly on the viewer and dispatch a single bulk update that reinstates
     * all settings and queues all relevant listeners.
     *
     * Camera restore hook
     * -------------------
     * Once crystvis-js exposes setCameraState(state), add after displayModel():
     *
     *   if (doc.camera && app.setCameraState) {
     *       app.setCameraState(doc.camera);
     *   }
     *
     * @param {Object} doc  Parsed session document (from parseSessionDocument)
     */
    restoreSession(doc) {
        if (!this.initialised) return;

        const app = this.viewer;
        const intf = this;

        const modelEntries = Object.entries(doc.models ?? {});
        if (modelEntries.length === 0) return;

        const params = {
            supercell: [3, 3, 3],
            molecularCrystal: doc.settings?.app_load_as_mol ?? null,
            useNMRActiveIsotopes: doc.settings?.app_use_nmr_isos ?? true,
            vdwScaling: doc.settings?.app_vdw_scaling ?? 1.0,
        };

        // Collect file sources to re-populate app_model_sources after load
        const restoredSources = {};

        const merger = new CallbackMerger(modelEntries.length, () => {
            // ── Phase 2: all files loaded ────────────────────────────────────
            // Display the active model directly on the viewer (no dispatch
            // reset) so that app.displayed is populated before listeners run.
            const targetModel = doc.activeModel ?? app.modelList[0];
            if (targetModel && app.modelList.includes(targetModel)) {
                app.displayModel(targetModel);
                // Replicate the housekeeping that displayListener normally does
                centerDisplayed(app);
                if (app.model?.box) {
                    const themeName = doc.settings?.app_theme_name ?? 'dark';
                    const theme = themes[themeName] ?? themes.dark;
                    app.model.box.color = theme.FwdColor3;
                }
            }

            // ── Phase 3: restore all settings + fire all render listeners ────
            intf.dispatch({
                type: 'update',
                data: {
                    // All serialized settings from the session document.
                    // NON_SERIALIZABLE_KEYS were already excluded on save so
                    // this is safe to spread directly.
                    ...doc.settings,

                    // Non-serializable keys must be re-derived, not restored:
                    app_model_sources: restoredSources,
                    app_default_displayed: app.displayed,
                    app_model_queued: null,

                    // Fire every render listener so the canvas matches the
                    // restored settings.  We deliberately skip Events.DISPLAY
                    // because we called app.displayModel() directly above.
                    listen_update: [
                        Events.VIEWS,
                        Events.SEL_LABELS,
                        Events.CELL,
                        Events.CSCALE,
                        Events.MS_ELLIPSOIDS,
                        Events.MS_LABELS,
                        Events.EFG_ELLIPSOIDS,
                        Events.EFG_LABELS,
                        Events.DIP_LINKS,
                        Events.JC_LINKS,
                        Events.EUL_ANGLES,
                        Events.PLOTS_RECALC,
                    ],
                },
            });
        });

        // ── Phase 1: load each model from stored source text ─────────────────
        modelEntries.forEach(([modelName, { text, extension }]) => {
            // Re-create a synthetic File so we can pass the text back through
            // the same loadModels pathway as a real file pick.
            const result = app.loadModels(text, extension, modelName, params);

            // Capture sources only for models that actually loaded
            Object.entries(result).forEach(([n, v]) => {
                if (v === 0) restoredSources[n] = { text, extension };
            });

            merger.call(result);
        });
    }

}

// Hook for interface
function useAppInterface() {
    let state = useSelector(makeSelector('app'), shallowEqual);
    let dispatcher = useDispatch();

    let intf = new AppInterface(state, dispatcher);

    return intf;
}

export default useAppInterface;
export { initialAppState };