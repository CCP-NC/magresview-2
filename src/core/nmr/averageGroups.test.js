import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TensorData } from '@ccp-nc/crystvis-js';
import { Loader } from '@ccp-nc/crystvis-js/lib/loader.js';
import { Model } from '@ccp-nc/crystvis-js/lib/model.js';
import { buildSpinSystem } from './buildSpinSystem';
import { computeDipolarCoupling } from './dipolar';
import { toSimpson } from './simpson';
import { formatSimpsonTemplate } from './metadata';
import { getSimplificationWarnings } from './warnings';

const GAMMA_H = 267.522187e6;
const GAMMA_C = 67.2828e6;

const iso = (Mxx, Myy, Mzz) => new TensorData([[Mxx, 0, 0], [0, Myy, 0], [0, 0, Mzz]]);

/**
 * Ideal tetrahedral methyl: C at the origin, C3 axis along z, r(C-H) = 1.09 A,
 * H-C-H = 109.47 deg. Atoms are plain objects carrying just what buildSpinSystem reads.
 */
function idealMethyl({ external = null } = {}) {
    const r = 1.09;
    const theta = Math.acos(1 / 3);
    const centre = {
        index: 0, element: 'C', isotope: '13', label: 'C1', xyz: [0, 0, 0], bondedAtoms: [],
        isotopeData: { spin: 0.5, gamma: GAMMA_C, Q: 0 }, ms: iso(10, 20, 30),
    };
    const hs = [0, 1, 2].map(k => {
        const phi = (2 * Math.PI * k) / 3;
        return {
            index: k + 1, element: 'H', isotope: '1', label: `H${k + 1}`,
            xyz: [r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta)],
            isotopeData: { spin: 0.5, gamma: GAMMA_H, Q: 0 },
            // distinct, anisotropic shieldings so the average is visibly not any one of them
            ms: iso(20 + 6 * k, 40 - 3 * k, 60 + 9 * k),
        };
    });
    centre.bondedAtoms = hs;
    const atoms = [centre, ...hs];
    if (external) {
        atoms.push({
            index: 4, element: 'H', isotope: '1', label: 'H9', xyz: external,
            isotopeData: { spin: 0.5, gamma: GAMMA_H, Q: 0 }, ms: iso(25, 35, 45),
        });
    }
    return { atoms, hs, centre };
}

const REFS = { H: 30, C: 180 };

function ideal(opts = {}, extra = {}) {
    const { atoms } = idealMethyl(extra);
    return buildSpinSystem(atoms, { references: REFS, averageGroups: 'CH3', includeD: true, ...opts });
}

