import { describe, it, expect } from 'vitest';
import { TensorData } from '@ccp-nc/crystvis-js';
import {
    Site,
    Coupling,
    SpinSystem,
    buildSpinSystem,
    calculateDimension,
    calculateSpinHalfEquivalent,
    getFeasibility,
    getConnectedComponents,
    FEASIBILITY_LIMITS,
    EFG_TO_HZ,
} from './index';

describe('Site model', () => {
    it('computes chemical shift from shielding reference and gradient', () => {
        // MS eigenvalues: [225, 75, -300], iso = 0, zeta = -300
        const D = [
            [225, 0, 0],
            [0, 75, 0],
            [0, 0, -300]
        ];
        const ms = new TensorData(D);
        const site = new Site({
            index: 0,
            isotope: '13C',
            element: 'C',
            ms,
            reference: 180.0,
            gradient: -1.0,
        });

        expect(site.hasShift).toBe(true);
        // delta_iso = ref + grad * sigma_iso = 180 - 0 = 180
        expect(site.shift_iso).toBe(180.0);
        // shift_reduced_anisotropy = grad * ms.reduced_anisotropy = -1 * (-300) = +300
        expect(site.shift_reduced_anisotropy).toBe(300.0);
        expect(site.shift_asymmetry).toBeCloseTo(0.5);
    });

    it('computes quadrupolar Cq for quadrupole-active nuclei', () => {
        // EFG tensor in atomic units with Vzz = 0.5
        const V = [
            [-0.25, 0, 0],
            [0, -0.25, 0],
            [0, 0, 0.5]
        ];
        const efg = new TensorData(V);
        const site = new Site({
            index: 0,
            isotope: '2H',
            element: 'H',
            spin: 1.0, // I = 1 > 0.5
            Q: 0.00286, // barn
            efg,
        });

        expect(site.isQuadrupoleActive).toBe(true);
        const expectedCq = EFG_TO_HZ * 0.00286 * 0.5;
        expect(site.Cq).toBeCloseTo(expectedCq, 2);
    });

    it('returns Cq = 0 for spin-1/2 nuclei', () => {
        const V = [
            [-0.25, 0, 0],
            [0, -0.25, 0],
            [0, 0, 0.5]
        ];
        const site = new Site({
            index: 0,
            isotope: '1H',
            element: 'H',
            spin: 0.5,
            Q: 0,
            efg: new TensorData(V),
        });
        expect(site.isQuadrupoleActive).toBe(false);
        expect(site.Cq).toBe(0);
    });
});

describe('SpinSystem feasibility guard', () => {
    it('computes Hilbert space dimension and spin-1/2 equivalent', () => {
        // Two spin-1/2 nuclei: dim = 2 * 2 = 4
        const s1 = new Site({ index: 0, spin: 0.5 });
        const s2 = new Site({ index: 1, spin: 0.5 });
        expect(calculateDimension([s1, s2])).toBe(4);
        expect(calculateSpinHalfEquivalent(4)).toBe(2);
        expect(getFeasibility(4)).toBe('silent');

        // Nine spin-1/2 nuclei: dim = 512 (> 256, <= 4096) -> slow
        const nineSpins = Array.from({ length: 9 }, (_, i) => new Site({ index: i, spin: 0.5 }));
        const dim9 = calculateDimension(nineSpins);
        expect(dim9).toBe(512);
        expect(getFeasibility(dim9)).toBe('slow');

        // Thirteen spin-1/2 nuclei: dim = 8192 (> 4096) -> warning
        const thirteenSpins = Array.from({ length: 13 }, (_, i) => new Site({ index: i, spin: 0.5 }));
        const dim13 = calculateDimension(thirteenSpins);
        expect(dim13).toBe(8192);
        expect(getFeasibility(dim13)).toBe('warning');
    });

    it('computes connected components for coupling graph', () => {
        const couplings = [
            new Coupling({ type: 'D', site_i: 0, site_j: 1 }),
            new Coupling({ type: 'D', site_i: 2, site_j: 3 }),
            new Coupling({ type: 'D', site_i: 3, site_j: 4 }),
        ];
        const comps = getConnectedComponents(6, couplings);
        // Expect components: [0, 1], [2, 3, 4], [5]
        expect(comps.length).toBe(3);
    });

    it('blocks export when shielding reference is missing (ADR-0010)', () => {
        const ms = new TensorData([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
        const mockAtom = {
            index: 0,
            element: 'C',
            isotope: '13',
            xyz: [0, 0, 0],
            getArrayValue: (k) => (k === 'ms' ? ms : null),
            isotopeData: { spin: 0.5, gamma: 6.728, Q: 0 },
        };

        const sysWithoutRef = buildSpinSystem([mockAtom], {
            references: {}, // Missing C reference!
        });

        expect(sysWithoutRef.canExport).toBe(false);
        expect(sysWithoutRef.missingReferences).toEqual(['C']);

        const sysWithRef = buildSpinSystem([mockAtom], {
            references: { C: 180.0 },
        });

        expect(sysWithRef.canExport).toBe(true);
        expect(sysWithRef.missingReferences).toEqual([]);
    });

    it('verifies MAGRESVIEW_VERSION matches package.json', async () => {
        const { MAGRESVIEW_VERSION } = await import('./constants');
        const fs = await import('fs');
        const path = await import('path');
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf-8'));
        expect(MAGRESVIEW_VERSION).toBe(pkg.version);
    });

    it('formats calculation metadata summary cleanly', async () => {
        const { formatCalculationSummary } = await import('./metadata');
        const calcMeta = {
            calc_code: ['QE-GIPAW'],
            calc_code_version: ['7.1'],
            calc_code_platform: ['x86_64'],
            calc_xcfunctional: ['PBE'],
            calc_cutoffenergy: ['60.0 Ry'],
            calc_kpoint_mp_grid: ['4 4 4'],
            calc_kpoint_mp_offset: ['0.5 0.5 0.5'],
            calc_pspot: ['Si.pbe-tm-gipaw.UPF', 'O.pbe-rrkjus-gipaw-dc.UPF'],
            calc_prefix: ['quartz'],
            calc_custom_setting: ['val1', 'val2'],
        };

        const lines = formatCalculationSummary(calcMeta);
        expect(lines).toContain('Code: QE-GIPAW 7.1 (x86_64)');
        expect(lines).toContain('Functional: PBE');
        expect(lines).toContain('Cutoff energy: 60.0 Ry');
        expect(lines).toContain('K-point grid: 4 4 4 (offset: 0.5 0.5 0.5)');
        expect(lines).toContain('Pseudopotentials: Si.pbe-tm-gipaw.UPF; O.pbe-rrkjus-gipaw-dc.UPF');
        expect(lines).toContain('Job name: quartz');
        expect(lines).toContain('custom_setting: val1 val2');
    });
});
