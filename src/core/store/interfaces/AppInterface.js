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

import { shallowEqual, useSelector, useDispatch } from 'react-redux';

import { makeSelector, BaseInterface } from '../utils';
import { CallbackMerger, ClickHandler } from '../../../utils';

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
    app_advanced_mode: false,
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

    let models = app.modelList;

    if (!app.model && models.length > 0) {
        // Let's display a different one
        data = appDisplayModel(state, models[0]);
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
        // Auto-enable the relevant coupling display when switching to those panels
        // so the user can immediately click an atom without a separate checkbox.
        const data = { app_sidebar: v };
        if (v === 'dip')   data.dip_links_on = true;
        if (v === 'jcoup') data.jc_links_on  = true;
        this.dispatch({ type: 'update', data });
    }

    get advancedMode() {
        return this.state.app_advanced_mode;
    }

    set advancedMode(v) {
        this.dispatch({ type: 'update', data: { app_advanced_mode: v } });
    }

    /**
     * Interaction mode is derived from the active sidebar.
     * 'dip' → 'dipolar', 'jcoup' → 'jcoupling', 'euler' → 'euler',
     * all other sidebars → 'select'.
     */
    get interactionMode() {
        const sidebar = this.state.app_sidebar;
        if (sidebar === 'dip')   return 'dipolar';
        if (sidebar === 'jcoup') return 'jcoupling';
        if (sidebar === 'euler') return 'euler';
        return 'select';
    }

    /**
     * Switch to a specialised interaction mode by switching the corresponding
     * sidebar.  Passing 'select' switches to the Select & Display sidebar.
     */
    setInteractionMode(mode) {
        const sidebarMap = { select: 'select', dipolar: 'dip', jcoupling: 'jcoup', euler: 'euler' };
        const target = sidebarMap[mode];
        // Route through the sidebar setter so auto-enable logic fires for dip/jcoup
        if (target) this.sidebar = target;
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

        // Override CrystVis's default box-selection handler so it dispatches
        // through Redux instead of setting vis.selected directly.
        // Shift+drag adds all atoms inside the box to the current selection,
        // matching the Shift+click "add" behaviour.
        const dispatch = this.dispatch;
        vis.onAtomBox((boxView) => {
            dispatch({
                type: 'call',
                function: (state, bv) => {
                    const cur = state.sel_selected_view;
                    const newSel = cur ? cur.or(bv) : bv;
                    return {
                        sel_selected_view: newSel,
                        listen_update: [Events.VIEWS]
                    };
                },
                arguments: [boxView]
            });
        });

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

            // Find a valid one to load
            var to_display = null;
            Object.entries(success).forEach(([n, v]) => {
                if (v === 0) {
                    to_display = n;
                }
            });

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

        Array.from(files).forEach(parseOne);
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