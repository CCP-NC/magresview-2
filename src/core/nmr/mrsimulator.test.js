import { describe, it, expect } from 'vitest';
import { TensorData } from '@ccp-nc/crystvis-js';
import { Site } from './site';
import { Coupling } from './coupling';
import { SpinSystem } from './spinSystem';
import { computeDipolarCoupling } from './dipolar';
import { toMrsimulator } from './mrsimulator';
import { EFG_TO_HZ } from './constants';

const D2R = Math.PI / 180;

const matMul = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((s, _x, k) => s + A[i][k] * B[k][j], 0)));
const transpose = A => A[0].map((_, j) => A.map(row => row[j]));

/**
 * T_lab = R diag(evals) R^T with R = Rz(gamma) Ry(beta) Rz(alpha) built from the
 * passive-style rotation matrices below, angles in radians.
 *
 * This is the convention mrsimulator 1.0.0 was verified to use, and it is the
 * SIMPSON one: the same numbers, only in radians. Verified by simulating CSA +
 * dipolar, CSA + J and CSA + EFG static powders with misaligned tensors in
 * SIMPSON, in mrsimulator, and from an analytic spectrum built straight from the
 * lab-frame tensors. With the opposite ("active") sense mrsimulator disagreed
 * with the analytic spectrum by 15-35% RMS; with this one, 0.1%.
 */
function labTensor(evals, alpha, beta, gamma) {
    const [ca, sa, cb, sb, cg, sg] = [Math.cos(alpha), Math.sin(alpha), Math.cos(beta), Math.sin(beta), Math.cos(gamma), Math.sin(gamma)];
    const Rz = (c, s) => [[c, s, 0], [-s, c, 0], [0, 0, 1]];
    const Ry = [[cb, 0, -sb], [0, 1, 0], [sb, 0, cb]];
    const R = matMul(Rz(cg, sg), matMul(Ry, Rz(ca, sa)));
    return matMul(R, matMul([[evals[0], 0, 0], [0, evals[1], 0], [0, 0, evals[2]]], transpose(R)));
}

const haeberlen = (iso, zeta, eta) => [iso - 0.5 * zeta * (1 + eta), iso - 0.5 * zeta * (1 - eta), iso + zeta];

function expectMatrixClose(actual, expected, tol = 1e-9, scale = 1) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            expect(Math.abs(actual[i][j] - expected[i][j]) / scale).toBeLessThan(tol);
        }
    }
}

describe('mrsimulator writer: Euler angle sense', () => {

    // Tensors deliberately misaligned, with eta != 0 and non-trivial alpha and gamma.
    const sigma = labTensor(haeberlen(50, -80, 0.6), 30 * D2R, 50 * D2R, 70 * D2R);
    const efgEvals = (cq, Q, eta) => haeberlen(0, cq / (EFG_TO_HZ * Q), eta);

    it('writes shielding angles that rebuild the original tensor', () => {
        const site = new Site({ index: 0, isotope: '13C', element: 'C', ms: new TensorData(sigma), reference: 0, gradient: -1 });
        const out = toMrsimulator(new SpinSystem({ sites: [site] }));
        const { zeta, eta, alpha, beta, gamma } = out.sites[0].shielding_symmetric;

        expectMatrixClose(labTensor(haeberlen(site.ms.isotropy, zeta, eta), alpha, beta, gamma), sigma);
    });

    it('writes quadrupolar angles that rebuild the original EFG', () => {
        const Q = 2.86;
        const efg = labTensor(efgEvals(20000, Q, 0.3), 70 * D2R, 40 * D2R, 15 * D2R);
        const ms = new TensorData(sigma);
        const site = new Site({ index: 0, isotope: '2H', element: 'H', spin: 1, Q, ms, efg: new TensorData(efg), reference: 0, gradient: -1 });
        const out = toMrsimulator(new SpinSystem({ sites: [site] }));
        const { Cq, eta, alpha, beta, gamma } = out.sites[0].quadrupolar;

        expect(Cq).toBeCloseTo(20000, 4);
        const vzz = Cq / (EFG_TO_HZ * Q);
        expectMatrixClose(labTensor(haeberlen(0, vzz, eta), alpha, beta, gamma), efg);
    });

    it('writes dipolar angles that rebuild the original dipolar tensor', () => {
        const th = 70 * D2R, ph = 40 * D2R;
        const c = new Site({ index: 0, isotope: '13C', element: 'C', gamma: 67.2828e6, position: [0, 0, 0] });
        const h = new Site({ index: 1, isotope: '1H', element: 'H', gamma: 267.522e6,
            position: [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)] });
        const dip = computeDipolarCoupling(c, h, null);
        const out = toMrsimulator(new SpinSystem({ sites: [c, h], couplings: [dip] }));
        const { D, alpha, beta, gamma } = out.couplings[0].dipolar;

        const r = dip.displacement.map(x => x / dip.distance);
        const expected = r.map((ri, i) => r.map((rj, j) => dip.coupling_constant * (3 * ri * rj - (i === j ? 1 : 0))));
        expectMatrixClose(labTensor([-D, -D, 2 * D], alpha, beta, gamma), expected, 1e-9, Math.abs(D));
    });
});

describe('mrsimulator writer: referencing gradient', () => {
    const ms = new TensorData([[40, 0, 0], [0, 60, 0], [0, 0, 140]]);
    const build = gradient => new SpinSystem({
        sites: [new Site({ index: 0, isotope: '13C', element: 'C', ms, reference: 170, gradient })],
    });

    it('scales the anisotropy by the gradient, consistently with the isotropic shift', () => {
        // sigma_iso = 80, reduced sigma anisotropy = +60
        const at = g => toMrsimulator(build(g)).sites[0];

        expect(at(-1).isotropic_chemical_shift).toBeCloseTo(90, 9);
        expect(at(-1).shielding_symmetric.zeta).toBeCloseTo(60, 9);

        expect(at(-0.9).isotropic_chemical_shift).toBeCloseTo(98, 9);
        expect(at(-0.9).shielding_symmetric.zeta).toBeCloseTo(54, 9);
    });

    it('leaves the asymmetry untouched by the gradient', () => {
        const eta = g => toMrsimulator(build(g)).sites[0].shielding_symmetric.eta;

        expect(eta(-0.9)).toBeCloseTo(eta(-1), 12);
    });
});
