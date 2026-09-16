# Global B0 state and 1D spectral plot quadrupolar shifts

Spectrometer magnetic field (B₀) is a single, model-wide physical property shared across interactions. We promote B₀ to `app_B0` so that EFG calculations, 1D spectral plotting, and the spectrometer field dialog share a single source of truth. `AppInterface` owns the only writable accessor; `EFGInterface` and `PlotsInterface` expose read-only views of the same value, and nothing in the store holds a second field.

In the 1D plotting tool, quadrupolar effects are included as an isotropic central-transition MAS peak shift (δ_QIS), moving peaks to δ_obs = δ_iso + δ_QIS. Full powder lineshape simulation is explicitly deferred.

**The shift applies in chemical shift mode only.** Folding δ_QIS into a shielding axis produces a composite ("σ_iso − δ_QIS") that is not a shielding, is not a shift, and corresponds to no measurable quantity: in shielding mode there is no reference and therefore no experimental spectrum to compare the plot against. The switch is disabled outside shift mode and says why.

**The shift is opt-in.** It moves peaks by tens to hundreds of ppm, so defaulting it on would mean a plot silently disagreeing with the raw DFT δ_iso the user came to look at.

## Considered Options

- Independent per-nucleus Larmor frequencies were rejected because all nuclei in a physical sample experience the same external magnet B₀. The dialog still lets you *type* any isotope's frequency, but that is an input method for B₀, not an independent setting — editing one moves all the others, and the dialog says so.
- Storing B₀ per-model was rejected in favour of a global instrument setting: switching models with different elements preserves B₀ and recomputes Larmor frequencies for the new model's isotopes. Note that B₀ is nevertheless part of a saved Session, unlike theme — it determines computed values, so a session that did not carry it would not reproduce its own numbers.
- Backwards compatibility with the earlier per-interaction `efg_B0` was dropped rather than aliased: that key was never in a release, so the `app_B0 ?? efg_B0` fallbacks were dead code that only looked like a migration.
- Simulating full second-order quadrupolar lineshapes (powder patterns) in the 1D plot was deferred in favour of isotropic peak shifting, which integrates with existing Gaussian/Lorentzian broadening.

## Consequences

- The spectrometer field dialog (hotkey `B`) provides two-way synchronisation: editing B₀, ¹H MHz, or any isotope's resonance frequency updates all the others. Because a controlled input that reformats on every keystroke cannot be typed into, the field currently being edited keeps its raw text until it loses focus and only the other fields update live. B₀ is stored to 6 decimal places so that a typed frequency round-trips within its own displayed precision.
- The dialog enumerates every isotope in the *model*, not in the current selection: B₀ is a property of the instrument, not of what happens to be highlighted.
- `store/listeners/plots.js` is the single authority on whether the shift was applied. It reports `plots_quad_info` ({applied, nShifted, nUnreliable, maxRatio}) alongside the plot data, and the sidebar, the axis label and the plot title all read that rather than re-deriving the condition. The axis label uses Plotly's HTML subset (`<sub>`), not TeX underscores, so exported figures read δ_obs rather than "δ_obs".
- `PlotsInterface.quadEligibility` is the matching single predicate for *availability*, returning one of `ok | no-element | no-efg | not-quadrupolar | integer-spin | shielding-mode | no-field`. The switch's disabled state and its explanatory note are both derived from it, so they cannot disagree.
