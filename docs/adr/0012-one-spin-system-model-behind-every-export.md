# One spin system model behind every export

Every export — the MS, EFG, dipolar, J and hyperfine report tables as well as the SIMPSON and
mrsimulator files — is produced from a single in-memory spin system of sites and couplings. Writers
are pure functions over that model and contain no physics.

Status: accepted

## Context

Each report table used to walk the selection and emit text by itself. The cost of that showed up in
two ways. The same off-by-one, in which the second atom of a pair was labelled using an index into a
sliced array rather than the full one, existed independently in both the dipolar and the J table.
And a spin system exporter was written, wired to nothing, and rotted until it carried at least four
separate faults: a tensor property requested under a name the accessor does not recognise, a
formatting helper called with the wrong arity, an interface getter that does not exist, and the
inherited index bug. None of it was detectable, because there was nothing to test but strings.

A spin system is also the natural domain object. The report tables and the simulator files are two
views onto the same sites and couplings, and they need the same physics: the full J tensor, the
dipolar tensor's orientation, referenced shifts, quadrupolar coupling constants.

## Consequences

- The model is framework-free, with no React or Redux imports, so it is testable without a browser
  and can be lifted into a library later without untangling it from the application.
- Physics that belongs next to the tensors moves to crystvis-js rather than growing a second physics
  layer in the application: the dipolar tensor, which exists in MagresView but is used by no export,
  and the J tensor, of which only the isotropy currently survives.
- Euler angles in report tables move from the legacy rotation helper to the tensor's own method, the
  same call the SIMPSON writer makes. Tables consequently begin honouring the PAS ordering and
  rotation sense the user has selected, and angles in exports will change for anyone not on the
  previous hardcoded defaults. Two code paths computing one quantity is the duplication being
  removed.
