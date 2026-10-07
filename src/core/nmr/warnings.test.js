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
import { buildTemplateOperators, formatSimpsonTemplate } from './metadata';

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
        Q: 2.86, // millibarn
        efg: new TensorData([[-0.00025, 0, 0], [0, -0.00025, 0], [0, 0, 0.0005]]),
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
        const o17 = new Site({ index: 0, isotope: '17O', element: 'O', spin: 2.5, Q: -25.6 });
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

describe('mrsimulator weak-coupling warning', () => {
    const carbon = index => new Site({ index, isotope: '13C', element: 'C', label: `C${index + 1}` });
    const coupling = (type, i, j) => new Coupling({ type, site_i: i, site_j: j, coupling_constant: -1000 });

    it('warns when couplings between like nuclei go to mrsimulator', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1)], couplings: [coupling('D', 0, 1)] });
        const w = getSimplificationWarnings(sys, { target: 'mrsimulator', includeD: true });

        expect(w.some(x => x.level === 'warning' && /weak-coupling limit/.test(x.text))).toBe(true);
        expect(textOf(w)).toMatch(/1H/);
    });

    it('is quiet for heteronuclear couplings, which are fine in the weak-coupling limit', () => {
        const sys = new SpinSystem({ sites: [carbon(0), proton(1)], couplings: [coupling('D', 0, 1)] });

        expect(textOf(getSimplificationWarnings(sys, { target: 'mrsimulator', includeD: true })))
            .not.toMatch(/weak-coupling/);
    });

    it('is quiet for the SIMPSON target, which does the full spin dynamics', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1)], couplings: [coupling('D', 0, 1)] });

        expect(textOf(getSimplificationWarnings(sys, { target: 'simpson', includeD: true })))
            .not.toMatch(/weak-coupling/);
    });

    it('only counts coupling types that are actually written', () => {
        const sys = new SpinSystem({ sites: [proton(0), proton(1)], couplings: [coupling('J', 0, 1)] });

        expect(textOf(getSimplificationWarnings(sys, { target: 'mrsimulator', includeD: true, includeJ: false })))
            .not.toMatch(/weak-coupling/);
        expect(textOf(getSimplificationWarnings(sys, { target: 'mrsimulator', includeD: false, includeJ: true })))
            .toMatch(/weak-coupling/);
    });
});

describe('SIMPSON template dipole_check override', () => {
    const site = (index, isotope, gamma) => new Site({ index, isotope, element: isotope.replace(/\d/g, ''), gamma });
    const template = (sites, d) => formatSimpsonTemplate('x.spinsys', new SpinSystem({
        sites,
        couplings: [new Coupling({ type: 'D', site_i: 0, site_j: 1, coupling_constant: d })],
    }), {}).join('\n');

    const H = 267.522e6, C = 67.2828e6, N15 = -27.126e6;

    it('is not offered for a correctly signed coupling between like-signed gammas', () => {
        expect(template([site(0, '1H', H), site(1, '13C', C)], -23000)).not.toContain('dipole_check');
    });

    it('is not offered for a legitimately positive coupling between opposite-signed gammas', () => {
        expect(template([site(0, '1H', H), site(1, '15N', N15)], 11000)).not.toContain('dipole_check');
    });

    it('is offered when the sign contradicts the nuclei, as after averaging a methyl against its carbon', () => {
        expect(template([site(0, '1H', H), site(1, '13C', C)], +7258)).toContain('dipole_check     false');
        expect(template([site(0, '1H', H), site(1, '15N', N15)], -4000)).toContain('dipole_check     false');
    });
});
