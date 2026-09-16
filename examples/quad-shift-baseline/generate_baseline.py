#!/usr/bin/env python3
"""Generate the soprano oracle baseline for MagresView 2's combined MS+EFG
quadrupolar quantities (P_Q, delta_QIS, delta_obs).

Follows the same oracle pattern as examples/euler-stress-tests: soprano is
the reference implementation, and its outputs are committed as fixtures that
the JS unit tests compare against.

Convention (see docs/adr/0008): central transition, MAS isotropic average.
The delta_QIS values are computed with soprano's own NMRFlags.Q_2_SHIFT
expression (soprano/calculate/nmr/nmr.py), evaluated for the central
transition only.

Usage:
    python3 generate_baseline.py

Writes: src/utils/quad-shift-baseline.json (relative to the repo root)
"""

import json
from pathlib import Path

import numpy as np
from ase import Atoms
from scipy.spatial.transform import Rotation

from soprano.data.nmr import _get_nmr_data
from soprano.properties.nmr import (
    EFGAsymmetry,
    EFGQuadrupolarConstant,
    EFGQuadrupolarProduct,
    MSIsotropy,
)

B0 = 14.1  # T; must match the fixture's B0 field

# Must match QUAD_PERTURBATION_WARN_RATIO in src/utils/utils-nmr.jsx.
PERTURBATION_WARN_RATIO = 0.2

NMR_DATA = _get_nmr_data()


def has_central_transition(spin):
    """True for half-integer spins above 1/2.

    Only these have an m = -1/2 <-> +1/2 transition, so only these have a
    delta_QIS. Integer-spin quadrupolar nuclei (2H, 6Li, 10B, 14N, ...) do
    not, even though C_Q and P_Q are perfectly well defined for them.
    """
    return spin > 0.5 and (2 * spin) % 2 == 1


def make_tensor(evals, seed):
    """Symmetric 3x3 tensor with given eigenvalues, in a rotated frame."""
    R = Rotation.random(random_state=seed).as_matrix()
    return R @ np.diag(evals) @ R.T


def second_order_shift_ct(chi, eta, I, nu0_hz):
    """Soprano's Q_2_SHIFT contribution (ppm) for the central transition.

    Transcribed from soprano.calculate.nmr.nmr.NMRCalculator.spectrum_1d
    (the q_shifts block), restricted to m = (-1/2, +1/2).
    """
    larm = nu0_hz / 1e6  # MHz
    nu_l = nu0_hz
    m = np.array([-0.5, 0.5])
    F = (
        (chi / (4 * I * (2 * I - 1))) ** 2
        * m
        / nu_l
        * (-0.2 * (I * (I + 1) - 3 * m**2) * (3 + eta**2))
        * 2
    )
    return np.diff(F)[0] / larm


# Test sites: (element, isotope, EFG eigenvalues/au, MS eigenvalues/ppm,
#              chemical shift reference/ppm, rotation seed)
SITES = [
    # 23Na, I=3/2, modest C_Q, non-axial
    ("Na", 23, [-0.05, -0.07, 0.12], [520.0, 545.0, 580.0], 556.3, 11),
    # 27Al, I=5/2, larger C_Q, near-axial
    ("Al", 27, [-0.21, -0.25, 0.46], [500.0, 530.0, 590.0], 561.0, 23),
    # 17O, I=5/2, negative gamma
    ("O", 17, [-0.6, -1.2, 1.8], [200.0, 260.0, 320.0], 287.5, 37),
    # 1H, I=1/2: not a quadrupolar site, expected null in the JS layer
    ("H", 1, [-0.1, -0.1, 0.2], [25.0, 30.0, 35.0], 30.7, 41),
    # 14N, I=1: a genuine quadrupolar site (C_Q, P_Q defined) with NO central
    # transition, so delta_QIS must come back null. Regression guard: applying
    # the CT formula here gives a spurious shift of several hundred ppm.
    ("N", 14, [-0.30, -0.40, 0.70], [-50.0, 10.0, 90.0], 190.0, 53),
    # 59Co, I=7/2, huge Q: |P_Q|/nu_0 lands beyond second-order perturbation
    # validity, so the app must flag it rather than quote the number.
    ("Co", 59, [-0.17, -0.23, 0.40], [3000.0, 3400.0, 4100.0], 8000.0, 67),
]


def main():
    entries = []

    for el, iso, efg_evals, ms_evals, ref, seed in SITES:
        efg = make_tensor(efg_evals, seed)
        ms = make_tensor(ms_evals, seed + 1)

        atoms = Atoms(el, positions=[[0.0, 0.0, 0.0]], cell=np.eye(3) * 5.0, pbc=True)
        atoms.set_array("efg", efg[None, :, :])
        atoms.set_array("ms", ms[None, :, :])

        isotopes = {el: iso}
        idata = NMR_DATA[el][str(iso)]
        spin = idata["I"]
        gamma = idata["gamma"]
        Q = idata["Q"]

        siso = MSIsotropy.get(atoms)[0]

        entry = {
            "element": el,
            "isotope": iso,
            "spin": spin,
            "gamma": gamma,
            "Q_mb": Q,
            "efg_tensor": efg.tolist(),
            "ms_tensor": ms.tolist(),
            "reference": ref,
            "s_iso": siso,
        }

        has_ct = has_central_transition(spin)
        entry["has_central_transition"] = has_ct

        if spin > 0.5:
            chi = EFGQuadrupolarConstant(isotopes=isotopes)(atoms)[0]  # Hz
            eta = EFGAsymmetry.get(atoms)[0]
            pq = EFGQuadrupolarProduct(isotopes=isotopes)(atoms)[0]  # Hz
            nu0 = abs(gamma) * B0 / (2 * np.pi)  # Hz
            ratio = abs(pq) / nu0
            entry.update(
                {
                    "CQ_MHz": chi / 1e6,
                    "eta": eta,
                    "PQ_MHz": pq / 1e6,
                    "nu0_MHz": nu0 / 1e6,
                }
            )
            if has_ct:
                qis = second_order_shift_ct(chi, eta, spin, nu0)
                entry.update(
                    {
                        "ratio": ratio,
                        "perturbation_valid": bool(ratio <= PERTURBATION_WARN_RATIO),
                        "qis_ppm": qis,
                        "dobs_ppm": (ref - siso) + qis,
                    }
                )
            else:
                # No central transition: delta_QIS and hence delta_obs are
                # undefined, NOT zero and NOT the CT expression evaluated at
                # integer I. The perturbation ratio only gates the delta_QIS
                # warning, so it is undefined here too. See docs/adr/0008.
                entry.update(
                    {
                        "ratio": None,
                        "perturbation_valid": None,
                        "qis_ppm": None,
                        "dobs_ppm": None,
                    }
                )
        else:
            entry.update(
                {
                    "CQ_MHz": None,
                    "eta": None,
                    "PQ_MHz": None,
                    "nu0_MHz": None,
                    "ratio": None,
                    "perturbation_valid": None,
                    "qis_ppm": None,
                    "dobs_ppm": None,
                }
            )

        entries.append(entry)

    out = {
        "description": "Soprano oracle baseline for quadrupolar shift "
        "quantities (see docs/adr/0008). Generated by "
        "examples/quad-shift-baseline/generate_baseline.py",
        "soprano_version": __import__("soprano").__version__,
        "B0_T": B0,
        "sites": entries,
    }

    dest = Path(__file__).resolve().parents[2] / "src" / "utils" / "quad-shift-baseline.json"
    dest.write_text(json.dumps(out, indent=2))
    print(f"Wrote {dest}")


if __name__ == "__main__":
    main()
