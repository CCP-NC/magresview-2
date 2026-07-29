# MagresView 2 Context

## Glossary

*This file captures the agreed-upon domain language for MagresView 2. It is intentionally free of implementation details.*

- **Session** — A snapshot of the current workspace. It captures enough state to reload the same model files and reproduce the same scientific visualization (camera, atom selection, and all visualization settings for MS, EFG, Dipolar, J-Coupling, Euler, and plots). It does not include UI chrome such as theme, active sidebar, open modals, or interaction mode. Advanced mode is a user preference, not workspace state.

- **Tensor pair (A/B)** — The ordered pair of tensors whose relative orientation is visualised: a tensor type (MS or EFG) on atom A and a tensor type on atom B. In the same-atom case A and B are the same atom with different tensor types.

- **Relative Euler visualisation** — The disks-plus-table presentation of a tensor pair's relative tensor orientation, in which the highlighted table row's Euler angles always equal the drawn geometry.

- **PAS frame**, **PAS ordering**, **PAS-frame configuration**, **Orientation class**, **Relative Euler solution** — Consumed verbatim from the crystvis-js glossary (see `crystvis-js/CONTEXT.md`); not redefined here. MagresView surfaces the PAS ordering and Euler specification as user controls and cycles through the PAS-frame configurations.
