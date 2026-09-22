#!/usr/bin/env python3
"""
Generate test fixtures for MagresView 2 spin system export validation.
Uses Soprano as the convention oracle (pinned to Soprano v0.12).

Usage:
    python3 generate_fixtures.py
    # Or to specify a custom soprano location:
    SOPRANO_PATH=/path/to/soprano python3 generate_fixtures.py
"""

import os
import sys
import json
from datetime import datetime
import numpy as np
from scipy.spatial.transform import Rotation
import ase.io

# Allow overriding soprano source path via environment variable
soprano_path = os.environ.get("SOPRANO_PATH")
if soprano_path and soprano_path not in sys.path:
    sys.path.insert(0, soprano_path)

try:
    import soprano
except ImportError:
    raise ImportError(
        "Soprano >= 0.12 is required to run fixture generation. "
        "Install via `pip install soprano` or set SOPRANO_PATH environment variable."
    )

from soprano.nmr.spin_system import SpinSystem
from soprano.nmr.site import Site
from soprano.nmr.tensor import MagneticShielding, ElectricFieldGradient, NMRTensor
from soprano.nmr.coupling import DipolarCoupling, ISCoupling
from soprano.data.nmr import EFG_TO_CHI, nmr_quadrupole

OUTDIR = os.path.dirname(os.path.abspath(__file__))
SOPRANO_VERSION = "0.12"
DATE = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def make_header(name, description, invocation):
    return (
        f"# ==============================================================================\n"
        f"# Test Case: {name}\n"
        f"# Description: {description}\n"
        f"# Oracle: Soprano v{SOPRANO_VERSION}\n"
        f"# Generated: {DATE}\n"
        f"# Invocation: {invocation}\n"
        f"# ==============================================================================\n"
    )

def make_shielding_tensor(pas_evals, beta_deg=0, gamma_deg=0):
    pas = np.diag(pas_evals)
    R = Rotation.from_euler("ZYZ", [0, beta_deg, gamma_deg], degrees=True).as_matrix()
    sigma_lab = R @ pas @ R.T
    return MagneticShielding(sigma_lab, species="13C", reference=0.0, gradient=-1.0), sigma_lab

def make_efg_tensor(pas_evals, beta_deg=0, gamma_deg=0):
    pas = np.diag(pas_evals)
    R = Rotation.from_euler("ZYZ", [0, beta_deg, gamma_deg], degrees=True).as_matrix()
    efg_lab = R @ pas @ R.T
    return ElectricFieldGradient(efg_lab, species="2H"), efg_lab

def make_j_tensor(J_iso, zeta, eta=0.0, beta_deg=0, gamma_deg=0):
    """Create a J-coupling tensor in the lab frame matching Soprano test suite."""
    import scipy.constants as cnst
    from soprano.data.nmr import nmr_gamma

    gh = nmr_gamma("H", iso=1)
    gc = nmr_gamma("C", iso=13)
    scale = cnst.h * gh * gc / (4 * np.pi**2) * 1e19

    K_iso = J_iso / scale
    zeta_K = zeta / scale

    evals = np.array([
        K_iso - 0.5 * zeta_K * (1 + eta),
        K_iso - 0.5 * zeta_K * (1 - eta),
        K_iso + zeta_K,
    ])
    pas = np.diag(evals)
    R = Rotation.from_euler("ZYZ", [0, beta_deg, gamma_deg], degrees=True).as_matrix()
    j_lab = R @ pas @ R.T

    # The physical J tensor in Hz is scale * j_lab
    J_phys_lab = scale * j_lab
    return NMRTensor(j_lab, order="h"), J_phys_lab

