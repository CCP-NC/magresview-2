# Quadrupolar shifts are central-transition, MAS-average, soprano-validated

MagresView 2 reports combined MS+EFG observables (P_Q, δ_QIS, δ_obs) for quadrupolar sites. Literature conventions for the second-order quadrupolar shift differ in prefactor, sign, transition, and averaging assumptions, and once users compare our numbers against experiments the choice is effectively locked in. We fix one convention: the **central transition** (m = ±½) under **magic-angle spinning**, using the isotropic average

δ_QIS = −(3/40) · (P_Q/ν₀)² · [I(I+1) − ¾] / [I²(2I−1)²] · 10⁶ ppm

where ν₀ is the Larmor frequency of the site's assigned isotope at the model-wide B₀, and P_Q = C_Q·√(1 + η²/3).

**δ_QIS exists only for half-integer spin I > ½.** Integer-spin quadrupolar nuclei — ²H, ⁶Li, ¹⁰B and, most importantly, ¹⁴N, which is the default nitrogen isotope — have no m = ±½ transition at all. The expression above is finite when evaluated at integer I, but it is meaningless: for ¹⁴N with C_Q = 3 MHz at 14.1 T it returns −448 ppm, several spectral widths of spurious displacement. `quadrupolarData` therefore returns `qis: null` for these nuclei while still reporting C_Q and P_Q, which *are* well defined for them, and `secondOrderShift` throws if called at integer I so the mistake cannot be made silently.

δ_QIS is also only the leading term of a perturbation expansion in x = |P_Q|/ν₀. The app flags sites above `QUAD_PERTURBATION_WARN_RATIO` (0.2, defined in `src/utils/utils-nmr.jsx`) rather than quoting them without comment; at that ratio the neglected third-order term is already at the ~20% level. The shift is still shown — suppressing it would be its own kind of lie — but the UI says it should not be trusted.

## Considered Options

- A transition selector (satellites, arbitrary m) was rejected for v1: it multiplies UI and testing surface for a rarely needed case, and belongs with the future lineshape-simulation feature.
- Static (non-MAS) averages were rejected: CT-MAS centre-of-gravity shifts are what users compare against MQMAS/MAS data.
- Reporting δ_QIS for integer spin "because soprano's Q_2_SHIFT block will compute it" was rejected. Agreement with a reference implementation is not agreement with the physics; the oracle is only an oracle inside its domain of validity.
- Silently withholding δ_QIS for large P_Q/ν₀ was rejected in favour of showing it with a warning: the number is still the right starting point, and hiding it gives the user nothing to act on.

## Consequences

- Values are validated against a soprano-generated baseline committed as test fixtures (`src/utils/quad-shift-baseline.json`, same oracle pattern as the euler-angle work in `examples/euler-stress-tests/`). The fixture deliberately spans the failure modes as well as the happy path: I = 3/2 (²³Na), I = 5/2 with both signs of γ (²⁷Al, ¹⁷O), I = 1/2 (¹H, not quadrupolar), **I = 1 (¹⁴N, quadrupolar but no central transition)** and **I = 7/2 with x = 0.28 (⁵⁹Co, beyond perturbation validity)**.
- δ_obs = δ_iso + δ_QIS is only defined when a chemical shift reference exists for the element; the app never substitutes an implicit reference (see glossary: Observed shift). It is likewise undefined wherever δ_QIS is.
