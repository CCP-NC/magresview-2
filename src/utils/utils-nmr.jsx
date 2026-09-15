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

/**
 * Gyromagnetic ratio of 1H in rad/s/T, used to express B0 as the equivalent
 * proton Larmor frequency.
 */
const GAMMA_H = 267522128.0;

/**
 * Larmor frequency (in Hz, absolute value) of a nucleus with gyromagnetic
 * ratio gamma (rad/s/T) in a field B0 (T).
 *
 * @param  {Number} gamma   Gyromagnetic ratio in rad/s/T
 * @param  {Number} B0      Magnetic field in T
 *
 * @return {Number}         Larmor frequency in Hz
 */
function larmorFrequency(gamma, B0) {
    return Math.abs(gamma*B0/(2*Math.PI));
}

/**
 * Quadrupolar product P_Q = C_Q*sqrt(1 + eta^2/3). Returned in the same
 * units as C_Q, keeping its sign.
 *
 * @param  {Number} CQ      Quadrupolar coupling constant
 * @param  {Number} eta     EFG asymmetry parameter
 *
 * @return {Number}         Quadrupolar product, same units as CQ
 */
function quadrupoleProduct(CQ, eta) {
    return CQ*Math.sqrt(1.0 + eta*eta/3.0);
}

/**
 * Second-order quadrupolar-induced shift (in ppm) of the central transition
 * under MAS — the isotropic (rotation-invariant) centre-of-gravity term:
 *
 *   d_QIS = -(3/40) * (P_Q/nu0)^2 * [I(I+1) - 3/4] / [I^2 (2I-1)^2] * 1e6
 *
 * Equivalent to soprano's NMRFlags.Q_2_SHIFT contribution for the central
 * transition (see docs/adr/0008).
 *
 * @param  {Number} PQ      Quadrupolar product in Hz
 * @param  {Number} I       Nuclear spin quantum number (must be > 1/2)
 * @param  {Number} nu0     Larmor frequency of the nucleus in Hz
 *
 * @return {Number}         Second-order quadrupolar-induced shift in ppm
 */
function secondOrderShift(PQ, I, nu0) {
    const x = PQ/nu0;
    return -(3.0/40.0)*x*x*(I*(I+1) - 0.75)/(I*I*(2*I - 1)*(2*I - 1))*1e6;
}

/**
 * Quadrupolar data for an atom at a given field. Returns null unless the
 * atom is a quadrupolar site (isotope spin > 1/2 with a defined quadrupole
 * moment) with EFG data.
 *
 * @param  {AtomImage} a    Atom
 * @param  {Number} B0      Magnetic field in T (only needed for qis)
 *
 * @return {Object}         { spin, CQ, PQ, qis } with CQ and PQ in Hz and
 *                          qis in ppm (qis is null if B0 is not given),
 *                          or null for non-quadrupolar sites
 */
function quadrupolarData(a, B0=null) {

    const iD = a.isotopeData;

    if (!iD || !(iD.spin > 0.5) || !iD.Q) {
        return null;
    }

    let T;
    try {
        T = a.getArrayValue('efg');
    }
    catch (e) {
        return null;
    }
    if (!T) {
        return null;
    }

    const CQ = T.efgAtomicToHz(iD.Q).haeberlen_eigenvalues[2];
    const PQ = quadrupoleProduct(CQ, T.asymmetry);

    let qis = null;
    if (B0 && iD.gamma) {
        qis = secondOrderShift(PQ, iD.spin, larmorFrequency(iD.gamma, B0));
    }

    return {
        spin: iD.spin,
        CQ: CQ,
        PQ: PQ,
        qis: qis
    };
}

export { dipolarCoupling, dipolarTensor, jCoupling,
         GAMMA_H, larmorFrequency, quadrupoleProduct, secondOrderShift,
         quadrupolarData };