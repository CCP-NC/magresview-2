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
export const tooltip_lorentzian_broadening = <div>
    <p>
        This is the width used for the <a href="https://en.wikipedia.org/wiki/Spectral_line_shape#Lorentzian" target="_blank" rel="noopener noreferrer">Lorentzian broadening function. </a> <br />
        When the width is set to 0, no broadening is applied and simple sticks are drawn.
    </p>
</div>

export const tooltip_plots_shifts = <div>
    <p>
        If you have set a reference value for the selected element, you can choose to display chemical shift information, rather than the computed chemical shielding. <br />
        If no reference value is set, this option will be disabled. <br />
        You can set a reference value by clicking the <b>Set References</b> button in the <b>Magnetic Shielding</b> tab. <br />
    </p>
</div>

export const tooltip_plots_elements = <div>
    <p>
        Choose which species to plot from the set of <i> currently selected </i> elements. <br />
        To change the selection, use the <b>Select and display</b> tab. <br />
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