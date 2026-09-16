import _ from 'lodash';
import { elementView, getNMRData, getB0 } from '../utils';
import { quadrupolarData } from '../../../utils';

// Reported back to the UI so that the sidebar, the axis label and the plot
// title all describe exactly what this listener did, rather than each
// re-deriving it from a slightly different set of conditions.
const NO_QUAD_INFO = {
    applied: false,     // was any peak actually moved?
    nShifted: 0,        // how many peaks were moved
    nUnreliable: 0,     // of those, how many are outside perturbation validity
    maxRatio: null      // largest |P_Q|/nu_0 among the shifted peaks
};

function emptyResult() {
    return {
        plots_data: [],
        plots_quad_info: NO_QUAD_INFO
    };
}

/**
 * Whether the second-order quadrupolar shift should be applied to the 1D plot.
 *
 * d_QIS is a shift, not a shielding: it only has meaning on an axis that is
 * already a chemical shift axis referenced to a real standard (ADR 0009).
 * In shielding mode there is no reference and therefore no experimental
 * spectrum to compare against, so the correction is never applied.
 */
function quadShiftRequested(state) {
    return !!(state.plots_q2_shifts && state.plots_use_refs && getB0(state) !== null);
}

function plotsListener(state) {

    // If plot is off, return empty data
    // (no need to waste time computing)
    if (state.plots_mode === 'none') {
        return emptyResult();
    }

    // Get axes ranges
    // use the range specified by the user/defaults
    // later we might override this with the range of peaks
    let minx = parseFloat(state.plots_min_x);
    let maxx = parseFloat(state.plots_max_x);
    // make sure minx < maxx
    if (minx > maxx) {
        let tmp = minx;
        minx = maxx;
        maxx = tmp;
    }

    // Get target atom view: the selection (or everything displayed), narrowed
    // to the chosen element. Shared with PlotsInterface so the sidebar always
    // describes the same atoms this listener plotted.
    const view = elementView(state);
    const ref_table = state.ms_references;
    const use_refs = state.plots_use_refs;
    const nmr_mode = use_refs? 'cs' : 'iso';

    // Is there even anything to plot?
    let noplot = !view;
    noplot = noplot || (isNaN(minx) || isNaN(maxx));
    noplot = noplot || (state.plots_mode === 'none');

    if (noplot) {
        return emptyResult();
    }

    let xaxis = [];
    let yaxis = [];

    const w = parseFloat(state.plots_peak_width);
    const n = parseInt(state.plots_x_steps);
    let peaks = getNMRData(view, nmr_mode, 'ms', ref_table)[1];
    const NWIDTHS = 5;

    // make sure no null values in peaks
    if (peaks.indexOf(null) >= 0) {
        // No MS reference set for this element — return empty data silently.
        // The UI should prompt the user to enter a reference before switching to shift mode.
        return emptyResult();
    }

    // Apply the second-order quadrupolar shift, if it applies at all.
    // quadrupolarData returns qis === null for every site where d_QIS is not
    // defined: non-quadrupolar sites, sites with no EFG data, and integer-spin
    // nuclei (14N, 2H, ...) which have no central transition. So this loop is
    // safe to run over every atom.
    let quadInfo = NO_QUAD_INFO;

    if (quadShiftRequested(state)) {
        const B0 = getB0(state);
        let nShifted = 0;
        let nUnreliable = 0;
        let maxRatio = null;

        peaks = peaks.map((p, i) => {
            const qd = quadrupolarData(view.atoms[i], B0);
            if (!qd || qd.qis === null) {
                return p;
            }
            nShifted += 1;
            if (qd.perturbationValid === false) nUnreliable += 1;
            if (maxRatio === null || qd.ratio > maxRatio) maxRatio = qd.ratio;
            // delta_obs = delta_iso + delta_QIS
            return p + qd.qis;
        });

        quadInfo = {
            applied: nShifted > 0,
            nShifted: nShifted,
            nUnreliable: nUnreliable,
            maxRatio: maxRatio
        };
    }

    
    // if auto_x is true, use the range of peaks
    if (state.plots_auto_x) {
        // the range of peaks
        minx = _.min(peaks) - w*NWIDTHS;
        maxx = _.max(peaks) + w*NWIDTHS;
    }

    const labels = view.atoms.map((a) => a.crystLabel);
    // if not auto, filer peaks by range
    let rangepeaks = peaks;
    if (!state.plots_auto_x) {
        rangepeaks = peaks.filter((x) => (x >= minx && x <= maxx));
    }
        // filter labels by peak positions
    const rangelabels = labels.filter((x, i) => (rangepeaks.indexOf(peaks[i]) >= 0));
    // check that rangelabels has the same length as rangepeaks
    if (rangelabels.length !== rangepeaks.length) {
        throw Error('Mismatch between labels and peaks');
    }
    // sort labels and peaks by peak position
    const sorted = _.zip(rangepeaks, rangelabels).sort((a, b) => (a[0] - b[0]));
    const sortedpeaks = sorted.map((x) => x[0]);
    const sortedlabels = sorted.map((x) => x[1]);


    if (w > 0) {
        function lorentzian(x, x0, w) {
            return 0.5/Math.PI*w/(Math.pow(x-x0, 2)+0.25*w*w);
        }

        function gaussian(x, x0, w) {
            // w is FWHM; convert to sigma
            const sigma = w / (2 * Math.sqrt(2 * Math.log(2)));
            return 1/(sigma * Math.sqrt(2*Math.PI)) * Math.exp(-0.5 * Math.pow((x-x0)/sigma, 2));
        }

        const kernel = (state.plots_broadening_type === 'gaussian') ? gaussian : lorentzian;

        xaxis = _.range(n).map((i) => (minx + (maxx-minx)*i/(n-1)));
        yaxis = xaxis.map((x) => {
            return sortedpeaks.reduce((s, x0) => (s + kernel(x, x0, w)), 0);
        });
    } else if (w === 0) {
        xaxis = sortedpeaks;
        yaxis = xaxis.map(() => 1.0);
    } else {
        throw Error('Invalid peak width');
    }


    // Build x range
    const data = [{
        id: 'Curve',
        data: xaxis.map((x, i) => ({
            x: x,
            y: yaxis[i]
        })),
        // return labels for peaks in the range
        // or empty array if no peaks in range
        peaks: sortedpeaks? sortedpeaks : [],
        labels: sortedlabels? sortedlabels: [],
    }];

    return {
        plots_data: data,
        plots_quad_info: quadInfo
    };
}

export { plotsListener };