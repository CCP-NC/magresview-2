import _ from 'lodash';
import { getSel, getNMRData } from '../utils';

function plotsListener(state) {

    // If plot is off, return empty data
    // (no need to waste time computing)
    if (state.plots_mode === 'none') {
        return {
            plots_data: []
        };
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

    // Get target atom view
    const app = state.app_viewer;
    let view = getSel(app);
    const ref_table = state.ms_references;
    const use_refs = state.plots_use_refs;
    const nmr_mode = use_refs? 'cs' : 'iso';

    // get subset of view that corresponds to the selected element
    if (state.plots_element) {
        view = view.and(view.find({"elements": [state.plots_element]}))
    }

    // Is there even anything to plot?
    let noplot = !view;
    noplot = noplot || (isNaN(minx) || isNaN(maxx));
    noplot = noplot || (state.plots_mode === 'none');

    if (noplot) {
        return {
            plots_data: []
        };
    }

    let xaxis = [];
    let yaxis = [];

    const w = parseFloat(state.plots_peak_width);
    const n = parseInt(state.plots_x_steps);
    const peaks = getNMRData(view, nmr_mode, 'ms', ref_table)[1];
    const NWIDTHS = 5;

    // make sure no null values in peaks
    if (peaks.indexOf(null) >= 0) {
        // cannot plot peaks if there are null values
        // probably because there is no MS reference
        alert('Check that you have set the MS reference ' +
        'for the selected element.\n\n ' +
        'Alternatively, switch to plotting the ' +
        'raw chemical sheilding instead.');
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
            return 0.5/Math.PI*w/(Math.pow(x-x0, 2)+0.25*w*w);  // Lorentzian peak
        }

        xaxis = _.range(n).map((i) => (minx + (maxx-minx)*i/(n-1)));
        yaxis = xaxis.map((x) => {
            return sortedpeaks.reduce((s, x0) => (s + lorentzian(x, x0, w)), 0);
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
        plots_data: data
    };
}

export { plotsListener };