describe('average groups: expand mode', () => {
    it('keeps every member as its own site, flagged with group metadata', () => {
        const sys = ideal();
        const members = sys.sites.filter(s => s.isAverageGroup);

        expect(sys.sites.length).toBe(4);
        expect(members.length).toBe(3);
        expect(members.map(s => s.label)).toEqual(['H1', 'H2', 'H3']);
        expect(members.map(s => s.averageGroupMember)).toEqual([0, 1, 2]);
        for (const m of members) {
            expect(m.averageGroupSize).toBe(3);
            expect(m.averageGroupPattern).toBe('CH3');
            expect(m.averageGroupId).toBe(0);
            expect(m.atomIndices.length).toBe(1);
            expect(m.isExpandedGroupMember).toBe(true);
        }
        // Dimension counts all n spins: 2^4
        expect(sys.dimension).toBe(16);
    });

    it('gives every member the arithmetic mean of the members\' MS tensors', () => {
        const sys = ideal();
        const [a, b, c] = sys.sites.filter(s => s.isAverageGroup);
        // mean eigenvalues: (26, 37, 69)
        for (const s of [a, b, c]) {
            expect(s.ms.symmetric[0][0]).toBeCloseTo(26, 8);
            expect(s.ms.symmetric[1][1]).toBeCloseTo(37, 8);
            expect(s.ms.symmetric[2][2]).toBeCloseTo(69, 8);
        }
    });

    it('turns the intra-methyl 1H-1H coupling into a +d/2 residual along the C3 axis', () => {
        const { atoms } = idealMethyl();
        const sys = ideal();
        const [s1, s2] = sys.sites;

        const rigid = computeDipolarCoupling(
            { ...s1, position: atoms[1].xyz },
            { ...s2, position: atoms[2].xyz },
            null
        ).coupling_constant;
        expect(rigid).toBeCloseTo(-21300, -3);

        const c = sys.couplings.find(k => k.type === 'D' && k.site_i === 0 && k.site_j === 1);
        expect(c.coupling_constant).toBeCloseTo(-rigid / 2, 6);
        expect(c.coupling_constant).toBeGreaterThan(10000);
        expect(c.coupling_constant).toBeCloseTo(10650, -2);
        expect(Math.abs(c.asymmetry)).toBeLessThan(1e-6);

        // Unique axis is the C3 axis (z): the Haeberlen z eigenvector of the averaged tensor
        const vzz = c.tensor.haeberlen_eigenvectors.map(row => row[2]);
        expect(Math.abs(vzz[2])).toBeCloseTo(1, 8);
    });

    it('couples the observed carbon to all three protons identically', () => {
        const sys = ideal();
        const ch = sys.couplings.filter(k => k.type === 'D' && k.site_j === 3);
        expect(ch.length).toBe(3);
        expect(ch[0].coupling_constant).toBeCloseTo(ch[1].coupling_constant, 8);
        expect(ch[1].coupling_constant).toBeCloseTo(ch[2].coupling_constant, 8);
        // The C-H vector is at 70.5 deg to the axis: P2(cos 70.53) = -1/3, so d_avg = -d_static/3
        const rigid = computeDipolarCoupling(
            { index: 0, position: [0, 0, 0], gamma: GAMMA_H, label: 'a' },
            { index: 1, position: idealMethyl().hs[0].xyz, gamma: GAMMA_C, label: 'b' },
            null
        ).coupling_constant;
        expect(Math.abs(ch[0].coupling_constant)).toBeCloseTo(Math.abs(rigid) / 3, 6);
    });

    it('gives an external atom on the axis an axial coupling about z', () => {
        const sys = ideal({}, { external: [0, 0, -3] });
        const x = sys.sites.length - 1;
        const c = sys.couplings.find(k => k.type === 'D' && k.site_i === 0 && k.site_j === x);

        expect(Math.abs(c.asymmetry)).toBeLessThan(1e-6);
        expect(Math.abs(c.tensor.haeberlen_eigenvectors[2][2])).toBeCloseTo(1, 8);
    });

    it('is generally not axial for an external atom off the axis', () => {
        const sys = ideal({}, { external: [2.5, 1.0, -1.0] });
        const x = sys.sites.length - 1;
        const c = sys.couplings.find(k => k.type === 'D' && k.site_i === 0 && k.site_j === x);

        expect(Math.abs(c.asymmetry)).toBeGreaterThan(1e-4);
        expect(Math.abs(c.asymmetry)).toBeLessThan(0.2);
    });

    it('averages all ordered pairs for a group against external sites (tensor trace stays zero)', () => {
        const sys = ideal({}, { external: [2.5, 1.0, -1.0] });
        const x = sys.sites.length - 1;
        const c = sys.couplings.find(k => k.type === 'D' && k.site_i === 0 && k.site_j === x);
        const D = c.tensor.symmetric;
        expect(D[0][0] + D[1][1] + D[2][2]).toBeCloseTo(0, 6);
    });

    it('writes a SIMPSON file with the opposite-sign intra-group residual and dipole_check false', () => {
        const sys = ideal();
        const out = toSimpson(sys, { observed_nucleus: '13C', filename: 'methyl.spinsys' });

        expect(out).toContain('nuclei 1H 1H 1H 13C');
        expect(out).toMatch(/^dipole 1 2 10\d\d\d\./m);
        expect(out).toContain('dipole_check     false');
        expect(out).toContain('Spin system dimension: 16');
    });

    it('states in the file that the group was kept as n jump-averaged spins', () => {
        const out = toSimpson(ideal(), { observed_nucleus: '13C' }).replace(/\n#\s+/g, ' ');
        expect(out).toContain('kept as 3 spins with fast-rotation (jump-averaged) tensors');
        expect(out).toContain('[averaged group, member 1 of 3]');
        expect(out).not.toContain('averaged to 1 spin');
    });

    it('still offers no dipole_check override when there is no group', () => {
        const { atoms } = idealMethyl();
        const sys = buildSpinSystem(atoms, { references: REFS, includeD: true });
        expect(formatSimpsonTemplate('x.spinsys', sys, {}).join('\n')).not.toContain('dipole_check');
    });
});

describe('average groups: collapse mode', () => {
    it('keeps the old behaviour: one site, no intra-group coupling', () => {
        const sys = ideal({ averageGroupMode: 'collapse' });

        expect(sys.sites.length).toBe(2);
        const group = sys.sites[0];
        expect(group.isAverageGroup).toBe(true);
        expect(group.averageGroupSize).toBe(3);
        expect(group.isExpandedGroupMember).toBe(false);
        expect(group.label).toBe('H1,H2,H3');
        expect(sys.dimension).toBe(4);
        expect(sys.couplings.length).toBe(1);
        expect(sys.couplings[0].site_j).toBe(1);
    });

    it('says what collapsing drops in the notes', () => {
        const out = toSimpson(ideal({ averageGroupMode: 'collapse' }), { observed_nucleus: '13C' });
        expect(out).toContain("Combined average group 'CH3'");
        expect(out).toContain('Intra-group couplings were dropped.');
    });
});

describe('average groups: warnings', () => {
    it('gives SIMPSON a notice, not a warning, for an expanded group', () => {
        const w = getSimplificationWarnings(ideal(), { includeD: true, target: 'simpson' });
        const g = w.filter(x => /Average group/.test(x.text));

        expect(g.length).toBe(1);
        expect(g[0].level).toBe('notice');
        expect(g[0].text).toMatch(/kept as 3 spins/);
        expect(g[0].text).toMatch(/hop rate/);
        expect(g[0].text).toMatch(/2\^3/);
    });

    it('warns loudly for mrsimulator about what the collapsed spin loses', () => {
        const w = getSimplificationWarnings(
            ideal({ averageGroupMode: 'collapse' }),
            { includeD: true, target: 'mrsimulator' }
        );
        const g = w.find(x => /Average group/.test(x.text));

        expect(g.level).toBe('warning');
        expect(g.text).toMatch(/cannot represent coupled equivalent spins/);
        expect(g.text).toMatch(/\+10\.7 kHz/);
        expect(g.text).toMatch(/one neighbour instead of 3/);
        expect(g.text).toMatch(/undercounted by a factor 3/);
    });
});

describe('average groups: real ethanol', () => {
    const magresText = fs.readFileSync(path.join(__dirname, '__fixtures__', 'ethanol.magres'), 'utf-8');
    const model = new Model(new Loader().load(magresText, 'magres', 'ethanol')['ethanol'], { useNMRActiveIsotopes: true });
    const options = {
        references: { H: 30.0, C: 180.0, O: 200.0 },
        includeD: true,
        includeJ: true,
        averageGroups: 'CH3',
    };

    it('expands the CH3 into 3 sites (9 sites total) and counts them in the dimension', () => {
        const sys = buildSpinSystem(model.atoms, options);
        const members = sys.sites.filter(s => s.isAverageGroup);

        expect(sys.sites.length).toBe(9);
        expect(members.length).toBe(3);
        // 6 spin-1/2 (2 C, 6 H -> 8 of them) and one 17O (spin 5/2): 2^8 * 6
        expect(sys.dimension).toBe(2 ** 8 * 6);
        // The three protons are identical in shift
        expect(members[0].shift_iso).toBeCloseTo(members[1].shift_iso, 8);
        expect(members[1].shift_iso).toBeCloseTo(members[2].shift_iso, 8);
        // Intra-group pairs are present
        const [i, j, k] = members.map(m => m.index);
        for (const [a, b] of [[i, j], [i, k], [j, k]]) {
            expect(sys.couplings.some(c => c.type === 'D' && c.site_i === a && c.site_j === b)).toBe(true);
            expect(sys.couplings.some(c => c.type === 'J' && c.site_i === a && c.site_j === b)).toBe(true);
        }
    });

    it('collapses to one site per group on request', () => {
        const sys = buildSpinSystem(model.atoms, { ...options, averageGroupMode: 'collapse' });
        expect(sys.sites.length).toBe(7);
        expect(sys.sites.filter(s => s.isAverageGroup).length).toBe(1);
    });

    it('averages J over the group rather than reading the first member', () => {
        const expanded = buildSpinSystem(model.atoms, options);
        const collapsed = buildSpinSystem(model.atoms, { ...options, averageGroupMode: 'collapse' });
        const pair = (sys, partnerAtom) => {
            const grp = sys.sites.find(s => s.isAverageGroup).index;
            const other = sys.sites.find(s => s.atomIndices[0] === partnerAtom).index;
            return sys.couplings.find(c => c.type === 'J'
                && ((c.site_i === grp && c.site_j === other) || (c.site_j === grp && c.site_i === other)));
        };
        const carbonAtom = expanded.sites.find(s => s.element === 'C' && !s.isAverageGroup).atomIndices[0];
        const jExp = pair(expanded, carbonAtom);
        const jCol = pair(collapsed, carbonAtom);
        expect(jExp).toBeDefined();
        expect(jCol).toBeDefined();
        expect(jExp.coupling_constant).toBeCloseTo(jCol.coupling_constant, 6);
    });
});
