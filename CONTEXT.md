# MagresView 2 Context

## Glossary

*This file captures the agreed-upon domain language for MagresView 2. It is intentionally free of implementation details.*

- **Session** — A snapshot of the current workspace. It captures enough state to reload the same model files and reproduce the same scientific visualization (camera, atom selection, and all visualization settings for MS, EFG, Dipolar, J-Coupling, Euler, and plots). It does not include UI chrome such as theme, active sidebar, open modals, or interaction mode. Advanced mode is a user preference, not workspace state.

- **Tensor pair (A/B)** — The ordered pair of tensors whose relative orientation is visualised: a tensor type (MS or EFG) on atom A and a tensor type on atom B. In the same-atom case A and B are the same atom with different tensor types.

- **Relative Euler visualisation** — The disks-plus-table presentation of a tensor pair's relative tensor orientation, in which the highlighted table row's Euler angles always equal the drawn geometry.

- **PAS frame**, **PAS ordering**, **PAS-frame configuration**, **Orientation class**, **Relative Euler solution** — Consumed verbatim from the crystvis-js glossary (see `crystvis-js/CONTEXT.md`); not redefined here. MagresView surfaces the PAS ordering and Euler specification as user controls and cycles through the PAS-frame configurations.

- **Quadrupolar site** — An atom whose assigned isotope has spin I > ½. Only quadrupolar sites have quadrupolar quantities; for all other sites those quantities are displayed as absent, never as zero. The assigned isotope comes from the app's single isotope assignment; quadrupolar quantities never use their own isotope choice.

- **Quadrupolar product (P_Q)** — C_Q·√(1 + η²/3), the field-independent scalar combining the quadrupolar coupling constant and asymmetry of a site's EFG tensor.

- **Central transition** — The m = −½ ↔ +½ nuclear spin transition. It exists only for half-integer spins, and is the transition whose narrow, second-order-broadened line dominates a quadrupolar MAS spectrum. Integer-spin quadrupolar sites (²H, ⁶Li, ¹⁰B, ¹⁴N) have no central transition, so every central-transition quantity is absent for them — never zero, and never the half-integer formula evaluated at integer spin.

- **Second-order quadrupolar-induced shift (δ_QIS)** — The field-dependent isotropic shift, in ppm, of a quadrupolar site's central transition under magic-angle spinning, arising from the second-order quadrupolar interaction. Depends on P_Q, spin I, and the site isotope's Larmor frequency at the chosen external field. Defined only where a central transition exists.
  _Avoid_: quadrupolar shift (ambiguous), dynamic shift

- **Observed shift (δ_obs)** — δ_iso + δ_QIS: the centre-of-gravity shift an experimentalist reads off a central-transition MAS spectrum. Exists only when a chemical shift reference is set for the site's element; never computed from an assumed reference.

- **External field (B₀)** — The single, model-wide magnetic flux density (in tesla) at which field-dependent quantities are evaluated. Presented alongside its equivalent ¹H Larmor frequency.

- **Larmor frequency (ν₀)** — The resonance precession frequency of a nuclear isotope in the external field B₀: ν₀ = |γ|B₀ / (2π). Because all nuclei in a physical sample reside in the same magnetic field B₀, specifying any single isotope's Larmor frequency uniquely determines B₀ and thereby determines the Larmor frequencies of all other isotopes in the system.
