# Quadrupolar shifts in MagresView 2

MagresView 2 reports three quantities that combine an EFG tensor with a nuclear isotope and, in two cases, with the spectrometer field: the quadrupolar product P_Q, the second-order quadrupolar-induced shift δ_QIS, and the observed shift δ_obs. The same δ_QIS can optionally be applied to peak positions in the 1D spectral plot. This document sets out the theory those quantities rest on, the conventions we have fixed, where the implementation lives, and the places where the physics constrains the code in ways that are not obvious from reading it.

The aim here is to give enough context to work on the feature safely. It is not a review of quadrupolar NMR; for that, the standard treatments of the second-order quadrupole effect and the MQMAS literature are the place to start. The decisions recorded here are argued for in `adr/0008-quadrupolar-shift-convention-ct-mas.md` and `adr/0009-global-b0-and-1d-plot-quad-shifts.md`; this document explains them rather than re-deciding them.

## Scope

We cover: the quadrupolar coupling and its first- and second-order effects; why the central transition is singled out; the isotropic MAS shift and its field dependence; the validity limits of the second-order treatment; and how all of that is arranged across the codebase.

We do not cover: powder lineshape simulation, satellite transitions, MQMAS or STMAS, dynamic effects, or the relationship between δ_QIS and the isotropic dimension of a 2D experiment. The app deliberately implements a centre-of-gravity shift and nothing more, and several of the design choices below only make sense in that light.

## Theory

### The quadrupolar interaction

A nucleus with spin I > ½ has an electric quadrupole moment Q, which couples to the electric field gradient (EFG) at the nuclear site. In a magres file the EFG arrives as a symmetric, traceless 3×3 tensor **V** in atomic units. Diagonalising it in the Haeberlen convention gives principal values ordered by |V_zz| ≥ |V_xx| ≥ |V_yy|, from which two scalars follow:

the quadrupolar coupling constant

    C_Q = e·Q·V_zz / h

and the asymmetry

    η = (V_yy − V_xx) / V_zz,      0 ≤ η ≤ 1.

C_Q is conventionally quoted in MHz and carries the sign of V_zz·Q. crystvis-js performs the unit conversion in `TensorData.efgAtomicToHz(Q)` using a single constant, `efg2hz = 234964.778`, so that C_Q in Hz is V_zz in atomic units times Q in millibarn times that factor.

C_Q and η are not independent in their effect on a spectrum. To leading order the second-order shift depends only on the combination

    P_Q = C_Q·√(1 + η²/3),

the quadrupolar product. That is, two sites with different C_Q and η but the same P_Q produce the same centre-of-gravity shift, and P_Q is therefore the natural scalar to report and to colour atoms by. It is field-independent, keeps the sign of C_Q, and is what an experimentalist typically extracts from a field-dependent measurement.

### Why second order, and why the central transition

In a strong magnetic field the quadrupolar coupling is a perturbation on the Zeeman interaction. Treated to first order, it shifts the frequency of the m ↔ m−1 transition by an amount proportional to (m − ½). For the m = −½ ↔ +½ transition this prefactor vanishes identically: the central transition carries no first-order quadrupolar shift or broadening at all. This is why the central transition dominates the spectrum of a quadrupolar nucleus. The satellite transitions are spread over hundreds of kHz or more, while the central transition remains comparatively narrow.

What survives for the central transition is the second-order term, which scales as C_Q²/ν₀ and has two consequences: an anisotropic broadening, and an isotropic shift of the line's centre of gravity. Magic-angle spinning does not remove either. The second-order term contains rank-4 angular components, and spinning about a single axis at 54.74° averages only the rank-2 part. Under MAS one is therefore left with a residual second-order lineshape whose centre of gravity sits at

    δ_QIS = −(3/40) · (P_Q/ν₀)² · [I(I+1) − ¾] / [I²(2I−1)²] · 10⁶   ppm,

with P_Q and the Larmor frequency ν₀ = |γ|B₀/2π expressed in the same units. This is the quantity MagresView reports as δ_QIS.

Three features of this expression are worth stating plainly, because each of them shows up as a constraint in the code.

First, δ_QIS is always negative. Every factor other than the leading −3/40 is positive for I > ½, so the second-order quadrupolar interaction always moves the centre of gravity to lower frequency, and hence to lower chemical shift. A positive δ_QIS anywhere in the app indicates a bug, not an unusual site.

Second, the spin dependence is much steeper than the formula looks. Writing δ_QIS = K_I·(P_Q/ν₀)² in ppm with both frequencies in MHz:

| I   | K_I      |
|-----|----------|
| 3/2 | −25000   |
| 5/2 | −6000    |
| 7/2 | −2551    |
| 9/2 | −1389    |

