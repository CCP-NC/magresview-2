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
