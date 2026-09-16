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

import Plotly from 'plotly.js-dist-min';
import { PLOT_DIV_ID } from '../../plot/constants';
import { loadImage, hasCentralTransition } from '../../../utils';
import { makeSelector, DataCheckInterface, elementView, getB0, larmorHMHz } from '../utils';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
// lodash
import _ from 'lodash';

const initialPlotsState = {
    plots_mode: 'none',
    plots_element: null, // what species' spectrum to plot
    plots_use_refs: false,
    // The second-order quadrupolar shift is a physical correction that moves
    // peaks by tens to hundreds of ppm. It is opt-in so that a plot never
    // silently disagrees with the raw DFT d_iso the user came here to see.
    plots_q2_shifts: false,
    // Written by the plots listener, read by the sidebar and the plot. Derived
    // state — never set from the UI. See store/listeners/plots.js.
    plots_quad_info: { applied: false, nShifted: 0, nUnreliable: 0, maxRatio: null },
    plots_show_x_axis: true,
    plots_show_y_axis: true,
    plots_show_grid: true,
    plots_broadening_type: 'lorentzian', // 'lorentzian' | 'gaussian'
    plots_bkg_img_url: null,
    plots_bkg_img_w: 0,
    plots_bkg_img_h: 0,
    plots_auto_x: true, // if this are true, ignore the min/max values
    plots_auto_y: true, // if this are true, ignore the min/max values
    plots_min_x: 0,
    plots_max_x: 100.0,
    plots_min_y: 0,
    plots_max_y: 5.0,
    plots_peak_width: 0.5,
    plots_x_steps: 801,
    plots_data: null,
    plots_show_labels: false,
};

function makePlotAction(data) {
    return {
        type: 'update',
        data: {
            ...data,
            listen_update: [Events.PLOTS_RECALC]
        }
    };
}

class PlotsInterface extends DataCheckInterface {

    get app() {
        return this.state.app_viewer;
    }

