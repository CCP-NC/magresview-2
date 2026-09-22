import pkg from '../../../package.json';

/**
 * NMR and Spin System Constants
 */

/**
 * Feasibility guard thresholds for spin system dimension ∏(2I + 1).
 *
 * NMR users have intuition for spin-1/2 equivalents: log2(dimension).
 *
 * - SILENT:    ≤ 256  (≤ 8 spins-1/2)  - silent
 * - SLOW:      ≤ 4096 (≤ 12 spins-1/2) - inline notice ("Simulation will be slow")
 * - INTRACTABLE: > 4096 (> 12 spins-1/2) - prominent warning ("Simulation may be intractable")
 *
 * Note: Warn, never block (contrast with missing shielding reference, which blocks).
 */
export const FEASIBILITY_LIMITS = {
    SILENT_DIMENSION: 256,
    SLOW_DIMENSION: 4096,
};

/**
 * Default referencing gradient (slope) for shielding-to-shift conversion.
 * δ = reference + gradient * σ
 * Conventionally -1.0 (linear calibration).
 */
export const DEFAULT_GRADIENT = -1.0;

/**
 * Conversion factor from atomic units of EFG to Hz when multiplied by Q (in barn).
 * Matches crystvis-js efg2hz constant.
 */
export const EFG_TO_HZ = 234964.77815245767;

/**
 * Physical constant mu_0 * hbar / (8 * pi^2) * 1e30 used in dipolar coupling calculations.
 * Units match distances in Angstrom and gyromagnetic ratios in 1e7 rad s^-1 T^-1.
 */
export const MU0_HBAR_E30 = 1.3252140307214143e-10;

/**
 * MagresView 2 application version loaded directly from package.json and git.
 */
export const MAGRESVIEW_VERSION = pkg.version;
export const MAGRESVIEW_GIT_COMMIT = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : '';
export const MAGRESVIEW_GIT_TAG = typeof __GIT_TAG__ !== 'undefined' ? __GIT_TAG__ : '';

/**
 * Largest atom selection we will compute pairwise couplings for.
 *
 * Only couplings are capped. Sites are O(N) and cost nothing worth measuring:
 * 243 sites build in under a millisecond. Couplings are O(N^2) with a
 * minimum-image search per pair, which measures 108 ms at 72 atoms and 962 ms
 * at 243, so a whole supercell locks the UI for as long as it takes.
 *
 * A selection past this cap can still be exported, as long as it does not need
 * couplings: per-site report tables and the split archive (one single-site
 * file per site) both work at any size.
 *
 * This is a build-cost guard, not a verdict on whether a simulation is
 * tractable. That question can only be answered after the build and depends on
 * the target simulator: see FEASIBILITY_LIMITS and
 * SpinSystem.mrsimulatorFeasibility. Those warn, they do not block.
 */
export const MAX_SPINSYS_COUPLED_ATOMS = 64;

