/**
 * Coupling represents a pairwise interaction between two sites (dipolar or J coupling).
 *
 * `anisotropy` (Δ = σzz − (σxx+σyy)/2) and `reduced_anisotropy` (ζ = σzz − σiso) carry one
 * definition for both types. Unless given explicitly they are read from the tensor, so a pure
 * dipolar pair has Δ = 3d and ζ = 2d. Writers use ζ.
 */
export class Coupling {
    constructor({
        type, // 'D' | 'J'
        site_i,
        site_j,
        site_i_label = '',
        site_j_label = '',
        distance = 0,
        displacement = [0, 0, 0],
        tensor = null,
        coupling_constant = 0,
        anisotropy = undefined,
        reduced_anisotropy = undefined,
        asymmetry = 0,
    } = {}) {
        this.type = type;
        this.site_i = site_i;
        this.site_j = site_j;
        this.site_i_label = site_i_label;
        this.site_j_label = site_j_label;
        this.distance = distance;
        this.displacement = displacement;
        this.tensor = tensor;
        this.coupling_constant = coupling_constant;
        this.anisotropy = anisotropy ?? tensor?.anisotropy ?? 0;
        this.reduced_anisotropy = reduced_anisotropy ?? tensor?.reduced_anisotropy ?? 0;
        this.asymmetry = asymmetry;
    }

    /**
     * Euler angles of the interaction tensor [alpha, beta, gamma].
     */
    euler({ passive = true, degrees = true } = {}) {
        if (!this.tensor) return [0, 0, 0];
        return this.tensor.euler('zyz', !passive, 'haeberlen', degrees);
    }
}
