import { EFG_TO_HZ, DEFAULT_GRADIENT } from './constants';

/**
 * Site represents one nucleus in a spin system.
 * Holds isotope, spin, magnetic shielding (MS) and electric field gradient (EFG) tensors,
 * and chemical shift references.
 */
export class Site {
    constructor({
        index = 0,
        isotope = '',
        element = '',
        label = '',
        atomIndices = [],
        atoms = [],
        position = [0, 0, 0],
        spin = 0.5,
        gamma = 0,
        Q = 0,
        ms = null,
        efg = null,
        reference = null,
        gradient = DEFAULT_GRADIENT,
    } = {}) {
        this.index = index;
        this.isotope = isotope;
        this.element = element;
        this.label = label;
        this.atomIndices = atomIndices;
        this.atoms = atoms;
        this.position = position;
        this.spin = spin;
        this.gamma = gamma;
        this.Q = Q;
        this.ms = ms;
        this.efg = efg;
        this.reference = reference;
        this.gradient = gradient ?? DEFAULT_GRADIENT;
    }

    /**
     * Whether the site has a quadrupole interaction (spin > 1/2, Q != 0, and EFG tensor present)
     */
    get isQuadrupoleActive() {
        return this.spin > 0.5 && this.Q !== 0 && this.efg !== null;
    }

    /**
     * Whether the site has a valid shielding reference configured
     */
    get hasShift() {
        return (
            this.ms !== null &&
            this.reference !== null &&
            this.reference !== undefined &&
            this.reference !== '' &&
            Number.isFinite(Number(this.reference))
        );
    }

    /**
     * Isotropic chemical shift (ppm): δ_iso = reference + gradient * σ_iso
     */
    get shift_iso() {
        if (!this.hasShift) return null;
        return Number(this.reference) + this.gradient * this.ms.isotropy;
    }

    /**
     * Reduced anisotropy of the chemical shift tensor (ppm).
     * Linear referencing multiplies deviatoric eigenvalues by gradient: ζ_δ = gradient * ζ_σ.
     */
    get shift_reduced_anisotropy() {
        if (!this.hasShift) return null;
        return this.gradient * this.ms.reduced_anisotropy;
    }

    /**
     * Asymmetry of the chemical shift tensor (same as shielding asymmetry).
     */
    get shift_asymmetry() {
        if (this.ms === null) return null;
        return this.ms.asymmetry;
    }

    /**
     * Quadrupolar coupling constant C_q in Hz: C_q = efg2hz * Q * V_zz
     * V_zz is the Haeberlen/NQR largest absolute eigenvalue (|V_zz| >= |V_yy| >= |V_xx|) in atomic units.
     */
    get Cq() {
        if (!this.isQuadrupoleActive) return 0;
        const Vzz = this.efg.haeberlen_eigenvalues[2];
        return EFG_TO_HZ * this.Q * Vzz;
    }

    /**
     * Asymmetry of the EFG tensor.
     */
    get efg_asymmetry() {
        if (this.efg === null) return null;
        return this.efg.asymmetry;
    }

    /**
     * Magnetic shielding Euler angles [alpha, beta, gamma].
     */
    msEuler({ passive = true, degrees = true } = {}) {
        if (!this.ms) return [0, 0, 0];
        return this.ms.euler('zyz', !passive, 'haeberlen', degrees);
    }

    /**
     * Electric field gradient Euler angles [alpha, beta, gamma].
     */
    efgEuler({ passive = true, degrees = true } = {}) {
        if (!this.efg) return [0, 0, 0];
        return this.efg.euler('zyz', !passive, 'haeberlen', degrees);
    }
}
