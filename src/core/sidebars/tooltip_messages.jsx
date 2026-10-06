// Helper tooltip messages for the sidebar elements

//  --- Load file sidebar ---
export const tooltip_molecular_crystal = <div>
    <p>MagresView tries to identify molecular units within the crystal structure. <br />
        It can then draw the correct periodic image of each atom such that full molecular units are visible. <br />
        This is especially useful for molecular crystals.
    </p>
    <p>
        <b>Auto:</b> (default): it will do a very basic check to see if your structure looks organic (if it has C and H atoms).
        If it does, it will load it as a molecular crystal. <br />
        <b>Yes:</b> it will load the structure as a molecular crystal. <br />
        <b>No:</b> display structure exactly as in the loaded file.
    </p>
</div>;

export const tooltip_nmr_active = <div>
    <p> MagresView will default to assuming NMR-active isotopes for each element, rather than the most abundant isotope. <br />
        You can disable this by unchecking this box. <br />
    </p>
    <p>
        To set a custom isotope for each atom/element, use the <b>Select and display</b> tab.
    </p>
</div>;

export const tooltip_vdw_scaling = <div>
    <p> MagresView calculates atom connectivity using the van der Waals radii of atoms. You can scale these radii to change add or remove bonds. <br />
    </p>
    <p>
        This is only done when loading or reloading a structure. Click the reload icon next to an existing structure to apply any changes to the vdW scale.  <br />
    </p>
</div>;

//  --- Select and display sidebar ---
// isotope selection
export const tooltip_isotope_select = <div>
    Select either a single atom or group of atoms with the same element and then select their isotope.
    By default these are set to the NMR-active isotope for each element.
    You can easily see what isotopes have been set by setting the "Label by" dropdown to "Isotope".
</div>

// label by
export const tooltip_label_by = <div>
    Label selected sites by chosen property. <br /><br />
    If crystallographic labels were not present in the file these will be generated automatically, with indices matching the order of the file.
    {/* TODO: add link explaining best practice. */}
</div>

// selection mode
export const tooltip_selection_mode = <div>
    <p>
        Selection mode: <br />
        <b>Atom:</b> select individual atoms. <br />
        <b>Element:</b> select by element <br />
        <b>Crystallographic label</b> select by crystallographic label <br />
        <b>Sphere:</b> select atoms within a sphere of a given radius. <br />
        <b>Molecule:</b> select all atoms in a molecule. <br />
        <b>Bonds:</b> select atoms within a given number of bonds. <br />
    </p>

</div>

// isotope selection
export const tooltip_isotopes = <div>
    <p>
        To change an isotope, select a group of atoms all having the same element then choose an isotope from the dropdown. <br />
        You can display isotope labels using the Label by dropdown above. <br />
        The isotope information is taken from this file: <a href="https://github.com/CCP-NC/crystvis-js/blob/master/lib/nmrdata.js" target="_blank" rel="noopener noreferrer">nmrdata.js</a>
    </p>
</div>

// --- Magnetic shielding sidebar ---



// --- Plots sidebar ---
export const tooltip_broadening_type = <div>
    <p>
        <b>Lorentzian</b> broadening arises from exponential decay of transverse 
        magnetization in the time domain (T₂ or T₂*), representing homogeneous 
        broadening.
        <br />
        <b>Gaussian</b> broadening arises from a static distribution of resonance 
        frequencies (inhomogeneous broadening), such as chemical shift distributions 
        or unresolved dipolar couplings, and is common in disordered or 
        dipolar-coupled systems.
    </p>
</div>

export const tooltip_lorentzian_broadening = <div>
    <p>
        Peak width at half-maximum (FWHM) in ppm. <br />
        When set to 0, no broadening is applied and simple sticks are drawn.
    </p>
</div>

export const tooltip_plots_shifts = <div>
    <p>
        Toggle between plotting the raw computed magnetic <b>shielding</b> (ppm) and
        the <b>chemical shift</b> (ppm), which requires a reference value for each element.
    </p>
    <p>
        If no reference is set for the current element when you switch to Shift mode,
        you will be prompted to enter one. You can also update references at any time
        using the <b>Referencing</b> button below.
    </p>
</div>

export const tooltip_plots_elements = <div>
    <p>
        Choose which species to plot from the set of <i>currently selected</i> elements. <br />
        To change the selection, use the <b>Select and display</b> tab.
    </p>
    <p>
        When in Shift mode, switching to an element with no reference set will prompt
        you to enter one.
    </p>
</div>


// --- Export sidebar ---
export const tooltip_files_merge = <div>
    <p>
        Keeps the first site carrying each crystallographic label and throws away the
        rest. Nothing is averaged. Sites that share a label usually have different
        tensor orientations, and you cannot combine those into one tensor.
    </p>
    <p>
        Dropping sites leaves holes in the coupling network, so turn dipolar and J
        couplings off before you use this.
    </p>
    <p>
        Label multiplicities go into the output file, counted over the current
        selection only.
    </p>
</div>

export const tooltip_files_scope = <div>
    <p>
        A full spin system is one file holding every selected nucleus, coupled together.
    </p>
    <p>
        One file per site gives each nucleus its own file with no couplings. Use it for
        independent single-spin simulations, or when the whole system is too big to
        simulate. For SIMPSON you get a ZIP with one .spinsys per site.
    </p>
</div>

export const tooltip_files_average_groups = <div>
    <p>
        Collapses a rotating group such as a methyl into one site whose tensors are
        averaged over its members. This is the fast-rotation limit, and it scales the
        C–H dipolar coupling by the expected −1/3.
    </p>
    <p>
        What comes out is not a CH<sub>3</sub> spin system. It has one proton rather
        than three, so it gives you neither the right multiplicity nor the right
        homonuclear linewidth. Use it only when you are looking at the group through a
        coupled heteronucleus.
    </p>
</div>



export const tooltip_files_precision = <div>
    <p>
        The number of decimal places to use in the output file.
    </p>
</div>

// --- Euler angles sidebar ---
export const tooltip_pas_ordering = <div>
    <p>
        <b>PAS Ordering Convention:</b><br />
        Determines how the Principal Axis System (PAS) eigenvectors (X, Y, Z) are assigned to the tensor eigenvalues.
    </p>
    <p>
        Haeberlen: <span style={{ whiteSpace: 'nowrap' }}>|V<sub>zz</sub> &minus; V<sub>iso</sub>| &ge; |V<sub>xx</sub> &minus; V<sub>iso</sub>| &ge; |V<sub>yy</sub> &minus; V<sub>iso</sub>|.</span><br />
        NQR: <span style={{ whiteSpace: 'nowrap' }}>|V<sub>zz</sub>| &ge; |V<sub>yy</sub>| &ge; |V<sub>xx</sub>|.</span><br />
        Increasing: <span style={{ whiteSpace: 'nowrap' }}>V<sub>xx</sub> &le; V<sub>yy</sub> &le; V<sub>zz</sub>.</span><br />
        Decreasing: <span style={{ whiteSpace: 'nowrap' }}>V<sub>xx</sub> &ge; V<sub>yy</sub> &ge; V<sub>zz</sub>.</span>
    </p>
</div>;
