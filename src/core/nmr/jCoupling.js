import { Coupling } from './coupling';

/**
 * Extract J-coupling between two sites if ISC tensor data is present in the model.
 *
 * @param  {Site}   site1 First site
 * @param  {Site}   site2 Second site
 * @return {Coupling|null} Coupling object or null if no ISC data
 */
export function computeJCoupling(site1, site2) {
    const a1 = site1.atoms?.[0];
    const a2 = site2.atoms?.[0];
    if (!a1 || !a2 || typeof a1.getArrayValue !== 'function') {
        return null;
    }

    let T;
    try {
        const iscArray = a1.getArrayValue('isc');
        if (!iscArray) return null;
        T = iscArray[a2.index];
    } catch (e) {
        return null;
    }

    if (!T) return null;

    const g1 = site1.gamma;
    const g2 = site2.gamma;
    const tensorHz = T.iscAtomicToHz(g1, g2);

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
        anisotropy: tensorHz.reduced_anisotropy,
        asymmetry: tensorHz.asymmetry,
    });
}