K_I varies by a factor of eighteen across the four spins in common use. The I = 5/2 value of −6000 is the coefficient most often quoted in textbooks, and it is tempting to reuse it; it is wrong by more than a factor of four for I = 3/2.

Third, the shift in ppm falls as B₀⁻². For a ²⁷Al site with P_Q = 15.9 MHz, δ_QIS runs from −139 ppm at 9.4 T to −22 ppm at 23.5 T. That is the whole reason high-field instruments are preferred for quadrupolar work, and it is also why a reported δ_QIS is meaningless without the field it was evaluated at. The UI states B₀ wherever δ_QIS appears.

### Observed shift

The quantity an experimentalist actually reads off a central-transition MAS spectrum is the sum of the chemical shift and the quadrupolar-induced shift:

    δ_obs = δ_iso + δ_QIS.

Computing δ_iso from a calculated shielding requires a reference: δ_iso = σ_ref − σ_iso. MagresView never assumes one. Where no reference has been set for an element, δ_obs is reported as absent rather than computed from an implicit σ_ref of zero. This is the same rule that already governs the plain chemical shift elsewhere in the app, and it matters more here because a user comparing δ_obs against experiment has every reason to trust the number.

### Integer spin has no central transition

The expression for δ_QIS is finite at integer I, and evaluating it there is a mistake that is easy to make and hard to spot. Integer-spin nuclei have no m = −½ ↔ +½ transition, so there is no central transition and no central-transition shift. The quantity is not zero; it is undefined.

The practical consequence is sharper than it might sound, because ¹⁴N is the default nitrogen isotope, has I = 1, and appears in a large fraction of the magres files people load. At 14.1 T its Larmor frequency is 43.4 MHz, so a perfectly ordinary C_Q of 3 MHz gives P_Q/ν₀ ≈ 0.07 and, if the central-transition formula is applied regardless, a spurious shift of −448 ppm. A ¹⁴N spectrum spans a few hundred ppm in total. The error is not a correction; it is several spectral widths. ²H, ⁶Li and ¹⁰B are affected in the same way, though with smaller magnitudes.

C_Q and P_Q, by contrast, are perfectly well defined for integer spin and are still reported. Only the central-transition quantities, δ_QIS and δ_obs, are withheld.

### Validity of the second-order treatment

δ_QIS is the leading term of a perturbation expansion in

    x = |P_Q| / ν₀.

The neglected third-order contribution scales as x³, so the fractional error in δ_QIS is of order x. For most ²³Na and ²⁷Al sites at modern fields x sits below 0.15 and the expansion is comfortable. For nuclei with large quadrupole moments it need not be: ⁵⁹Co has Q = 420 mb, and a moderate EFG puts x near 0.3, where perturbation theory should not be trusted and exact diagonalisation is required.

We chose to keep reporting δ_QIS in that regime while flagging it, rather than withholding it. Suppressing the number gives the user nothing to act on, whereas a flagged number is still the right starting point for deciding whether a full treatment is needed. The threshold is a single constant, `QUAD_PERTURBATION_WARN_RATIO`, set to 0.2 in `src/utils/utils-nmr.jsx`. At that ratio the third-order term is already around the 20% level, which is well outside the precision anyone comparing against experiment would accept. Raising the constant suppresses warnings; lowering it makes the app stricter. It is deliberately the only place the number appears in the JavaScript, and `examples/quad-shift-baseline/generate_baseline.py` carries a matching copy that the fixtures are generated against.

### What is not modelled

Applying δ_QIS to a peak in the 1D plot moves its centre of gravity and nothing else. The peak is then broadened with whichever symmetric kernel the user has chosen, Lorentzian or Gaussian. A real second-order central-transition MAS lineshape is neither symmetric nor described by either kernel; it has the characteristic asymmetric two-horned form whose width scales as P_Q²/ν₀. A plot produced with δ_QIS enabled therefore has the right peak positions and the wrong peak shapes. The tooltip says so, and full lineshape simulation is deferred rather than approximated.

## Conventions fixed by this branch

Literature treatments differ in prefactor, sign, choice of transition and averaging assumption, and once users start comparing MagresView numbers against their own the choice is effectively locked in. We fix one convention and state it: central transition, magic-angle spinning, isotropic average, evaluated at the model-wide B₀ using the site's assigned isotope. The full argument is in ADR 0008.

Two subsidiary points follow. The isotope used is always the app's single isotope assignment, the one set in the isotope dialog; quadrupolar quantities never carry a private isotope choice of their own. And B₀ is a single, model-wide value, on the grounds that every nucleus in a physical sample sits in the same magnet. The spectrometer field dialog lets the user type any isotope's Larmor frequency, but that is an input method for B₀ rather than an independent setting: editing one row moves all the others.

