/**
 * Listeners for the relative Euler-angle visualisation.
 *
 * A single RelativeTensorOrientation (from crystvis-js) is the source of truth:
 * both the sidebar angle table and the 3D Euler disks read from it, so the
 * displayed angles always match the drawn geometry.
 */

import * as mjs from 'mathjs';
import { TensorData } from '@ccp-nc/crystvis-js';
import { msColor, efgColor, crystColor, dipColor } from './colors';

const tensorColor = {
    'ms': msColor,
    'efg': efgColor,
    'cryst': crystColor,
    'dipolar': dipColor
};

const EUL_DISK_NAME = 'eul';

// Normalised vector.
function unit(v) {
    const n = Math.hypot(v[0], v[1], v[2]);
    return n > 0 ? [v[0] / n, v[1] / n, v[2] / n] : v;
}

function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// A triaxial TensorData whose principal axes are the crystallographic reference
// frame (x∥a, z∥c*, y=z×x). Falls back to the Cartesian frame for non-periodic
// models. Eigenvalues 1/2/3 make it triaxial with a well-defined orientation.
function crystFrameTensor(model) {
    let x = [1, 0, 0], y = [0, 1, 0], z = [0, 0, 1];
    if (model && model.periodic && model.cell) {
        const cell = model.cell.toArray ? model.cell.toArray() : model.cell;
        x = unit(cell[0]);
        z = unit(cross(cell[0], cell[1]));
        y = cross(z, x);
    }
    const R = [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]];
    const D = [[1, 0, 0], [0, 2, 0], [0, 0, 3]];
    const M = mjs.multiply(mjs.multiply(R, D), mjs.transpose(R));
    return new TensorData(M);
}

// An axial TensorData whose unique axis lies along the A→B internuclear vector,
// i.e. the dipolar coupling tensor D ∝ 3û⊗û − I (symmetric, traceless, unique
// eigenvalue along û). Only the orientation matters here, not the magnitude.
// Symmetric in its two atoms (û⊗û is sign-independent). Null if undefined.
function dipolarTensor(atomA, atomB) {
    if (!atomA || !atomB || atomA === atomB) return null;
    const a = atomA.xyz, b = atomB.xyz;
    const v = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const n = Math.hypot(v[0], v[1], v[2]);
    if (n < 1e-6) return null;
    const u = [v[0] / n, v[1] / n, v[2] / n];
    const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => 3 * u[i] * u[j] - (i === j ? 1 : 0)));
    return new TensorData(M);
}

// Resolve the TensorData for a tensor type on an atom, or null if unavailable.
// `otherAtom` is the opposite pick, needed only for the pair-defined dipolar tensor.
function resolveTensor(atom, type, otherAtom) {
    if (!atom) return null;
    if (type === 'cryst') return crystFrameTensor(atom.model);
    if (type === 'dipolar') return dipolarTensor(atom, otherAtom);
    return atom.model.hasArray(type) ? atom.getArrayValue(type) : null;
}

// Plain-data configuration list used by the sidebar table. Empty for
// non-discrete orientations (continuous/indeterminate have no discrete sets).
function buildConfigs(orientation) {
    return orientation.configurations.map((c, i) => ({
        index: i,
        id: c.id,
        aFlip: c.source.transform,
        bFlip: c.target.transform,
        euler: c.euler,                 // radians [alpha, beta, gamma]
        singular: c.singular.isSingular,
        relativeRotation: c.rotation
    }));
}

function renderDisks(atomA, orientation, config, on, tA, tB) {
    if (!atomA) return;
    atomA.removeEulerDisks(EUL_DISK_NAME);
    if (!on || !orientation || orientation.orientationClass === 'indeterminate')
        return;
    atomA.addEulerDisks(orientation, EUL_DISK_NAME, {
        configurationId: config ? config.id : null,
        color1: tensorColor[tA],
        color2: tensorColor[tB]
    });
}

// Rebuild: inputs changed. Recompute the orientation, reset the active
// configuration to the default, and (re)render the disks.
function eulerAngleListener(state) {

    const a2A = state.eul_newatom_A || state.eul_atom_A;
    const a2B = state.eul_newatom_B || state.eul_atom_B;

    const tA = state.eul_tensor_A;
    const tB = state.eul_tensor_B;

    // Clean up the previous A atom's label and disks before moving to the new one.
    if (state.eul_atom_A) {
        state.eul_atom_A.removeLabel('eulA');
        if (state.eul_atom_A !== a2A) state.eul_atom_A.removeEulerDisks(EUL_DISK_NAME);
    }
    if (state.eul_atom_B) state.eul_atom_B.removeLabel('eulB');

    if (a2A) {
        let r = a2A.radius;
        a2A.addLabel('A', 'eulA', { shift: [0, 0.25 * r, 0], color: tensorColor[tA], onOverlay: true, height: 0.04 });
    }
    if (a2B) {
        let r = a2B.radius;
        a2B.addLabel('B', 'eulB', { shift: [0, -0.5 * r, 0], color: tensorColor[tB], onOverlay: true });
    }

    const nmrA = resolveTensor(a2A, tA, a2B);
    const nmrB = resolveTensor(a2B, tB, a2A);

    let orientation = null;
    let configs = [];
    let orientationClass = null;

    if (nmrA && nmrB) {
        orientation = nmrA.relativeOrientationTo(nmrB, {
            sourceConvention: state.eul_order_A,
            targetConvention: state.eul_order_B,
            sequence: state.eul_convention,
            active: state.eul_active
        });
        configs = buildConfigs(orientation);
        orientationClass = orientation.orientationClass;
    }

    renderDisks(a2A, orientation, configs[0], state.eul_disks_on, tA, tB);

    return {
        eul_atom_A: a2A,
        eul_atom_B: a2B,
        eul_newatom_A: null,
        eul_newatom_B: null,
        eul_orientation: orientation,
        eul_configs: configs,
        eul_orientation_class: orientationClass,
        eul_active_config: 0
    };
}

// Toggle: show/hide the disks without recomputing the orientation.
function eulerDisksListener(state) {
    const configs = state.eul_configs || [];
    renderDisks(state.eul_atom_A, state.eul_orientation, configs[state.eul_active_config],
        state.eul_disks_on, state.eul_tensor_A, state.eul_tensor_B);
    return {};
}

// Cycle: animate the existing disks to the selected configuration.
function eulerConfigListener(state) {
    const atomA = state.eul_atom_A;
    const configs = state.eul_configs || [];
    const config = configs[state.eul_active_config];
    if (!atomA || !config) return {};
    const disks = atomA.getEulerDisks(EUL_DISK_NAME);
    if (disks) disks.animateToConfiguration(config.id, 300);
    return {};
}

export { eulerAngleListener, eulerDisksListener, eulerConfigListener };
