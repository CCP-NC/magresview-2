import { describe, it, expect } from 'vitest';
import { TensorData } from '@ccp-nc/crystvis-js';
import { Site } from './site';
import { Coupling } from './coupling';
import { SpinSystem } from './spinSystem';
import {
    crossTermsApply,
    formatExportSettings,
    getSimplificationWarnings,
} from './warnings';
import { buildTemplateOperators } from './metadata';

function proton(index, label = `H${index + 1}`) {
    return new Site({
        index,
        isotope: '1H',
        element: 'H',
        label,
        ms: new TensorData([[10, 0, 0], [0, 20, 0], [0, 0, 30]]),
        reference: 30,
    });
}

function deuteron(index) {
    return new Site({
        index,
        isotope: '2H',
        element: 'H',
        label: `D${index + 1}`,
        spin: 1.0,
        Q: 0.00286,
        efg: new TensorData([[-0.25, 0, 0], [0, -0.25, 0], [0, 0, 0.5]]),
    });
}

function textOf(warnings) {
    return warnings.map(w => w.text).join(' | ');
}

describe('crossTermsApply', () => {
    it('applies only at second order with the quadrupole present', () => {
        expect(crossTermsApply(true, 2)).toBe(true);
        expect(crossTermsApply(true, 1)).toBe(false);
        expect(crossTermsApply(true, 0)).toBe(false);
        // The fatal case: cross-terms with no quadrupole line to attach to.
        expect(crossTermsApply(false, 2)).toBe(false);
    });
});

describe('getSimplificationWarnings', () => {

    it('warns when a multi-spin system has dipolar couplings switched off', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1), proton(2)] });
        const w = getSimplificationWarnings(sys, { includeD: false });

        expect(w.some(x => x.level === 'warning')).toBe(true);
        expect(textOf(w)).toMatch(/Dipolar couplings omitted from a 3-site system/);
        expect(textOf(w)).toMatch(/may not correctly represent the actual system/);
    });

    it('stays quiet about couplings for a single site', () => {
        const sys = new SpinSystem({ sites: [proton(0)] });

        expect(textOf(getSimplificationWarnings(sys, { includeD: false })))
            .not.toMatch(/Dipolar/);
    });

    it('warns when equivalent nuclei are removed with couplings on', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1)] });
        const w = getSimplificationWarnings(sys, { mergeByLabel: true, includeD: true });

        expect(w.filter(x => x.level === 'warning').length).toBeGreaterThan(0);
        expect(textOf(w)).toMatch(/coupling network is incomplete/);
        expect(textOf(w)).toMatch(/Switch couplings off before removing equivalent nuclei/);
    });

    it('only notes the removal when couplings are already off', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1)] });
        const w = getSimplificationWarnings(sys, { mergeByLabel: true, includeD: false, includeJ: false });
        const merge = w.find(x => /label/.test(x.text));

        expect(merge.level).toBe('notice');
        expect(merge.text).toMatch(/Nothing is averaged/);
    });

    it('warns that an averaged methyl is not a methyl spin system', () => {
        const site = new Site({
            index: 0,
            isotope: '1H',
            element: 'H',
            label: 'H1,H2,H3',
            atomIndices: [0, 1, 2],
            isAverageGroup: true,
            averageGroupPattern: 'CH3',
        });
        const sys = new SpinSystem({ sites: [site] });
        const w = getSimplificationWarnings(sys, {});

        expect(w[0].level).toBe('warning');
        expect(w[0].text).toMatch(/averaged to 1 spin/);
        expect(w[0].text).toMatch(/fast-rotation limit for heteronuclear observation/);
    });

    it('warns when quadrupolar nuclei lose their quadrupole interaction', () => {
        const sys = new SpinSystem({ sites: [deuteron(0)] });
        const w = getSimplificationWarnings(sys, { includeEFG: false });

        expect(textOf(w)).toMatch(/Quadrupolar interaction omitted for 1 quadrupole-active site/);
        expect(textOf(w)).toMatch(/2H/);
    });

    it('notes that first order excludes the cross-terms', () => {
        const sys = new SpinSystem({ sites: [deuteron(0)] });
        const w = getSimplificationWarnings(sys, { includeEFG: true, quadrupoleOrder: 1 });

        expect(textOf(w)).toMatch(/first order only/);
        expect(textOf(w)).toMatch(/cross-terms are excluded/);
    });

    it('escalates missing orientations from a note to a warning when coupled', () => {
        const single = new SpinSystem({ sites: [proton(0)] });
        const coupled = new SpinSystem({
            sites: [proton(0), proton(1)],
            couplings: [new Coupling({ type: 'D', site_i: 0, site_j: 1, coupling_constant: -20000 })],
        });

        const lone = getSimplificationWarnings(single, { includeAngles: false })
            .find(w => /orientations omitted/.test(w.text));
        const pair = getSimplificationWarnings(coupled, { includeAngles: false, includeD: true })
            .find(w => /orientations omitted/.test(w.text));

        expect(lone.level).toBe('notice');
        expect(pair.level).toBe('warning');
        expect(pair.text).toMatch(/Relative orientations are lost/);
    });

    it('explains that per-site export drops couplings by construction', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1)] });
        const w = getSimplificationWarnings(sys, { scope: 'site', includeD: false });

        expect(textOf(w)).toMatch(/omitted by construction/);
        // ...and does not then also complain about the missing couplings.
        expect(textOf(w)).not.toMatch(/may not correctly represent/);
    });
});

