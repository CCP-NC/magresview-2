import _ from 'lodash';
import { dipolarCoupling, jCoupling, quadrupolarData,
         GAMMA_H, larmorFrequency } from '../../utils';

// Datatypes combining MS and EFG data for quadrupolar sites. These return
// null for non-quadrupolar sites (spin <= 1/2), which callers must tolerate.
const quadDatatypes = ['PQ', 'qis', 'dobs'];

// Parse a B0 state value (string) into a positive number in T, or null if
// invalid
function parseB0(v) {
    const B0 = parseFloat(v);
    return (isNaN(B0) || B0 <= 0) ? null : B0;
}

/**
 * The external field, in T, as a number — or null if the current input is not
 * a valid field. `app_B0` is the single, model-wide source of truth (ADR 0009);
 * nothing else in the store holds a field value.
 */
function getB0(state) {
    return parseB0(state.app_B0);
}

/**
 * Equivalent 1H Larmor frequency in MHz for the store's current B0, or null
 * if the current input is not a valid field.
 */
function larmorHMHz(state) {
    const B0 = getB0(state);
    return B0 === null ? null : larmorFrequency(GAMMA_H, B0)/1e6;
}

function makeSelector(prefix, extras=[]) {
    // Creates and returns a selector function for a given prefix
    function selector(state) {
        let ans = {};

        for (let key in state) {
            if (!_.startsWith(key, prefix) && extras.indexOf(key) === -1)
                continue;
            ans[key] = state[key];
        }

        return ans;
    }

    return selector;
}

const addPrefix = (p, n) => p + '_' + n;

function getSel(app) {
    let sel = app.selected;
    if (sel) {
        return sel.length > 0? sel : app.displayed;
    }
    else {
        return null;
    }
}

/**
 * The atoms a 1D spectrum is computed over: the current selection, or
 * everything displayed if nothing is selected, narrowed to the chosen element.
 * Returns null when there is nothing to work on (no model loaded).
 *
 * Both the plots listener and PlotsInterface go through this, so the sidebar
 * can never be describing a different set of atoms from the one the plot was
 * actually built from.
 *
 * Note that ModelView.find already searches *within* the view it is called on,
 * so no further intersection is needed to narrow by element.
 */
function elementView(state) {
    const app = state.app_viewer;
    if (!app?.model) return null;

    const view = getSel(app);
    if (!view) return null;

    const element = state.plots_element;
    return element ? view.find({ elements: [element] }) : view;
}

