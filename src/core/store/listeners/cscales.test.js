import { describe, it, expect, vi } from 'vitest';

import { TensorData } from '@ccp-nc/crystvis-js';
import { getIsotopeData } from '@ccp-nc/crystvis-js/lib/data.js';

import { colorScaleListener } from './cscales';

import baseline from '../../../utils/quad-shift-baseline.json';

// Minimal AtomImage stand-in
function makeAtom(element, isotope, efgM, msM) {
    const efgT = efgM ? new TensorData(efgM) : null;
    const msT = msM ? new TensorData(msM) : null;
    return {
        element: element,
        isotopeData: getIsotopeData(element, isotope),
        getArrayValue: (name) => {
            if (name === 'efg') return efgT;
            if (name === 'ms') return msT;
            throw Error('No such array');
        }
    };
}

// Minimal ModelView stand-in
function makeView(atoms) {
    return {
        atoms: atoms,
        length: atoms.length,
        map: (f) => atoms.map(f),
        xor: () => makeView([]),
        setProperty: vi.fn()
    };
}

function makeState(view, overrides={}) {
    return {
        app_viewer: { displayed: view, selected: makeView([]) },
        cscale_view: null,
        cscale_displ: null,
        cscale_type: 'efg_qis',
        cscale_cmap: 'viridis',
        cscale_lims: [0, 1],
        cscale_lims_override: null,
        cscale_units: '',
        efg_B0: '14.1',
        ms_references: {},
        ...overrides
    };
}

const naSite = baseline.sites.find((s) => s.element === 'Na');
const hSite = baseline.sites.find((s) => s.element === 'H');

describe('colorScaleListener quadrupolar modes', () => {

    it('greys out non-quadrupolar sites instead of failing', () => {
        const na = makeAtom('Na', 23, naSite.efg_tensor, naSite.ms_tensor);
        const al = makeAtom('Al', 27, naSite.efg_tensor, naSite.ms_tensor);
        const h = makeAtom('H', 1, hSite.efg_tensor, hSite.ms_tensor);
        const view = makeView([na, al, h]);
        const state = makeState(view);

        expect(() => colorScaleListener(state)).not.toThrow();

        const colors = view.setProperty.mock.calls
            .find((c) => c[0] === 'color')[1];

        expect(colors.length).toBe(3);
        // Quadrupolar sites get colour-scale colours
        expect(colors[0]).not.toBe('#888888');
        expect(colors[1]).not.toBe('#888888');
        // The spin-1/2 site is greyed out
        expect(colors[2]).toBe('#888888');

        // Limits only span the valid values
        expect(state.cscale_lims[0]).not.toBe(0);
        expect(state.cscale_units).toBe('ppm');
    });

    it('uncolours everything for d_obs with no reference set', () => {
        const na = makeAtom('Na', 23, naSite.efg_tensor, naSite.ms_tensor);
        const view = makeView([na]);
        const state = makeState(view, { cscale_type: 'efg_dobs' });

        expect(() => colorScaleListener(state)).not.toThrow();

        const colors = view.setProperty.mock.calls
            .find((c) => c[0] === 'color')[1];
        expect(colors).toBeNull();
    });

    it('colours d_obs sites once a reference exists', () => {
        const na = makeAtom('Na', 23, naSite.efg_tensor, naSite.ms_tensor);
        const view = makeView([na]);
        const state = makeState(view, {
            cscale_type: 'efg_dobs',
            ms_references: { Na: naSite.reference }
        });

        colorScaleListener(state);

        const colors = view.setProperty.mock.calls
            .find((c) => c[0] === 'color')[1];
        expect(colors[0]).not.toBe('#888888');
        expect(state.cscale_lims[0]).toBeCloseTo(naSite.dobs_ppm, 4);
    });

});
