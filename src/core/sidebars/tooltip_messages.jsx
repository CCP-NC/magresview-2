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
        using the <b>Set References</b> button below.
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


// --- Report files sidebar ---
export const tooltip_files_merge = <div>
    <p>
        If checked, sites with the same crystallographic label will 
        be merged into one entry in the output file. 
    </p>
    {/* <p>
        If no crystallographic labels were present in the loaded file, 
        then they will have been generated automatically based on the site index, 
        so this option won't do anything.
    </p> */}
    <p>
        The multiplicity of each label is given in the output file.
        Note: This checks for multiplicity within the current selection only. 
    </p>
</div>

export const tooltip_files_precision = <div>
    <p>
        The number of decimal places to use in the output file.
    </p>
</div>