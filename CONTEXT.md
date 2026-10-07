# MagresView 2 Context

## Glossary

*This file captures the agreed-upon domain language for MagresView 2. It is intentionally free of implementation details.*

- **Session** — A snapshot of the current workspace. It captures enough state to reload the same model files and reproduce the same scientific visualization (camera, atom selection, and all visualization settings for MS, EFG, Dipolar, J-Coupling, Euler, and plots). It does not include UI chrome such as theme, active sidebar, open modals, or interaction mode. Advanced mode is a user preference, not workspace state.

- **Tensor pair (A/B)** — The ordered pair of tensors whose relative orientation is visualised: a tensor type (MS or EFG) on atom A and a tensor type on atom B. In the same-atom case A and B are the same atom with different tensor types.

- **Relative Euler visualisation** — The disks-plus-table presentation of a tensor pair's relative tensor orientation, in which the highlighted table row's Euler angles always equal the drawn geometry.

- **PAS frame**, **PAS ordering**, **PAS-frame configuration**, **Orientation class**, **Relative Euler solution** — Consumed verbatim from the crystvis-js glossary (see `crystvis-js/CONTEXT.md`); not redefined here. MagresView surfaces the PAS ordering and Euler specification as user controls and cycles through the PAS-frame configurations.

### Export

- **Spin system** — The set of sites and the couplings between them that describes a selection as an input to a spin-dynamics simulator. It is the shared subject of every export: both the report tables and the simulator files are views onto one spin system.
  _Avoid_: spinsys (that is a SIMPSON block name, not the concept), system, model.

- **Site** — One nucleus in a spin system, carrying its isotope, its magnetic shielding and its electric field gradient. A site is distinct from an atom: several symmetry-equivalent atoms may be represented by one site.
  _Avoid_: nucleus, spin, atom.

- **Coupling** — A pairwise interaction between two sites. A coupling is either dipolar (computed from geometry and gyromagnetic ratios) or J (read from the calculated indirect spin-spin tensor).
  _Avoid_: interaction, link, bond.

- **Shielding reference** — The per-element shielding value that anchors the conversion from calculated magnetic shielding to chemical shift. Without it a site has no chemical shift, only a shielding.
  _Avoid_: reference shift, zero, offset.

- **Referencing gradient** — The per-element slope of the shielding-to-shift conversion, d&delta;/d&sigma; in δ = reference + gradient × σ. Conventionally −1; a fitted value expresses a linear calibration against experiment. Set alongside the shielding reference, and applied wherever a shift is shown: labels, colour scales, plots and exports.
  _Avoid_: slope, scaling factor.

- **Average group** — A set of atoms that fast molecular motion exchanges, and whose tensors are therefore replaced by their average over the group. A coupled SIMPSON export keeps every member as its own site; mrsimulator, report tables and per-site files collapse the group to one site whose multiplicity is the group size (see ADR-0008). Identified by a pattern over bonded neighbours, such as CH3 or NH2.
  _Avoid_: functional group (too broad), methyl, rotor.

- **Anisotropy (Δ)** — The anisotropy of a tensor in the Haeberlen convention, Δ = σzz − (σxx + σyy)/2, always 3/2 of the reduced anisotropy. Defined once for every tensor, a Coupling's included, so the same name never means two things. For a pure dipolar pair Δ = 3d.
  _Avoid_: anisotropy without a symbol where ζ could be meant.

- **Reduced anisotropy (ζ)** — ζ = σzz − σiso in the Haeberlen convention. It is what the simulator files take: SIMPSON's `jcoupling` line wants ζ/2, mrsimulator's J `zeta` wants ζ. For a pure dipolar pair ζ = 2d.
  _Avoid_: CSA, span.

- **Report table** — A tabulated export of per-site or per-coupling quantities, intended to be read by a person or a spreadsheet. Distinct from a simulator file, which is intended to be read by a program.
  _Avoid_: data file, CSV, output.

- **Simulator file** — An export of a spin system in the input format of a named spin-dynamics program. Its correctness is defined by that program's conventions, not by MagresView's.
  _Avoid_: spinsys file, simulation input, export.

- **Observed nucleus** — The isotope a simulator file is written to detect, which determines the ordering of the channels it declares and the start and detect operators of the driver template.
  _Avoid_: detected nucleus, target, channel.

- **Export scope** — Whether an export describes one coupled spin system or one isolated site at a time. It is the first choice the user makes, because it decides which other options can mean anything: an isolated site has no couplings and no relative orientation to preserve.
  _Avoid_: split export, mode, archive.

- **Simplification warning** — A statement that the chosen settings describe something other than the real system, such as a multi-spin system exported without its dipolar couplings. Distinct from a feasibility warning, which is about cost rather than correctness. Shown in the panel and written into the exported file, so the caveats travel with it.
  _Avoid_: validation error, caveat, note.

- **Cross-term** — A second-order contribution from two interactions acting together, written in SIMPSON as `quadrupole_x_dipole` or `quadrupole_x_shift`. Derived from the quadrupole order rather than chosen: see ADR-0014.
  _Avoid_: mixing term, coupling (that is a pairwise interaction between sites).

- **Spin system dimension** — The size of the spin system's state space, the product of (2I+1) over its sites. It, rather than the number of sites, determines whether a simulation is feasible.
  _Avoid_: system size, number of spins, Hilbert space.