describe('formatExportSettings', () => {
    it('records every switch, including the ones that were off', () => {
        const lines = formatExportSettings({
            scope: 'system',
            target: 'simpson',
            includeMS: true,
            includeEFG: true,
            quadrupoleOrder: 2,
            includeD: false,
            includeJ: false,
            includeAngles: true,
        });

        expect(lines.join('\n')).toMatch(/Dipolar couplings: no/);
        expect(lines.join('\n')).toMatch(/Quadrupolar: yes, order 2/);
        expect(lines.join('\n')).toMatch(/Second-order cross-terms: yes/);
    });

    it('spells out what omitting orientations means', () => {
        const lines = formatExportSettings({ includeAngles: false });

        expect(lines.join('\n')).toMatch(/all Euler angles set to zero/);
    });

    it('reports couplings by scope, not by leftover checkbox state', () => {
        // A one-site file cannot have couplings whatever the panel was set to.
        const lines = formatExportSettings({ scope: 'site', includeD: true, includeJ: true });

        expect(lines.join('\n')).toMatch(/Dipolar couplings: n\/a \(one file per site\)/);
        expect(lines.join('\n')).toMatch(/J couplings: n\/a \(one file per site\)/);
    });
});

describe('buildTemplateOperators', () => {

    it('addresses the observed isotope, not spin 1', () => {
        // The old template hardcoded I1x, which detects whichever nucleus came
        // first in the selection regardless of what the user asked to observe.
        const sites = [proton(0), proton(1), proton(2),
            new Site({ index: 3, isotope: '13C', element: 'C' })];
        const ops = buildTemplateOperators(sites, '13C');

        expect(ops.start).toBe('I4x');
        expect(ops.detect).toBe('I4p');
        expect(ops.isotope).toBe('13C');
    });

    it('sums over every spin carrying the observed isotope', () => {
        const sites = [proton(0), proton(1), proton(2),
            new Site({ index: 3, isotope: '13C', element: 'C' })];
        const ops = buildTemplateOperators(sites, '1H');

        expect(ops.start).toBe('I1x+I2x+I3x');
        expect(ops.detect).toBe('I1p+I2p+I3p');
    });

    it('falls back to the first nucleus when none is chosen', () => {
        const ops = buildTemplateOperators([proton(0)], '');

        expect(ops.start).toBe('I1x');
        expect(ops.isotope).toBe('1H');
    });

    it('points at the central transition for half-integer quadrupolar nuclei', () => {
        const o17 = new Site({ index: 0, isotope: '17O', element: 'O', spin: 2.5, Q: -0.0256 });
        const ops = buildTemplateOperators([o17], '17O');

        expect(ops.note).toMatch(/central transition/);
        expect(ops.note).toMatch(/I1c/);
    });

    it('gives up rather than emitting an unreadable operator sum', () => {
        const many = Array.from({ length: 20 }, (_, i) => proton(i));
        const ops = buildTemplateOperators(many, '1H');

        expect(ops.start).toBe('I1x');
        expect(ops.note).toMatch(/20 spins carry 1H/);
    });
});
