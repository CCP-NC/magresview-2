import { MAGRESVIEW_VERSION, MAGRESVIEW_GIT_COMMIT, MAGRESVIEW_GIT_TAG, DEFAULT_GRADIENT } from './constants';
import { getCalculationMetadata, getCalculationRaw } from '../../utils/utils-magres';
import { formatExportSettings, getSimplificationWarnings } from './warnings';

/**
 * Largest number of spins we will spell out in a summed operator before
 * giving up and telling the user to write it themselves.
 */
const MAX_TEMPLATE_OPERATOR_TERMS = 16;

function getVersionLabel(meta) {
    const v = meta?.appVersion || MAGRESVIEW_VERSION;
    const git = meta?.gitCommit || MAGRESVIEW_GIT_COMMIT;
    return git ? `v${v} (${git})` : `v${v}`;
}

/**
 * Format calculation metadata into human-readable summary strings.
 *
 * @param  {Object.<string, string[]>} calcMeta Parsed calculation key-value map
 * @return {string[]} Array of formatted parameter lines
 */
export function formatCalculationSummary(calcMeta) {
    if (!calcMeta || typeof calcMeta !== 'object' || Object.keys(calcMeta).length === 0) {
        return [];
    }
    const lines = [];

    const code = calcMeta.calc_code?.[0];
    const version = calcMeta.calc_code_version?.[0] || calcMeta.calc_version?.[0];
    const platform = calcMeta.calc_code_platform?.[0];
    if (code) {
        let codeStr = code;
        if (version) codeStr += ` ${version}`;
        if (platform) codeStr += ` (${platform})`;
        lines.push(`Code: ${codeStr}`);
    }

    if (calcMeta.calc_xcfunctional?.[0]) {
        lines.push(`Functional: ${calcMeta.calc_xcfunctional[0]}`);
    }

    if (calcMeta.calc_cutoffenergy?.[0]) {
        const units = calcMeta['units calc_cutoffenergy']?.[0] || '';
        lines.push(`Cutoff energy: ${calcMeta.calc_cutoffenergy[0]}${units ? ` ${units}` : ''}`);
    }

    if (calcMeta.calc_kpoint_mp_grid?.[0]) {
        const offset = calcMeta.calc_kpoint_mp_offset?.[0];
        lines.push(`K-point grid: ${calcMeta.calc_kpoint_mp_grid[0]}${offset ? ` (offset: ${offset})` : ''}`);
    }

    if (calcMeta.calc_pspot?.length > 0) {
        lines.push(`Pseudopotentials: ${calcMeta.calc_pspot.join('; ')}`);
    }

    const name = calcMeta.calc_name?.[0] || calcMeta.calc_prefix?.[0];
    if (name) {
        lines.push(`Job name: ${name}`);
    }

    if (calcMeta.calc_comment?.[0]?.trim()) {
        lines.push(`Comment: ${calcMeta.calc_comment[0].trim()}`);
    }

    const handled = new Set([
        'calc_code', 'calc_code_version', 'calc_version', 'calc_code_platform',
        'calc_code_version_git', 'calc_code_hgversion', 'calc_xcfunctional',
        'calc_cutoffenergy', 'units calc_cutoffenergy', 'calc_kpoint_mp_grid',
        'calc_kpoint_mp_offset', 'calc_pspot', 'calc_name', 'calc_prefix', 'calc_comment'
    ]);

    for (const [k, v] of Object.entries(calcMeta)) {
        if (!handled.has(k)) {
            lines.push(`${k.replace(/^calc_/, '')}: ${v.join(' ')}`);
        }
    }

    return lines;
}

/**
 * Return formatted notes for any merging or averaging that occurred.
 *
 * @param  {object} meta Metadata dictionary
 * @return {string[]} Array of human-readable merge note strings
 */
export function getMergeNotes(meta) {
    if (!meta?.merging) return [];
    const notes = [];
    for (const g of meta.merging.averageGroupMatches || []) {
        notes.push(
            `Combined average group '${g.pattern || meta.merging.averageGroups}' (${g.label}) for atoms [${g.atomIndices.join(', ')}]. Intra-group couplings were dropped.`
        );
    }
    if (meta.merging.mergeByLabel) {
        notes.push('Symmetry-equivalent nuclei were removed by CIF label.');
    }
    if (meta.merging.modelMerged && meta.merging.modelMergedFrom?.length > 1) {
        notes.push(`Model merged from complementary calculations (${meta.merging.modelMergedFrom.join(' + ')}).`);
    }
    return notes;
}

