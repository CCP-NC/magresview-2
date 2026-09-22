# Soprano is the convention oracle, SIMPSON is the numerical one

Spin system export reproduces Soprano's conventions exactly — block order, field order, units,
signs, index base, cross-term rules — but not its output bytes. Numbers are formatted by
MagresView's own precision control, and correctness is proven by porting Soprano's
SIMPSON-validated synthetic test suite rather than by diffing Soprano's CLI output.

Status: accepted

## Context

Spin system files are full of traps that look like nothing in a code review: SIMPSON's `jcoupling`
anisotropy is zeta/2 rather than zeta; its `dipole` takes no 2*pi factor, and Soprano's own legacy
backend had one as a bug; mrsimulator receives the *shielding* reduced anisotropy while SIMPSON
receives the *shift* one, so the two differ in sign for the same tensor. None of these are
discoverable from the file format. Getting them right requires an oracle.

Byte-identical reproduction is not available. Soprano's numbers come from NumPy and SciPy,
MagresView's from crystvis-js, and those agree to roughly 1e-14 rather than bit-for-bit. Soprano's
formatting is also internally inconsistent: `shift` and `quadrupole` use raw Python float repr
while `dipole` and `jcoupling` use `%.6f`, and suppressed angles are emitted as bare `0 0 0`.
Reproducing that would bake the inconsistency into the interface and make the existing precision
control meaningless for spin systems.

Soprano's `tests/simpson_validation/` contains eight synthetic cases whose answers are analytically
known and were verified against the SIMPSON v6.0.2 binary. Validating against those tests the
physics against SIMPSON itself, which is strictly stronger than agreeing with Soprano.

## Consequences

- Equivalence is checked field-by-field on tokenised output with numerical tolerances, not by
  string comparison. A string diff would fail on formatting we have deliberately chosen not to copy.
- Only SIMPSON and mrsimulator are supported. A target Soprano does not implement is a target whose
  convention mapping we would be inventing with nothing to check it against.
- Soprano is tracked by commit hash in the fixture headers, not by version. At the time of writing
  the relevant work lives on an unreleased branch.
- The oracle cannot catch an inverted rotation sense. If Soprano's active-versus-passive direction
  for Euler angles is backwards, MagresView reproduces the same inversion and the comparison passes
  while both tools emit wrong files. The direction must therefore be established independently of
  Soprano, against SIMPSON itself, before any writer is written. Only tensors with non-zero
  asymmetry can detect it: axial tensors, including every dipolar coupling, have a degenerate alpha
  and are blind to the swap. Soprano's own CSA tests 03a and 03b are the discriminating pair, and
  collapse to the same peak if the sense is inverted.
- The mrsimulator side is weaker than the SIMPSON side: Soprano's mrsimulator output is asserted
  only against Soprano's own numbers, never round-tripped through mrsimulator. The shielding-versus-
  shift sign of `shielding_symmetric.zeta` must be confirmed against mrsimulator before the feature
  is advertised. If Soprano is wrong, the fix belongs upstream in Soprano, not as a silent
  divergence here.