## Implementation

### Layout

The feature spans four layers, each with one job.

| Layer | File | Responsibility |
|-------|------|----------------|
| Physics | `src/utils/utils-nmr.jsx` | Pure functions. No store, no React, no UI concepts. |
| Store data access | `src/core/store/utils.js` | `getNMRData` datatypes, B₀ accessors. |
| Derivation | `src/core/store/listeners/plots.js`, `labels.js`, `cscales.js` | Compute what is displayed, and record what was done. |
| Presentation | `MVSidebarPlots`, `MVSidebarEFG`, `MVPlot1D`, `MVLarmorModal` | Read derived state; never re-derive it. |

### The physics layer

`src/utils/utils-nmr.jsx` holds the whole calculation and knows nothing about the app:

- `larmorFrequency(gamma, B0)` returns |γ|B₀/2π in Hz. The absolute value matters. ¹⁷O and several other useful nuclei have negative γ; δ_QIS itself depends on ν₀² and would not notice, but the perturbation ratio |P_Q|/ν₀ would come out negative and every validity check would then pass silently.
- `quadrupoleProduct(CQ, eta)` returns P_Q, keeping the sign of C_Q.
- `isHalfIntegerSpin(I)` and `hasCentralTransition(I)` encode the spin restriction. The second is the one to use; it also excludes I = ½, for which the m = ±½ pair is the only transition but carries no quadrupolar shift.
- `secondOrderShift(PQ, I, nu0)` evaluates δ_QIS in ppm, and throws if called at integer I. It would have been friendlier to return `null`, but a thrown error cannot be accidentally propagated as a number, and the failure mode being guarded against is precisely one of silent propagation.
- `QUAD_PERTURBATION_WARN_RATIO` is the validity threshold discussed above.
- `quadrupolarData(atom, B0)` is the entry point everything else uses.

`quadrupolarData` returns `null` for any site that is not quadrupolar, meaning no isotope data, spin ≤ ½, no quadrupole moment, or no EFG tensor. For a quadrupolar site it returns

```js
{ spin, CQ, PQ, hasCT, qis, ratio, perturbationValid }
```

with `CQ` and `PQ` in Hz and `qis` in ppm. The split matters: `CQ` and `PQ` are populated for every quadrupolar site including integer spin, whereas `qis`, `ratio` and `perturbationValid` are `null` unless `hasCT` is true and a valid B₀ was supplied. Callers that respect this distinction get the integer-spin behaviour for free, which is why the store layer needed no special-casing.

### Where B₀ lives

`app_B0` is the only field value in the store, held as a string because it is edited through a text input. `AppInterface` owns the only writable accessor; `EFGInterface` and `PlotsInterface` expose read-only getters onto the same key. Writing it dispatches `EFG_LABELS`, `CSCALE` and `PLOTS_RECALC` together, since a field change can invalidate atom labels, the colour scale and the plot simultaneously.

Two helpers in `src/core/store/utils.js` save every consumer from re-implementing the parse: `getB0(state)` returns the field in tesla as a number, or `null` if the input is not a positive number, and `larmorHMHz(state)` returns the equivalent ¹H frequency. `app_B0` is excluded from the per-model state snapshot, so switching structures preserves the instrument setting, but it is included in a saved Session, because a session that did not carry it would not reproduce its own numbers.

### Datatypes

`getNMRData(view, datatype, ...)` gains three quadrupolar datatypes, listed in `quadDatatypes`: `PQ`, `qis` and `dobs`. All three return `null` per atom where the quantity does not exist, and every consumer, colour scales and labels alike, already treats `null` as absent rather than as an error. `dobs` returns `null` for one further reason, where no chemical shift reference exists for the element.

### The plots listener is the authority

The 1D plot needed a single answer to "was the shift applied, and to what?", because at least three components want to describe it: the sidebar note, the axis label and the plot title. Earlier versions of this branch had each of them re-deriving the condition from slightly different ingredients, which is exactly the kind of thing that drifts.

`plotsListener` now returns `plots_quad_info` alongside `plots_data`:

```js
{ applied, nShifted, nUnreliable, maxRatio }
```

Everything downstream reads that. The gate itself is one function, `quadShiftRequested(state)`, which requires the user's toggle, a valid B₀, and shift mode. Per-atom eligibility is then left entirely to `quadrupolarData` returning a non-null `qis`, so the loop can run over every atom without inspecting spins itself.

