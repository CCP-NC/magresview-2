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
import { makeSelector, BaseInterface } from '../utils';

const initialCScaleState = {
    cscale_view: null,
    cscale_displ: null,
    cscale_type: 'none',
    cscale_lims: [0,1],
    cscale_lims_override: null,
    cscale_units: '',
    cscale_cmap: 'viridis',
};

// A base class not meant to be used directly, but inherited by all interfaces
// that make use of color scales. 
// 
// Must be used in conjuction with makeCScaleSelector!
class CScaleInterface extends BaseInterface {

    get colorScaleType() {
        return this.state.cscale_type;
    }

    set colorScaleType(v) {
        this.dispatch({
            type: 'update',
            data: {
                cscale_type: v,
                listen_update: [Events.CSCALE]
            }
        });
    }

    get colorScalePrefix() {
        return this.colorScaleType.split('_', 2)[0];
    }

    get colorScaleLimits() {
        return this.state.cscale_lims;
    }

    get colorScaleLimitsOverride() {
        return this.state.cscale_lims_override;
    }

    set colorScaleLimitsOverride(v) {
        // Pass [min, max] to pin, or null to restore auto-scaling.
        this.dispatch({
            type: 'update',
            data: { cscale_lims_override: v, listen_update: [Events.CSCALE] }
        });
    }

    get colorScaleUnits() {
        return this.state.cscale_units;
    }

    get colorScaleCmap() {
        return this.state.cscale_cmap;
    }

    set colorScaleCmap(v) {
        this.dispatch({
            type: 'update',
            data: {
                cscale_cmap: v,
                listen_update: [Events.CSCALE]
            }
        });
    }

    reset() {
        this.dispatch({
            type: 'update',
            data: {
                ...initialCScaleState,
                listen_update: [Events.CSCALE]
            }
        });
    }

    resetColorScaleLimits() {
        this.colorScaleLimitsOverride = null;
    }

}

function makeCScaleSelector(prefix, extras=[]) {
    extras = extras.concat(Object.keys(initialCScaleState));

    return makeSelector(prefix, extras);
}

export default CScaleInterface;
export { initialCScaleState, makeCScaleSelector };