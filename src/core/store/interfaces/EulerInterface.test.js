import { describe, it, expect, vi } from 'vitest';

import { EulerInterface } from './EulerInterface';

function makeInterface(stateOverrides = {}) {
    const dispatch = vi.fn();
    const state = {
        eul_convention: 'zyz',
        eul_active: true,
        eul_active_config: 0,
        eul_configs: [],
        eul_orientation_class: null,
        ...stateOverrides
    };
    return { intf: new EulerInterface(state, dispatch), dispatch };
}

const HALF_PI = Math.PI / 2;

describe('EulerInterface.configs', () => {
    it('converts radians to degrees and flags the active row', () => {
        const { intf } = makeInterface({
            eul_active_config: 1,
            eul_configs: [
                { index: 0, id: 'a', aFlip: 'identity', bFlip: 'identity', euler: [0, 0, 0], singular: true },
                { index: 1, id: 'b', aFlip: 'flip-x', bFlip: 'flip-y', euler: [HALF_PI, HALF_PI, Math.PI], singular: false }
            ]
        });

        const rows = intf.configs;
        expect(rows[1].active).toBe(true);
        expect(rows[0].active).toBe(false);
        expect(rows[1].alpha).toBeCloseTo(90);
        expect(rows[1].beta).toBeCloseTo(90);
        expect(rows[1].gamma).toBeCloseTo(180);
        expect(rows[0].singular).toBe(true);
    });
});

describe('EulerInterface.cycleConfig', () => {
    const configs = [{ index: 0 }, { index: 1 }, { index: 2 }];

    it('wraps forward past the end', () => {
        const { intf, dispatch } = makeInterface({ eul_active_config: 2, eul_configs: configs });
        intf.cycleConfig(1);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ eul_active_config: 0 })
        }));
    });

    it('wraps backward past the start', () => {
        const { intf, dispatch } = makeInterface({ eul_active_config: 0, eul_configs: configs });
        intf.cycleConfig(-1);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ eul_active_config: 2 })
        }));
    });

    it('does nothing with no configurations', () => {
        const { intf, dispatch } = makeInterface({ eul_active_config: 0, eul_configs: [] });
        intf.cycleConfig(1);
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('EulerInterface.swapAB', () => {
    const atomA = { crystLabel: 'A' };
    const atomB = { crystLabel: 'B' };

    it('swaps atoms, tensors and orderings and rebuilds', () => {
        const { intf, dispatch } = makeInterface({
            eul_atom_A: atomA, eul_atom_B: atomB,
            eul_tensor_A: 'ms', eul_tensor_B: 'dipolar',
            eul_order_A: 'haeberlen', eul_order_B: 'nqr'
        });
        intf.swapAB();
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                eul_newatom_A: atomB, eul_newatom_B: atomA,
                eul_tensor_A: 'dipolar', eul_tensor_B: 'ms',
                eul_order_A: 'nqr', eul_order_B: 'haeberlen'
            })
        }));
    });

    it('does nothing unless both atoms are picked', () => {
        const { intf, dispatch } = makeInterface({ eul_atom_A: atomA, eul_atom_B: null });
        intf.swapAB();
        expect(dispatch).not.toHaveBeenCalled();
    });
});

describe('EulerInterface.setTensor', () => {
    it('snaps ordering to the tensor\'s natural convention (EFG → NQR)', () => {
        const { intf, dispatch } = makeInterface({ eul_tensor_B: 'ms', eul_order_B: 'haeberlen' });
        intf.setTensor('B', 'efg');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ eul_tensor_B: 'efg', eul_order_B: 'nqr' })
        }));
    });

    it('uses Haeberlen for MS and dipolar', () => {
        const { intf, dispatch } = makeInterface();
        intf.setTensor('A', 'dipolar');
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ eul_tensor_A: 'dipolar', eul_order_A: 'haeberlen' })
        }));
    });
});

describe('EulerInterface.gaugeWarning', () => {
    it('is null when there is no problematic axial ordering', () => {
        const { intf } = makeInterface({ eul_orientation: { freeRotation: null } });
        expect(intf.gaugeWarning).toBe(null);
    });

    it('recommends the natural ordering when a unique axis lands on X', () => {
        const { intf } = makeInterface({
            eul_tensor_B: 'efg', eul_order_B: 'decreasing',
            eul_orientation: { freeRotation: { problematic: true, onX: { source: false, target: true } } }
        });
        const w = intf.gaugeWarning;
        expect(w).toContain('Tensor B');
        expect(w).toContain('NQR');
    });
});

describe('EulerInterface validation', () => {
    it('rejects an invalid PAS ordering', () => {
        const { intf } = makeInterface();
        expect(() => { intf.orderA = 'bogus'; }).toThrow();
    });

    it('rejects an invalid Euler sequence', () => {
        const { intf } = makeInterface();
        expect(() => { intf.sequence = 'xyz'; }).toThrow();
    });
});
