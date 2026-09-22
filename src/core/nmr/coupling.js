/**
 * Coupling represents a pairwise interaction between two sites (dipolar or J coupling).
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
        anisotropy = 0,
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
        this.anisotropy = anisotropy;
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
