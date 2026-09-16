/**
 * MagresView 2.0
 *
 * Utilities for detecting and merging complementary Magres models/files (e.g. NMR shielding + EFG).
 */

import { load as parseMagres } from '@ccp-nc/crystvis-js/lib/formats/magres.js';

/**
 * Extract calculation metadata key-value pairs from a Model or Atoms object.
 * Returns an object mapping key -> string[] of line values.
 *
 * @param {Model|Object} model 
 * @returns {Object.<string, string[]>}
 */
export function getCalculationMetadata(model) {
    if (!model) return {};
    const info = model._atoms_base?.info || model.info || {};
    const rawCalc = info['magres-blocks']?.calculation || info.magresblock_calculation || info.calculation;
    if (!rawCalc) return {};

    const meta = {};

    if (typeof rawCalc === 'string') {
        const lines = rawCalc.split(/\r?\n/);
        for (const line of lines) {
            const trim = line.trim();
            if (!trim || trim.startsWith('#')) continue;
            const parts = trim.split(/\s+/);
            const key = parts[0];
            const val = parts.slice(1).join(' ').trim();
            if (!meta[key]) meta[key] = [];
            meta[key].push(val);
        }
    } else if (Array.isArray(rawCalc)) {
        for (const item of rawCalc) {
            if (typeof item === 'string') {
                const parts = item.trim().split(/\s+/);
                const key = parts[0];
                const val = parts.slice(1).join(' ').trim();
                if (!meta[key]) meta[key] = [];
                meta[key].push(val);
            }
        }
    } else if (typeof rawCalc === 'object') {
        for (const [key, val] of Object.entries(rawCalc)) {
            if (Array.isArray(val)) {
                meta[key] = val.map(item => Array.isArray(item) ? item.join(' ') : String(item));
            } else if (val !== null && val !== undefined) {
                meta[key] = [String(val)];
            }
        }
    }

    return meta;
}

/**
 * Helper to parse pseudopotential entries into a Map of species -> definition.
 * Supports CASTEP (e.g. "H 1|0.6|...") and QE-GIPAW (e.g. "Si.pbe-tm-gipaw.UPF").
 *
 * @param {string[]} vals 
 * @returns {Map<string, string>}
 */
function parsePspots(vals) {
    const pspots = new Map();
    for (const v of vals) {
        const parts = v.trim().split(/\s+/);
        if (parts.length >= 2) {
            // CASTEP format: <species> <definition>
            pspots.set(parts[0], parts.slice(1).join(' '));
        } else if (parts.length === 1) {
            // QE-GIPAW format: <filename> (e.g. Si.pbe-tm-gipaw.UPF)
            const match = parts[0].match(/^([A-Za-z]+(?::[A-Za-z]+)?)[._]/);
            const species = match ? match[1] : parts[0];
            pspots.set(species, parts[0]);
        }
    }
    return pspots;
}

/**
 * Check whether two metadata values match, accounting for whitespace
 * and floating-point token equivalence (e.g. "40.00 Ry" == "40.0 Ry").
 *
 * @param {string} strA 
 * @param {string} strB 
 * @returns {boolean}
 */
function valuesMatch(strA, strB) {
    if (strA === strB) return true;
    const tokensA = strA.replace(/\s+/g, ' ').trim().split(' ');
    const tokensB = strB.replace(/\s+/g, ' ').trim().split(' ');
    if (tokensA.length !== tokensB.length) return false;

    for (let i = 0; i < tokensA.length; i++) {
        const tA = tokensA[i];
        const tB = tokensB[i];
        if (tA === tB) continue;
        const numA = Number(tA);
        const numB = Number(tB);
        if (!isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) < 1e-6) {
            continue;
        }
        return false;
    }
    return true;
}

/**
 * Check if two models have conflicting calculation metadata keys.
 * For example, if pseudopotentials, functionals, cutoffs, or k-grids differ, returns true.
 *
 * @param {Model|Object} modelA 
 * @param {Model|Object} modelB 
 * @returns {boolean} True if there is a clash, false otherwise.
 */
export function hasMetadataClash(modelA, modelB) {
    const metaA = getCalculationMetadata(modelA);
    const metaB = getCalculationMetadata(modelB);

    // 1. Check pseudopotentials (calc_pspot)
    if (metaA.calc_pspot && metaB.calc_pspot) {
        const pspotsA = parsePspots(metaA.calc_pspot);
        const pspotsB = parsePspots(metaB.calc_pspot);

        for (const [species, potA] of pspotsA) {
            if (pspotsB.has(species)) {
                const potB = pspotsB.get(species);
                if (potA !== potB) {
                    return true; // Clash in pseudopotentials for this species
                }
            }
        }
    }

    // 2. Check all common single-value calculation keys
    const ignoreKeys = new Set([
        'calc_pspot',
        'calc_comment',
        'calc_name',
        'calc_code_version_git',
        'calc_code_hgversion'
    ]);

    for (const key of Object.keys(metaA)) {
        if (ignoreKeys.has(key)) continue;
        if (!metaB[key]) continue;

        const valsA = metaA[key].map(v => v.trim()).filter(Boolean);
        const valsB = metaB[key].map(v => v.trim()).filter(Boolean);

        if (valsA.length === 0 || valsB.length === 0) continue;

        if (key === 'calc_prefix') {
            const cleanA = valsA[0].replace(/[-._](?:nmr|efg|scf)(?:_\d+)?$/i, '');
            const cleanB = valsB[0].replace(/[-._](?:nmr|efg|scf)(?:_\d+)?$/i, '');
            if (cleanA && cleanB && cleanA !== cleanB) {
                return true; // Different prefix/system name
            }
            continue;
        }

        if (valsA.length === 1 && valsB.length === 1) {
            if (!valuesMatch(valsA[0], valsB[0])) {
                return true; // Clash!
            }
        }
    }

    return false;
}

