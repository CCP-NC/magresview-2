# Cross-terms are derived from the quadrupole order

SIMPSON's second-order cross-terms (`quadrupole_x_dipole`, `quadrupole_x_shift`) are not offered as
a user choice. They are written exactly when the quadrupole interaction is written at second order,
and never otherwise. This diverges from Soprano, which emits them at any order above zero.

Status: accepted

## Context

The export panel previously carried a `Second-order cross-terms` checkbox, independent of both the
EFG checkbox and the quadrupole order. `toSimpson` gated the cross-term lines on `q_order > 0` and
the site carrying an EFG tensor, but not on `include_efg`. Two combinations were reachable, and
both were wrong:

**Cross-terms with EFG unticked.** The writer emitted `quadrupole_x_shift 4` for a site that had no
`quadrupole 4 ...` line, because section 2 was skipped and section 5 was not. SIMPSON 6.0.1 refuses
the file outright:

```
Error: spinsys: mixing - nucleus 1 has no defined quadrupole
```

Reproduced from the quartz fixture with five atoms selected and EFG unticked.

**Cross-terms with a first-order quadrupole.** We expected SIMPSON to ignore them. It does not.
Running a ²H–¹H pair with `quadrupole 1 1` and the cross-term lines gives a different FID from the
same system without them, and different again from the second-order treatment. The result is a
Hamiltonian truncated at first order in the quadrupole but second order in its cross-terms, which
runs silently and means nothing. SIMPSON offers no protection here, so the writer must.

Soprano's `_site_has_quadrupole` (`soprano/nmr/spin_system.py:494-498`) tests `effective_q_order >
0`, so Soprano emits cross-terms alongside a first-order quadrupole. Soprano has no separate
`include_efg` switch — order *is* the switch there — so it cannot reach the fatal case. MagresView
added the extra checkbox and reached it.

## Considered options

**Keep the checkbox and fix the gating.** Make the writer respect `include_efg` and leave the user
free to combine cross-terms with first order. Rejected: it fixes the file SIMPSON rejects and
leaves the one it accepts and gets wrong. The silent failure is the worse of the two.

**Match Soprano: emit at any order above zero.** Preserves parity with the oracle. Rejected for the
same reason, and because the measurement above shows the combination is not benign. Divergence here
is a bug fix, not a stylistic choice.

**Derive from the order (chosen).** One `crossTermsApply(includeEFG, order)` predicate, used by the
writer, the interface and the settings record. The UI surfaces a quadrupole order of first or
second, labels second as "with cross-terms", and shows the order only when the EFG checkbox is on.
The invalid states become unreachable rather than merely discouraged.

## Consequences

- MagresView's SIMPSON output differs from Soprano's for `q_order=1` on a system with both a
  quadrupolar nucleus and an MS tensor or dipolar coupling. The Soprano parity suite must not treat
  that case as a regression. Existing fixtures are unaffected: `test_08` uses order 2, and the
  order-1 fixtures (`test_04a`) are single sites with no MS, so they emit no cross-terms either way.
- `quadrupole_x_*` indices are now guaranteed to name a nucleus that emitted a `quadrupole` line.
  That invariant is asserted directly, over all four combinations of order and EFG.
- The user loses the ability to request second-order quadrupole without cross-terms. No physical
  reading of that combination has been offered; if one emerges, it belongs under Advanced with its
  own justification.
- This should be raised upstream with Soprano rather than left as a silent divergence.
