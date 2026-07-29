import { describe, it, expect, vi } from 'vitest';
import { TensorData } from '@ccp-nc/crystvis-js';

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

describe('EulerInterface.txtReport', () => {
    it('returns a notice when no atom pair is selected', () => {
        const { intf } = makeInterface({ eul_atom_A: null, eul_atom_B: null });
        expect(intf.txtReport()).toContain('No atom pair selected');
    });

    it('generates a nicely formatted summary report with atom labels, tensors, orderings, conventions and angles', () => {
        const atomA = { crystLabel: 'Si1' };
        const atomB = { crystLabel: 'O2' };
        const { intf } = makeInterface({
            eul_atom_A: atomA,
            eul_atom_B: atomB,
            eul_tensor_A: 'ms',
            eul_tensor_B: 'efg',
            eul_order_A: 'haeberlen',
            eul_order_B: 'nqr',
            eul_convention: 'zxz',
            eul_active: true,
            eul_active_config: 0,
            eul_configs: [
                { index: 0, id: 'c0', aFlip: 'identity', bFlip: 'identity', euler: [Math.PI / 2, Math.PI / 4, 0] }
            ]
        });

        const report = intf.txtReport();
        expect(report).toContain('MagresView 2 — Relative Tensor Orientation Report');
        expect(report).toContain('Atom A: Si1');
        expect(report).toContain('Tensor:       Shielding');
        expect(report).toContain('PAS Ordering: Haeberlen');
        expect(report).toContain('Atom B: O2');
        expect(report).toContain('Tensor:       EFG');
        expect(report).toContain('PAS Ordering: NQR');
        expect(report).toContain('Sequence:     ZXZ');
        expect(report).toContain('Rotation:     Active');
        expect(report).toContain('Degrees:  alpha = 90.00°,  beta = 45.00°,  gamma = 0.00°');
        expect(report).toContain('Radians:  alpha = 1.5708 rad,  beta = 0.7854 rad,  gamma = 0.0000 rad');
        expect(report).toContain('Active Set:   1 of 1');
    });
});

describe('EulerInterface.txtRotationMatrixReport', () => {
    it('generates a formatted rotation matrix report', () => {
        const atomA = { crystLabel: 'Si1' };
        const atomB = { crystLabel: 'O2' };
        const activeR = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const passiveR = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

        const { intf } = makeInterface({
            eul_atom_A: atomA,
            eul_atom_B: atomB,
            eul_tensor_A: 'ms',
            eul_tensor_B: 'efg',
            eul_order_A: 'haeberlen',
            eul_order_B: 'nqr',
            eul_convention: 'zyz',
            eul_active: true,
            eul_active_config: 0,
            eul_configs: [
                { index: 0, id: 'c0', aFlip: 'identity', bFlip: 'identity', euler: [0, 0, 0], relativeRotation: activeR }
            ]
        });

        expect(intf.currentRotationMatrix).toEqual(activeR);
        const report = intf.txtRotationMatrixReport();
        expect(report).toContain('MagresView 2 — Relative Rotation Matrix Report');
        expect(report).toContain('Rotation Matrix R (Active, PAS A -> PAS B)');
        expect(report).toContain('1.000000');
    });

    it('produces a relative rotation matrix R where R[2][2] equals cos(beta) for ZYZ orientation', () => {
        const tensorA = new TensorData([[10, 1, 2], [1, 20, 1], [2, 1, 30]]);
        const tensorB = new TensorData([[12, 0, 3], [0, 18, 1], [3, 1, 25]]);

        const orientation = tensorA.relativeOrientationTo(tensorB, {
            sourceConvention: 'haeberlen',
            targetConvention: 'haeberlen',
            sequence: 'zyz',
            active: true
        });

        const config = orientation.configurations[0];
        const betaRad = config.euler[1];
        const R = config.rotation;

        expect(R[2][2]).toBeCloseTo(Math.cos(betaRad), 6);
    });
});

describe('EulerInterface.txtSelfAngleTable', () => {
    it('throws if MS or EFG data is missing from the model', () => {
        const { intf } = makeInterface({
            app_viewer: { model: { hasArray: () => false } }
        });
        expect(() => intf.txtSelfAngleTable()).toThrow('Both MS and EFG tensors are needed');
    });

    it('generates a table of MS-to-EFG relative orientation angles using crystvis TensorData', () => {
        const msMatrix = [[10, 0, 0], [0, 20, 0], [0, 0, 30]];
        const efgMatrix = [[0, 5, 0], [5, 0, 0], [0, 0, 10]];

        const mockAtom = {
            crystLabel: 'Si1',
            getArrayValue: (k) => k === 'ms' ? new TensorData(msMatrix) : new TensorData(efgMatrix)
        };

        const { intf } = makeInterface({
            app_viewer: {
                model: { hasArray: (k) => k === 'ms' || k === 'efg' },
                selected: [mockAtom],
                displayed: [mockAtom]
            },
            eul_order_A: 'haeberlen',
            eul_order_B: 'nqr',
            eul_convention: 'zyz',
            eul_active: true
        });

        const table = intf.txtSelfAngleTable();
        expect(table).toContain('Euler angles between MS (haeberlen) and EFG (nqr) tensors in radians');
        expect(table).toContain('sequence: ZYZ');
        expect(table).toContain('rotation: active');
        expect(table).toContain('Si1');
    });
});
