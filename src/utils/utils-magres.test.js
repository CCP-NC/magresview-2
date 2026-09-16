import { describe, it, expect } from 'vitest';
import {
    canMergeModels,
    getMergedModelName,
    parseMagresBlocks,
    mergeMagresText,
    findMergeablePair,
    hasMetadataClash,
    getCalculationMetadata
} from './utils-magres';

import fixtureNMR from './__fixtures__/quartz.nmr.magres?raw';
import fixtureEFG from './__fixtures__/quartz.efg.magres?raw';

describe('utils-magres', () => {
    function createMockModel({
        symbols = ['Si', 'O'],
        positions = [[0, 0, 0], [1, 1, 1]],
        cell = [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
        arrays = {},
        info = {}
    } = {}) {
        return {
            _atoms_base: {
                length: () => symbols.length,
                get_chemical_symbols: () => symbols,
                get_positions: () => positions,
                get_cell: () => cell,
                info: info
            },
            hasArray: (name) => Boolean(arrays[name]),
            getArray: (name) => arrays[name] || null
        };
    }

    describe('canMergeModels', () => {
        it('returns false for null/undefined or identical instances', () => {
            const m = createMockModel();
            expect(canMergeModels(null, m)).toBe(false);
            expect(canMergeModels(m, null)).toBe(false);
            expect(canMergeModels(m, m)).toBe(false);
        });

        it('returns false when atom counts differ', () => {
            const mA = createMockModel({ symbols: ['Si', 'O'] });
            const mB = createMockModel({ symbols: ['Si'] });
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when chemical symbols differ', () => {
            const mA = createMockModel({ symbols: ['Si', 'O'] });
            const mB = createMockModel({ symbols: ['Si', 'C'] });
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when positions differ beyond tolerance', () => {
            const mA = createMockModel({ positions: [[0, 0, 0], [1, 1, 1]] });
            const mB = createMockModel({ positions: [[0, 0, 0], [1, 1, 1.05]] });
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when cells differ beyond tolerance', () => {
            const mA = createMockModel({ cell: [[2, 0, 0], [0, 2, 0], [0, 0, 2]] });
            const mB = createMockModel({ cell: [[3, 0, 0], [0, 2, 0], [0, 0, 2]] });
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when both have identical tensor data', () => {
            const mA = createMockModel({ arrays: { ms: true, efg: true } });
            const mB = createMockModel({ arrays: { ms: true, efg: true } });
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns true when structures match and tensors are complementary', () => {
            const mA = createMockModel({ arrays: { ms: true } });
            const mB = createMockModel({ arrays: { efg: true } });
            expect(canMergeModels(mA, mB)).toBe(true);
        });

        it('returns false when pseudopotentials clash (QE-GIPAW format)', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_pspot Si.pbe-tm-gipaw.UPF\ncalc_pspot O.pbe-rrkjus-gipaw-dc.UPF'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_pspot Si.different-pspot.UPF\ncalc_pspot O.pbe-rrkjus-gipaw-dc.UPF'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(true);
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when pseudopotentials clash (CASTEP format)', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code CASTEP\ncalc_pspot H 1|0.6|13|15|17|10(qc=8)'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code CASTEP\ncalc_pspot H 2|0.8|20|20|20|10(qc=9)'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(true);
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when cutoffs clash', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_cutoffenergy 40.00 Ry'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_cutoffenergy 60.00 Ry'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(true);
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when functionals clash', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_xcfunctional PBE'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_xcfunctional LDA'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(true);
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('returns false when k-point grids clash', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_kpoint_mp_grid 4 4 4'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_kpoint_mp_grid 8 8 8'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(true);
            expect(canMergeModels(mA, mB)).toBe(false);
        });

        it('allows merging when metadata matches even with equivalent numeric formatting differences', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_cutoffenergy 40.00 Ry\ncalc_kpoint_mp_offset 0.50 0.50 0.50\ncalc_pspot Si.pbe-tm-gipaw.UPF'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_cutoffenergy 40.0 Ry\ncalc_kpoint_mp_offset 0.5 0.5 0.5\ncalc_pspot Si.pbe-tm-gipaw.UPF'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(false);
            expect(canMergeModels(mA, mB)).toBe(true);
        });

        it('allows merging when one model has extra non-conflicting metadata', () => {
            const mA = createMockModel({
                arrays: { ms: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_code_version_git 717e55c36f28\ncalc_cutoffenergy 40.00 Ry'
                    }
                }
            });
            const mB = createMockModel({
                arrays: { efg: true },
                info: {
                    'magres-blocks': {
                        calculation: 'calc_code QE-GIPAW\ncalc_cutoffenergy 40.00 Ry'
                    }
                }
            });
            expect(hasMetadataClash(mA, mB)).toBe(false);
            expect(canMergeModels(mA, mB)).toBe(true);
        });
    });

    describe('getMergedModelName', () => {
        it('cleans suffixes .nmr and .efg', () => {
            expect(getMergedModelName('quartz.nmr', 'quartz.efg')).toBe('quartz');
            expect(getMergedModelName('quartz-nmr', 'quartz-efg')).toBe('quartz');
            expect(getMergedModelName('quartz_nmr', 'quartz_efg')).toBe('quartz');
        });

        it('cleans CrystVis collision index like quartz and quartz_1', () => {
            expect(getMergedModelName('quartz', 'quartz_1')).toBe('quartz');
        });

        it('respects matching calc_prefix from metadata', () => {
            const info = { 'magres-blocks': { calculation: 'calc_code QE-GIPAW\ncalc_prefix my_quartz' } };
            const mA = createMockModel({ info });
            const mB = createMockModel({ info });
            expect(getMergedModelName('foo', 'bar', mA, mB)).toBe('my_quartz');
        });

        it('reads calc_prefix out of the real fixtures', () => {
            const model = { info: { 'magres-blocks': parseMagresBlocks(fixtureNMR) } };
            expect(getCalculationMetadata(model).calc_prefix).toEqual(['quartz']);
        });
    });

    describe('parseMagresBlocks & mergeMagresText', () => {
        const magresA = `#$magres-abinitio-v1.0
[calculation]
calc_code QE-GIPAW
calc_prefix quartz
calc_version 7.4
[/calculation]
[atoms]
  units lattice Angstrom
  lattice 2.0 0.0 0.0 0.0 2.0 0.0 0.0 0.0 2.0
  units atom Angstrom
  atom Si Si 1 0.0 0.0 0.0
[/atoms]
[magres]
  units sus 10^-6.cm^3.mol^-1
  sus 1 0 0 0 1 0 0 0 1
  units ms ppm
  ms Si 1 100 0 0 0 100 0 0 0 100
[/magres]`;

        const magresB = `#$magres-abinitio-v1.0
[calculation]
calc_code QE-GIPAW
calc_prefix quartz
calc_git_hash 1234abcd
[/calculation]
[atoms]
  units lattice Angstrom
  lattice 2.0 0.0 0.0 0.0 2.0 0.0 0.0 0.0 2.0
  units atom Angstrom
  atom Si Si 1 0.0 0.0 0.0
[/atoms]
[magres]
  units efg au
  efg Si 1 0.5 0 0 0 0.5 0 0 0 -1.0
[/magres]`;

        it('parses blocks correctly', () => {
            const blocks = parseMagresBlocks(magresA);
            expect(blocks).toHaveProperty('calculation');
            expect(blocks).toHaveProperty('atoms');
            expect(blocks).toHaveProperty('magres');
        });

        it('merges magres files with combined calculation and magres blocks', () => {
            const merged = mergeMagresText(magresA, magresB);
            expect(merged).toContain('#$magres-abinitio-v1.0');
            expect(merged).toContain('calc_version 7.4');
            expect(merged).toContain('calc_git_hash 1234abcd');
            expect(merged).toContain('units ms ppm');
            expect(merged).toContain('units efg au');
            expect(merged).toContain('units sus 10^-6.cm^3.mol^-1');
            expect(merged).toContain('ms Si 1');
            expect(merged).toContain('efg Si 1');
            expect(merged).toContain('sus 1 0 0');
        });

        it('carries blocks the parser does not interpret through the merge', async () => {
            const { Loader } = await import('@ccp-nc/crystvis-js/lib/loader.js');
            const withOldBlock = magresA + '\n[magres_old]\nAtom: Si        1\nTOTAL tensor\n[/magres_old]\n';
            const merged = mergeMagresText(withOldBlock, magresB);
            expect(merged).toContain('Atom: Si        1');

            const loader = new Loader();
            loader.load(merged, 'magres', 'x');
            expect(loader.status, `Loader error: ${loader.error_message}`).toBe(0);
        });

        it('keeps the symmetry line in the atoms block', () => {
            const withSymmetry = magresA.replace('  units atom Angstrom', '  symmetry P1\n  units atom Angstrom');
            expect(mergeMagresText(withSymmetry, magresB)).toContain('symmetry P1');
        });

        it('merges the quartz fixtures and validates through CrystVis Loader', async () => {
            const { Loader } = await import('@ccp-nc/crystvis-js/lib/loader.js');
            const { Model } = await import('@ccp-nc/crystvis-js/lib/model.js');
            const merged = mergeMagresText(fixtureNMR, fixtureEFG);

            const loader = new Loader();
            const structs = loader.load(merged, 'magres', 'quartz');
            expect(loader.status, `Loader error: ${loader.error_message}`).toBe(0);
            expect(structs).toHaveProperty('quartz');

            const model = new Model(structs['quartz'], {
                supercell: [3, 3, 3],
                molecularCrystal: null,
                useNMRActiveIsotopes: true,
                vdwScaling: 1.0
            });
            expect(model._atoms_base.length()).toBe(9);
            expect(model.hasArray('ms')).toBe(true);
            expect(model.hasArray('efg')).toBe(true);
        });
    });

    describe('findMergeablePair', () => {
        it('returns null if fewer than 2 models loaded', () => {
            expect(findMergeablePair({ modelList: ['onlyOne'] })).toBe(null);
            expect(findMergeablePair(null)).toBe(null);
        });

        it('finds mergeable pair in app modelList', () => {
            const mA = createMockModel({ arrays: { ms: true } });
            const mB = createMockModel({ arrays: { efg: true } });
            const app = {
                modelList: ['quartz.nmr', 'quartz.efg'],
                _models: {
                    'quartz.nmr': mA,
                    'quartz.efg': mB
                }
            };

            const pair = findMergeablePair(app);
            expect(pair).toEqual(['quartz.nmr', 'quartz.efg']);
        });
    });
});
