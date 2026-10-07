"""
Compare SIMPSON and mrsimulator against an analytic static-powder spectrum built
straight from the lab-frame tensors in systems.json.

    python verify.py OUT_DIR

OUT_DIR must already hold the files written by generate.verify.js. Needs the
`simpson` binary on PATH and the `mrsimulator` and `scipy` Python packages.
Prints the relative RMS difference of each simulator from the analytic truth.
"""
import json
import os
import shutil
import subprocess
import sys
import warnings

import numpy as np
from scipy.ndimage import gaussian_filter1d

warnings.filterwarnings("ignore")

OUT = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VERIFY_OUT", ".")
HERE = os.path.dirname(os.path.abspath(__file__))

PROTON_HZ = 400e6
B0 = PROTON_HZ / 42.577478e6                      # tesla
LARMOR = {"13C": B0 * 10.7084e6, "2H": B0 * 6.5359e6}
MHZ_PER_T = {"13C": 10.7084, "2H": 6.53590}
SW, NP, BROADEN = 200000.0, 2048, 250.0           # Hz
GRID = np.linspace(-90000, 90000, 1801)
DG = GRID[1] - GRID[0]

# Isotropic powder directions of the lab z axis in the molecular frame (Fibonacci sphere).
N = 400000
_i = np.arange(N) + 0.5
_z = 1 - 2 * _i / N
_ph = np.pi * (1 + 5 ** 0.5) * _i
_r = np.sqrt(1 - _z * _z)
NVEC = np.stack([_r * np.cos(_ph), _r * np.sin(_ph), _z], 1)


def q(T):
    """n^T T n for every powder direction."""
    return np.einsum("ni,ij,nj->n", NVEC, np.asarray(T), NVEC)


def truth_freqs(name, sysd):
    nu = LARMOR[sysd["observed"]]
    shift = -q(sysd["sigma"]) * 1e-6 * nu         # shielding to offset (reference 0, gradient -1)
    if name == "A_csa_dip":
        s = q(sysd["dipolar"]) / 2                # lines at shift +- (n.D.n)/2
    elif name == "B_csa_J":
        s = q(sysd["J"]) / 2
    elif name == "C_csa_efg":
        s = 0.75 * sysd["Cq"] * q(sysd["efg"]) / sysd["vzz"]   # first-order +-1 transitions
    return np.concatenate([shift + s, shift - s])


def histogram(freqs):
    edges = np.append(GRID - DG / 2, GRID[-1] + DG / 2)
    h, _ = np.histogram(freqs, bins=edges)
    h = gaussian_filter1d(h.astype(float), BROADEN / DG)
    return h / np.trapezoid(h, GRID)


def normalise(x, y):
    order = np.argsort(x)
    y = np.interp(GRID, x[order], y[order])
    y = gaussian_filter1d(y, BROADEN / DG)
    return y / np.trapezoid(y, GRID)


def rel_rms(a, b):
    return float(np.sqrt(np.trapezoid((a - b) ** 2, GRID)) / np.sqrt(np.trapezoid(a ** 2, GRID)))


def simpson_spectrum(name):
    shutil.copy(os.path.join(HERE, f"{name}.in"), os.path.join(OUT, f"{name}.in"))
    subprocess.run(["simpson", f"{name}.in"], cwd=OUT, check=True, capture_output=True)
    d = np.loadtxt(os.path.join(OUT, f"{name}_fid.dat"))
    t, fid = d[:, 0], d[:, 1] + 1j * d[:, 2]
    dt = (t[1] - t[0]) * (1e-6 if t.max() > 1 else 1.0)
    fid[0] *= 0.5
    tt = np.arange(len(fid)) * dt
    fid = fid * np.exp(-0.5 * (2 * np.pi * BROADEN * tt) ** 2)
    spec = np.fft.fftshift(np.fft.fft(fid)).real
    f = np.fft.fftshift(np.fft.fftfreq(len(fid), dt))
    return normalise(f, spec)


def mrsimulator_spectrum(name, channel):
    from mrsimulator import Simulator, SpinSystem
    from mrsimulator.method.lib import BlochDecaySpectrum

    sj = json.load(open(os.path.join(OUT, f"{name}.json")))
    sj.pop("metadata", None)
    sj.pop("description", None)
    sj.pop("name", None)
    method = BlochDecaySpectrum(
        channels=[channel], magnetic_flux_density=B0, rotor_frequency=0,
        spectral_dimensions=[dict(count=NP, spectral_width=SW)],
    )
    sim = Simulator(spin_systems=[SpinSystem(**sj)], methods=[method])
    sim.config.integration_volume = "hemisphere"
    sim.config.integration_density = 100
    sim.run()
    ds = sim.methods[0].simulation
    x = np.asarray(ds.x[0].coordinates.value) * B0 * MHZ_PER_T[channel]   # ppm to Hz
    return normalise(x, ds.y[0].components[0].real)


def main():
    systems = json.load(open(os.path.join(OUT, "systems.json")))
    print(f"{'system':12s} {'SIMPSON':>9s} {'mrsimulator':>12s}   (relative RMS vs analytic truth)")
    for name, sysd in systems.items():
        T = histogram(truth_freqs(name, sysd))
        simpson = rel_rms(T, simpson_spectrum(name))
        mrs = rel_rms(T, mrsimulator_spectrum(name, sysd["observed"]))
        print(f"{name:12s} {simpson:9.3f} {mrs:12.3f}")


if __name__ == "__main__":
    main()
