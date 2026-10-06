# Export scope is the first choice, not a second button

Spin system export opens with a choice between a full coupled spin system and one file per site.
The scope then governs which other options exist: couplings and tensor orientations are absent in
per-site scope rather than present and ignored.

Status: accepted

## Context

Per-site export arrived as a second button at the bottom of the panel, `Save split archive (.zip)`,
sitting under the same checkboxes as the single-file export but honouring a different subset of
them. Ticking `Dipolar couplings` changed the first button's output and not the second's, with
nothing to say so. The size guard compounded it: a large selection disabled the single-file button
and left the archive enabled, so the only signal that the two buttons meant different things was
that one of them had gone grey.

Two of the reviewer's objections turned out to be the same objection. "I wouldn't have a tick box
for *Include tensor orientations*, since the simulation won't make sense if the tensors are all
re-aligned along z — it would make sense if you don't have couplings and are outputting single spin
simulations" and "perhaps you can simplify matters by making the distinction between a full spin
system and a per spin simulation at the top" are one restructuring: several options are meaningful
in exactly one scope, and the scope was buried.

## Considered options

**Label the buttons better.** Cheapest. Rejected: it documents the trap instead of removing it. The
checkboxes would still read as applying to both buttons, because they are rendered once above both.

**Disable the irrelevant controls in each scope.** Rejected: a disabled `Dipolar couplings` checkbox
invites the user to wonder how to enable it, when the honest answer is that the question does not
arise for an isolated spin. Hiding states the relationship; disabling implies a missing permission.

**Scope first, controls conditional (chosen).** A radio pair at the top of spin system mode, and a
single save button whose filename and label follow from the scope. `includeD` and `includeJ` read
as false in per-site scope at the interface level, not merely in the view, so the cost guard, the
warnings and the writers all agree without each having to know about the switch.

## Consequences

- `splitZipValid` and `splitFileName` are gone. `fileValid`, `fileName` and `mimeType` cover both
  scopes, and `generateFile()` returns a `Uint8Array` for the per-site SIMPSON case.
- Delivery differs by target, which the UI states: a `.spinsys` file holds exactly one system, so
  per-site SIMPSON is a ZIP of one file per site, while mrsimulator represents independent sites
  natively and stays a single JSON.
- `Include tensor orientations` survives only in per-site scope, under Advanced. For a coupled
  system, zeroing every Euler angle aligns all tensors with the lab frame and the answer is simply
  wrong, so it is not offered.
- The coupling cap's advice changes from "use the split archive" to "switch to one file per site",
  which is now a visible control rather than a button the user has to notice is still enabled.
- Scope is recorded in the exported file's settings block, so a reader can tell a deliberately
  uncoupled file from a coupled one that lost its couplings.