/**
 * Build a structured metadata dictionary for a SpinSystem export.
 *
 * @param  {object} params Building context
 * @return {object} Metadata dictionary
 */
export function buildSpinSystemMetadata({
    model = null,
    view = null,
    atoms = [],
    activeAtoms = [],
    sites = [],
    avgGroupMatches = [],
    options = {},
} = {}) {
    const {
        references = {},
        gradients = {},
        mergeByLabel = false,
        averageGroups = null,
        sourceFilename = null,
        modelName = null,
        mergedFrom = null,
    } = options;

    const calcMeta = getCalculationMetadata(model);
    const rawCalc = getCalculationRaw(model);
    const calcSummary = formatCalculationSummary(calcMeta);

    const totalAtomsInModel = model?.length || atoms.length;
    const selectedAtomIndices = atoms.map(a => a?.index).filter(idx => idx != null);
    const exportedIndices = sites.flatMap(s => s.atomIndices || []).filter(idx => idx != null);

    const mname = modelName || model?.name || 'model';
    const resolvedSourceFile = sourceFilename || (mname ? `${mname}.magres` : 'model.magres');

    const merging = {
        averageGroups: averageGroups || null,
        averageGroupMatches: avgGroupMatches.map(g => ({
            pattern: g.pattern || averageGroups || null,
            label: g.map(a => a.crystLabel || a.label || `${a.element}${a.index + 1}`).join(','),
            atomIndices: g.map(a => a.index),
        })),
        mergeByLabel: Boolean(mergeByLabel),
        modelMerged: Boolean(mergedFrom && mergedFrom.length > 0),
        modelMergedFrom: mergedFrom || null,
    };

    return {
        appName: 'MagresView 2',
        appVersion: MAGRESVIEW_VERSION,
        gitCommit: MAGRESVIEW_GIT_COMMIT,
        gitTag: MAGRESVIEW_GIT_TAG,
        date: new Date().toISOString(),
        sourceFile: resolvedSourceFile,
        modelName: mname,
        calculation: {
            raw: rawCalc,
            parameters: calcMeta,
            summary: calcSummary,
        },
        selection: {
            totalAtomsInModel,
            selectedIndices: selectedAtomIndices,
            isSubset: totalAtomsInModel > 0 && selectedAtomIndices.length > 0 && selectedAtomIndices.length < totalAtomsInModel,
        },
        exportedIndices,
        sites: sites.map(s => ({
            siteIndex: s.index,
            label: s.label,
            isotope: s.isotope,
            element: s.element,
            atomIndices: s.atomIndices || [],
            position: s.position,
            isAverageGroup: Boolean(s.isAverageGroup),
            averageGroupPattern: s.averageGroupPattern || null,
            reference: s.reference,
            gradient: s.gradient,
        })),
        merging,
        references,
        gradients,
    };
}

/**
 * Build the start/detect operator strings for the template.
 *
 * SIMPSON's `I<n>x` addresses spin n only, so a hardcoded `I1x` detects
 * whichever nucleus happened to come first in the selection — not the one the
 * user chose to observe. Sum over every spin carrying the observed isotope
 * instead.
 *
 * @param  {Array}  sites           Spin system sites, in `nuclei` order
 * @param  {string} observedNucleus Isotope string, e.g. '13C'
 * @return {{start: string, detect: string, isotope: string, note: string|null}}
 */
export function buildTemplateOperators(sites = [], observedNucleus = '') {
    if (sites.length === 0) {
        return { start: 'I1x', detect: 'I1p', isotope: '', note: null };
    }

    const isotope = observedNucleus && sites.some(s => s.isotope === observedNucleus)
        ? observedNucleus
        : sites[0].isotope;

    const indices = sites
        .map((s, i) => (s.isotope === isotope ? i + 1 : null))
        .filter(i => i !== null);

    if (indices.length > MAX_TEMPLATE_OPERATOR_TERMS) {
        return {
            start: `I${indices[0]}x`,
            detect: `I${indices[0]}p`,
            isotope,
            note: `${indices.length} spins carry ${isotope}; the operators above address only the `
                + 'first. Sum over all of them, or observe a smaller system.',
        };
    }

    // A half-integer quadrupolar nucleus is normally observed on its central
    // transition, which is a different operator, not a different scaling.
    const observedSites = indices.map(i => sites[i - 1]);
    const halfIntegerQuad = observedSites.some(
        s => s.spin > 0.5 && Math.abs((s.spin * 2) % 2) === 1
    );

    return {
        start: indices.map(i => `I${i}x`).join('+'),
        detect: indices.map(i => `I${i}p`).join('+'),
        isotope,
        note: halfIntegerQuad
            ? `${isotope} is a half-integer quadrupolar nucleus. To observe the central transition `
                + `only, use ${indices.map(i => `I${i}c`).join('+')} in place of the operators above.`
            : null,
    };
}

