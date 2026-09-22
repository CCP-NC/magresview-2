# Export is blocked when a shielding reference is missing

Spin system export is disabled, naming the elements at fault, until every element in the selection
has a shielding reference. MagresView will not substitute a reference of zero and will not fall
back to emitting shielding values in a field that expects a chemical shift.

Status: accepted

## Context

SIMPSON's `shift` line and mrsimulator's `isotropic_chemical_shift` both take a chemical shift.
Magres files contain shieldings. The conversion needs a per-element reference, and MagresView has
carried one in `ms_references` since the chemical-shift colour scale was added, but no export has
ever consulted it.

Emitting a shielding into a shift field fails silently and catastrophically. SIMPSON runs without
complaint and produces a spectrum that is mirrored and offset by hundreds of ppm, and the file
looks entirely ordinary to a reader. There is no stage at which the mistake announces itself.
Soprano takes the same position, guarding every shift property behind a reference check and
refusing to run its CLI without complete references.

## Consequences

- A disabled export button with an explanation is a worse first impression than a file, and this is
  accepted deliberately: a wrong file costs more than a blocked one.
- The contrast with the spin system size guard is intentional. A large spin system is expensive but
  correct, so it warns and proceeds. A missing reference is silently incorrect, so it blocks.
- References stay in `ms_references` as the single source of truth, shared with the colour scale and
  already captured in the session snapshot. A second copy owned by the exporter would drift.
- A per-element referencing gradient is exposed, defaulting to -1, matching the value Soprano's spin
  system pipeline actually ships with. Without it the linear calibration that Soprano's
  `--gradients` flag enables could not be reproduced, which would break the oracle for anyone using
  it.
