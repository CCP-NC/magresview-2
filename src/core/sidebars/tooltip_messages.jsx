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


//  --- Select and display sidebar ---
// isotope selection
export const tooltip_isotope_select = <div>
    Select either a single atom or group of atoms with the same element and then select their isotope.
    By default these are set to the NMR-active isotope for each element.
    You can easily see what isotopes have been set by setting the "Label by" dropdown to "Isotope".
</div>

// --- Magnetic shielding sidebar ---
