import { FEASIBILITY_LIMITS } from './constants';

/**
 * Calculate total spin system Hilbert space dimension: ∏(2I + 1).
 */
export function calculateDimension(sites) {
    if (!sites || sites.length === 0) return 1;
    return sites.reduce((prod, s) => prod * (2 * (s.spin ?? 0.5) + 1), 1);
}

/**
 * Calculate spin-1/2 equivalent (log2 of dimension).
 */
export function calculateSpinHalfEquivalent(dim) {
    if (dim <= 0) return 0;
    return Math.log2(dim);
}

/**
 * Determine feasibility category based on dimension.
 */
export function getFeasibility(dim) {
    if (dim <= FEASIBILITY_LIMITS.SILENT_DIMENSION) return 'silent';
    if (dim <= FEASIBILITY_LIMITS.SLOW_DIMENSION) return 'slow';
    return 'warning';
}

/**
 * Compute connected components of the coupling graph.
 *
 * @param  {number} numSites Number of sites
 * @param  {Array<Coupling>} couplings Couplings list
 * @return {Array<Array<number>>} List of component site index arrays
 */
export function getConnectedComponents(numSites, couplings) {
    const parent = Array.from({ length: numSites }, (_, i) => i);
    function find(i) {
        if (parent[i] === i) return i;
        return (parent[i] = find(parent[i]));
    }
    function union(i, j) {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent[rootI] = rootJ;
    }

    for (const c of couplings) {
        if (c.site_i < numSites && c.site_j < numSites) {
            union(c.site_i, c.site_j);
        }
    }

    const components = {};
    for (let i = 0; i < numSites; i++) {
        const root = find(i);
        if (!components[root]) components[root] = [];
        components[root].push(i);
    }
    return Object.values(components);
}

/**
 * SpinSystem models a complete collection of sites and couplings for NMR export.
 */
export class SpinSystem {
    constructor({
        sites = [],
        couplings = [],
        warnings = [],
        missingReferences = [],
        model = null,
    } = {}) {
        this.sites = sites;
        this.couplings = couplings;
        this.warnings = warnings;
        this.missingReferences = missingReferences;
        this.model = model;
    }

    /**
     * Whether export is allowed. Blocked if any element in the selection with MS data
     * is missing a shielding reference (ADR-0010).
     */
    get canExport() {
        return this.missingReferences.length === 0;
    }

    /**
     * Total Hilbert space dimension: ∏(2I + 1)
     */
    get dimension() {
        return calculateDimension(this.sites);
    }

    /**
     * Spin-1/2 equivalent (log2(dimension))
     */
    get spinHalfEquivalent() {
        return calculateSpinHalfEquivalent(this.dimension);
    }

    /**
     * Feasibility status for simulation ('silent' | 'slow' | 'warning')
     */
    get feasibility() {
        return getFeasibility(this.dimension);
    }

    /**
     * Connected components of the coupling graph
     */
    get connectedComponents() {
        return getConnectedComponents(this.sites.length, this.couplings);
    }

    /**
     * Dimension of the largest connected component of the coupling graph
     */
    get maxComponentDimension() {
        const comps = this.connectedComponents;
        if (comps.length === 0) return 1;
        let maxDim = 1;
        for (const comp of comps) {
            const compSites = comp.map(idx => this.sites[idx]);
            const dim = calculateDimension(compSites);
            if (dim > maxDim) maxDim = dim;
        }
        return maxDim;
    }

    /**
     * Feasibility status for mrsimulator (uses largest connected component)
     */
    get mrsimulatorFeasibility() {
        return getFeasibility(this.maxComponentDimension);
    }

    /**
     * List of unique isotope strings in the spin system
     */
    get isotopes() {
        return Array.from(new Set(this.sites.map(s => s.isotope)));
    }
}
