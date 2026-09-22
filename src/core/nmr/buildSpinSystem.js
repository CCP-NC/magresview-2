import { TensorData } from '@ccp-nc/crystvis-js';
import { Site } from './site';
import { Coupling } from './coupling';
import { SpinSystem } from './spinSystem';
import { checkForMultipleImages, computeDipolarCoupling } from './dipolar';
import { computeJCoupling } from './jCoupling';
import { findAverageGroups, averageMatrix3x3, computeAveragedDipolarCoupling } from './averageGroups';
import { DEFAULT_GRADIENT } from './constants';
import { buildSpinSystemMetadata } from './metadata';

/**
 * Build a SpinSystem from an atom selection/view and configuration options.
 *
 * @param  {object|Array} view      CrystVis view, Model, or array of AtomImage objects
 * @param  {object}       [options] Configuration options
 * @return {SpinSystem}             Constructed SpinSystem instance
 */
export function buildSpinSystem(view, options = {}) {
    const {
        references = {},
        gradients = {},
        includeD = false,
        includeJ = false,
        dipolarCutoff = null,
        dipolarHomonuclear = false,
        mergeByLabel = false,
        averageGroups = null,
    } = options;

    let atoms = [];
    let model = null;

    if (Array.isArray(view)) {
        atoms = view;
        model = atoms[0]?.model || atoms[0]?._model || null;
    } else if (view && Array.isArray(view.atoms)) {
        atoms = view.atoms;
        model = view.model || view._model || null;
    } else if (view && typeof view.atoms === 'function') {
        atoms = view.atoms();
        model = view.model || view._model || null;
    }

    const warnings = [];

    // Check minimum-image warning on multiple images of same base atom (ADR-0011)
    if (checkForMultipleImages(atoms)) {
        warnings.push('Multiple images of the same atom are selected; dipolar couplings use the minimum-image convention.');
    }

    // Merge by label if requested and supported
    let activeAtoms = atoms;
    if (mergeByLabel) {
        const seenLabels = new Set();
        activeAtoms = [];
        for (const a of atoms) {
            const lbl = a.crystLabel || a.label;
            if (lbl && !seenLabels.has(lbl)) {
                seenLabels.add(lbl);
                activeAtoms.push(a);
            } else if (!lbl) {
                activeAtoms.push(a);
            }
        }
    }

    // Average groups (CH3, NH2, etc. per ADR-0008)
    const avgGroupMatches = averageGroups ? findAverageGroups(activeAtoms, averageGroups) : [];
    const groupedAtomIndices = new Set();
    const sites = [];

    for (const group of avgGroupMatches) {
        group.forEach(a => groupedAtomIndices.add(a.index !== undefined ? a.index : a));

        const labels = group.map(a => a.crystLabel || a.label || `${a.element}${a.index + 1}`);
        const groupLabel = labels.join(',');
        warnings.push(`Intra-group couplings within ${groupLabel} were dropped.`);

        // Centroid position
        const sumPos = [0, 0, 0];
        for (const a of group) {
            sumPos[0] += a.xyz[0] / group.length;
            sumPos[1] += a.xyz[1] / group.length;
            sumPos[2] += a.xyz[2] / group.length;
        }

        // Arithmetic average of MS tensors
        let ms = null;
        const msList = group.map(a => a.getArrayValue ? a.getArrayValue('ms') : a.ms).filter(Boolean);
        if (msList.length === group.length) {
            const avgM = averageMatrix3x3(msList.map(t => t._M || t.matrix || t));
            ms = new TensorData(avgM);
        }

        // Arithmetic average of EFG tensors
        let efg = null;
        const efgList = group.map(a => a.getArrayValue ? a.getArrayValue('efg') : a.efg).filter(Boolean);
        if (efgList.length === group.length) {
            const avgV = averageMatrix3x3(efgList.map(t => t._M || t.matrix || t));
            efg = new TensorData(avgV);
        }

        const rep = group[0];
        const iData = rep.isotopeData || {};
        const el = rep.element;
        const ref = references[el] !== undefined ? references[el] : null;
        const grad = gradients[el] !== undefined ? gradients[el] : DEFAULT_GRADIENT;

        sites.push(new Site({
            index: sites.length,
            isotope: `${rep.isotope || iData.isotope || ''}${el}`,
            element: el,
            label: groupLabel,
            atomIndices: group.map(a => a.index),
            atoms: group,
            position: sumPos,
            spin: iData.spin !== undefined ? iData.spin : 0.5,
            gamma: iData.gamma || 0,
            Q: iData.Q || 0,
            ms,
            efg,
            reference: ref,
            gradient: grad,
            isAverageGroup: true,
            averageGroupPattern: group.pattern || averageGroups || null,
        }));
    }

    // Add remaining non-grouped atoms
    for (const a of activeAtoms) {
        if (groupedAtomIndices.has(a.index !== undefined ? a.index : a)) {
            continue;
        }

        const iData = a.isotopeData || {};
        const el = a.element;
        const ref = references[el] !== undefined ? references[el] : null;
        const grad = gradients[el] !== undefined ? gradients[el] : DEFAULT_GRADIENT;

        const ms = a.getArrayValue ? a.getArrayValue('ms') : (a.ms || null);
        const efg = a.getArrayValue ? a.getArrayValue('efg') : (a.efg || null);
        const lbl = a.crystLabel || a.label || `${el}${a.index !== undefined ? a.index + 1 : sites.length + 1}`;

        sites.push(new Site({
            index: sites.length,
            isotope: `${a.isotope || iData.isotope || ''}${el}`,
            element: el,
            label: lbl,
            atomIndices: [a.index],
            atoms: [a],
            position: a.xyz ? Array.from(a.xyz) : [0, 0, 0],
            spin: iData.spin !== undefined ? iData.spin : 0.5,
            gamma: iData.gamma || 0,
            Q: iData.Q || 0,
            ms,
            efg,
            reference: ref,
            gradient: grad,
        }));
    }

    // Check missing shielding references for any site with MS data (ADR-0010)
    const missingRefs = new Set();
    for (const s of sites) {
        if (s.ms !== null && !s.hasShift) {
            missingRefs.add(s.element);
        }
    }
    const missingReferences = Array.from(missingRefs).sort();

    // Couplings
    const couplings = [];

    // 1. Dipolar couplings
    if (includeD) {
        for (let i = 0; i < sites.length; i++) {
            for (let j = i + 1; j < sites.length; j++) {
                const s1 = sites[i];
                const s2 = sites[j];

                if (dipolarHomonuclear && s1.element !== s2.element) {
                    continue;
                }

                const coup = computeAveragedDipolarCoupling(s1, s2, model);
                if (coup) {
                    if (dipolarCutoff !== null && coup.distance > dipolarCutoff) {
                        continue;
                    }
                    couplings.push(coup);
                }
            }
        }
    }

    // 2. J couplings
    if (includeJ) {
        for (let i = 0; i < sites.length; i++) {
            for (let j = i + 1; j < sites.length; j++) {
                const s1 = sites[i];
                const s2 = sites[j];
                const coup = computeJCoupling(s1, s2);
                if (coup) {
                    couplings.push(coup);
                }
            }
        }
    }

    const metadata = buildSpinSystemMetadata({
        model,
        view,
        atoms,
        activeAtoms,
        sites,
        avgGroupMatches,
        options,
    });

    return new SpinSystem({
        sites,
        couplings,
        warnings,
        missingReferences,
        model,
        metadata,
    });
}
