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
import { larmorHMHz } from '../utils';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';

const initialEFGState = {
    efg_view: null,
    efg_ellipsoids_on: false,
    efg_ellipsoids_scale: 0.1,
    efg_labels_type: 'none',
    efg_precision: 2,
};

// Action creator
const efgAction = function(data, update=[]) {
    return {
        type: 'update',
        data: {
            ...data,
            listen_update: update
        }
    };
}

class EFGInterface extends CScaleInterface {

    get hasData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('efg')));        
    }

    get hasEllipsoids() {
        return this.state.efg_ellipsoids_on;
    }

    set hasEllipsoids(v) {
        this.dispatch(efgAction({ efg_ellipsoids_on: v }, [Events.EFG_ELLIPSOIDS]));
    }

    get ellipsoidScale() {
        return this.state.efg_ellipsoids_scale;
    }

    set ellipsoidScale(v) {
        this.dispatch(efgAction({ efg_ellipsoids_scale: v }, [Events.EFG_ELLIPSOIDS]));
    }

    get labelsMode() {
        return this.state.efg_labels_type;
    }

    set labelsMode(v) {
        this.dispatch(efgAction({ efg_labels_type: v }, [Events.EFG_LABELS]));
    }

    get precision() {
        return this.state.efg_precision;
    }

    set precision(v) {
        this.dispatch(efgAction({ 'efg_precision': v }, [Events.EFG_LABELS]));
    }

    // Read-only views onto the single, model-wide external field. B0 is owned
    // by AppInterface (ADR 0009); change it via `appint.B0 = ...` or the
    // spectrometer field dialog.
    get B0() {
        return this.state.app_B0;
    }

    // Equivalent 1H Larmor frequency in MHz for the current B0, or null if
    // the current input is not a valid field
    get larmorH() {
        return larmorHMHz(this.state);
    }

    // True if at least one chemical shift reference is set in the MS tab;
    // without any, d_obs cannot be computed for any site
    get hasMSRefs() {
        const refs = this.state.ms_references || {};
        return Object.values(refs).some((v) => (v !== null && v !== undefined && v !== ''));
    }

    get colorScaleAvailable() {
        let pre = this.colorScalePrefix;
        return (pre === 'none' || pre === 'efg');
    }

    // reset 
    reset() {
        // reset the parent class 
        super.reset();

        // for some reason at least one needs to fire off like this to properly reset the cscale
        // so this is a bit of a hack. Instead of doing:
        // this.ellipsoidScale = initialEFGState.efg_ellipsoids_scale;
        // we do:
        this.dispatch(efgAction({ 'efg_ellipsoids_scale':  initialEFGState.efg_ellipsoids_scale}, [Events.CSCALE]));
        
        // the others can be reset like this
        this.hasEllipsoids = initialEFGState.efg_ellipsoids_on;
        this.labelsMode = initialEFGState.efg_labels_type;
        this.precision = initialEFGState.efg_precision;
        
    }

}

function useEFGInterface() {
    let state = useSelector(makeCScaleSelector('efg', ['app_viewer', 'ms_cscale_type', 'ms_references', 'app_B0']), shallowEqual);
    let dispatcher = useDispatch();

    let intf = new EFGInterface(state, dispatcher);

    return intf;
}

export default useEFGInterface;
export { initialEFGState };