import { TensorData } from '@ccp-nc/crystvis-js';
import { Coupling } from './coupling';
import { averageMatrix3x3 } from './averageGroups';

/**
 * Extract J-coupling between two sites if ISC tensor data is present in the model.
 *
 * For average group members the ISC tensors (in Hz, converted with this pair's
 * gyromagnetic ratios) are averaged over every pair of distinct member atoms, as for
 * the dipolar coupling in ADR-0008.
 *
 * @param  {Site}   site1 First site
 * @param  {Site}   site2 Second site
 * @return {Coupling|null} Coupling object or null if no ISC data
 */
export function computeJCoupling(site1, site2) {
    const g1 = site1.gamma;
    const g2 = site2.gamma;

    const tensors = [];
    for (const a1 of site1.memberAtoms || []) {
        if (typeof a1?.getArrayValue !== 'function') continue;
        let iscArray;
        try {
            iscArray = a1.getArrayValue('isc');
        } catch (e) {
            continue;
        }
        if (!iscArray) continue;

        for (const a2 of site2.memberAtoms || []) {
            if (a1 === a2) continue;
            const T = iscArray[a2.index];
            if (T) tensors.push(T.iscAtomicToHz(g1, g2));
        }
    }

    if (tensors.length === 0) return null;
    const tensorHz = tensors.length === 1
        ? tensors[0]
        : new TensorData(averageMatrix3x3(tensors.map(t => t.data)));

    const displacement = [
        site2.position[0] - site1.position[0],
        site2.position[1] - site1.position[1],
        site2.position[2] - site1.position[2],
    ];
    const distance = Math.hypot(...displacement);

    return new Coupling({
        type: 'J',
        site_i: site1.index,
        site_j: site2.index,
        site_i_label: site1.label,
        site_j_label: site2.label,
        distance,
        displacement,
        tensor: tensorHz,
        coupling_constant: tensorHz.isotropy,
        anisotropy: tensorHz.anisotropy,
        reduced_anisotropy: tensorHz.reduced_anisotropy,
        asymmetry: tensorHz.asymmetry,
    });
}
