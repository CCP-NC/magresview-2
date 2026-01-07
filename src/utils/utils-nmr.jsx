/** 
 * Utilities that have to do with computing non-trivial NMR quantities
 */

/**
 * Dipolar coupling constant in Hz between two atoms. Takes into account both
 * distance and the properties of the isotopes.
 * 
 * @param  {AtomImage} a1 First atom
 * @param  {AtomImage} a2 Second atom
 * 
 * @return {[Number, Array]}    Dipolar coupling in Hz and unit vector connecting
 *                              the two atoms
 */
function dipolarCoupling(a1, a2) {

    const MU0_HBAR_E30 = 1.3252140307214143e-10;
    const g1 = a1.isotopeData.gamma || 0;
    const g2 = a2.isotopeData.gamma || 0;

    const r1 = a1.xyz;
    const r2 = a2.xyz;
    const r = r2.map((x, i) => x-r1[i]);
    const R = Math.sqrt(r.reduce((s, x) => s+x*x, 0));
    const rnorm = r.map((x) => x/R);

    return [-MU0_HBAR_E30*g1*g2/(8*Math.PI*Math.PI*Math.pow(R, 3)), rnorm];    
}

/** 
 * Given a pair of atoms, return the full dipolar coupling tensor in Hz.
 * 
 * The dipolar coupling is given by:

    .. math::

        d_{ij} = -\\frac{\\mu_0\\hbar\\gamma_i\\gamma_j}{8\\pi^2r_{ij}^3}

    where the gammas represent the gyromagnetic ratios of the nuclei and the
    r is their distance. 

    This is computed in the dipolarCoupling function. 
    
    The full tensor of the interaction is then defined as

    .. math::

         D_{ij} = d_{ij}(3\\hat{r}_{ij}\\otimes \\hat{r}_{ij}-\\mathbb{I})

    where :math:`\\hat{r}_{ij} = r_{ij}/|r_{ij}|` and the Kronecker product is
    used.

    This function returns the tensor in the form of a 3x3 array.
 * 
 * @param  {AtomImage} a1 First atom
 * @param  {AtomImage} a2 Second atom
 * 
 * @return {Array}      3x3 Dipolar coupling tensor
 */
function dipolarTensor(a1, a2) {

    // Get the dipolar coupling and the unit vector
    const [d,rnorm] = dipolarCoupling(a1, a2);

    let D = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i=0; i<3; i++) {
        for (let j=0; j<3; j++) {
            D[i][j] = d*(3*rnorm[i]*rnorm[j] - (i===j ? 1 : 0));
        }
    }
    // Return the tensor
    return D;
}

/**
 * J coupling constant in Hz between two atoms. Will return
 * a value only if the ISC tensor data is available
 * 
 * @param  {AtomImage} a1   First atom
 * @param  {AtomImage} a2   Second atom
 * 
 * @return {Number}         J-coupling constant in Hz
 */
function jCoupling(a1, a2) {

    let T;
    // Is it present at all?
    try {
        T = a1.getArrayValue('isc')[a2.index];
    }
    catch (e) {
        // Not found
        return null;
    }

    if (!T)
        return null;

    // Convert the tensor
    let g1 = a1.isotopeData.gamma;
    let g2 = a2.isotopeData.gamma;
    T = T.iscAtomicToHz(g1, g2);

    return T.isotropy;
}

export { dipolarCoupling, dipolarTensor, jCoupling };