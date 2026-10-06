/**
 * Simplification warnings for spin system export.
 *
 * These are judgements about the *settings*, not about the structure, so they
 * live apart from the build-time warnings that `buildSpinSystem` records on
 * the SpinSystem itself. A spin system is physically fine; a spin system with
 * dipolar couplings switched off may well be nonsense.
 *
 * Both the sidebar and the exported file header render this list, so a user
 * who sends someone a .spinsys sends the caveats with it.
 */

import { parseAverageGroupPattern } from './averageGroups';

/**
 * Default export settings. Writers and the UI share this shape.
 */
export const DEFAULT_EXPORT_SETTINGS = {
    scope: 'system',          // 'system' (one coupled file) | 'site' (one file per site)
    target: 'simpson',        // 'simpson' | 'mrsimulator'
    includeMS: true,
    includeEFG: true,
    includeD: false,
    includeJ: false,
    quadrupoleOrder: 2,       // effective order: 0 when EFG is off
    includeCrossTerms: true,  // derived from quadrupoleOrder, never set directly
    includeAngles: true,
    msIsotropic: false,
    mergeByLabel: false,
    averageGroups: '',
    observedNucleus: '',
    dipolarHomonuclear: false,
};

/**
 * Whether second-order cross-terms apply, given the quadrupole treatment.
 *
 * `quadrupole_x_dipole` and `quadrupole_x_shift` are second-order terms.
 * SIMPSON 6.0.1 does not refuse them alongside a first-order quadrupole: it
 * applies them, producing an inconsistently truncated Hamiltonian and a
 * silently different answer. It *does* hard-error when they appear with no
 * `quadrupole` line at all. So cross-terms are derived here, never offered as
 * an independent switch.
 *
 * @param  {boolean} includeEFG      Whether quadrupole lines are written
 * @param  {number}  quadrupoleOrder Quadrupole treatment order (0, 1 or 2)
 * @return {boolean}                 Whether to emit cross-term lines
 */
export function crossTermsApply(includeEFG, quadrupoleOrder) {
    return Boolean(includeEFG) && Number(quadrupoleOrder) === 2;
}

/**
 * Human-readable one-line summary of each setting, for the file header.
 *
 * @param  {object} settings Export settings
 * @return {string[]}        Formatted "Key: value" lines
 */
export function formatExportSettings(settings = {}) {
    const s = { ...DEFAULT_EXPORT_SETTINGS, ...settings };
    const yn = v => (v ? 'yes' : 'no');

    const lines = [
        `Scope: ${s.scope === 'site' ? 'one file per site (no couplings)' : 'full coupled spin system'}`,
        `Magnetic shielding: ${yn(s.includeMS)}${s.includeMS && s.msIsotropic ? ' (isotropic only, anisotropy discarded)' : ''}`,
        `Quadrupolar: ${s.includeEFG ? `yes, order ${s.quadrupoleOrder}` : 'no'}`,
    ];

    if (s.target === 'simpson') {
        lines.push(`Second-order cross-terms: ${yn(crossTermsApply(s.includeEFG, s.quadrupoleOrder))}`);
    }

    // Couplings cannot exist in a one-site file, so report the scope rather
    // than whatever the checkboxes happened to be left on.
    if (s.scope === 'site') {
        lines.push(
            'Dipolar couplings: n/a (one file per site)',
            'J couplings: n/a (one file per site)'
        );
    } else {
        lines.push(
            `Dipolar couplings: ${s.includeD ? (s.dipolarHomonuclear ? 'yes (homonuclear only)' : 'yes') : 'no'}`,
            `J couplings: ${yn(s.includeJ)}`
        );
    }

    lines.push(`Tensor orientations: ${s.includeAngles ? 'yes' : 'no (all Euler angles set to zero)'}`);

    if (s.mergeByLabel) {
        lines.push('Symmetry-equivalent nuclei: removed (first site per label kept)');
    }
    if (s.averageGroups) {
        lines.push(`Average groups: ${s.averageGroups}`);
    }
    if (s.observedNucleus) {
        lines.push(`Observed nucleus: ${s.observedNucleus}`);
    }

    return lines;
}