def generate_synthetic_fixtures():
    fixtures = {}

    # Test 01: Isotropic shift +100 ppm
    sigma_01 = np.diag([-100.0, -100.0, -100.0])
    ms_01 = MagneticShielding(sigma_01, species="13C", reference=0.0, gradient=-1.0)
    s1 = SpinSystem(sites=[Site(isotope="13C", label="C1", index=0, ms=ms_01)])
    fixtures["test_01"] = {
        "description": "Isotropic shift +100 ppm @ 400 MHz (13C)",
        "invocation": "SpinSystem(sites=[Site('13C', ms=diag([-100,-100,-100]))]).to_simpson('13C')",
        "spinsys": s1.to_simpson(observed_nucleus="13C"),
        "mrsimulator": s1.to_mrsimulator(),
        "input": {
            "type": "synthetic_ms",
            "matrix": sigma_01.tolist(),
            "pas": [-100.0, -100.0, -100.0],
            "beta": 0,
            "gamma": 0,
            "species": "13C",
            "ref": 0.0,
        }
    }

    # Test 02: CSA beta = 0, 90, 54.7356
    pas_02 = [100.0, 100.0, -200.0]
    for suffix, beta in [("a", 0.0), ("b", 90.0), ("c", 54.73561032)]:
        ms, sigma_lab = make_shielding_tensor(pas_02, beta_deg=beta)
        s = SpinSystem(sites=[Site(isotope="13C", label="C1", index=0, ms=ms)])
        key = f"test_02{suffix}"
        fixtures[key] = {
            "description": f"CSA zeta=+200 ppm, beta={beta} deg",
            "invocation": f"make_shielding_tensor([100, 100, -200], beta_deg={beta})",
            "spinsys": s.to_simpson(observed_nucleus="13C"),
            "mrsimulator": s.to_mrsimulator(),
            "input": {
                "type": "synthetic_ms",
                "matrix": sigma_lab.tolist(),
                "pas": pas_02,
                "beta": beta,
                "gamma": 0,
                "species": "13C",
                "ref": 0.0,
            }
        }

    # Test 03: CSA eta=0.5, beta=90, gamma = 0, 90
    pas_03 = [225.0, 75.0, -300.0]
    for suffix, gamma in [("a", 0.0), ("b", 90.0)]:
        ms, sigma_lab = make_shielding_tensor(pas_03, beta_deg=90.0, gamma_deg=gamma)
        s = SpinSystem(sites=[Site(isotope="13C", label="C1", index=0, ms=ms)])
        key = f"test_03{suffix}"
        fixtures[key] = {
            "description": f"CSA zeta=+300 ppm, eta=0.5, beta=90, gamma={gamma}",
            "invocation": f"make_shielding_tensor([225, 75, -300], beta_deg=90, gamma_deg={gamma})",
            "spinsys": s.to_simpson(observed_nucleus="13C"),
            "mrsimulator": s.to_mrsimulator(),
            "input": {
                "type": "synthetic_ms",
                "matrix": sigma_lab.tolist(),
                "pas": pas_03,
                "beta": 90.0,
                "gamma": gamma,
                "species": "13C",
                "ref": 0.0,
            }
        }

    # Test 04: Quadrupole Cq=100 kHz, beta = 0, 90
    Q_2H = nmr_quadrupole("H", iso=2)
    Vzz = 100e3 / (EFG_TO_CHI * Q_2H)
    pas_04 = [-0.5 * Vzz, -0.5 * Vzz, Vzz]
    for suffix, beta in [("a", 0.0), ("b", 90.0)]:
        efg, efg_lab = make_efg_tensor(pas_04, beta_deg=beta)
        s = SpinSystem(sites=[Site(isotope="2H", label="H1", index=0, efg=efg)])
        key = f"test_04{suffix}"
        fixtures[key] = {
            "description": f"Quadrupole 2H Cq=100kHz, beta={beta}",
            "invocation": f"make_efg_tensor(pas, beta_deg={beta})",
            "spinsys": s.to_simpson(observed_nucleus="2H", q_order=1),
            "mrsimulator": s.to_mrsimulator(),
            "input": {
                "type": "synthetic_efg",
                "matrix": efg_lab.tolist(),
                "pas": pas_04,
                "beta": beta,
                "gamma": 0,
                "species": "2H",
                "Q": Q_2H,
                "q_order": 1,
            }
        }

    # Test 05: Dipolar 1H-13C d = -30210.667268 Hz, beta = 0, 90
    d_val = -30210.667268
    for suffix, beta in [("a", 0.0), ("b", 90.0)]:
        if beta == 0.0:
            D = d_val * np.diag([-1.0, -1.0, 2.0])
        else:
            D = d_val * np.diag([2.0, -1.0, -1.0])
        site_h = Site(isotope="1H", label="H1", index=0)
        site_c = Site(isotope="13C", label="C1", index=1)
        dip = DipolarCoupling(site_i=0, site_j=1, species1="1H", species2="13C", tensor=NMRTensor(D, order="n"))
        s = SpinSystem(sites=[site_h, site_c], couplings=[dip])
        key = f"test_05{suffix}"
        fixtures[key] = {
            "description": f"Dipolar 1H-13C splitting 60.5kHz, beta={beta}",
            "invocation": f"DipolarCoupling(0, 1, '1H', '13C', tensor=NMRTensor(D))",
            "spinsys": s.to_simpson(observed_nucleus="13C"),
            "mrsimulator": s.to_mrsimulator(),
            "input": {
                "type": "synthetic_dipolar",
                "d": d_val,
                "D_matrix": D.tolist(),
                "beta": beta,
            }
        }

    # Test 06: J-coupling isotropic 100 Hz
    site_h = Site(isotope="1H", label="H1", index=0)
    site_c = Site(isotope="13C", label="C1", index=1)
    j_tensor_06, J_phys_06 = make_j_tensor(100.0, 0.0)
    j_coup_06 = ISCoupling(site_i=0, site_j=1, species1="1H", species2="13C", tensor=j_tensor_06)
    s6 = SpinSystem(sites=[site_h, site_c], couplings=[j_coup_06])
    fixtures["test_06"] = {
        "description": "J-coupling isotropic 100 Hz",
        "invocation": "ISCoupling(0, 1, '1H', '13C', diag([100, 100, 100]))",
        "spinsys": s6.to_simpson(observed_nucleus="13C"),
        "mrsimulator": s6.to_mrsimulator(),
        "input": {
            "type": "synthetic_j",
            "J_matrix": J_phys_06.tolist(),
        }
    }

    # Test 07: J-aniso zeta = 200 Hz, beta = 0, 90
    for suffix, beta in [("a", 0.0), ("b", 90.0)]:
        j_tensor_07, J_phys_07 = make_j_tensor(0.0, 200.0, beta_deg=beta)
        site_h = Site(isotope="1H", label="H1", index=0)
        site_c = Site(isotope="13C", label="C1", index=1)
        j_coup = ISCoupling(site_i=0, site_j=1, species1="1H", species2="13C", tensor=j_tensor_07)
        s = SpinSystem(sites=[site_h, site_c], couplings=[j_coup])
        key = f"test_07{suffix}"
        fixtures[key] = {
            "description": f"J-coupling anisotropic zeta=200 Hz, beta={beta}",
            "invocation": f"ISCoupling(0, 1, '1H', '13C', tensor=NMRTensor(J))",
            "spinsys": s.to_simpson(observed_nucleus="13C"),
            "mrsimulator": s.to_mrsimulator(),
            "input": {
                "type": "synthetic_j",
                "J_matrix": J_phys_07.tolist(),
                "beta": beta,
            }
        }

    # Test 08: Quadrupole-dipole cross-term (13C-14N)
    site_c = Site(isotope="13C", label="C1", index=0)
    efg_14n = np.array([
        [-0.01630132,  0.0,         0.0       ],
        [ 0.0,        -0.08800965,  0.04873722],
        [ 0.0,         0.04873722,  0.10431097],
    ])
    site_n = Site(isotope="14N", label="N1", index=1, efg=ElectricFieldGradient(efg_14n, species="14N"))
    D_08 = -660.2 * np.diag([-1.0, -1.0, 2.0])
    dip_08 = DipolarCoupling(site_i=0, site_j=1, species1="13C", species2="14N", tensor=NMRTensor(D_08, order="n"))
    s8 = SpinSystem(sites=[site_c, site_n], couplings=[dip_08])
    fixtures["test_08"] = {
        "description": "Quadrupole-dipole cross-term (13C-14N)",
        "invocation": "SpinSystem([C1, N1], [dip]) with quadrupole on N1",
        "spinsys": s8.to_simpson(observed_nucleus="13C", q_order=2),
        "mrsimulator": s8.to_mrsimulator(),
        "input": {
            "type": "synthetic_cross",
            "efg_n": efg_14n.tolist(),
            "D_matrix": D_08.tolist(),
        }
    }

    # Quartz fixture: periodic, 3 sites (Si), minimum-image dipolar couplings
    a_ms = ase.io.read(os.path.join(OUTDIR, "../../../utils/__fixtures__/quartz.nmr.magres"))
    a_efg = ase.io.read(os.path.join(OUTDIR, "../../../utils/__fixtures__/quartz.efg.magres"))
    a_ms.set_array("efg", a_efg.get_array("efg"))
    refs_quartz = {"Si": 300.0, "O": 200.0}
    from soprano.properties.nmr import get_spin_system
    s_quartz = get_spin_system(a_ms[:3], references=refs_quartz, include_dipolar=True, isotopes={"O": 17, "Si": 29})
    fixtures["quartz_3si"] = {
        "description": "Quartz 3x 29Si sites with minimum-image dipolar couplings",
        "invocation": "get_spin_system(quartz[:3], references={'Si': 300, 'O': 200}, include_dipolar=True)",
        "spinsys": s_quartz.to_simpson(observed_nucleus="29Si"),
        "mrsimulator": s_quartz.to_mrsimulator(),
        "input": {
            "type": "structure_quartz",
            "indices": [0, 1, 2],
            "references": refs_quartz,
        }
    }

    # Ethanol fixture: 3x 1H sites with MS, dipolar, and J couplings
    eth = ase.io.read(os.path.join(OUTDIR, "ethanol.magres"))
    refs_eth = {"C": 180.0, "H": 30.0, "O": 200.0}
    s_eth = get_spin_system(eth[:3], references=refs_eth, include_dipolar=True, include_j=True)
    fixtures["ethanol_3h"] = {
        "description": "Ethanol 3x 1H sites with MS, Dipolar and J couplings",
        "invocation": "get_spin_system(ethanol[:3], references={'C': 180, 'H': 30, 'O': 200}, include_dipolar=True, include_j=True)",
        "spinsys": s_eth.to_simpson(observed_nucleus="1H"),
        "mrsimulator": s_eth.to_mrsimulator(),
        "input": {
            "type": "structure_ethanol",
            "indices": [0, 1, 2],
            "references": refs_eth,
        }
    }

    # Write files
    for name, data in fixtures.items():
        header = make_header(name, data["description"], data["invocation"])
        spinsys_path = os.path.join(OUTDIR, f"{name}.spinsys")
        with open(spinsys_path, "w") as f:
            f.write(header + data["spinsys"])

        json_path = os.path.join(OUTDIR, f"{name}_mrsimulator.json")
        with open(json_path, "w") as f:
            json.dump({
                "header": {
                    "name": name,
                    "description": data["description"],
                    "oracle": f"Soprano v{SOPRANO_VERSION}",
                    "generated": DATE,
                },
                "data": data["mrsimulator"]
            }, f, indent=2)

    # Save corpus metadata for JS tests
    corpus_json_path = os.path.join(OUTDIR, "synthetic_corpus.json")
    with open(corpus_json_path, "w") as f:
        json.dump({
            "soprano_version": SOPRANO_VERSION,
            "date": DATE,
            "fixtures": fixtures
        }, f, indent=2)

    print(f"Generated {len(fixtures)} synthetic fixtures in {OUTDIR}")

if __name__ == "__main__":
    generate_synthetic_fixtures()
