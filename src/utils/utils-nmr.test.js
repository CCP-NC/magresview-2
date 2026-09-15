import { describe, it, expect } from 'vitest';

import { TensorData } from '@ccp-nc/crystvis-js';
import { getIsotopeData } from '@ccp-nc/crystvis-js/lib/data.js';

import { GAMMA_H, larmorFrequency, quadrupoleProduct, secondOrderShift,
         quadrupolarData } from './utils-nmr';
import { getNMRData } from '../core/store/utils';

import baseline from './quad-shift-baseline.json';

// Mock the minimal AtomImage interface used by the quadrupolar utilities
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

// Mock the minimal ModelView interface used by getNMRData
function makeView(atoms) {
    return {
        atoms: atoms,
        map: (f) => atoms.map(f)
    };
}

describe('quadrupolar formulas', () => {

    it('computes the 1H Larmor frequency at 14.1 T', () => {
        // 42.577 MHz/T * 14.1 T
        expect(larmorFrequency(GAMMA_H, 14.1)/1e6).toBeCloseTo(600.34, 1);
    });

    it('takes the absolute value of gamma', () => {
        expect(larmorFrequency(-GAMMA_H, 14.1)).toBeGreaterThan(0);
    });

    it('computes the quadrupolar product', () => {
        expect(quadrupoleProduct(3e6, 0.0)).toBeCloseTo(3e6);
        expect(quadrupoleProduct(3e6, 1.0)).toBeCloseTo(3e6*Math.sqrt(4.0/3.0));
        // sign of C_Q is kept
        expect(quadrupoleProduct(-3e6, 0.5)).toBeLessThan(0);
    });

    it('matches the textbook -6000 (PQ/nu0)^2 coefficient for I=5/2', () => {
        // Well-known approximation for the CT MAS centre-of-gravity shift
        const qis = secondOrderShift(3e6, 2.5, 104.3e6);
        expect(qis).toBeCloseTo(-6000*Math.pow(3/104.3, 2), 6);
    });

});

describe('soprano oracle baseline (docs/adr/0008)', () => {

    const B0 = baseline.B0_T;
    const sites = baseline.sites;

    sites.forEach((site) => {

        const label = `${site.isotope}${site.element}`;

        if (site.spin > 0.5) {

            it(`agrees with soprano isotope data for ${label}`, () => {
                const iD = getIsotopeData(site.element, site.isotope);
                expect(iD.spin).toBeCloseTo(site.spin);
                expect(iD.gamma/site.gamma).toBeCloseTo(1.0, 5);
                expect(iD.Q/site.Q_mb).toBeCloseTo(1.0, 5);
            });

            it(`reproduces soprano C_Q, P_Q and d_QIS for ${label}`, () => {
                const a = makeAtom(site.element, site.isotope,
                                   site.efg_tensor, site.ms_tensor);
                const qd = quadrupolarData(a, B0);

                expect(qd).not.toBeNull();
                expect(qd.CQ/1e6/site.CQ_MHz).toBeCloseTo(1.0, 4);
                expect(qd.PQ/1e6/site.PQ_MHz).toBeCloseTo(1.0, 4);
                expect(qd.qis/site.qis_ppm).toBeCloseTo(1.0, 4);
            });

            it(`reproduces soprano d_obs for ${label}`, () => {
                const a = makeAtom(site.element, site.isotope,
                                   site.efg_tensor, site.ms_tensor);
                const view = makeView([a]);
                const reftable = { [site.element]: site.reference };

                const [units, values] = getNMRData(view, 'dobs', 'efg',
                                                   reftable, { B0: B0 });
                expect(units).toBe('ppm');
                expect(values[0]/site.dobs_ppm).toBeCloseTo(1.0, 4);
            });

        }
        else {

            it(`returns null for the non-quadrupolar site ${label}`, () => {
                const a = makeAtom(site.element, site.isotope,
                                   site.efg_tensor, site.ms_tensor);
                expect(quadrupolarData(a, B0)).toBeNull();

                const view = makeView([a]);
                ['PQ', 'qis'].forEach((mode) => {
                    const values = getNMRData(view, mode, 'efg',
                                              null, { B0: B0 })[1];
                    expect(values[0]).toBeNull();
                });
                const dobs = getNMRData(view, 'dobs', 'efg',
                                        { [site.element]: site.reference },
                                        { B0: B0 })[1];
                expect(dobs[0]).toBeNull();
            });

        }

    });

    it('returns null d_obs when no reference is set', () => {
        const site = sites[0];
        const a = makeAtom(site.element, site.isotope,
                           site.efg_tensor, site.ms_tensor);
        const view = makeView([a]);

        // No reference table at all
        expect(getNMRData(view, 'dobs', 'efg', null, { B0: B0 })[1][0]).toBeNull();
        // Empty reference for the element
        expect(getNMRData(view, 'dobs', 'efg', { [site.element]: '' },
                          { B0: B0 })[1][0]).toBeNull();
    });

    it('returns null d_QIS without a field', () => {
        const site = sites[0];
        const a = makeAtom(site.element, site.isotope,
                           site.efg_tensor, site.ms_tensor);
        const qd = quadrupolarData(a, null);
        expect(qd).not.toBeNull();
        expect(qd.qis).toBeNull();
        const view = makeView([a]);
        expect(getNMRData(view, 'qis', 'efg', null, {})[1][0]).toBeNull();
    });

});
