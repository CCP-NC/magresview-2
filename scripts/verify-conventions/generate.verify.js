/**
 * Writes the three misaligned verification systems with the real MagresView
 * writers. Skipped unless VERIFY_OUT names an output directory.
 *
 *   VERIFY_OUT=/tmp/verify npx vitest run --config scripts/verify-conventions/vitest.verify.config.js
 *
 * Tensors are defined directly as lab-frame matrices and handed to the writers,
 * which have to recover the Euler angles themselves. The lab matrices are also
 * written to systems.json, so verify.py builds its analytic spectra from the
 * same numbers without knowing anything about angle conventions.
 */
import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TensorData } from '@ccp-nc/crystvis-js';
import nmrdata from '@ccp-nc/crystvis-js/lib/nmrdata.js';
import {
    Site, Coupling, SpinSystem, EFG_TO_HZ,
    computeDipolarCoupling, toSimpson, toMrsimulator,
} from '../../src/core/nmr';

const OUT = process.env.VERIFY_OUT;
const D2R = Math.PI / 180;

const matMul = (A, B) => A.map((_, i) => B[0].map((__, j) => A[i].reduce((s, _x, k) => s + A[i][k] * B[k][j], 0)));
const transpose = A => A[0].map((_, j) => A.map(row => row[j]));
const haeberlen = (iso, zeta, eta) => [iso - 0.5 * zeta * (1 + eta), iso - 0.5 * zeta * (1 - eta), iso + zeta];

// Lab tensor R diag(evals) R^T, R = Rz(gamma) Ry(beta) Rz(alpha) with passive-style rotation matrices.
function labTensor(evals, alphaDeg, betaDeg, gammaDeg) {
    const [a, b, g] = [alphaDeg, betaDeg, gammaDeg].map(x => x * D2R);
    const Rz = t => [[Math.cos(t), Math.sin(t), 0], [-Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
    const Ry = t => [[Math.cos(t), 0, -Math.sin(t)], [0, 1, 0], [Math.sin(t), 0, Math.cos(t)]];
    const R = matMul(Rz(g), matMul(Ry(b), Rz(a)));
    return matMul(R, matMul([[evals[0], 0, 0], [0, evals[1], 0], [0, 0, evals[2]]], transpose(R)));
}

const gamma = (el, A) => nmrdata[el].isotopes[String(A)].gamma;

describe.skipIf(!OUT)('verification systems', () => {
    it('writes SIMPSON and mrsimulator files for three misaligned systems', () => {
        fs.mkdirSync(OUT, { recursive: true });
        const truth = {};

        const carbon = (sigma) => new Site({
            index: 0, isotope: '13C', element: 'C', label: 'C1', gamma: gamma('C', 13),
            ms: new TensorData(sigma), reference: 0, gradient: -1,
        });
        const proton = new Site({ index: 1, isotope: '1H', element: 'H', label: 'H1', gamma: gamma('H', 1) });
        const sigmaC = labTensor(haeberlen(50, -80, 0.6), 30, 50, 70);

        // A: 13C CSA + 1H dipolar, H at polar 70 deg / azimuth 40 deg, 1.09 A away
        {
            const th = 70 * D2R, ph = 40 * D2R;
            const c = carbon(sigmaC);
            const h = new Site({
                ...proton,
                position: [1.09 * Math.sin(th) * Math.cos(ph), 1.09 * Math.sin(th) * Math.sin(ph), 1.09 * Math.cos(th)],
            });
            const dip = computeDipolarCoupling(c, h, null);
            truth.A_csa_dip = { observed: '13C', sigma: sigmaC, dipolar: dip.tensor.data };
            emit('A_csa_dip', new SpinSystem({ sites: [c, h], couplings: [dip] }), '13C');
        }

        // B: 13C CSA + anisotropic J (20 Hz iso, zeta = 3000 Hz, eta = 0.4)
        {
            const J = labTensor(haeberlen(20, 3000, 0.4), 20, 110, 55);
            const tensor = new TensorData(J);
            const cp = new Coupling({
                type: 'J', site_i: 0, site_j: 1, tensor,
                coupling_constant: tensor.isotropy, asymmetry: tensor.asymmetry,
            });
            truth.B_csa_J = { observed: '13C', sigma: sigmaC, J };
            emit('B_csa_J', new SpinSystem({ sites: [carbon(sigmaC), proton], couplings: [cp] }), '13C');
        }

        // C: 2H CSA + EFG (Cq = 20 kHz, eta = 0.3), first-order quadrupole
        {
            const Q = nmrdata.H.isotopes['2'].Q;
            const cq = 20000;
            const vzz = cq / (EFG_TO_HZ * Q);
            const sigma = labTensor(haeberlen(30, -60, 0.5), 25, 65, 80);
            const efg = labTensor(haeberlen(0, vzz, 0.3), 70, 40, 15);
            const d = new Site({
                index: 0, isotope: '2H', element: 'H', label: 'D1', spin: 1, Q, gamma: gamma('H', 2),
                ms: new TensorData(sigma), efg: new TensorData(efg), reference: 0, gradient: -1,
            });
            truth.C_csa_efg = { observed: '2H', sigma, efg, vzz, Cq: cq };
            emit('C_csa_efg', new SpinSystem({ sites: [d] }), '2H', 1);
        }

        fs.writeFileSync(path.join(OUT, 'systems.json'), JSON.stringify(truth, null, 1));
    });
});

function emit(name, sys, observed, qOrder = 2) {
    fs.writeFileSync(path.join(OUT, `${name}.spinsys`), toSimpson(sys, {
        observed_nucleus: observed, q_order: qOrder, include_header: false,
    }));
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(toMrsimulator(sys), null, 1));
}