/**
 * Format the commented, runnable SIMPSON driver template.
 *
 * Every value here is a starting point rather than a recommendation: MagresView
 * has no concept of an experiment, so field, MAS rate, spectral width and pulse
 * sequence are all the user's to choose.
 *
 * @param  {string}     filename Output filename being created
 * @param  {SpinSystem} sys      SpinSystem model
 * @param  {object}     settings Export settings
 * @return {string[]}            Comment lines
 */
export function formatSimpsonTemplate(filename = 'system.spinsys', sys = null, settings = {}) {
    const sites = sys?.sites || [];
    const ops = buildTemplateOperators(sites, settings.observedNucleus);
    // SIMPSON refuses a `dipole` whose sign disagrees with its nuclei: it must be
    // negative when gamma_i * gamma_j > 0 and positive otherwise. Unaveraged
    // couplings always satisfy this. Averaging can break it, e.g. an averaged
    // CH3 proton against its geminal carbon scales the coupling by
    // P2(109.5 deg) = -1/3, and the residual between two like protons of the same
    // group has the opposite sign to the rigid one, so only offer the override
    // when a coupling needs it.
    const needsDipoleOverride = (sys?.couplings || []).some(c => {
        if (c.type !== 'D') return false;
        const gi = sites[c.site_i]?.gamma;
        const gj = sites[c.site_j]?.gamma;
        return c.coupling_constant * -(gi * gj) < 0;
    });

    // Annotations go on their own line. SIMPSON's `par` block is not parsed as
    // plain Tcl and chokes on a trailing `;#` comment after a value.
    const lines = [
        '# ------------------------------------------------------------------------------',
        '# Minimal SIMPSON driver. This is a starting point, not a validated experiment:',
        '# the field, MAS rate, spectral width, powder set and pulse sequence below are',
        '# placeholders and must be chosen for your system.',
        '#',
        `#   source ${filename}`,
        '#',
        '#   par {',
        '#       proton_frequency 400e6',
        '#       # static; set the MAS rate in Hz to spin the sample',
        '#       spin_rate        0',
        '#       rotor_angle      54.7356',
        ...(ops.isotope ? [`#       # observing ${ops.isotope}`] : []),
        `#       start_operator   ${ops.start}`,
        `#       detect_operator  ${ops.detect}`,
        '#       np               8192',
        '#       sw               500000',
        '#       # powder average; use alpha0beta0 to check tensor orientations',
        '#       crystal_file     rep100',
        '#       verbose          0',
        ...(needsDipoleOverride ? [
            '#       # a motionally averaged dipolar coupling has the opposite sign to the SIMPSON convention check',
            '#       dipole_check     false',
        ] : []),
        '#   }',
        '#   proc pulseq {} {',
        '#       global par',
        '#       delay [expr 1e6/$par(sw)]',
        '#       store 1',
        '#       acq $par(np) 1',
        '#   }',
        '#   proc main {} {',
        '#       global par',
        '#       set f [fsimpson]',
        '#       fft $f',
        '#       fsave $f spectrum.dat -xreim',
        '#   }',
    ];

    if (ops.note) {
        lines.push('#');
        for (const line of wrapComment(`Note: ${ops.note}`)) {
            lines.push(`# ${line}`);
        }
    }

    lines.push(
        '#',
        '# Guidance on setting up SIMPSON simulations:',
        '#   Bak, Rasmussen & Nielsen, J. Magn. Reson. 147, 296 (2000). doi:10.1006/jmre.2000.2179',
        '#   Tosner et al., J. Magn. Reson. 246, 79 (2014). doi:10.1016/j.jmr.2014.07.002',
        '#   Juhl, Tosner & Vosegaard, Annu. Rep. NMR Spectrosc. 100, 1 (2020).',
        '# Tensor, Euler angle and referencing conventions used to write this file are',
        "# documented in Soprano's docs/simpson-conventions.md."
    );

    return lines;
}

/**
 * Format a human-readable header block for SIMPSON spinsys files.
 *
 * @param  {string}     filename Output filename being created
 * @param  {SpinSystem} sys      SpinSystem model
 * @param  {object}     settings Export settings, recorded verbatim in the header
 * @return {string}              Comment header text block
 */