/**
 * Check if two CrystVis Model objects represent the same physical system
 * with complementary tensor properties (e.g. one has NMR shielding, one has EFG),
 * and without any clashes in calculation metadata (e.g. same pseudopotentials, functional).
 *
 * @param {Model} modelA 
 * @param {Model} modelB 
 * @param {number} tolerance Coordinate and cell tolerance in Angstroms (default 1e-3)
 * @returns {boolean}
 */
export function canMergeModels(modelA, modelB, tolerance = 1e-3) {
    if (!modelA || !modelB || modelA === modelB) return false;

    const atomsA = modelA._atoms_base;
    const atomsB = modelB._atoms_base;
    if (!atomsA || !atomsB) return false;

    // 1. Atom count must match
    const lenA = atomsA.length();
    const lenB = atomsB.length();
    if (lenA !== lenB || lenA === 0) return false;

    // 2. Chemical symbols sequence must match
    const symsA = atomsA.get_chemical_symbols();
    const symsB = atomsB.get_chemical_symbols();
    for (let i = 0; i < lenA; i++) {
        if (symsA[i] !== symsB[i]) return false;
    }

    // 3. Unit cell must match (or both be absent)
    const cellA = atomsA.get_cell();
    const cellB = atomsB.get_cell();
    if (Boolean(cellA) !== Boolean(cellB)) return false;
    if (cellA && cellB) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(cellA[i][j] - cellB[i][j]) > tolerance) return false;
            }
        }
    }

    // 4. Atomic positions must match
    const posA = atomsA.get_positions();
    const posB = atomsB.get_positions();
    for (let i = 0; i < lenA; i++) {
        const dx = Math.abs(posA[i][0] - posB[i][0]);
        const dy = Math.abs(posA[i][1] - posB[i][1]);
        const dz = Math.abs(posA[i][2] - posB[i][2]);
        if (dx > tolerance || dy > tolerance || dz > tolerance) return false;
    }

    // 5. Must have complementary tensor data (at least one tensor type present in one but not the other)
    const hasMS_A = modelA.hasArray('ms');
    const hasMS_B = modelB.hasArray('ms');
    const hasEFG_A = modelA.hasArray('efg');
    const hasEFG_B = modelB.hasArray('efg');
    const hasISC_A = modelA.hasArray('isc');
    const hasISC_B = modelB.hasArray('isc');
    const hasHF_A = modelA.hasArray('hf');
    const hasHF_B = modelB.hasArray('hf');

    const complementary =
        (hasMS_A !== hasMS_B) ||
        (hasEFG_A !== hasEFG_B) ||
        (hasISC_A !== hasISC_B) ||
        (hasHF_A !== hasHF_B);

    if (!complementary) return false;

    // 6. Check that there is no clash in calculation metadata (e.g. different pseudopotentials, functionals, cutoffs)
    if (hasMetadataClash(modelA, modelB)) {
        return false;
    }

    return true;
}

/**
 * Determine a clean merged model name from two model names and optional Model objects.
 *
 * @param {string} nameA 
 * @param {string} nameB 
 * @param {Model} [modelA] 
 * @param {Model} [modelB] 
 * @returns {string}
 */
export function getMergedModelName(nameA, nameB, modelA = null, modelB = null) {
    // 1. Try calc_prefix from metadata if available in atoms info blocks
    const metaA = getCalculationMetadata(modelA);
    const metaB = getCalculationMetadata(modelB);
    const prefixA = metaA.calc_prefix?.[0] || null;
    const prefixB = metaB.calc_prefix?.[0] || null;

    if (prefixA && prefixA === prefixB) {
        return prefixA;
    }

    // 2. Strip standard suffixes (.nmr, -nmr, _nmr, .efg, -efg, _efg, _1, _2)
    const cleanA = (nameA || '').replace(/[-._](?:nmr|efg|scf)(?:_\d+)?$/i, '').replace(/_\d+$/, '');
    const cleanB = (nameB || '').replace(/[-._](?:nmr|efg|scf)(?:_\d+)?$/i, '').replace(/_\d+$/, '');

    if (cleanA && cleanA === cleanB) {
        return cleanA;
    }

    if (prefixA) return prefixA;
    if (prefixB) return prefixB;

    return cleanA || nameA || 'merged';
}

