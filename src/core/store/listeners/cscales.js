/**
 * Listeners for color scales
 */

import _ from 'lodash';
import { getSel, getNMRData, quadDatatypes, parseB0 } from '../utils';
import { getColorScale } from '../../../utils';

function colorScaleListener(state) {

    let app = state.app_viewer;
    let current_view = state.cscale_view;
    let current_greyed = state.cscale_displ;
    let displayed = app.displayed;

    let next_view = getSel(app);
    let next_greyed = null;

    const cstype = state.cscale_type;
    const cmap = state.cscale_cmap;

    // Restore color to the grayed out atoms
    if (current_greyed) {
        current_greyed.setProperty('color', null);
    }

    if (cstype !== 'none') {

        // Split in prefix and mode
        const [, prefix, mode] = cstype.match(/^([^_]*)_(.*)$/);
        // d_obs combines EFG data with the MS chemical shift references
        const ref_table = (mode === 'dobs') ?
            state.ms_references : state[prefix + '_references'];
        const options = { B0: parseB0(state[prefix + '_B0']) };

        // Quadrupolar quantities are undefined (null) on non-quadrupolar
        // sites; those are greyed out rather than treated as errors
        const nullsExpected = quadDatatypes.indexOf(mode) >= 0;

        next_greyed = displayed.xor(next_view);

        const nmrdata = getNMRData(next_view, mode, prefix, ref_table, options);
        const values = nmrdata[1];

        // if there are any null values, reset colors and throw error
        if (!nullsExpected && values.indexOf(null) >= 0) {
            if (current_view)
                current_view.setProperty('color', null);
            // reset color scale limits
            state.cscale_lims = [0, 1];
            state.cscale_units = '';
            throw Error('Cannot plot color scale because there are null values. ');
        }

        if (cstype === 'efg_Q' || cstype === 'efg_PQ') {
            // Special case for EFG Q and P_Q
            // convert all to absolute values
            values.forEach((v, i) => values[i] = (v === null ? null : Math.abs(v)));
        }

        const valid = values.filter((v) => v !== null);

        if (valid.length === 0) {
            // Nothing to colour (e.g. d_obs with no reference set)
            if (current_view)
                current_view.setProperty('color', null);
            next_view.setProperty('color', null);
            next_greyed.setProperty('color', 0x888888);
            state.cscale_lims = [0, 1];
            state.cscale_units = nmrdata[0];
            return {
                cscale_view: next_view,
                cscale_displ: next_greyed
            };
        }

        let minv = _.min(valid);
        let maxv = _.max(valid);

        // Allow user to pin custom limits via the advanced panel
        const override = state.cscale_lims_override;
        if (Array.isArray(override) && override.length === 2) {
            minv = override[0];
            maxv = override[1];
        }

        let cs = getColorScale(minv, maxv, cmap);
        // Sites with no value (non-quadrupolar, or missing reference) are
        // greyed out like unselected atoms
        let colors = values.map((v) => (
            v === null ? '#888888' : cs.getColor(v).toHexString()
        ));

        // store minv and maxv TODO: is this the correct place to do this?
        state.cscale_lims = [minv, maxv];

        // store units
        state.cscale_units = nmrdata[0];

        next_view.setProperty('color', colors);
        next_greyed.setProperty('color', 0x888888);
    }
    else {
        if (current_view)
            current_view.setProperty('color', null);
    }

    return {
        cscale_view: next_view,
        cscale_displ: next_greyed
    };
}

export { colorScaleListener };