import { MAGRESVIEW_VERSION, MAGRESVIEW_GIT_COMMIT, MAGRESVIEW_GIT_TAG } from './constants';
import { getCalculationMetadata, getCalculationRaw } from '../../utils/utils-magres';

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
 * Format a human-readable header block for SIMPSON spinsys files.
 *
 * @param  {string}     filename Output filename being created
 * @param  {SpinSystem} sys      SpinSystem model
 * @return {string}              Comment header text block
 */
export function formatSimpsonHeader(filename = 'system.spinsys', sys = null) {
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
        lines.push('#', '# Shielding references:');
        for (const [el, refVal] of refEntries) {
            const grad = meta.gradients?.[el] !== undefined ? meta.gradients[el] : -1.0;
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

    lines.push(
        '#',
        '# Minimal runnable SIMPSON .in template to source and simulate this system:',
        '#',
        `#   source ${filename}`,
        '#',
        '#   par {',
        '#       proton_frequency 400e6',
        '#       start_operator   I1x',
        '#       detect_operator  I1p',
        '#       np               8192',
        '#       sw               500000',
        '#       crystal_file     rep64',
        '#       verbose          0',
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
        '# ==============================================================================',
        ''
    );

    return lines.join('\n');
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
 * @return {object}                 mrsimulator dictionary
 */
export function formatMrsimulatorOutput(sys, mrSites, mrCouplings) {
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

        result.metadata = {
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
