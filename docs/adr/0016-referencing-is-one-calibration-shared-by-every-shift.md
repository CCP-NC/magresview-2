# Referencing is one calibration shared by every shift

The shielding reference and the referencing gradient are set together, in the MS tab, and both
apply everywhere a chemical shift appears: atom labels, colour scales, spectral plots, report
tables and simulator files. Export reads them; it does not own a copy.

Status: accepted

## Context

The gradient arrived with spin system export (ADR-0010's referencing detail) and was wired only
into that path. `FilesInterface` held `files_gradients`, the export panel had its own per-element
inputs under Advanced, and nothing else in the application knew the gradient existed.

Everything else went through `getNMRData(view, 'cs', ...)`, which computed `ref - T.isotropy`: a
gradient of exactly −1, hardcoded. So setting a gradient of −0.95 in the export panel produced a
`.spinsys` whose shifts disagreed with the labels drawn on the structure, the colour scale, and the
simulated spectrum in the Plots tab. Nothing flagged the disagreement, and the exported file was
the only place the chosen value was recorded.

A referencing gradient is a property of the shielding scale, not of a file format. Two places to
set it is one too many.

## Considered options

**Mirror the export gradients into the MS state.** Keep both UIs, sync them. Rejected: two sources
of truth with a copy step between them, and no answer for which wins when they differ.

**Drop the gradient and always use −1.** Honest, and it is what every other part of the app assumed
anyway. Rejected: Soprano's `get_spin_system` takes the linear branch with a settable gradient, and
a fitted shielding-to-shift slope is a normal thing to want. Removing it would also leave the
exported header stating a value nobody could change, which is what prompted the question.

**One calibration owned by the MS tab (chosen).** `ms_gradients` sits beside `ms_references`, both
edited in the referencing modal, both cleared by the same reset, both serialised into sessions by
the existing rule. `getNMRData` takes a gradient table and computes `ref + gradient * sigma`.
`FilesInterface.gradients` reads `ms_gradients`.

## Consequences

- The referencing modal gains a gradient column, column headers, and the formula it implements. The
  button that opens it is relabelled from "Set References" to "Referencing", in both the MS and
  Plots tabs.
- `getNMRData` gained a fifth argument rather than a new mode, so the three listeners that compute
  shifts (labels, colour scales, plots) each pass one more table and are otherwise untouched.
- Unset has to be distinguished from zero before coercion: `Number('')` and `Number(null)` are both
  `0`, and a gradient of 0 flattens every shift onto its reference. An empty field means default,
  and a typed `0` means zero.
- Default behaviour is unchanged. With no gradient set, `ref + (-1) * sigma` is the previous
  `ref - sigma` exactly, so no existing output moves.
- `files_gradients` is gone from the store. Sessions written before this change carry the key and
  it is ignored on restore, which is the documented behaviour for unknown keys.