export function formatSimpsonHeader(filename = 'system.spinsys', sys = null, settings = {}) {
    const meta = sys?.metadata || {};
    const lines = [
        '# ==============================================================================',
        `# SIMPSON spin system generated by MagresView 2 ${getVersionLabel(meta)}`,
    ];

    if (meta.date) {
        lines.push(`# Generated: ${meta.date}`);
    }

    if (meta.sourceFile) {
        if (meta.merging?.modelMerged && meta.merging?.modelMergedFrom?.length > 1) {
            lines.push(`# Source files (merged calculation): ${meta.merging.modelMergedFrom.join(' + ')}`);
        } else {
            lines.push(`# Source file: ${meta.sourceFile}`);
        }
    }

    if (meta.calculation?.summary?.length > 0) {
        lines.push('#', '# MAGRES calculation:');
        for (const s of meta.calculation.summary) {
            lines.push(`#   ${s}`);
        }
    }

    const sites = sys?.sites || [];
    if (sites.length > 0) {
        lines.push('#');
        const total = meta.selection?.totalAtomsInModel;
        const totalStr = total ? ` (from ${total} atoms in model)` : '';
        const exportedIdxStr = meta.exportedIndices?.length > 0
            ? ` (atom indices: ${meta.exportedIndices.join(', ')})`
            : '';
        lines.push(`# Exported sites: ${sites.length}${totalStr}${exportedIdxStr}`);

        for (const site of sites) {
            const idx1 = site.index + 1;
            const atomIdxStr = site.atomIndices?.length > 1
                ? `atoms [${site.atomIndices.join(', ')}]`
                : (site.atomIndices?.length === 1 ? `atom ${site.atomIndices[0]}` : '');
            const posStr = site.position
                ? ` at [${site.position.map(v => Number(v).toFixed(3)).join(', ')}] Å`
                : '';
            const avgStr = site.isAverageGroup ? ' [averaged group]' : '';
            const desc = [site.isotope, atomIdxStr ? `(${atomIdxStr}, label ${site.label})` : `label ${site.label}`]
                .filter(Boolean)
                .join(' ');
            lines.push(`#   Site ${idx1}: ${desc}${posStr}${avgStr}`);
        }
    }

    const mergeNotes = getMergeNotes(meta);
    if (mergeNotes.length > 0) {
        lines.push('#', '# Merging and averaging:');
        for (const n of mergeNotes) {
            lines.push(`#   - ${n}`);
        }
    }

    const refEntries = Object.entries(meta.references || {}).filter(
        ([, val]) => val !== null && val !== undefined && val !== ''
    );
    if (refEntries.length > 0) {
        lines.push(
            '#',
            '# Shielding references, applied as delta = reference + gradient * sigma',
            '# (gradient is d(shift)/d(shielding), conventionally -1):'
        );
        for (const [el, refVal] of refEntries) {
            const grad = meta.gradients?.[el] !== undefined ? meta.gradients[el] : DEFAULT_GRADIENT;
            lines.push(`#   ${el}: reference = ${refVal} ppm, gradient = ${grad}`);
        }
    }

    if (sys?.dimension) {
        lines.push('#');
        const spinHalf = sys.spinHalfEquivalent !== undefined ? sys.spinHalfEquivalent.toFixed(1) : '0.0';
        lines.push(
            `# Spin system dimension: ${sys.dimension} (${spinHalf} spins-½ equivalent)`
        );
    }

    // Record what was asked for, so a file with interactions silently omitted is
    // distinguishable from one that genuinely has none.
    lines.push('#', '# Export settings:');
    for (const s of formatExportSettings(settings)) {
        lines.push(`#   ${s}`);
    }

    const allWarnings = [
        ...getSimplificationWarnings(sys, settings),
        ...(sys?.warnings || []).map(text => ({ level: 'notice', text })),
    ];
    if (allWarnings.length > 0) {
        lines.push('#', '# WARNINGS:');
        for (const w of allWarnings) {
            const prefix = w.level === 'warning' ? 'WARNING' : 'Note';
            for (const line of wrapComment(`${prefix}: ${w.text}`)) {
                lines.push(`#   ${line}`);
            }
        }
    }

    lines.push('#');
    lines.push(...formatSimpsonTemplate(filename, sys, settings));
    lines.push('# ==============================================================================', '');

    return lines.join('\n');
}

/**
 * Soft-wrap a long warning so the comment block stays readable in a terminal.
 */
function wrapComment(text, width = 74) {
    const words = text.split(' ');
    const out = [];
    let line = '';
    for (const w of words) {
        if (line && (line + ' ' + w).length > width) {
            out.push(line);
            line = '      ' + w;
        } else {
            line = line ? `${line} ${w}` : w;
        }
    }
    if (line) out.push(line);
    return out;
}

