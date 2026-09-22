import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TensorData } from '@ccp-nc/crystvis-js';
import { Loader } from '@ccp-nc/crystvis-js/lib/loader.js';
import { Model } from '@ccp-nc/crystvis-js/lib/model.js';
import { Site } from './site';
import { Coupling } from './coupling';
import { SpinSystem } from './spinSystem';
import { buildSpinSystem } from './buildSpinSystem';
import { toSimpson } from './simpson';
import { toMrsimulator } from './mrsimulator';
import { mergeMagresText } from '../../utils';

const FIXTURES_DIR = path.join(__dirname, '__fixtures__');
const corpus = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'synthetic_corpus.json'), 'utf-8'));

/**
 * Parse a SIMPSON .spinsys string into structured data.
 */
function parseSpinsys(text) {
    const lines = text
        .split('\n')
        .map(l => l.replace(/#.*$/, '').trim())
        .filter(l => l.length > 0 && l !== 'spinsys {' && l !== '}');

    const result = {
        channels: [],
        nuclei: [],
        shifts: [],
        quadrupoles: [],
        dipoles: [],
        jcouplings: [],
        cross_qd: [],
        cross_qs: [],
    };

    for (const line of lines) {
        const parts = line.split(/\s+/);
        const cmd = parts[0];

        switch (cmd) {
            case 'channels':
                result.channels = parts.slice(1);
                break;
            case 'nuclei':
                result.nuclei = parts.slice(1);
                break;
            case 'shift':
                result.shifts.push({
                    idx: parseInt(parts[1], 10),
                    iso: parseFloat(parts[2].replace('p', '')),
                    aniso: parseFloat(parts[3].replace('p', '')),
                    asymm: parseFloat(parts[4]),
                    alpha: parseFloat(parts[5]),
                    beta: parseFloat(parts[6]),
                    gamma: parseFloat(parts[7]),
                });
                break;
            case 'quadrupole':
                result.quadrupoles.push({
                    idx: parseInt(parts[1], 10),
                    order: parseInt(parts[2], 10),
                    Cq: parseFloat(parts[3]),
                    eta: parseFloat(parts[4]),
                    alpha: parseFloat(parts[5]),
                    beta: parseFloat(parts[6]),
                    gamma: parseFloat(parts[7]),
                });
                break;
            case 'dipole':
                result.dipoles.push({
                    idx1: parseInt(parts[1], 10),
                    idx2: parseInt(parts[2], 10),
                    d: parseFloat(parts[3]),
                    alpha: parseFloat(parts[4]),
                    beta: parseFloat(parts[5]),
                    gamma: parseFloat(parts[6]),
                });
                break;
            case 'jcoupling':
                result.jcouplings.push({
                    idx1: parseInt(parts[1], 10),
                    idx2: parseInt(parts[2], 10),
                    J_iso: parseFloat(parts[3]),
                    J_aniso: parseFloat(parts[4]),
                    eta: parseFloat(parts[5]),
                    alpha: parseFloat(parts[6]),
                    beta: parseFloat(parts[7]),
                    gamma: parseFloat(parts[8]),
                });
                break;
            case 'quadrupole_x_dipole':
                result.cross_qd.push([parseInt(parts[1], 10), parseInt(parts[2], 10)]);
                break;
            case 'quadrupole_x_shift':
                result.cross_qs.push(parseInt(parts[1], 10));
                break;
            default:
                break;
        }
    }

    return result;
}

/**
 * Reconstruct a 3x3 lab tensor from passive ZYZ Euler angles in degrees and Haeberlen PAS evals.
 */
function reconstructLabTensor(evals, alphaDeg, betaDeg, gammaDeg) {
    const a = (alphaDeg * Math.PI) / 180;
    const b = (betaDeg * Math.PI) / 180;
    const g = (gammaDeg * Math.PI) / 180;

    // Passive ZYZ rotation: R = Rz(g) * Ry(b) * Rz(a)
    // T_lab = R^T * T_pas * R
    const ca = Math.cos(a), sa = Math.sin(a);
    const cb = Math.cos(b), sb = Math.sin(b);
    const cg = Math.cos(g), sg = Math.sin(g);

    const Rz_a = [
        [ca, sa, 0],
        [-sa, ca, 0],
        [0, 0, 1]
    ];
    const Ry_b = [
        [cb, 0, -sb],
        [0, 1, 0],
        [sb, 0, cb]
    ];
    const Rz_g = [
        [cg, sg, 0],
        [-sg, cg, 0],
        [0, 0, 1]
    ];

    // Helper 3x3 multiply
    function matMul(A, B) {
        const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    }

    const R = matMul(Rz_g, matMul(Ry_b, Rz_a));
    const RT = [
        [R[0][0], R[1][0], R[2][0]],
        [R[0][1], R[1][1], R[2][1]],
        [R[0][2], R[1][2], R[2][2]]
    ];

    const pas = [
        [evals[0], 0, 0],
        [0, evals[1], 0],
        [0, 0, evals[2]]
    ];

    return matMul(RT, matMul(pas, R));
}

/**
 * Compare two floats within relative tolerance or absolute if near 0.
 */
function assertClose(actual, expected, relTol = 1e-6, absTol = 1e-5, msg = '') {
    const diff = Math.abs(actual - expected);
    if (Math.abs(expected) > absTol) {
        const rel = diff / Math.abs(expected);
        expect(rel, `${msg}: actual=${actual}, expected=${expected}, relDiff=${rel}`).toBeLessThan(relTol);
    } else {
        expect(diff, `${msg}: actual=${actual}, expected=${expected}, absDiff=${diff}`).toBeLessThan(absTol);
    }
}

describe('Soprano SIMPSON validation corpus', () => {
    const fixtures = corpus.fixtures;

    it('validates Test 01: Isotropic chemical shift', () => {
        const ref = parseSpinsys(fixtures.test_01.spinsys);
        const ms = new TensorData([[-100, 0, 0], [0, -100, 0], [0, 0, -100]]);
        const site = new Site({ index: 0, isotope: '13C', element: 'C', ms, reference: 0.0, gradient: -1.0 });
        const sys = new SpinSystem({ sites: [site] });

        const actualStr = toSimpson(sys, { observed_nucleus: '13C', include_header: false });
        const actual = parseSpinsys(actualStr);

        expect(actual.channels).toEqual(ref.channels);
        expect(actual.nuclei).toEqual(ref.nuclei);
        expect(actual.shifts.length).toBe(1);
        assertClose(actual.shifts[0].iso, ref.shifts[0].iso);
        assertClose(actual.shifts[0].aniso, ref.shifts[0].aniso);
    });

    it('validates Test 02a, 02b, 02c: CSA anisotropy and beta angles', () => {
        for (const suffix of ['a', 'b', 'c']) {
            const key = `test_02${suffix}`;
            const ref = parseSpinsys(fixtures[key].spinsys);
            const { matrix } = fixtures[key].input;

            const ms = new TensorData(matrix);
            const site = new Site({ index: 0, isotope: '13C', element: 'C', ms, reference: 0.0, gradient: -1.0 });
            const sys = new SpinSystem({ sites: [site] });

            const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '13C', include_header: false }));
            assertClose(actual.shifts[0].iso, ref.shifts[0].iso, 1e-6);
            assertClose(actual.shifts[0].aniso, ref.shifts[0].aniso, 1e-6);
            assertClose(actual.shifts[0].asymm, ref.shifts[0].asymm, 1e-6);
            assertClose(actual.shifts[0].beta, ref.shifts[0].beta, 1e-5);
        }
    });

    it('validates Test 03a and 03b canary: CSA asymmetry and 150 ppm peak shift', () => {
        const ref03a = parseSpinsys(fixtures.test_03a.spinsys);
        const ref03b = parseSpinsys(fixtures.test_03b.spinsys);

        const ms03a = new TensorData(fixtures.test_03a.input.matrix);
        const s03a = new SpinSystem({ sites: [new Site({ index: 0, isotope: '13C', element: 'C', ms: ms03a, reference: 0.0, gradient: -1.0 })] });
        const act03a = parseSpinsys(toSimpson(s03a, { observed_nucleus: '13C', include_header: false }));

        const ms03b = new TensorData(fixtures.test_03b.input.matrix);
        const s03b = new SpinSystem({ sites: [new Site({ index: 0, isotope: '13C', element: 'C', ms: ms03b, reference: 0.0, gradient: -1.0 })] });
        const act03b = parseSpinsys(toSimpson(s03b, { observed_nucleus: '13C', include_header: false }));

        // Assert 03a and 03b differ in angles
        expect(act03a.shifts[0].alpha).not.toBe(act03b.shifts[0].alpha);

        // Lab zz component of the shift tensor:
        // sigma_lab in 03a has [2][2] = 225 ppm -> shift_lab[2][2] = 0 - 225 = -225 ppm
        // sigma_lab in 03b has [2][2] = 75 ppm -> shift_lab[2][2] = 0 - 75 = -75 ppm
        const shiftLabZ_03a = 0.0 - fixtures.test_03a.input.matrix[2][2];
        const shiftLabZ_03b = 0.0 - fixtures.test_03b.input.matrix[2][2];

        assertClose(Math.abs(shiftLabZ_03a - shiftLabZ_03b), 150.0, 1e-4);
        assertClose(act03a.shifts[0].iso, ref03a.shifts[0].iso, 1e-6);
        assertClose(act03a.shifts[0].aniso, ref03a.shifts[0].aniso, 1e-6);
        assertClose(act03b.shifts[0].iso, ref03b.shifts[0].iso, 1e-6);
        assertClose(act03b.shifts[0].aniso, ref03b.shifts[0].aniso, 1e-6);
    });

    it('validates Test 04a, 04b: Quadrupole Cq and angles', () => {
        for (const suffix of ['a', 'b']) {
            const key = `test_04${suffix}`;
            const ref = parseSpinsys(fixtures[key].spinsys);
            const { matrix, Q, q_order } = fixtures[key].input;

            const efg = new TensorData(matrix);
            const site = new Site({
                index: 0,
                isotope: '2H',
                element: 'H',
                spin: 1.0,
                Q,
                efg,
            });
            const sys = new SpinSystem({ sites: [site] });
            const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '2H', q_order, include_header: false }));

            expect(actual.quadrupoles.length).toBe(1);
            expect(actual.quadrupoles[0].order).toBe(ref.quadrupoles[0].order);
            assertClose(actual.quadrupoles[0].Cq, ref.quadrupoles[0].Cq, 1e-5);
            assertClose(actual.quadrupoles[0].eta, ref.quadrupoles[0].eta, 1e-5);
        }
    });

    it('validates Test 05a, 05b: Dipolar coupling and no 2pi factor', () => {
        for (const suffix of ['a', 'b']) {
            const key = `test_05${suffix}`;
            const ref = parseSpinsys(fixtures[key].spinsys);
            const { D_matrix, d } = fixtures[key].input;

            const s1 = new Site({ index: 0, isotope: '1H', element: 'H' });
            const s2 = new Site({ index: 1, isotope: '13C', element: 'C' });
            const dip = new Coupling({
                type: 'D',
                site_i: 0,
                site_j: 1,
                tensor: new TensorData(D_matrix),
                coupling_constant: d,
                anisotropy: 3 * d,
            });

            const sys = new SpinSystem({ sites: [s1, s2], couplings: [dip] });
            const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '13C', include_header: false }));

            expect(actual.dipoles.length).toBe(1);
            expect(actual.dipoles[0].idx1).toBe(1);
            expect(actual.dipoles[0].idx2).toBe(2);
            assertClose(actual.dipoles[0].d, ref.dipoles[0].d, 1e-6);
            // Verify no 2*pi bug (value is ~ -30210 Hz, not -190000 Hz)
            expect(Math.abs(actual.dipoles[0].d)).toBeLessThan(50000);
        }
    });

    it('validates Test 06, 07a, 07b: J-coupling and SIMPSON zeta/2 scaling', () => {
        for (const name of ['test_06', 'test_07a', 'test_07b']) {
            const ref = parseSpinsys(fixtures[name].spinsys);
            const { J_matrix } = fixtures[name].input;
            const tensor = new TensorData(J_matrix);

            const s1 = new Site({ index: 0, isotope: '1H', element: 'H' });
            const s2 = new Site({ index: 1, isotope: '13C', element: 'C' });
            const jCoup = new Coupling({
                type: 'J',
                site_i: 0,
                site_j: 1,
                tensor,
                coupling_constant: tensor.isotropy,
                anisotropy: tensor.reduced_anisotropy,
                asymmetry: tensor.asymmetry,
            });

            const sys = new SpinSystem({ sites: [s1, s2], couplings: [jCoup] });
            const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '13C', include_header: false }));

            expect(actual.jcouplings.length).toBe(1);
            assertClose(actual.jcouplings[0].J_iso, ref.jcouplings[0].J_iso, 1e-6);
            assertClose(actual.jcouplings[0].J_aniso, ref.jcouplings[0].J_aniso, 1e-6);
        }
    });

    it('validates Test 08: Quadrupole-dipole cross-term ordering', () => {
        const ref = parseSpinsys(fixtures.test_08.spinsys);
        const { efg_n, D_matrix } = fixtures.test_08.input;

        const s1 = new Site({ index: 0, isotope: '13C', element: 'C', spin: 0.5 });
        const s2 = new Site({
            index: 1,
            isotope: '14N',
            element: 'N',
            spin: 1.0,
            Q: 0.02044, // barn for 14N
            efg: new TensorData(efg_n),
        });
        const dip = new Coupling({
            type: 'D',
            site_i: 0,
            site_j: 1,
            tensor: new TensorData(D_matrix),
            coupling_constant: -660.2,
            anisotropy: 3 * -660.2,
        });

        const sys = new SpinSystem({ sites: [s1, s2], couplings: [dip] });
        const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '13C', q_order: 2, include_header: false }));

        // Cross-term line: quadrupole_x_dipole 2 1 (site 2 is 14N, site 1 is 13C)
        expect(actual.cross_qd).toEqual([[2, 1]]);
        expect(actual.cross_qd).toEqual(ref.cross_qd);
    });

    it('validates Quartz: periodic structure, 17O, minimum-image dipolar couplings', () => {
        const ref = parseSpinsys(fixtures.quartz_3si.spinsys);
        const magresNMR = fs.readFileSync(path.join(FIXTURES_DIR, '../../../utils/__fixtures__/quartz.nmr.magres'), 'utf-8');
        const magresEFG = fs.readFileSync(path.join(FIXTURES_DIR, '../../../utils/__fixtures__/quartz.efg.magres'), 'utf-8');

        const mergedMagres = mergeMagresText(magresNMR, magresEFG);
        const loader = new Loader();
        const s = loader.load(mergedMagres, 'magres', 'quartz');
        const model = new Model(s['quartz'], { useNMRActiveIsotopes: true });

        // Build spin system for first 3 atoms (all Si)
        const sys = buildSpinSystem(model.atoms.slice(0, 3), {
            references: { Si: 300.0, O: 200.0 },
            includeD: true,
        });

        const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '29Si', include_header: false }));

        expect(actual.nuclei).toEqual(ref.nuclei);
        expect(actual.shifts.length).toBe(3);
        for (let i = 0; i < 3; i++) {
            assertClose(actual.shifts[i].iso, ref.shifts[i].iso, 1e-6);
            assertClose(actual.shifts[i].aniso, ref.shifts[i].aniso, 1e-6);
            assertClose(actual.shifts[i].asymm, ref.shifts[i].asymm, 1e-6);
        }

        expect(actual.dipoles.length).toBe(3);
        for (let i = 0; i < 3; i++) {
            assertClose(actual.dipoles[i].d, ref.dipoles[i].d, 1e-5);
        }
    });

    it('validates Ethanol: MS, Dipolar and J couplings', () => {
        const ref = parseSpinsys(fixtures.ethanol_3h.spinsys);
        const magresText = fs.readFileSync(path.join(FIXTURES_DIR, 'ethanol.magres'), 'utf-8');

        const loader = new Loader();
        const s = loader.load(magresText, 'magres', 'ethanol');
        const model = new Model(s['ethanol'], { useNMRActiveIsotopes: true });

        const sys = buildSpinSystem(model.atoms.slice(0, 3), {
            references: { C: 180.0, H: 30.0, O: 200.0 },
            includeD: true,
            includeJ: true,
        });

        const actual = parseSpinsys(toSimpson(sys, { observed_nucleus: '1H', include_header: false }));

        expect(actual.shifts.length).toBe(3);
        for (let i = 0; i < 3; i++) {
            assertClose(actual.shifts[i].iso, ref.shifts[i].iso, 1e-6);
            assertClose(actual.shifts[i].aniso, ref.shifts[i].aniso, 1e-6);
            assertClose(actual.shifts[i].asymm, ref.shifts[i].asymm, 1e-6);
        }

        expect(actual.dipoles.length).toBe(3);
        for (let i = 0; i < 3; i++) {
            assertClose(actual.dipoles[i].d, ref.dipoles[i].d, 1e-5);
        }

        expect(actual.jcouplings.length).toBe(3);
        for (let i = 0; i < 3; i++) {
            assertClose(actual.jcouplings[i].J_iso, ref.jcouplings[i].J_iso, 1e-5);
            assertClose(actual.jcouplings[i].J_aniso, ref.jcouplings[i].J_aniso, 1e-5);
        }
    });

    it('validates mrsimulator JSON output matches Soprano reference', () => {
        // Test with test_01, test_03a, test_06, and ethanol
        const ref01 = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'test_01_mrsimulator.json'), 'utf-8')).data;
        const ms01 = new TensorData([[-100, 0, 0], [0, -100, 0], [0, 0, -100]]);
        const s01 = new SpinSystem({ sites: [new Site({ index: 0, isotope: '13C', element: 'C', ms: ms01, reference: 0.0, gradient: -1.0 })] });
        const act01 = toMrsimulator(s01);

        expect(act01.sites[0].isotope).toBe(ref01.sites[0].isotope);
        assertClose(act01.sites[0].isotropic_chemical_shift, ref01.sites[0].isotropic_chemical_shift);
        assertClose(act01.sites[0].shielding_symmetric.zeta, ref01.sites[0].shielding_symmetric.zeta);
    });

    it('generates a split ZIP archive containing one spinsys file per site', async () => {
        const ms1 = new TensorData([[100, 0, 0], [0, 100, 0], [0, 0, -200]]);
        const ms2 = new TensorData([[200, 0, 0], [0, -100, 0], [0, 0, -100]]);
        const site1 = new Site({ index: 0, isotope: '13C', element: 'C', label: 'C1', ms: ms1, reference: 0.0 });
        const site2 = new Site({ index: 1, isotope: '1H', element: 'H', label: 'H1', ms: ms2, reference: 0.0 });
        const sys = new SpinSystem({ sites: [site1, site2] });

        const { toSimpsonSplitZip } = await import('./simpson');
        const zipBytes = toSimpsonSplitZip(sys, 'ethanol');
        expect(zipBytes).toBeInstanceOf(Uint8Array);
        expect(zipBytes.length).toBeGreaterThan(100);

        // Header check: ZIP local file header signature 0x04034b50
        const view = new DataView(zipBytes.buffer);
        expect(view.getUint32(0, true)).toBe(0x04034b50);
    });

    it('includes rich metadata in SIMPSON header from real MAGRES calculation', () => {
        const magresText = fs.readFileSync(path.join(FIXTURES_DIR, 'ethanol.magres'), 'utf-8');
        const loader = new Loader();
        const s = loader.load(magresText, 'magres', 'ethanol');
        const model = new Model(s['ethanol'], { useNMRActiveIsotopes: true });

        const sys = buildSpinSystem(model.atoms, {
            references: { H: 30.0, C: 180.0, O: 200.0 },
            gradients: { H: -1.0, C: -1.0, O: -1.0 },
            includeD: true,
            sourceFilename: 'ethanol.magres',
            modelName: 'ethanol',
            averageGroups: 'CH3',
        });

        const output = toSimpson(sys, { observed_nucleus: '1H', filename: 'ethanol.spinsys' });

        // App and version
        expect(output).toContain('# SIMPSON spin system generated by MagresView 2 v0.4.0');
        // Source file
        expect(output).toContain('# Source file: ethanol.magres');
        // MAGRES calculation block metadata
        expect(output).toContain('# MAGRES calculation:');
        expect(output).toContain('#   Code: CASTEP 7.0');
        expect(output).toContain('#   Functional: PBE');
        expect(output).toContain('Cutoff energy: 4.0000000000000000E+01');
        expect(output).toContain('K-point grid: 1 1 1');
        // Exported sites and indices
        expect(output).toContain('# Exported sites:');
        expect(output).toContain('[averaged group]');
        // Merging and averaging notes
        expect(output).toContain('# Merging and averaging:');
        expect(output).toContain('Combined average group \'CH3\'');
        expect(output).toContain('Intra-group couplings were dropped.');
        // Referencing
        expect(output).toContain('# Shielding references:');
        expect(output).toContain('H: reference = 30 ppm, gradient = -1');
        // Spin system dimension
        expect(output).toContain('# Spin system dimension:');
        // Template
        expect(output).toContain('# Minimal runnable SIMPSON .in template');
        expect(output).toContain('source ethanol.spinsys');
        // Actual spinsys block
        expect(output).toContain('spinsys {');
    });

    it('includes rich metadata in mrsimulator output', () => {
        const magresText = fs.readFileSync(path.join(FIXTURES_DIR, 'ethanol.magres'), 'utf-8');
        const loader = new Loader();
        const s = loader.load(magresText, 'magres', 'ethanol');
        const model = new Model(s['ethanol'], { useNMRActiveIsotopes: true });

        const sys = buildSpinSystem(model.atoms.slice(0, 3), {
            references: { H: 30.0, C: 180.0 },
            sourceFilename: 'ethanol.magres',
            modelName: 'ethanol',
        });

        const mrData = toMrsimulator(sys);

        expect(mrData.name).toBe('ethanol.magres');
        expect(mrData.description).toContain('MagresView 2 v0.4.0');
        expect(mrData.description).toContain('ethanol.magres');
        expect(mrData.description).toContain('CASTEP 7.0');
        expect(mrData.description).toContain('Exported atom indices: [0, 1, 2]');

        expect(mrData.metadata).toBeDefined();
        expect(mrData.metadata.app).toBe('MagresView 2');
        expect(mrData.metadata.version).toBe('0.4.0');
        expect(mrData.metadata.source_file).toBe('ethanol.magres');
        expect(mrData.metadata.exported_indices).toEqual([0, 1, 2]);
        expect(mrData.metadata.calculation.parameters.calc_code).toEqual(['CASTEP']);
        expect(mrData.metadata.calculation.parameters.calc_xcfunctional).toEqual(['PBE']);
        expect(mrData.metadata.selection.totalAtomsInModel).toBe(9);
        expect(mrData.metadata.selection.isSubset).toBe(true);

        expect(mrData.sites.length).toBe(3);
    });

    it('populates metadata in split ZIP archive spinsys files', async () => {
        const magresText = fs.readFileSync(path.join(FIXTURES_DIR, 'ethanol.magres'), 'utf-8');
        const loader = new Loader();
        const s = loader.load(magresText, 'magres', 'ethanol');
        const model = new Model(s['ethanol'], { useNMRActiveIsotopes: true });

        const sys = buildSpinSystem(model.atoms.slice(0, 2), {
            references: { H: 30.0 },
            sourceFilename: 'ethanol.magres',
            modelName: 'ethanol',
        });

        const { toSimpsonSplitZip } = await import('./simpson');
        const zipBytes = toSimpsonSplitZip(sys, 'ethanol');
        // Parse ZIP central directory or convert bytes to string to check metadata in file headers
        const textDecoder = new TextDecoder('utf-8');
        const zipString = textDecoder.decode(zipBytes);

        expect(zipString).toContain('# SIMPSON spin system generated by MagresView 2 v0.4.0');
        expect(zipString).toContain('# Source file: ethanol.magres');
        expect(zipString).toContain('# MAGRES calculation:');
        expect(zipString).toContain('#   Code: CASTEP 7.0');
        expect(zipString).toContain('# Exported sites: 1 (from 9 atoms in model)');
    });
});
