import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TensorData } from '@ccp-nc/crystvis-js';
import { eulerAngleListener, eulerDisksListener, eulerConfigListener } from './euler';

// Real crystvis tensors so we exercise the actual relativeOrientationTo path.
const TRIAXIAL_A = [[10, 1, 2], [1, 20, 1], [2, 1, 30]];
const TRIAXIAL_B = [[12, 0, 3], [0, 18, 1], [3, 1, 25]];
const AXIAL = [[15, 0, 0], [0, 15, 0], [0, 0, 30]];
const SPHERICAL = [[5, 0, 0], [0, 5, 0], [0, 0, 5]];

function makeAtom(tensors, xyz = [0, 0, 0]) {
    // tensors: { ms: 3x3, efg: 3x3 }
    const data = {};
    for (const k in tensors) data[k] = new TensorData(tensors[k]);
    return {
        radius: 1,
        crystLabel: 'A1',
        xyz,
        addLabel: vi.fn(),
        removeLabel: vi.fn(),
        addEulerDisks: vi.fn(),
        removeEulerDisks: vi.fn(),
        getEulerDisks: vi.fn(() => null),
        getArrayValue: vi.fn((k) => data[k]),
        model: { hasArray: vi.fn((k) => k in data) }
    };
}

function baseState(atom, overrides = {}) {
    return {
        eul_atom_A: null,
        eul_atom_B: null,
        eul_newatom_A: atom,
        eul_newatom_B: atom,
        eul_tensor_A: 'ms',
        eul_tensor_B: 'efg',
        eul_order_A: 'haeberlen',
        eul_order_B: 'haeberlen',
        eul_convention: 'zyz',
        eul_active: true,
        eul_disks_on: true,
        eul_active_config: 0,
        ...overrides
    };
}

describe('eulerAngleListener', () => {
    it('builds a discrete orientation with 16 configurations and renders disks', () => {
        const atom = makeAtom({ ms: TRIAXIAL_A, efg: TRIAXIAL_B });
        const out = eulerAngleListener(baseState(atom));

        expect(out.eul_orientation_class).toBe('discrete');
        expect(out.eul_configs).toHaveLength(16);
        expect(out.eul_active_config).toBe(0);       // reset to default (ADR-0004)
        expect(atom.addEulerDisks).toHaveBeenCalledTimes(1);
        // Same-atom vis is anchored on atom A.
        expect(out.eul_atom_A).toBe(atom);
    });

    it('gives an axial/triaxial pair a discrete gauged solution (unique axis on Z)', () => {
        const atom = makeAtom({ ms: TRIAXIAL_A, efg: AXIAL });
        const out = eulerAngleListener(baseState(atom));

        // Target (EFG) axial with unique axis on Z under Haeberlen ⇒ discrete,
        // gamma gauged to zero, deduped to 8 configurations.
        expect(out.eul_orientation_class).toBe('discrete');
        expect(out.eul_configs).toHaveLength(8);
        expect(out.eul_configs.every((c) => c.euler[2] === 0)).toBe(true);
        expect(atom.addEulerDisks).toHaveBeenCalledTimes(1);
    });

    it('marks a spherical pair indeterminate and does not draw disks', () => {
        const atom = makeAtom({ ms: TRIAXIAL_A, efg: SPHERICAL });
        const out = eulerAngleListener(baseState(atom));

        expect(out.eul_orientation_class).toBe('indeterminate');
        expect(out.eul_configs).toHaveLength(0);
        expect(atom.addEulerDisks).not.toHaveBeenCalled();
        expect(atom.removeEulerDisks).toHaveBeenCalled();
    });

    it('builds the A→B dipolar tensor from atom positions (discrete gauged vs a triaxial)', () => {
        const atomA = makeAtom({ ms: TRIAXIAL_A }, [0, 0, 0]);
        const atomB = makeAtom({ ms: TRIAXIAL_B }, [0, 0, 2.4]);
        const out = eulerAngleListener(baseState(atomA, {
            eul_newatom_A: atomA, eul_newatom_B: atomB,
            eul_tensor_A: 'dipolar', eul_tensor_B: 'ms'
        }));
        // The dipolar tensor is axial with its unique axis on Z under Haeberlen,
        // so the source-axial pair is discrete with alpha gauged to zero.
        expect(out.eul_orientation_class).toBe('discrete');
        expect(out.eul_configs).toHaveLength(8);
        expect(out.eul_configs.every((c) => c.euler[0] === 0)).toBe(true);
        expect(atomA.addEulerDisks).toHaveBeenCalledTimes(1);
    });

    it('yields no orientation for a dipolar tensor on a single (same) atom', () => {
        const atom = makeAtom({ ms: TRIAXIAL_A }, [1, 1, 1]);
        const out = eulerAngleListener(baseState(atom, {
            eul_newatom_A: atom, eul_newatom_B: atom,
            eul_tensor_A: 'dipolar', eul_tensor_B: 'ms'
        }));
        expect(out.eul_orientation_class).toBe(null);
        expect(out.eul_configs).toHaveLength(0);
    });

    it('removes disks when the toggle is off', () => {
        const atom = makeAtom({ ms: TRIAXIAL_A, efg: TRIAXIAL_B });
        const out = eulerAngleListener(baseState(atom, { eul_disks_on: false }));

        expect(out.eul_orientation_class).toBe('discrete');
        expect(atom.addEulerDisks).not.toHaveBeenCalled();
        expect(atom.removeEulerDisks).toHaveBeenCalled();
    });
});

describe('eulerConfigListener', () => {
    it('animates the existing disks to the active configuration', () => {
        const disks = { animateToConfiguration: vi.fn() };
        const atom = makeAtom({ ms: TRIAXIAL_A, efg: TRIAXIAL_B });
        atom.getEulerDisks = vi.fn(() => disks);
        const configs = [{ id: 'c0' }, { id: 'c1' }, { id: 'c2' }];

        eulerConfigListener({ eul_atom_A: atom, eul_configs: configs, eul_active_config: 2 });

        expect(disks.animateToConfiguration).toHaveBeenCalledWith('c2', 300);
    });
});

describe('eulerDisksListener', () => {
    let atom;
    beforeEach(() => { atom = makeAtom({ ms: TRIAXIAL_A, efg: TRIAXIAL_B }); });

    it('adds disks when on', () => {
        const orientation = new TensorData(TRIAXIAL_A).relativeOrientationTo(new TensorData(TRIAXIAL_B));
        eulerDisksListener({
            eul_atom_A: atom, eul_orientation: orientation,
            eul_configs: [{ id: 'x' }], eul_active_config: 0, eul_disks_on: true
        });
        expect(atom.addEulerDisks).toHaveBeenCalledTimes(1);
    });

    it('only removes disks when off', () => {
        eulerDisksListener({
            eul_atom_A: atom, eul_orientation: null,
            eul_configs: [], eul_active_config: 0, eul_disks_on: false
        });
        expect(atom.addEulerDisks).not.toHaveBeenCalled();
        expect(atom.removeEulerDisks).toHaveBeenCalled();
    });
});
