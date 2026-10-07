# Convention verification harness

An opt-in check that the SIMPSON and mrsimulator files MagresView writes describe the
tensors they were meant to. It is **not** part of `npx vitest run` and is not run in CI,
because it needs two external simulators.

## What it does

1. `generate.verify.js` builds three deliberately misaligned systems from **lab-frame
   tensors**, runs them through the real writers (`toSimpson`, `toMrsimulator`), and
   writes `.spinsys`, mrsimulator `.json` and `systems.json` (the lab tensors) to a
   directory:

   | system | content |
   | --- | --- |
   | `A_csa_dip` | ¹³C CSA (ζσ = −80 ppm, η = 0.6) + ¹H dipolar, H at polar 70° / azimuth 40° |
   | `B_csa_J` | ¹³C CSA + anisotropic J (20 Hz iso, ζ = 3000 Hz, η = 0.4) |
   | `C_csa_efg` | ²H CSA + EFG (Cq = 20 kHz, η = 0.3), first-order quadrupole |

2. `verify.py` builds the analytic static-powder spectrum straight from those lab
   tensors (lines at the isotropic shift ± nᵀDn/2, and the equivalent for J and the
   quadrupole), runs SIMPSON with the drivers `A_csa_dip.in`, `B_csa_J.in` and
   `C_csa_efg.in`, simulates the mrsimulator JSON, and prints each simulator's relative
   RMS difference from the analytic truth.

## Running it

Requirements: the `simpson` binary on `PATH`, and a Python environment with `numpy`,
`scipy` and `mrsimulator`.

```sh
export VERIFY_OUT=/tmp/mv-verify
npx vitest run --config scripts/verify-conventions/vitest.verify.config.js
python scripts/verify-conventions/verify.py "$VERIFY_OUT"
```

The generator is skipped unless `VERIFY_OUT` is set, and its file name does not match
the `*.test.*` pattern of the normal test run.

## Expected output

```
system         SIMPSON  mrsimulator   (relative RMS vs analytic truth)
A_csa_dip        0.031        0.001
B_csa_J          0.019        0.001
C_csa_efg        0.026        0.001
```

mrsimulator integrates the powder far more finely, so it sits near 0.001. SIMPSON at
`zcw4180` with 250 Hz broadening sits near 0.03. Anything above about 0.05 means a
convention is wrong: the opposite Euler-angle sense gave 0.15 to 0.35 for mrsimulator.

## The lesson

Agreement between two simulators, or between a writer and a reference implementation,
is not correctness. The earlier mrsimulator export matched Soprano's reference fixtures and
was still wrong, because both used the same inverted Euler-angle
sense. Only an analytic spectrum built from the lab-frame tensors, which involves no
angle convention at all, catches an inversion that every implementation under test
shares. Keep the truth independent of the code it judges.