/**
 * Warnings and notices arising from the combination of spin system and settings.
 *
 * @param  {SpinSystem} sys      The built spin system
 * @param  {object}     settings Export settings
 * @return {Array<{level: string, text: string}>} 'warning' is load-bearing, 'notice' is informational
 */
export function getSimplificationWarnings(sys, settings = {}) {
    const s = { ...DEFAULT_EXPORT_SETTINGS, ...settings };
    const sites = sys?.sites || [];
    const out = [];

    const warn = text => out.push({ level: 'warning', text });
    const note = text => out.push({ level: 'notice', text });

    const perSite = s.scope === 'site';
    const coupled = sites.length > 1 && !perSite;
    const quadrupolar = sites.filter(site => site.isQuadrupoleActive);
    const withMS = sites.filter(site => site.ms !== null && site.ms !== undefined);
    const averaged = sites.filter(site => site.isAverageGroup);

    if (perSite) {
        note(
            'Per-site export: every file holds one isolated nucleus, so all couplings are '
            + 'omitted by construction. Use the full spin system if the couplings matter.'
        );
    }

    // --- Omitted interactions -------------------------------------------------
    if (!s.includeMS && withMS.length > 0) {
        warn(
            `Magnetic shielding omitted for ${withMS.length} site(s) that carry an MS tensor. `
            + 'Every spin will resonate at zero offset.'
        );
    }

    if (!s.includeEFG && quadrupolar.length > 0) {
        warn(
            `Quadrupolar interaction omitted for ${quadrupolar.length} quadrupole-active site(s) `
            + `(${[...new Set(quadrupolar.map(site => site.isotope))].join(', ')}). `
            + 'This is usually the dominant interaction for these nuclei.'
        );
    } else if (s.includeEFG && quadrupolar.length > 0 && Number(s.quadrupoleOrder) === 1) {
        note(
            'Quadrupolar interaction treated to first order only. Second-order quadrupolar '
            + 'shifts and quadrupolar cross-terms are excluded.'
        );
    }

    if (coupled && !s.includeD) {
        warn(
            `Dipolar couplings omitted from a ${sites.length}-site system. The simulation may not `
            + 'correctly represent the actual system.'
        );
    }

    if (coupled && s.includeD && s.dipolarHomonuclear) {
        note(
            'Only homonuclear dipolar couplings were written. Heteronuclear couplings present in '
            + 'the structure are missing.'
        );
    }

    if (!s.includeAngles) {
        const text =
            'Tensor orientations omitted: every tensor is written with zero Euler angles, so all '
            + 'principal axes are aligned with the lab frame.';
        if (coupled || (sys?.couplings?.length || 0) > 0) {
            warn(`${text} Relative orientations are lost and a coupled simulation will be wrong.`);
        } else {
            note(text);
        }
    }

    if (s.includeMS && s.msIsotropic && withMS.length > 0) {
        note('Shielding anisotropy discarded: only the isotropic shift is written.');
    }

    // --- Site reductions ------------------------------------------------------
    if (s.mergeByLabel) {
        if (s.includeD || s.includeJ) {
            warn(
                'Symmetry-equivalent nuclei were removed while couplings are switched on. Only the '
                + 'first site of each label survives, so the coupling network is incomplete rather '
                + 'than reduced. Switch couplings off before removing equivalent nuclei.'
            );
        } else {
            note(
                'Symmetry-equivalent nuclei removed: the first site of each crystallographic label '
                + 'is kept and the rest discarded. Nothing is averaged.'
            );
        }
    }

    for (const site of averaged) {
        warn(
            `Site ${site.index + 1} (${site.label}) averaged to 1 spin. `
            + 'Internal couplings dropped (fast-rotation limit for heteronuclear observation).'
        );
    }

    if (s.averageGroups) {
        const rawPatterns = s.averageGroups.split(',').map(p => p.trim()).filter(Boolean);
        const invalidPatterns = rawPatterns.filter(p => !parseAverageGroupPattern(p));
        if (invalidPatterns.length > 0) {
            warn(
                `Unrecognised average group pattern(s): ${invalidPatterns.join(', ')}. `
                + 'Patterns must have the form XHn (e.g. CH3, NH2).'
            );
        } else if (averaged.length === 0) {
            note(`Average group pattern '${s.averageGroups}' matched no groups in the selection.`);
        }
    }

    return out;
}
