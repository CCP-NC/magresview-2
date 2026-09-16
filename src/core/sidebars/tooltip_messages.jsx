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
// --- EFG sidebar: quantity definitions (MathML) ---
// React 18 does not namespace MathML elements created via JSX, so the
// equations are static trusted strings injected with dangerouslySetInnerHTML.
const MathEq = ({ src }) => (
    <div className='mv-math-eq' dangerouslySetInnerHTML={{ __html: src }} />
);

export const tooltip_efg_Q = <div>
    <p><b>Quadrupolar coupling constant</b></p>
    <MathEq src='<math display="block">
        <msub><mi>C</mi><mi>Q</mi></msub><mo>=</mo>
        <mfrac>
            <mrow><mi>e</mi><mi>Q</mi><msub><mi>V</mi><mrow><mi>z</mi><mi>z</mi></mrow></msub></mrow>
            <mi>h</mi>
        </mfrac>
    </math>' />
    <p>
        Q is the nuclear quadrupole moment of the isotope assigned to each
        site (see the <b>Select and display</b> tab).
    </p>
</div>;

export const tooltip_efg_Vzz = <div>
    <p><b>Largest EFG principal component</b> (atomic units)</p>
    <MathEq src='<math display="block">
        <mrow>
            <mo>|</mo><msub><mi>V</mi><mrow><mi>z</mi><mi>z</mi></mrow></msub><mo>|</mo>
            <mo>&#8805;</mo>
            <mo>|</mo><msub><mi>V</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub><mo>|</mo>
            <mo>&#8805;</mo>
            <mo>|</mo><msub><mi>V</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub><mo>|</mo>
        </mrow>
    </math>' />
</div>;

export const tooltip_efg_asymm = <div>
    <p><b>EFG asymmetry parameter</b></p>
    <MathEq src='<math display="block">
        <mi>&#951;</mi><mo>=</mo>
        <mfrac>
            <mrow>
                <msub><mi>V</mi><mrow><mi>x</mi><mi>x</mi></mrow></msub>
                <mo>&#8722;</mo>
                <msub><mi>V</mi><mrow><mi>y</mi><mi>y</mi></mrow></msub>
            </mrow>
            <msub><mi>V</mi><mrow><mi>z</mi><mi>z</mi></mrow></msub>
        </mfrac>
        <mo>,</mo><mspace width="1em"></mspace>
        <mn>0</mn><mo>&#8804;</mo><mi>&#951;</mi><mo>&#8804;</mo><mn>1</mn>
    </math>' />
    <p>
        with the principal components ordered
        <span style={{ whiteSpace: 'nowrap' }}> |V<sub>zz</sub>| &ge; |V<sub>yy</sub>| &ge; |V<sub>xx</sub>|</span>.
    </p>
</div>;

export const tooltip_efg_PQ = <div>
    <p><b>Quadrupolar product</b></p>
    <MathEq src='<math display="block">
        <msub><mi>P</mi><mi>Q</mi></msub><mo>=</mo>
        <msub><mi>C</mi><mi>Q</mi></msub>
        <msqrt><mn>1</mn><mo>+</mo><mfrac><msup><mi>&#951;</mi><mn>2</mn></msup><mn>3</mn></mfrac></msqrt>
    </math>' />
</div>;

export const tooltip_efg_qis = <div>
    <p><b>Second-order quadrupolar-induced shift</b> (central transition, under MAS)</p>
    <MathEq src='<math display="block">
        <msub><mi>&#948;</mi><mtext>QIS</mtext></msub><mo>=</mo>
        <mo>&#8722;</mo><mfrac><mn>3</mn><mn>40</mn></mfrac>
        <msup>
            <mrow><mo>(</mo><mfrac>
                <msub><mi>P</mi><mi>Q</mi></msub>
                <msub><mi>&#957;</mi><mn>0</mn></msub>
            </mfrac><mo>)</mo></mrow>
            <mn>2</mn>
        </msup>
        <mfrac>
            <mrow><mi>I</mi><mo>(</mo><mi>I</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>&#8722;</mo><mfrac><mn>3</mn><mn>4</mn></mfrac></mrow>
            <mrow>
                <msup><mi>I</mi><mn>2</mn></msup>
                <msup><mrow><mo>(</mo><mn>2</mn><mi>I</mi><mo>&#8722;</mo><mn>1</mn><mo>)</mo></mrow><mn>2</mn></msup>
            </mrow>
        </mfrac>
        <mo>&#215;</mo><msup><mn>10</mn><mn>6</mn></msup>
        <mspace width="0.5em"></mspace><mtext>ppm</mtext>
    </math>' />
    <p>
        &nu;<sub>0</sub> is the Larmor frequency of the site&apos;s isotope at
        the field B<sub>0</sub> set below. I is the nuclear spin.
    </p>
</div>;

export const tooltip_efg_dobs = <div>
    <p><b>Observed shift</b> (centre of gravity of the central transition in a MAS spectrum)</p>
    <MathEq src='<math display="block">
        <msub><mi>&#948;</mi><mtext>obs</mtext></msub><mo>=</mo>
        <msub><mi>&#948;</mi><mtext>iso</mtext></msub><mo>+</mo>
        <msub><mi>&#948;</mi><mtext>QIS</mtext></msub>
    </math>' />
    <p>
        Requires a chemical shift reference (set in the <b>MS</b> tab) and MS
        data. Only defined for quadrupolar sites (spin &gt; &#189;).
    </p>
</div>;

// --- Spectral plots sidebar ---
export const tooltip_plots_q2_shifts = <div>
    <p><b>Second-order quadrupolar shift (&delta;<sub>QIS</sub>)</b></p>
    <p>
        Moves each peak to &delta;<sub>obs</sub> = &delta;<sub>iso</sub> +
        &delta;<sub>QIS</sub>, the centre-of-gravity position of the central
        transition under magic-angle spinning (MAS) at the spectrometer field
        B<sub>0</sub>.
    </p>
    <p>
        Available only in <b>shift</b> mode: &delta;<sub>QIS</sub> is a shift,
        so it needs an axis referenced to a real standard. It is also only
        defined for <b>half-integer</b> spins above &#189; — integer-spin
        nuclei such as <sup>14</sup>N and <sup>2</sup>H have no central
        transition, and are left unshifted.
    </p>
    <p>
        <b>Not a lineshape simulation.</b> Peaks are moved and then broadened
        with the chosen symmetric kernel (Lorentzian or Gaussian); no
        quadrupolar powder pattern is computed.
    </p>
    <p>
        <b>Validity.</b> &delta;<sub>QIS</sub> is second-order perturbation
        theory in |P<sub>Q</sub>|/&nu;<sub>0</sub>. Sites where that ratio is
        large are flagged: their peak positions need exact diagonalisation
        instead.
    </p>
</div>;
