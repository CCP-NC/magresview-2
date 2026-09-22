# Hyperfine is out of scope for spin system export

Hyperfine tensors are not written to any simulator file, and their report table is deferred to a
later change. Exporting hyperfine requires a target that models it, which is a new class of target
rather than a new writer over the existing model.

Status: accepted

## Context

Neither supported target can represent a hyperfine interaction. SIMPSON's spin system block admits
shifts, quadrupole couplings, dipolar couplings, J couplings and cross terms between them, and
nothing else; mrsimulator is purely nuclear. There is no field to write a hyperfine tensor into.

Soprano has no hyperfine support of any kind, so a hyperfine simulator export would also have no
oracle, which is the condition under which other targets were rejected.

The data is already present and unused: the magres reader parses the legacy block into a hyperfine
array alongside the gyromagnetic ratios it needs, and a hyperfine sidebar exists on an unmerged
branch providing ellipsoids, labels and colour scale but no export.

## Consequences

- A hyperfine report table is straightforward and remains wanted. It is deferred only to keep this
  change to one coherent subject, and it carries no design risk: as a column group on the shared
  site model it inherits the same selection, averaging and merging rules as every other per-site
  quantity.
- Exporting hyperfine to a simulator needs a target that models it, such as muspinsim or EasySpin.
  That is deliberately deferred and deliberately separated, because it is not a new writer over the
  existing model. A muon is a site with a hyperfine coupling to an electron, not a nucleus with a
  shielding, and admitting one changes what a site is. It would also need a validation story that
  does not exist, since Soprano cannot serve as its oracle.
- This change therefore has no dependency on the unmerged hyperfine sidebar branch.
