/**
 * MRSimulator export writer.
 * Converts a SpinSystem model to an MRSimulator JSON schema dictionary.
 * Conventions:
 * - Angles in active ZYZ radians
 * - Shielding reduced anisotropy in shielding_symmetric.zeta (shielding sign, not shift sign)
 * - Isotropic chemical shift in isotropic_chemical_shift
 * - Full zeta in j_symmetric.zeta (not divided by 2)
 * - 0-based site_index: [site_i, site_j]
 */
export function toMrsimulator(sys, options = {}) {
    if (!sys.canExport) {
        const missing = sys.missingReferences.join(', ');
        throw new Error(`Cannot export spin system: missing shielding reference for element(s): ${missing}`);
    }

    const {
        include_ms = true,
        include_efg = true,
        include_dip = true,
        include_j = true,
        include_angles = true,
        include_ms_angles = null,
        include_efg_angles = null,
        include_dipolar_angles = null,
        include_jcoupling_angles = null,
        ms_isotropic = false,
    } = options;

    const useMsAngles = include_ms_angles !== null ? include_ms_angles : include_angles;
    const useEfgAngles = include_efg_angles !== null ? include_efg_angles : include_angles;
    const useDipAngles = include_dipolar_angles !== null ? include_dipolar_angles : include_angles;
    const useJAngles = include_jcoupling_angles !== null ? include_jcoupling_angles : include_angles;

    // Build sites
    const mrSites = [];
    for (const site of sys.sites) {
        const siteData = {
            isotope: site.isotope,
            label: site.label,
        };

        if (site.ms && include_ms) {
            siteData.isotropic_chemical_shift = site.shift_iso;

            const shielding_symmetric = {
                zeta: ms_isotropic ? 0 : site.ms.reduced_anisotropy,
                eta: ms_isotropic ? 0 : site.ms.asymmetry,
            };

            if (useMsAngles && !ms_isotropic) {
                // Active ZYZ in radians
                const [alpha, beta, gamma] = site.msEuler({ passive: false, degrees: false });
                shielding_symmetric.alpha = alpha;
                shielding_symmetric.beta = beta;
                shielding_symmetric.gamma = gamma;
            }

            siteData.shielding_symmetric = shielding_symmetric;
        }

        if (site.efg && site.isQuadrupoleActive && include_efg) {
            const quadrupolar = {
                Cq: site.Cq,
                eta: site.efg_asymmetry,
            };

            if (useEfgAngles) {
                // Active ZYZ in radians
                const [alpha, beta, gamma] = site.efgEuler({ passive: false, degrees: false });
                quadrupolar.alpha = alpha;
                quadrupolar.beta = beta;
                quadrupolar.gamma = gamma;
            }

            siteData.quadrupolar = quadrupolar;
        }

        mrSites.push(siteData);
    }

    // Build couplings (merging dipolar and J for each site pair)
    const couplingMap = new Map();

    for (const c of sys.couplings) {
        const i = Math.min(c.site_i, c.site_j);
        const j = Math.max(c.site_i, c.site_j);
        const key = `${i},${j}`;

        if (!couplingMap.has(key)) {
            couplingMap.set(key, { site_index: [i, j] });
        }
        const entry = couplingMap.get(key);

        if (c.type === 'D' && include_dip) {
            const dipolar = {
                D: c.coupling_constant,
            };
            if (useDipAngles) {
                const [alpha, beta, gamma] = c.euler({ passive: false, degrees: false });
                dipolar.alpha = alpha;
                dipolar.beta = beta;
                dipolar.gamma = gamma;
            }
            entry.dipolar = dipolar;
        } else if (c.type === 'J' && include_j) {
            entry.isotropic_j = c.coupling_constant;
            const j_symmetric = {
                zeta: c.anisotropy,
                eta: c.asymmetry,
            };
            if (useJAngles) {
                const [alpha, beta, gamma] = c.euler({ passive: false, degrees: false });
                j_symmetric.alpha = alpha;
                j_symmetric.beta = beta;
                j_symmetric.gamma = gamma;
            }
            entry.j_symmetric = j_symmetric;
        }
    }

    const mrCouplings = Array.from(couplingMap.values()).filter(
        entry => entry.dipolar !== undefined || entry.isotropic_j !== undefined
    );

    return {
        sites: mrSites,
        couplings: mrCouplings,
    };
}