    get hasData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('ms')));        
    }

    get mode() {
        return this.state.plots_mode;
    }

    set mode(v) {
        this.dispatch(makePlotAction({ plots_mode: v }));
    }

    get elements() {
        let elements = this.state.app_viewer.selected.elements
        // if there current selection is empty (i.e. if not elements ), use all the elements
        if (elements.length === 0) {
            elements = _.uniq(this.state.app_viewer.model.symbols);
        }
        return elements;
    }

    setDefaultElement() {
        if (!this.hasData) {
            return;
        }
        if (!this.state.element) {
            // set the default element to the first one
            this.element = this.elements[0];
            return;
        }
        if (!this.elements.includes(this.element)) {
            // the currently chosen element is not in the current selection anymore
            // set the default element to the first one
            this.element = this.elements[0];
            return;
        }
    }

    get element() {
        return this.state.plots_element;
    }

    set element(v) {
        this.dispatch(makePlotAction({ plots_element: v }));
    }

    get q2Shifts() {
        return this.state.plots_q2_shifts;
    }

    set q2Shifts(v) {
        this.dispatch(makePlotAction({ plots_q2_shifts: v }));
    }

    /**
     * The atoms the spectrum is computed over, narrowed to the chosen element.
     * Shares `elementView` with the plots listener, so what the sidebar says
     * about the data and what the plot was built from cannot diverge.
     */
    get currentAtoms() {
        return elementView(this.state)?.atoms ?? [];
    }

    /**
     * Whether the second-order quadrupolar shift can be applied to the current
     * element, and if not, why. This is the single predicate the sidebar uses
     * to enable/disable the switch and to explain itself; the plots listener
     * independently reports what it actually did via `quadInfo`.
     *
     * Returns one of:
     *   'ok'              — d_QIS is defined for at least one atom of this element
     *   'no-element'      — nothing chosen yet, or no atoms to describe
     *   'no-efg'          — the model carries no EFG data at all
     *   'not-quadrupolar' — every isotope of this element has spin <= 1/2
     *   'integer-spin'    — quadrupolar, but integer spin: no central transition
     *   'shielding-mode'  — d_QIS is a shift; it needs a referenced shift axis
     *   'no-field'        — B0 is not a valid positive field
     */
    get quadEligibility() {
        if (!this.element) return 'no-element';
        if (!this.hasEFGData) return 'no-efg';

        const spins = this.currentAtoms.map((a) => a.isotopeData?.spin);
        // Say nothing rather than assert 'not quadrupolar' about an empty set;
        // this happens transiently while a model is being swapped in.
        if (spins.length === 0) return 'no-element';
        if (!spins.some((I) => I > 0.5)) return 'not-quadrupolar';
        if (!spins.some((I) => hasCentralTransition(I))) return 'integer-spin';

        if (!this.useRefTable) return 'shielding-mode';
        if (getB0(this.state) === null) return 'no-field';
        return 'ok';
    }

    get canQuadShift() {
        return this.quadEligibility === 'ok';
    }

    /**
     * What the plots listener actually did on its last run: whether any peak
     * was moved, how many, and how far outside second-order perturbation
     * validity the worst site is. Never re-derived by the UI — see
     * store/listeners/plots.js.
     */
    get quadInfo() {
        return this.state.plots_quad_info ?? initialPlotsState.plots_quad_info;
    }

    // Read-only view onto the single, model-wide external field (ADR 0009).
    // Writing goes through AppInterface / the spectrometer field dialog.
    get B0() {
        return this.state.app_B0;
    }

    get larmorH() {
        return larmorHMHz(this.state);
    }

    get useRefTable() {
        return this.state.plots_use_refs;
    }

    set useRefTable(v) {
        this.dispatch(makePlotAction({ 
            plots_use_refs: v,
         }));
    }   

    get showXAxis() {
        return this.state.plots_show_x_axis;
    }

    set showXAxis(v) {
        this.dispatch({
            type: 'update',
            data: { plots_show_x_axis: v }
        });
    }

    get showYAxis() {
        return this.state.plots_show_y_axis;
    }

    set showYAxis(v) {
        this.dispatch({
            type: 'update',
            data: { plots_show_y_axis: v }
        });
    }

    get broadeningType() {
        return this.state.plots_broadening_type;
    }

    set broadeningType(v) {
        this.dispatch(makePlotAction({ plots_broadening_type: v }));
    }

    get showGrid() {
        return this.state.plots_show_grid;
    }

    set showGrid(v) {
        this.dispatch({
            type: 'update',
            data: {
                plots_show_grid: v
            }
        });
    }

    get showLabels() {
        return this.state.plots_show_labels;
    }

    set showLabels(v) {
        this.dispatch({
            type: 'update',
            data: {
                plots_show_labels: v
            }
        });
    }
    
    get peakW() {
        return this.state.plots_peak_width;
    }

    set peakW(v) {
        if (isNaN(v)) {
            v = 0.0;
            alert('Peak width must be a number. Setting to 0.');
        }
        v = parseFloat(v);
        if (v < 0.0) {
            v = -1.0*v;
            alert('Peak width cannot be negative. Setting to absolute value.');
        }
        this.dispatch(makePlotAction({ plots_peak_width: v }));
    }

    get autoScaleX() {
        return this.state.plots_auto_x;
    }

    set autoScaleX(v) {
        this.dispatch(makePlotAction({ plots_auto_x: v }));
    }

    get autoScaleY() {
        return this.state.plots_auto_y;
    }

    set autoScaleY(v) {
        this.dispatch(makePlotAction({ plots_auto_y: v }));
    }


    get rangeX() {
        return [this.state.plots_min_x, this.state.plots_max_x];
    }

    get floatRangeX() {
        let xmin = parseFloat(this.state.plots_min_x);
        let xmax = parseFloat(this.state.plots_max_x);

        xmin = isNaN(xmin)? 0.0 : xmin;
        xmax = isNaN(xmax)? xmin+100.0 : xmax;

        // make sure xmin < xmax
        if (xmin > xmax) {
            let tmp = xmin;
            xmin = xmax;
            xmax = tmp;
        }

        return [xmin, xmax];
    }

    get rangeY() {
        return [this.state.plots_min_y, this.state.plots_max_y];        
    }

    get floatRangeY() {
        let ymin = parseFloat(this.state.plots_min_y);
        let ymax = parseFloat(this.state.plots_max_y);

        ymin = isNaN(ymin)? 0.0 : ymin;
        ymax = isNaN(ymax)? ymin+100.0 : ymax;

        return [ymin, ymax];
    }

    get xSteps() {
        return this.state.plots_x_steps;
    }

    set xSteps(v) {
        this.dispatch(makePlotAction({ plots_x_steps: v }));
    }

    setRange(vmin=null, vmax=null, axis='x') {

        if ('xy'.indexOf(axis) < 0) {
            // Invalid axis
            return;
        }

        vmin = (vmin === null? this.state['plots_min_' + axis] : vmin);
        vmax = (vmax === null? this.state['plots_max_' + axis] : vmax);

        this.dispatch({
            type: 'update',
            data: {
                ['plots_min_' + axis]: vmin,
                ['plots_max_' + axis]: vmax,
                listen_update: [Events.PLOTS_RECALC]
            }
        });
    }

    get data() {
        return this.state.plots_data;
    }

    // download existing plot as SVG via Plotly API
    downloadSVG() {
        const div = document.getElementById(PLOT_DIV_ID);
        if (!div) return;
        Plotly.downloadImage(div, {
            format: 'svg',
            filename: 'magresview_plot',
        });
    }
    // download data
    downloadData() {
        let data = this.data[0].data;
        let csvContent = "data:text/csv;charset=utf-8,";
        // x header depends on if use_refs is true
        let xlabel = this.useRefTable? "Chemical shift /ppm" : "Shielding /ppm";
        csvContent += xlabel + ", Intensity \n";
        data.forEach(function(r) {
            let row = r.x + ", " + r.y + "\n";
            csvContent += row;
        });
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "magresview_plot_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    get bkgImage() {
        if (this.state.plots_bkg_img_url) {
            return {
                url: this.state.plots_bkg_img_url,
                width: this.state.plots_bkg_img_w,
                height: this.state.plots_bkg_img_h
            };
        }

        return null;
    }

    loadBkgImage(files) {
        const dispatch = this._dispatcher;
        loadImage(files[0]).then((img) => {
            dispatch({
                type: 'update',
                data: {
                    plots_bkg_img_url: img.src,
                    plots_bkg_img_w: img.naturalWidth,
                    plots_bkg_img_h: img.naturalHeight
                }
            });
        });
    }

    clearBkgImage() {
        this.dispatch({
            type: 'update',
            data: {
                plots_bkg_img_url: null,
                plots_bkg_img_w: 0,
                plots_bkg_img_h: 0
            }
        });
    }

}

// Hook for interface
function usePlotsInterface() {
    let state = useSelector(makeSelector('plots', ['app_viewer', 'app_B0', 'ms_references']), shallowEqual);
    let dispatcher = useDispatch();

    let intf = new PlotsInterface(state, dispatcher);

    return intf;
}


export default usePlotsInterface;
export { initialPlotsState };