/**
 * Format table comment lines for Report Table exports (MS, EFG, Dipolar, J).
 *
 * @param  {SpinSystem} sys   SpinSystem model
 * @param  {string}     title Table title, e.g. "MS Table"
 * @param  {object}     opts  Options including eulerConvention and includeEuler
 * @return {string}           Comment lines text ending with newline
 */
export function formatTableComments(sys, title, opts = {}) {
    const lines = [];
    lines.push(`# ${title} generated by MagresView 2`);
    const meta = sys?.metadata || {};

    if (meta.appVersion) {
        lines.push(`# MagresView version: ${getVersionLabel(meta).replace(/^v/, '')}`);
    }
    if (meta.date) {
        lines.push(`# Generated: ${meta.date}`);
    }
    if (meta.sourceFile) {
        if (meta.merging?.modelMerged && meta.merging?.modelMergedFrom?.length > 1) {
            lines.push(`# Source files (merged calculation): ${meta.merging.modelMergedFrom.join(' + ')}`);
        } else {
            lines.push(`# Source file: ${meta.sourceFile}`);
        }
    }
    if (meta.calculation?.summary?.length > 0) {
        lines.push(`# MAGRES calculation: ${meta.calculation.summary.join(', ')}`);
    }
    if (meta.exportedIndices?.length > 0) {
        const total = meta.selection?.totalAtomsInModel;
        const totalStr = total ? ` (from ${total} atoms in model)` : '';
        lines.push(`# Exported sites: ${sys.sites.length}${totalStr}, atom indices: ${meta.exportedIndices.join(', ')}`);
    }
    for (const note of getMergeNotes(meta)) {
        lines.push(`# Merging: ${note}`);
    }
    if (opts.includeEuler) {
        lines.push(`# Euler angles convention: ${opts.eulerConvention}`);
    }
    return lines.join('\n') + '\n';
}

/**
 * Format mrsimulator dictionary with metadata.
 *
 * @param  {SpinSystem} sys         SpinSystem model
 * @param  {Array}      mrSites     List of mrsimulator site objects
 * @param  {Array}      mrCouplings List of mrsimulator coupling objects
 * @param  {object}     settings    Export settings, recorded alongside the data
 * @return {object}                 mrsimulator dictionary
 */
export function formatMrsimulatorOutput(sys, mrSites, mrCouplings, settings = {}) {
    const meta = sys?.metadata || {};
    const hasMeta = meta && Object.keys(meta).length > 0;

    const result = {
        sites: mrSites,
        couplings: mrCouplings,
    };

    if (hasMeta) {
        if (meta.sourceFile || meta.modelName) {
            result.name = meta.sourceFile || meta.modelName;
        }

        const descParts = [
            `Spin system exported by MagresView 2 ${getVersionLabel(meta)}`,
        ];
        if (meta.date) descParts.push(`Generated: ${meta.date}`);
        if (meta.sourceFile) descParts.push(`Source file: ${meta.sourceFile}`);
        if (meta.calculation?.summary?.length > 0) {
            descParts.push(`MAGRES calculation: ${meta.calculation.summary.join(', ')}`);
        }
        if (meta.exportedIndices?.length > 0) {
            descParts.push(`Exported atom indices: [${meta.exportedIndices.join(', ')}]`);
        }
        for (const note of getMergeNotes(meta)) {
            descParts.push(note);
        }
        result.description = descParts.join('. ') + '.';

        const warnings = [
            ...getSimplificationWarnings(sys, settings),
            ...(sys?.warnings || []).map(text => ({ level: 'notice', text })),
        ];

        result.metadata = {
            export_settings: formatExportSettings(settings),
            warnings: warnings.map(w => `${w.level === 'warning' ? 'WARNING' : 'Note'}: ${w.text}`),
            app: meta.appName || 'MagresView 2',
            version: meta.appVersion || MAGRESVIEW_VERSION,
            git_commit: meta.gitCommit || MAGRESVIEW_GIT_COMMIT || null,
            git_tag: meta.gitTag || MAGRESVIEW_GIT_TAG || null,
            date: meta.date || null,
            source_file: meta.sourceFile || null,
            model_name: meta.modelName || null,
            calculation: meta.calculation || null,
            selection: meta.selection || null,
            exported_indices: meta.exportedIndices || [],
            merging: meta.merging || null,
            references: meta.references || null,
            gradients: meta.gradients || null,
            dimension: sys.dimension,
            spin_half_equivalent: sys.spinHalfEquivalent,
        };
    }

    return result;
}
