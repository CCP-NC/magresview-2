import { TensorData } from '@ccp-nc/crystvis-js';
import { computeMinimumImageDisplacement, dipolarTensorFromDisplacement } from './dipolar';
import { Coupling } from './coupling';

/**
 * Parse and validate a functional group pattern string like 'CH3' or 'NH2'.
 *
 * Valid pattern: element symbol (with optional site digits, e.g. 'C1') followed
 * strictly by 'H' and an integer count of hydrogens (>= 1).
 * Strings with trailing nonsense (e.g. 'CH3dffdfsdfs') return null.
 *
 * @param  {string} pattern Pattern to parse
 * @return {{target: string, count: number}|null} Parsed target element/label and H count, or null
 */
export function parseAverageGroupPattern(pattern) {
    if (!pattern || typeof pattern !== 'string') return null;
    const trimmed = pattern.trim();
    const match = trimmed.match(/^([A-Z][a-z]?\d*)H([1-9]\d*)$/);
    if (!match) return null;
    return {
        target: match[1],
        count: parseInt(match[2], 10),
    };
}

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
        const parsed = parseAverageGroupPattern(pat);
        if (!parsed) continue;

        const { target, count: n } = parsed;

        // Find candidate central atoms with element or crystallographic label matching target
        const centralAtoms = atoms.filter(a => {
            if (a.element === target) return true;
            const lbl = a.crystLabel || a.label;
            return Boolean(lbl && lbl === target);
        });

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
                        groupInSet.pattern = pat.trim();
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
 * Compute the jump-averaged dipolar coupling between two sites, either of which may belong
 * to an average group. Per ADR-0008 it is the mean of the dipolar tensors over every pair of
 * distinct member atoms: all ordered pairs inside a group, member against external atom,
 * or member against member for two groups. The tensor is averaged first and d read off after,
 * so the result is generally not axial.
 */
export function computeAveragedDipolarCoupling(site1, site2, model) {
    const members = site => (site.memberAtoms && site.memberAtoms.length > 0
        ? site.memberAtoms
        : [{ xyz: site.position, isotopeData: { gamma: site.gamma } }]);
    const atoms1 = members(site1);
    const atoms2 = members(site2);

    const tensors = [];
    let sumR = 0;
    let count = 0;

    for (const a1 of atoms1) {
        for (const a2 of atoms2) {
            // A member is not coupled to itself
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
        anisotropy: tensor.anisotropy,
        reduced_anisotropy: tensor.reduced_anisotropy,
        asymmetry: tensor.asymmetry,
    });
}