The *set* of atoms is shared too. `elementView(state)` in `src/core/store/utils.js` returns the current selection, or everything displayed if nothing is selected, narrowed to the chosen element; both the listener and `PlotsInterface.currentAtoms` go through it. Worth knowing when reading that helper: `ModelView.find` already searches within the view it is called on, so narrowing by element needs no further intersection. The older `view.and(view.find(q))` in the listener was doing the same work twice.

Two properties of the gate deserve comment. The shift is applied in chemical shift mode only: folding δ_QIS into a shielding axis produces a composite that is neither a shielding nor a shift and corresponds to nothing measurable, since in shielding mode there is no reference and therefore no experimental spectrum to compare against. And the toggle defaults to off, because a correction worth tens to hundreds of ppm should not silently change the numbers a user came to look at.

### Availability in the UI

Whether the control can be used at all is a separate question from what the listener did, and it is answered by one getter, `PlotsInterface.quadEligibility`, which returns one of `ok`, `no-element`, `no-efg`, `not-quadrupolar`, `integer-spin`, `shielding-mode` or `no-field`. An empty atom set maps to `no-element` rather than `not-quadrupolar`, since the app should not make a claim about nuclei it does not have. `MVSidebarPlots` maps those to explanatory strings in `QUAD_DISABLED_REASON`, and uses the same value for the switch's disabled state, its hover title and the note beneath it. They therefore cannot disagree, which was not true of the first implementation.

The axis label uses Plotly's HTML subset rather than TeX. `δ<sub>obs</sub>` renders correctly; `δ_obs` renders as a literal underscore in the exported figure, which is worth remembering given that these plots end up in papers.

## Validation

The numbers are checked against soprano as an oracle, following the same pattern as the Euler-angle work in `examples/euler-stress-tests/`. `examples/quad-shift-baseline/generate_baseline.py` builds synthetic sites with known EFG and MS tensors, evaluates them through soprano's own `Q_2_SHIFT` expression restricted to the central transition, and writes `src/utils/quad-shift-baseline.json`. The JavaScript tests compare against that fixture.

The fixture deliberately spans the failure modes rather than only the happy path:

| Site | I   | Purpose |
|------|-----|---------|
| ²³Na | 3/2 | Ordinary half-integer case, small x |
| ²⁷Al | 5/2 | Larger C_Q, near-axial |
| ¹⁷O  | 5/2 | Negative γ |
| ¹H   | 1/2 | Not quadrupolar; everything absent |
| ¹⁴N  | 1   | Quadrupolar, no central transition; C_Q and P_Q present, δ_QIS absent |
| ⁵⁹Co | 7/2 | x = 0.279, beyond perturbation validity |

The last two exist because of bugs this branch fixed, and both would pass silently without them. Agreement with soprano is necessary but not sufficient: soprano's `Q_2_SHIFT` block will happily evaluate the central-transition expression at integer spin, so for ¹⁴N the fixture records `qis_ppm: null` on physical grounds rather than copying the reference implementation. An oracle is only an oracle inside its domain of validity.

## Traps

A few things are easy to get wrong here, and all of them have been got wrong at least once.

Spin ≤ ½ and integer spin are different exclusions with different consequences, and a single `spin > 0.5` test conflates them. Use `hasCentralTransition`.

`null` and `0` are not interchangeable. A quantity that does not exist for a site must be absent, never zero; a zero δ_QIS is a legitimate value for a site with a vanishing EFG, and rendering absence as zero makes the two indistinguishable.

Every δ_QIS needs its B₀ shown next to it, since the value changes by a factor of six between 9.4 T and 23.5 T.

Testing a controlled numeric input with `fireEvent.change` and a complete string will not catch reformat-on-keystroke bugs. `MVLarmorModal` had one: typing "6" towards "600" reformatted the field to "6.000" with the caret at the end, so the next digit landed in the decimals and the value could never grow. Only `userEvent.type`, entering one character at a time, exposes it.

Finally, B₀ is stored to six decimal places rather than four. This looks like over-precision but is not: at four decimal places a typed 400.000 MHz round-trips back through the field as 399.998 MHz, which reads as a bug even though the physical error is negligible.

## Extending this

The natural next step is a proper second-order central-transition MAS lineshape rather than a shifted symmetric peak, which would replace the broadening kernel for eligible sites while leaving the centre of gravity where δ_QIS puts it. Satellite transitions and a transition selector were considered and deferred; they belong with that work rather than with the centre-of-gravity shift, since a transition selector without lineshapes gives the user positions for lines whose widths the app cannot draw. Sites flagged as beyond perturbation validity would be better served by exact diagonalisation of the Zeeman-plus-quadrupolar Hamiltonian, which is tractable for a single site and would remove the need for the warning entirely. Each of these would be a worthwhile addition; none of them changes the conventions fixed above.
