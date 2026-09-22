# Dipolar couplings use the minimum-image convention

Dipolar couplings between sites are computed from the closest periodic copy of each pair, matching
Soprano, rather than from the positions of the atom images currently drawn on screen. Where the
selection contains several images of the same base atom, the export warns, because that is the case
in which minimum-imaging is most likely to contradict what the user built.

Status: accepted

## Context

MagresView is a visualiser, so the instinctive rule is that exported geometry should be the geometry
on screen. For dipolar couplings that rule is wrong in the common case. A user who loads a crystal
and selects every proton in the cell has two protons at opposite corners separated by a lattice
vector in-cell, while their nearest periodic copies may be a couple of angstroms apart. Using
in-cell separations reports a negligible coupling where a dominant one exists, and nothing about the
output reveals it.

The opposite case is real but rarer: a user who displays ghosts and hand-assembles a cluster has
chosen those positions deliberately, and minimum-imaging them contradicts the picture.

Soprano resolves pairs to the closest periodic copy.

## Consequences

- Exported couplings may not correspond to the drawn separation between two atom images. This is a
  deliberate departure from what-you-see-is-what-you-get, confined to dipolar couplings.
- The hand-built cluster case is surfaced rather than guessed at: selecting several images of one
  base atom triggers a warning instead of a mode switch. One rule, with the ambiguous case made
  visible.
- Dipolar couplings are off by default and support restricting which sites may pair, following
  Soprano, and additionally support a cutoff that Soprano lacks. All-pairs enumeration is quadratic,
  and a spin system large enough for that to matter is already too large to simulate.
