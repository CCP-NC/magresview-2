import { TensorData } from '@ccp-nc/crystvis-js';
import { MU0_HBAR_E30 } from './constants';
import { Coupling } from './coupling';

/**
 * Compute the shortest displacement vector from p1 to p2 using the minimum image convention
 * if the model is periodic.
 *
 * @param  {Array<number>} p1    Coordinates of first point [x, y, z]
 * @param  {Array<number>} p2    Coordinates of second point [x, y, z]
 * @param  {object}        model CrystVis model (or null)
 * @return {Array<number>}       Shortest displacement vector [dx, dy, dz]
 */
export function computeMinimumImageDisplacement(p1, p2, model) {
    if (!model || !model.periodic || !model.cell) {
        return [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    }

    const r = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    const f = model.absToFrac(r);
    if (!f) {
        return r;
    }

    const rx = Math.round(f[0]);
    const ry = Math.round(f[1]);
    const rz = Math.round(f[2]);

    let bestR = r;
    let minNormSq = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                const ftest = [f[0] - rx + dx, f[1] - ry + dy, f[2] - rz + dz];
                const cart = model.fracToAbs(ftest);
                const normSq = cart[0] * cart[0] + cart[1] * cart[1] + cart[2] * cart[2];
                if (normSq < minNormSq) {
                    minNormSq = normSq;
                    bestR = cart;
                }
            }
        }
    }

    return bestR;
}

/**
 * Compute the dipolar coupling tensor between two positions and gyromagnetic ratios.
 *
 * @param  {Array<number>} r  Displacement vector from site 1 to site 2 (Angstroms)
 * @param  {number}        g1 Gyromagnetic ratio of site 1
 * @param  {number}        g2 Gyromagnetic ratio of site 2
 * @return {object}           { d, R, rnorm, D }
 */
export function dipolarTensorFromDisplacement(r, g1, g2) {
    const R = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2]);
    if (R < 1e-6) {
        return null;
    }

    const rnorm = [r[0] / R, r[1] / R, r[2] / R];
    // d = -mu_0 * hbar / (8 * pi^2 * R^3) * g1 * g2
    const d = -MU0_HBAR_E30 * g1 * g2 / (8 * Math.PI * Math.PI * Math.pow(R, 3));

    // Full 3x3 interaction tensor: D_ij = d * (3 * r_i * r_j - delta_ij)
    const D = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            D[i][j] = d * (3 * rnorm[i] * rnorm[j] - (i === j ? 1 : 0));
        }
    }

    return { d, R, rnorm, D };
}

/**
 * Compute a single dipolar Coupling between two sites.
 */
export function computeDipolarCoupling(site1, site2, model) {
    const r = computeMinimumImageDisplacement(site1.position, site2.position, model);
    const res = dipolarTensorFromDisplacement(r, site1.gamma, site2.gamma);
    if (!res) return null;

    const tensor = new TensorData(res.D);

    return new Coupling({
        type: 'D',
        site_i: site1.index,
        site_j: site2.index,
        site_i_label: site1.label,
        site_j_label: site2.label,
        distance: res.R,
        displacement: r,
        tensor,
        coupling_constant: res.d,
        anisotropy: 3 * res.d,
        asymmetry: 0,
    });
}

/**
 * Check if atom selection contains multiple periodic images of the same base atom.
 */
export function checkForMultipleImages(atoms) {
    if (!atoms || atoms.length === 0) return false;
    const seenIndices = new Set();
    for (const a of atoms) {
        // Base atom index in unit cell
        const baseIdx = a.index !== undefined ? a.index : a._index;
        if (baseIdx !== undefined) {
            if (seenIndices.has(baseIdx)) {
                return true;
            }
            seenIndices.add(baseIdx);
        }
    }
    return false;
}