/**
 * Parse top-level blocks from a Magres format string using CrystVis's built-in Magres loader.
 * Returns the parsed atoms.info['magres-blocks'] object.
 *
 * @param {string} text 
 * @returns {Object.<string, any>}
 */
export function parseMagresBlocks(text) {
    if (!text || typeof text !== 'string') return {};
    const str = text.trim();
    if (!str) return {};

    const fullStr = str.startsWith('#$magres-abinitio-v') ? str : '#$magres-abinitio-v1.0\n' + str;
    try {
        const structs = parseMagres(fullStr);
        return Object.values(structs || {})[0]?.info?.['magres-blocks'] || {};
    } catch {
        return {};
    }
}

/**
 * Render a parsed Magres block back to text. The parser stores known blocks
 * as { tag: { units, lines } }; both `atoms` and `magres` use that shape.
 *
 * @param {Object.<string, {units: ?string, lines: string[][]}>} data
 * @returns {string[]}
 */
function formatTaggedBlock(data) {
    const out = [];
    for (const [tag, entry] of Object.entries(data || {})) {
        if (!entry) continue;
        if (entry.units) {
            out.push(`  units ${tag} ${entry.units}`);
        }
        for (const l of entry.lines || []) {
            out.push(`  ${tag} ${l.join(' ')}`);
        }
    }
    return out;
}

/**
 * Merge two Magres file contents into a single standard Magres file string.
 * Uses CrystVis's parser to extract blocks and merges calculation metadata,
 * atoms block, and magres tensor blocks (ms, efg, sus, isc). Blocks the
 * parser does not interpret are carried over verbatim.
 *
 * @param {string} textA 
 * @param {string} textB 
 * @returns {string}
 */
export function mergeMagresText(textA, textB) {
    const bA = parseMagresBlocks(textA);
    const bB = parseMagresBlocks(textB);

    // 1. Merge [calculation] block
    const calcStrA = typeof bA.calculation === 'string' ? bA.calculation : '';
    const calcStrB = typeof bB.calculation === 'string' ? bB.calculation : '';
    const linesA = calcStrA.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
    const linesB = calcStrB.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));

    const mapB = new Map();
    for (const l of linesB) {
        const parts = l.trim().split(/\s+/);
        const key = parts[0];
        const val = parts.slice(1).join(' ');
        mapB.set(key, { line: l, val });
    }

    const mergedCalcLines = [];
    const seenSingleKeys = new Set();
    const seenLines = new Set();

    for (const l of linesA) {
        const parts = l.trim().split(/\s+/);
        const key = parts[0];
        const val = parts.slice(1).join(' ');
        seenLines.add(l.trim());
        if (key === 'calc_pspot') {
            mergedCalcLines.push(l);
        } else {
            seenSingleKeys.add(key);
            if (!val && mapB.has(key) && mapB.get(key).val) {
                mergedCalcLines.push(mapB.get(key).line);
            } else {
                mergedCalcLines.push(l);
            }
        }
    }

    for (const l of linesB) {
        const parts = l.trim().split(/\s+/);
        const key = parts[0];
        if (key === 'calc_pspot') {
            if (!seenLines.has(l.trim())) {
                mergedCalcLines.push(l);
                seenLines.add(l.trim());
            }
        } else if (!seenSingleKeys.has(key)) {
            mergedCalcLines.push(l);
            seenSingleKeys.add(key);
        }
    }

    // 2. Format [atoms] block (taken whole from A, falling back to B)
    const atomsLines = formatTaggedBlock(bA.atoms || bB.atoms || {});

    // 3. Format [magres] block (combine tags from B and A; A takes precedence for duplicate tags like sus)
    const magresLines = formatTaggedBlock({
        ...(bB.magres || {}),
        ...(bA.magres || {})
    });

    const out = [
        '#$magres-abinitio-v1.0',
        '[calculation]',
        mergedCalcLines.join('\n'),
        '[/calculation]',
        '[atoms]',
        atomsLines.join('\n'),
        '[/atoms]',
        '[magres]',
        magresLines.join('\n'),
        '[/magres]'
    ];

    // 4. Pass through any block we don't interpret (e.g. magres_old, which
    // carries CASTEP hyperfine tensors) so merging never loses data.
    const handled = new Set(['calculation', 'atoms', 'magres']);
    const passthrough = { ...bB, ...bA };
    for (const [name, body] of Object.entries(passthrough)) {
        if (handled.has(name) || typeof body !== 'string') continue;
        out.push(`[${name}]`, body.replace(/\n+$/, ''), `[/${name}]`);
    }

    out.push('');
    return out.join('\n');
}

/**
 * Find the first pair of mergeable models currently loaded in CrystVis.
 *
 * @param {CrystVis} app 
 * @returns {[string, string]|null}
 */
export function findMergeablePair(app) {
    if (!app || !app.modelList || app.modelList.length < 2) return null;

    const list = app.modelList;
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            const nameA = list[i];
            const nameB = list[j];
            const modelA = app._models?.[nameA];
            const modelB = app._models?.[nameB];
            if (canMergeModels(modelA, modelB)) {
                return [nameA, nameB];
            }
        }
    }

    return null;
}

