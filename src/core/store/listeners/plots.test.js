import { describe, it, expect } from 'vitest';

import { TensorData } from '@ccp-nc/crystvis-js';
import { getIsotopeData } from '@ccp-nc/crystvis-js/lib/data.js';

import { plotsListener } from './plots';
import { elementView } from '../utils';

import baseline from '../../../utils/quad-shift-baseline.json';

// Minimal AtomImage stand-in
function makeAtom(element, isotope, efgM, msM, crystLabel) {
    const efgT = efgM ? new TensorData(efgM) : null;
    const msT = msM ? new TensorData(msM) : null;
    return {
        element: element,
        isotope: isotope,
        crystLabel: crystLabel || `${element}1`,
        isotopeData: getIsotopeData(element, isotope),
        getArrayValue: (name) => {
            if (name === 'efg') return efgT;
            if (name === 'ms') return msT;
            throw Error('No such array');
        }
    };
}

// Minimal ModelView stand-in supporting find and and
function makeView(atoms) {
    return {
        atoms: atoms,
        length: atoms.length,
        map: (f) => atoms.map(f),
        find: (query) => {
            const els = query.elements || [];
            return makeView(atoms.filter((a) => els.includes(a.element)));
        },
        and: (other) => makeView(atoms.filter((a) => other.atoms.includes(a))),
    };
}

function makeState(view, overrides={}) {
    return {
        // CrystVis sets model/displayed/selected together, so a mock without
        // `model` is not a state the app can actually be in.
        app_viewer: { model: {}, displayed: view, selected: makeView([]) },
        plots_mode: 'line1d',
        plots_element: null,
        plots_use_refs: true,
        plots_q2_shifts: true,
        plots_auto_x: true,
        plots_min_x: 0,
        plots_max_x: 100,
        plots_peak_width: 0.5,
        plots_x_steps: 101,
        plots_broadening_type: 'lorentzian',
        app_B0: '14.1',
        ms_references: {},
        ...overrides
    };
}

const site = (el) => baseline.sites.find((s) => s.element === el);

const naSite = site('Na');
const alSite = site('Al');
const hSite  = site('H');
const nSite  = site('N');
const coSite = site('Co');

// Run the listener for a single baseline site and hand back the first peak
// plus the quad bookkeeping.
function runSite(s, overrides={}) {
    const a = makeAtom(s.element, s.isotope, s.efg_tensor, s.ms_tensor, `${s.element}1`);
    const view = makeView([a]);
    const state = makeState(view, {
        plots_element: s.element,
        ms_references: { [s.element]: s.reference },
        ...overrides
    });
    const res = plotsListener(state);
    return {
        peak: res.plots_data[0]?.peaks[0],
        quad: res.plots_quad_info
    };
}

