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

- **Referencing gradient** — The per-element slope of the shielding-to-shift conversion. Conventionally −1; a fitted value expresses a linear calibration against experiment.
  _Avoid_: slope, scaling factor.

- **Average group** — A set of atoms that fast molecular motion exchanges, and which is therefore exported as a single site with averaged tensors. Identified by a pattern over bonded neighbours, such as CH3 or NH2.
  _Avoid_: functional group (too broad), methyl, rotor.

- **Report table** — A tabulated export of per-site or per-coupling quantities, intended to be read by a person or a spreadsheet. Distinct from a simulator file, which is intended to be read by a program.
  _Avoid_: data file, CSV, output.

- **Simulator file** — An export of a spin system in the input format of a named spin-dynamics program. Its correctness is defined by that program's conventions, not by MagresView's.
  _Avoid_: spinsys file, simulation input, export.

- **Observed nucleus** — The isotope a simulator file is written to detect, which determines the ordering of the channels it declares.
  _Avoid_: detected nucleus, target, channel.

- **Spin system dimension** — The size of the spin system's state space, the product of (2I+1) over its sites. It, rather than the number of sites, determines whether a simulation is feasible.
  _Avoid_: system size, number of spins, Hilbert space.
