import _ from 'lodash';
import { dipolarCoupling, jCoupling } from '../../utils';

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

function getNMRData(view, datatype, tenstype='ms', reftable=null) {

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
                let ref = reftable[el] || 0.0;
                return ref-T.isotropy;
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
                return T.efgAtomicToHz(iD.Q).haeberlen_eigenvalues[2];
            });
            units = 'Hz'; // if this changes, change formatNumber as well!
            break;
        default:
            break;
    }

    return [units, values];
}
function formatNumber(value, unit, precision=2) {
    // function to adapt metric prefix to number given a unit string
    // and a precision
    // returns a string with the number and the unit
    
    // special hadnling for kHz
    if (unit === 'Hz') {
        // -- handle negative values -- //
        if (value < 0) {
            return '-' + formatNumber(-value, unit, precision);
        }

        // -- handle positive values -- //
        
        // suppress label completely if value is less than 1e-8 kHz
        if (value < 1e-8) {
            return '';
        }

        let prefix = '';
        // convert to MHz if value is greater than 1 MHz
        if (value > 1e6) {
            value /= 1e6;
            prefix = 'M';
            // hard-coded precision for MHz
            precision = 3;
        }
        // Convert to kHz if value is > 1 kHz but < 1 MHz
        else if (value > 1e3) {
            value /= 1e3;
            prefix = 'k';
            // hard-coded precision for kHz
            precision = 1;
        }
        else {
            // hard-coded precision for Hz
            precision = 0;
        }
        unit = prefix + 'Hz';

    }
    return value.toFixed(precision) + ' ' + unit;
}

function getLinkLabel(a1, a2, linktype) {

    switch (linktype) {
        case 'dip':
            const D = dipolarCoupling(a1, a2)[0];
            return (D/1e3).toFixed(2) + ' kHz';
        case 'jc':
            const J = jCoupling(a1, a2);
            if (J === null) {
                return '';
            }
            return J.toFixed(2) + ' Hz';
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
    getNMRData,
    formatNumber,
    getLinkLabel,
    BaseInterface,
    DataCheckInterface
};