describe('plotsListener quadrupolar peak shifts', () => {

    it('plots pure chemical shift when q2_shifts is off', () => {
        const { peak, quad } = runSite(alSite, { plots_q2_shifts: false });
        expect(peak).toBeCloseTo(alSite.reference - alSite.s_iso, 2);
        expect(quad.applied).toBe(false);
        expect(quad.nShifted).toBe(0);
    });

    it('shifts peaks to d_obs = d_iso + d_QIS in shift mode', () => {
        const { peak, quad } = runSite(alSite);
        expect(peak).toBeCloseTo(alSite.dobs_ppm, 2);
        expect(quad.applied).toBe(true);
        expect(quad.nShifted).toBe(1);
        expect(quad.nUnreliable).toBe(0);
        expect(quad.maxRatio).toBeCloseTo(alSite.ratio, 6);
    });

    // d_QIS is a shift, not a shielding: there is no reference in shielding
    // mode, hence no experimental spectrum to compare against (ADR 0009).
    it('never applies d_QIS in shielding mode', () => {
        const { peak, quad } = runSite(naSite, { plots_use_refs: false });
        expect(peak).toBeCloseTo(naSite.s_iso, 2);
        expect(quad.applied).toBe(false);
        expect(quad.nShifted).toBe(0);
    });

    it('does not shift spin-1/2 nuclei (1H)', () => {
        const withQ    = runSite(hSite);
        const withoutQ = runSite(hSite, { plots_q2_shifts: false });

        expect(withQ.peak).toBeCloseTo(withoutQ.peak, 6);
        expect(withQ.peak).toBeCloseTo(hSite.reference - hSite.s_iso, 4);
        expect(withQ.quad.applied).toBe(false);
    });

    // Regression guard: 14N is the default nitrogen isotope and has spin 1.
    // Applying the central-transition formula to it produces a spurious shift
    // of several hundred ppm — several spectral widths for nitrogen.
    it('does not shift integer-spin quadrupolar nuclei (14N)', () => {
        const withQ    = runSite(nSite);
        const withoutQ = runSite(nSite, { plots_q2_shifts: false });

        expect(withQ.peak).toBeCloseTo(withoutQ.peak, 6);
        expect(withQ.peak).toBeCloseTo(nSite.reference - nSite.s_iso, 4);
        expect(withQ.quad.applied).toBe(false);
        expect(withQ.quad.nShifted).toBe(0);
    });

    it('flags sites beyond second-order perturbation validity (59Co)', () => {
        const { peak, quad } = runSite(coSite);
        expect(peak).toBeCloseTo(coSite.dobs_ppm, 2);
        // The shift is still applied — but the user is told not to trust it
        expect(quad.applied).toBe(true);
        expect(quad.nShifted).toBe(1);
        expect(quad.nUnreliable).toBe(1);
        expect(quad.maxRatio).toBeCloseTo(coSite.ratio, 6);
    });

    it('does not shift when B0 is not a valid field', () => {
        const { peak, quad } = runSite(alSite, { app_B0: '0' });
        expect(peak).toBeCloseTo(alSite.reference - alSite.s_iso, 2);
        expect(quad.applied).toBe(false);
    });

    it('shifts only the eligible atoms in a mixed set', () => {
        // Al (CT, within validity), Co (CT, beyond validity), N (integer spin)
        // and H (spin-1/2) plotted together: only the two CT sites move.
        const sites = [alSite, coSite, nSite, hSite];
        const view = makeView(sites.map(
            (s) => makeAtom(s.element, s.isotope, s.efg_tensor, s.ms_tensor, `${s.element}1`)
        ));
        const refs = Object.fromEntries(sites.map((s) => [s.element, s.reference]));
        const state = makeState(view, { plots_element: null, ms_references: refs });

        const res = plotsListener(state);
        const quad = res.plots_quad_info;

        expect(quad.nShifted).toBe(2);           // Al and Co only
        expect(quad.nUnreliable).toBe(1);        // Co only
        expect(quad.maxRatio).toBeCloseTo(coSite.ratio, 6);

        // N and H land on their unshifted chemical shifts
        const peaks = res.plots_data[0].peaks;
        expect(peaks).toContainEqual(expect.closeTo(nSite.reference - nSite.s_iso, 4));
        expect(peaks).toContainEqual(expect.closeTo(hSite.reference - hSite.s_iso, 4));
    });

    it('reports empty quad info when the plot is off', () => {
        const { quad } = runSite(alSite, { plots_mode: 'none' });
        expect(quad).toEqual({ applied: false, nShifted: 0, nUnreliable: 0, maxRatio: null });
    });

});

// The sidebar decides whether the control is available from
// PlotsInterface.currentAtoms, while the listener decides what to shift from
// its own view. Both now go through elementView; these tests pin that, so the
// two cannot drift back apart.
describe('elementView is shared by the listener and the interface', () => {

    const sites = [alSite, nSite, hSite];
    const atoms = sites.map(
        (s) => makeAtom(s.element, s.isotope, s.efg_tensor, s.ms_tensor, `${s.element}1`)
    );

    it('narrows to the chosen element', () => {
        const state = makeState(makeView(atoms), { plots_element: 'Al' });
        expect(elementView(state).atoms).toEqual([atoms[0]]);
    });

    it('returns every displayed atom when no element is chosen', () => {
        const state = makeState(makeView(atoms), { plots_element: null });
        expect(elementView(state).atoms).toHaveLength(3);
    });

    it('prefers a non-empty selection over everything displayed', () => {
        const state = makeState(makeView(atoms), { plots_element: null });
        state.app_viewer.selected = makeView([atoms[1]]);
        expect(elementView(state).atoms).toEqual([atoms[1]]);
    });

    it('returns null with no model, rather than throwing', () => {
        const state = makeState(makeView(atoms));
        state.app_viewer = { model: null, selected: null, displayed: null };
        expect(elementView(state)).toBeNull();
        // ...and the listener degrades to an empty plot instead of blowing up
        expect(() => plotsListener(state)).not.toThrow();
        expect(plotsListener(state).plots_data).toEqual([]);
    });

    it('feeds the listener exactly the atoms it shifts', () => {
        const state = makeState(makeView(atoms), {
            plots_element: 'Al',
            ms_references: { Al: alSite.reference }
        });
        const view = elementView(state);
        const quad = plotsListener(state).plots_quad_info;
        // one Al atom in the view, one peak shifted
        expect(view.atoms).toHaveLength(1);
        expect(quad.nShifted).toBe(1);
    });

});
