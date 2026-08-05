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
import { shallowEqual, useSelector, useDispatch } from 'react-redux';

const initialHFState = {
    hf_view: null,
    hf_ellipsoids_on: false,
    hf_ellipsoids_scale: 0.1,
    hf_labels_type: 'none',
    hf_precision: 2,
};

// Action creator
const hfAction = function(data, update=[]) {
    return {
        type: 'update',
        data: {
            ...data,
            listen_update: update
        }
    };
}

class HFInterface extends CScaleInterface {

    get hasData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('hf')));
    }

    get app() {
        return this.state.app_viewer;
    }

    // Per-species gyromagnetic ratios parsed from the file (or null if absent).
    get gyromagneticRatios() {
        let app = this.state.app_viewer;
        if (!app || !app.model) {
            return null;
        }
        return app.model.info?.['hf-gyromagnetic-ratios'] ?? null;
    }

    get hasEllipsoids() {
        return this.state.hf_ellipsoids_on;
    }

    set hasEllipsoids(v) {
        this.dispatch(hfAction({ hf_ellipsoids_on: v }, [Events.HF_ELLIPSOIDS]));
    }

    get ellipsoidScale() {
        return this.state.hf_ellipsoids_scale;
    }

    set ellipsoidScale(v) {
        this.dispatch(hfAction({ hf_ellipsoids_scale: v }, [Events.HF_ELLIPSOIDS]));
    }

    get labelsMode() {
        return this.state.hf_labels_type;
    }

    set labelsMode(v) {
        this.dispatch(hfAction({ hf_labels_type: v }, [Events.HF_LABELS]));
    }

    get precision() {
        return this.state.hf_precision;
    }

    set precision(v) {
        this.dispatch(hfAction({ 'hf_precision': v }, [Events.HF_LABELS]));
    }

    get colorScaleAvailable() {
        let pre = this.colorScalePrefix;
        return (pre === 'none' || pre === 'hf');
    }

    // reset 
    reset() {
        // reset the parent class 
        super.reset();

        // for some reason at least one needs to fire off like this to properly reset the cscale
        // so this is a bit of a hack. Instead of doing:
        // this.ellipsoidScale = initialHFState.hf_ellipsoids_scale;
        // we do:
        this.dispatch(hfAction({ 'hf_ellipsoids_scale':  initialHFState.hf_ellipsoids_scale}, [Events.CSCALE]));

        // the others can be reset like this
        this.hasEllipsoids = initialHFState.hf_ellipsoids_on;
        this.labelsMode = initialHFState.hf_labels_type;
        this.precision = initialHFState.hf_precision;

    }

}

function useHFInterface() {
    let state = useSelector(makeCScaleSelector('hf', ['app_viewer', 'ms_cscale_type']), shallowEqual);
    let dispatcher = useDispatch();

    let intf = new HFInterface(state, dispatcher);

    return intf;
}

export default useHFInterface;
export { initialHFState };
