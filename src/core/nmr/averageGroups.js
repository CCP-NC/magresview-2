import { TensorData } from '@ccp-nc/crystvis-js';
import { computeMinimumImageDisplacement, dipolarTensorFromDisplacement } from './dipolar';
import { Coupling } from './coupling';

/**
 * Find functional group patterns like 'CH3' or 'NH2' in a model or list of atoms.
 *
 * @param  {Array<AtomImage>} atoms List of atoms to search
 * @param  {string|Array<string>} patterns Patterns (e.g. 'CH3' or ['CH3', 'NH2'])
 * @return {Array<Array<AtomImage>>} List of atom groups
 */
export function findAverageGroups(atoms, patterns) {
    if (!patterns || !atoms || atoms.length === 0) return [];
    const patternList = Array.isArray(patterns)
        ? patterns
        : patterns.split(',').map(s => s.trim()).filter(Boolean);

    const groups = [];

    for (const pat of patternList) {
        if (!pat.includes('H')) continue;
        const parts = pat.split('H');
        const X = parts[0];
        const n = parseInt(parts[1], 10);
        if (!X || isNaN(n)) continue;

        // Find candidate central atoms with element X
        // We look at all atoms in the structure / selection that have bondedAtoms
        const centralAtoms = atoms.filter(a => a.element === X);

        for (const center of centralAtoms) {
            const bonded = center.bondedAtoms || [];
            const bondedH = bonded.filter(a => a.element === 'H');
            if (bondedH.length === n) {
                // Check if all bonded H are in our atom set
                const groupInSet = bondedH.filter(h => atoms.some(a => a === h || a.index === h.index));
                if (groupInSet.length === n) {
                    // Avoid duplicate groups
                    const indices = groupInSet.map(a => a.index).sort().join(',');
                    if (!groups.some(g => g.map(a => a.index).sort().join(',') === indices)) {
                        groupInSet.pattern = pat;
                        groups.push(groupInSet);
                    }
                }
            }
        }
    }

    return groups;
}

/**
 * Compute the arithmetic mean of 3x3 matrices.
 */
export function averageMatrix3x3(matrices) {
    const avg = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    const N = matrices.length;
    if (N === 0) return avg;

    for (const M of matrices) {
        const mat = Array.isArray(M) ? M : (M.toArray ? M.toArray() : M._data);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                avg[r][c] += mat[r][c] / N;
            }
        }
    }
    return avg;
}

/**
 * Compute tensor-averaged dipolar coupling between two sites (which may be averaged groups).
 * Per ADR-0008, computes the mean of the dipolar tensors from every pair of member positions.
 */
export function computeAveragedDipolarCoupling(site1, site2, model) {
    const atoms1 = site1.atoms && site1.atoms.length > 0 ? site1.atoms : [{ xyz: site1.position, isotopeData: { gamma: site1.gamma } }];
    const atoms2 = site2.atoms && site2.atoms.length > 0 ? site2.atoms : [{ xyz: site2.position, isotopeData: { gamma: site2.gamma } }];

    const tensors = [];
    let sumR = 0;
    let count = 0;

    for (const a1 of atoms1) {
        for (const a2 of atoms2) {
            // Check for intra-group coupling
            if (a1 === a2 || (a1.index !== undefined && a1.index === a2.index)) {
                continue;
            }
            const r = computeMinimumImageDisplacement(a1.xyz, a2.xyz, model);
            const res = dipolarTensorFromDisplacement(r, site1.gamma, site2.gamma);
            if (res) {
                tensors.push(res.D);
                sumR += res.R;
                count++;
            }
        }
    }

    if (tensors.length === 0) return null;

    const avgD = averageMatrix3x3(tensors);
    const tensor = new TensorData(avgD);

    // Extract coupling constant: in NQR / Haeberlen convention, largest absolute eigenvalue is 2*d
    const evals = tensor.haeberlen_eigenvalues;
    const d = evals[2] / 2.0;
    const avgDistance = sumR / count;
    const disp = computeMinimumImageDisplacement(site1.position, site2.position, model);

    return new Coupling({
        type: 'D',
        site_i: site1.index,
        site_j: site2.index,
        site_i_label: site1.label,
        site_j_label: site2.label,
        distance: avgDistance,
        displacement: disp,
        tensor,
        coupling_constant: d,
        anisotropy: 3 * d,
        asymmetry: tensor.asymmetry,
    });
}
