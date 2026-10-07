# Average groups keep n spins with jump-averaged tensors

A fast-rotating group (CH3, NH2, ...) is modelled as the time average of its Hamiltonian. For
SIMPSON every member of the group stays a spin and every tensor involving the group is the
arithmetic mean over the group's atoms: the shielding and EFG of each member, the dipolar and J
tensors of every pair that touches the group, and the couplings between the members themselves.
Collapsing the group to one site is kept only where it is exact or unavoidable: for mrsimulator,
and for report tables and per-site files.

Status: accepted. Supersedes the earlier decision to collapse every group to one site and drop its
internal couplings.

## Context

Soprano is the oracle for spin system export. Its `average_group` pipeline
(`soprano/nmr/extract.py:185`, `soprano/utils.py:73`) averages `ms` and `efg` with `merge_mean`
and collapses the group to one site at the position of the first member. Averaging the MS and EFG
tensors over a C3-related methyl is the correct fast-rotation average, because the rotation merely
permutes the three sites. Everything else about collapsing is wrong for a coupled simulation.

We first corrected the dipolar part: each coupling to an external site became the mean of the
dipolar tensors from every member, and the group's internal couplings were dropped. That left a
single proton standing for three, and the measurements below show it cannot be defended.

Measured on a static methyl powder (exact diagonalisation, then SIMPSON on the generated file):

| model | 1H rms linewidth | 1H extent |
| --- | --- | --- |
| rigid CH3 | 20.2 kHz | 70 kHz |
| fast-rotating CH3 (jump average) | 10.1 kHz | 33 kHz |
| collapsed to one 1H | one sharp line | none |

The intra-methyl 1H-1H coupling goes from -21.3 kHz static to +10.65 kHz residual, a factor of
-1/2, because the H-H vectors are perpendicular to the C3 axis. An observed 13C couples to three
equivalent protons and shows the 1:3:3:1 quartet; a collapsed group gives it one proton and a
two-line doublet. SIMPSON output for the n-spin model agreed with exact diagonalisation to 0.8%
RMS for the rigid group and 4% for the averaged one.

## Considered options

**Match Soprano.** Representative position, no dipolar averaging. Rejected: it ships the wrong
physics for one of the two primary use cases.

**Collapse to one site with tensor-averaged external couplings.** What this ADR first chose.
Rejected for SIMPSON on the measurements above: it loses the intra-group coupling, undercounts the
second moment seen by every other spin by a factor n, and cannot reproduce a 1:3:3:1 multiplet.
It is still the only representation available to mrsimulator and the only exact one for tables.

**Soprano's residual-rotation formula.** `_dip_tensor(d, r, rotation_axis)`
(`soprano/nmr/utils.py:174`) needs a rotation axis, which is ill-defined for `XH2`, and n-fold jump
averaging coincides with continuous rotation for a rank-2 tensor only when n >= 3. Rejected.

**Keep n spins with jump-averaged tensors (chosen).** No rotation axis, correct for any n, and for
an ideal C3 group it reduces to the residual formula. The three protons are identical in shift and
EFG, and their mutual coupling is the averaged one.

## Decision

`buildSpinSystem` takes `averageGroupMode`: `'expand'` (default) or `'collapse'`.

- **expand** (SIMPSON, scope "one coupled system"): a group of n atoms becomes n sites, flagged as
  members of the group with its id, pattern, size and member index. MS and EFG of each member are
  the mean over the group. The dipolar tensor of a pair is the mean of `D(r_p - r_q)` over every
  ordered pair of distinct atoms drawn from the two sides: all member pairs inside a group, member
  against external atom, member against member for two groups, each with its own minimum-image
  displacement. The tensor is averaged first and d read from it afterwards, so the result is
  generally not axial; the writer emits the asymmetry (`dipole_ave`). J tensors are averaged the
  same way after conversion to Hz with that pair's gyromagnetic ratios. Dimension and feasibility
  count all n spins.
- **collapse** (mrsimulator; report tables; per-site files): one site per group with averaged
  tensors, external couplings averaged as above, internal couplings dropped.
  - mrsimulator cannot represent coupled equivalent spins, so the export carries a loud warning
    naming what is lost: the intra-group coupling (about +10.7 kHz for a methyl 1H-1H pair) and the
    group's multiplicity as seen by every other spin (second moment undercounted by n).
  - Tables and per-site files contain no couplings, so one row or file per group is exact. Tables
    show a Multiplicity column whenever a group is present; the split archive writes one file per
    group named after the group label, with n in its metadata.

## Consequences

- MagresView's SIMPSON output no longer matches Soprano's whenever average groups are in use. The
  oracle survives at function level: the ideal-C3 intra pair is checked against `-d_static/2`
  directly, and the generated ethanol-methyl files (13C plus the three protons, with and without
  one external proton) were run through SIMPSON against exact diagonalisation of the same
  averaged tensors, agreeing to 2.7% and 2.1% RMS.
- Intra-group residuals have the opposite sign to SIMPSON's `dipole` check for like nuclei
  (+10.65 kHz for 1H-1H), and a group-to-carbon coupling flips sign too (P2(109.5 deg) = -1/3).
  The driver template emits `dipole_check false` exactly when some coupling needs it.
- The model is valid only if the hop rate is much larger than the couplings: about 10^6 s^-1
  against 10^4 Hz. It is a notice, not a check, and is written into the file.
- Cost grows by 2^n for spin-1/2 members, so a methyl multiplies the dimension by 8 and a
  fully-averaged selection can cross the feasibility limits quickly (ADR-0010 still applies: warn,
  never block).
- Soprano's 2D plotting path (`456e56a`) averages dipolar tensors as well, but its spin-system
  export still takes the first member's position. If Soprano's export later adopts n-spin
  expansion, this divergence should be retired.
