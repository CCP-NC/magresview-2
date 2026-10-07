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



import { Events } from '../listeners';
import CScaleInterface, { makeCScaleSelector } from './CScaleInterface';
import { referencingGradient } from '../utils';
import { DEFAULT_GRADIENT } from '../../nmr/constants';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';

const initialMSState = {
    ms_view: null,
    ms_ellipsoids_on: false,
    ms_ellipsoids_scale: 0.05,
    ms_labels_type: 'none',
    ms_references: {},
    // Per-element slope of the shielding-to-shift conversion. Lives next to
    // the references because it is the other half of the same calibration:
    // delta = reference + gradient * sigma.
    ms_gradients: {},
    ms_precision: 2,
    ms_show_ref_table: false,
};

// Update the references and gradients used for chemical shifts
function msSetReferences(state, refs=null, grads=null) {

    let new_refs = {};
    let new_grads = {};

    // Default behaviour if refs is null is to clear everything,
    // otherwise we update the existing table.
    if (refs) {
        new_refs = {
            ...state.ms_references,
            ...refs
        };
        new_grads = {
            ...state.ms_gradients,
            ...(grads || {})
        };
    }

    // We then update the state and refresh the ms labels, in case any changes
    // are needed
    return {
        ms_references: new_refs,
        ms_gradients: new_grads,
        listen_update: [Events.MS_LABELS, Events.CSCALE, Events.PLOTS_RECALC]
    };
}

// Action creator
const msAction = function(data, update=[]) {
    return {
        type: 'update',
        data: {
            ...data,
            listen_update: update
        }
    };
}

class MSInterface extends CScaleInterface {

    get hasData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('ms')));        
    }

    get hasEllipsoids() {
        return this.state.ms_ellipsoids_on;
    }

    set hasEllipsoids(v) {
        this.dispatch(msAction({ ms_ellipsoids_on: v }, [Events.MS_ELLIPSOIDS]));
    }

    get ellipsoidScale() {
        return this.state.ms_ellipsoids_scale;
    }

    set ellipsoidScale(v) {
        this.dispatch(msAction({ ms_ellipsoids_scale: v }, [Events.MS_ELLIPSOIDS]));
    }

    get labelsMode() {
        return this.state.ms_labels_type;
    }

    set labelsMode(v) {
        this.dispatch(msAction({ 'ms_labels_type': v }, [Events.MS_LABELS]));
    }

    get precision() {
        return this.state.ms_precision;
    }

    set precision(v) {
        this.dispatch(msAction({ 'ms_precision': v }, [Events.MS_LABELS]));
    }

    get colorScaleAvailable() {
        let pre = this.colorScalePrefix;
        return (pre === 'none' || pre === 'ms');
    }

    get referenceTable() {

        if (!this.state.app_viewer || !this.state.app_viewer.model)
            return [];

        // Find the elements, then return the respective references as pairs
        const elements = [...new Set(this.state.app_viewer.model.symbols)];
        const refs = this.state.ms_references;
        return Object.fromEntries(elements.map((el) => [el, refs[el] || '']));
    }

    /**
     * Gradients for the same elements as referenceTable, defaulting to -1 so
     * the modal always shows the value that will actually be applied.
     */
    get gradientTable() {

        if (!this.state.app_viewer || !this.state.app_viewer.model)
            return {};

        const elements = [...new Set(this.state.app_viewer.model.symbols)];
        const grads = this.state.ms_gradients || {};
        return Object.fromEntries(elements.map(
            (el) => [el, grads[el] === undefined || grads[el] === '' ? String(DEFAULT_GRADIENT) : grads[el]]
        ));
    }

    updateReferenceTable(data, gradients=null) {
        this.dispatch({
            type: 'call',
            function: msSetReferences,
            arguments: [data, gradients]
        });
    }

    getReference(el) {
        return this.state.ms_references[el] || '';
    }

    getGradient(el) {
        return referencingGradient(this.state.ms_gradients, el);
    }

    get showRefTable() {
        return this.state.ms_show_ref_table;
    }

    set showRefTable(v) {
        this.dispatch(msAction({ ms_show_ref_table: v }));
    }

    // reset 
    reset() {
        // reset the parent class 
        super.reset();
        
        // reset references
        this.updateReferenceTable([null])

        this.precision = initialMSState.ms_precision;
        this.labelsMode = initialMSState.ms_labels_type;
        this.hasEllipsoids = initialMSState.ms_ellipsoids_on;
        this.ellipsoidScale = initialMSState.ms_ellipsoids_scale;

        
    }

}

function useMSInterface() {
    let state = useSelector(makeCScaleSelector('ms', ['app_viewer', 'efg_cscale_type']), shallowEqual);
    let dispatcher = useDispatch();

    let intf = new MSInterface(state, dispatcher);

    return intf;
}

export default useMSInterface;
export { initialMSState, msSetReferences, MSInterface };