function getNMRData(view, datatype, tenstype='ms', reftable=null, options={}) {

    let units = '';
    let tens_units = {
        ms: 'ppm',
        efg: 'au'
    }[tenstype];
    let values = null;
    let tensors = view.map((a) => (a.getArrayValue(tenstype)));

    switch(datatype) {
        case 'iso': 
            values = tensors.map((T) => T.isotropy);
            units = tens_units;
            break;
        case 'aniso':
            values = tensors.map((T) => T.anisotropy);
            units = tens_units;
            break;
        case 'redaniso':
            values = tensors.map((T) => T.reduced_anisotropy);
            units = tens_units;
            break;            
        case 'asymm':
            values = tensors.map((T) => T.asymmetry);
            break;
        case 'span':
            values = tensors.map((T) => T.span);
            break;
        case 'skew':
            values = tensors.map((T) => T.skew);
            break;
        case 'cs':
            if (!reftable) {
                throw Error('Can not compute chemical shifts without a reference table');
            }
            values = tensors.map((T, i) => {
                let el = view.atoms[i].element;
                let ref = reftable[el];
                let cs = null;
                // only return a value if the reference is defined correctly
                if (ref !== null && ref !== undefined && ref !== '') {
                    cs = ref - T.isotropy;
                }
                return cs;
            });
            units = tens_units;
            break;
        case 'e_x':
            values = tensors.map((T) => T.haeberlen_eigenvalues[0]);
            break;
        case 'e_y':
            values = tensors.map((T) => T.haeberlen_eigenvalues[1]);
            break;
        case 'e_z':
            values = tensors.map((T) => T.haeberlen_eigenvalues[2]);
            break;
        case 'Q':
            values = tensors.map((T, i) => {
                let iD = view.atoms[i].isotopeData;
                return T.efgAtomicToHz(iD.Q).haeberlen_eigenvalues[2] / 1e6;
            });
            units = 'MHz'; // if this changes, change formatNumber as well!
            break;
        case 'PQ':
            // Quadrupolar product; null for non-quadrupolar sites
            values = view.atoms.map((a) => {
                const qd = quadrupolarData(a);
                return qd ? qd.PQ/1e6 : null;
            });
            units = 'MHz'; // if this changes, change formatNumber as well!
            break;
        case 'qis':
            // Second-order quadrupolar-induced shift of the central
            // transition under MAS; needs options.B0 (in T)
            values = view.atoms.map((a) => {
                const qd = quadrupolarData(a, options.B0);
                return qd ? qd.qis : null;
            });
            units = 'ppm';
            break;
        case 'dobs':
            // Observed shift d_obs = d_iso + d_QIS; needs options.B0 and a
            // chemical shift reference table (MS references). Null where
            // either is missing or the site is not quadrupolar.
            if (!reftable) {
                values = view.atoms.map(() => null);
                units = 'ppm';
                break;
            }
            values = view.atoms.map((a) => {
                const qd = quadrupolarData(a, options.B0);
                if (!qd || qd.qis === null) {
                    return null;
                }
                const ref = reftable[a.element];
                if (ref === null || ref === undefined || ref === '') {
                    return null;
                }
                let msT;
                try {
                    msT = a.getArrayValue('ms');
                }
                catch (e) {
                    return null;
                }
                if (!msT) {
                    return null;
                }
                return (ref - msT.isotropy) + qd.qis;
            });
            units = 'ppm';
            break;
        default:
            break;
    }

    return [units, values];
}
function formatNumber(value, unit, precision=2) {

    // if value is null, return empty string
    if (value === null) {
        return '';
    }
    // function to adapt metric prefix to number given a unit string
    // and a precision
    // returns a string with the number and the unit
    
    // special handling for Hz
    // we want the precision to be relative to the MHz scale
    if (unit === 'MHz') {
        // -- handle negative values -- //
        if (value < 0) {
            return '-' + formatNumber(-value, unit, precision);
        }

        // -- handle positive values -- //
        
        // suppress label completely if value is less than 1e-8 MHz
        if (value < 1e-8) {
            return '';
        }

        // convert to kHz if value is less than 1 MHz but larger than 1 kHz
        if (value < 1 && value > 1e-3) {
            value *= 1e3;
            unit = 'kHz';
            // scale precision to kHz scale (minimum 0)
            precision = Math.max(0, precision-3);
        }
        // Convert to Hz if value is less than 1 kHz but larger than 1e-2 Hz
        else if (value < 1e-3 && value > 1e-8) {
            value *= 1e6;
            unit = 'Hz';
            // scale precision to Hz scale (minimum 0)
            precision = Math.max(0, precision-6);
        }
        else {;
        }

    }
    return value.toFixed(precision) + ' ' + unit;
}

function getLinkLabel(a1, a2, linktype, precision=2) {

    switch (linktype) {
        case 'dip':
            const D = dipolarCoupling(a1, a2)[0];
            return (D/1e3).toFixed(precision) + ' kHz';
        case 'jc':
            const J = jCoupling(a1, a2);
            if (J === null) {
                return '';
            }
            return J.toFixed(precision) + ' Hz';
        default:
            return '';
    }
}


class BaseInterface {

    constructor(state, dispatcher) {
        this._state = state;
        this._dispatcher = dispatcher;
    }

    get state() {
        return this._state;
    }

    dispatch(action) {
        this._dispatcher(action);
    }

}

class DataCheckInterface extends BaseInterface {

    get hasModel() {
        let app = this.state.app_viewer;
        return (app && this.state.app_viewer.model);
    }

    get hasMSData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('ms')));            
    }

    get hasEFGData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('efg')));            
    }

    get hasISCData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('isc')));            
    }

}

export { 
    makeSelector, 
    addPrefix,
    getSel,
    elementView,
    getNMRData,
    quadDatatypes,
    parseB0,
    getB0,
    larmorHMHz,
    formatNumber,
    getLinkLabel,
    BaseInterface,
    DataCheckInterface
};