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
 * True for half-integer nuclear spins (1/2, 3/2, 5/2, ...).
 *
 * Only half-integer spins possess a central transition (m = -1/2 <-> +1/2).
 * Integer-spin quadrupolar nuclei (e.g. 2H, 6Li, 10B, 14N — all spin 1 or 3)
 * have no such transition, so every central-transition quantity, including
 * d_QIS, is undefined for them. See docs/adr/0008.
 *
 * @param  {Number} I       Nuclear spin quantum number
 *
 * @return {Boolean}        Whether I is a half-integer
 */
function isHalfIntegerSpin(I) {
    return Number.isFinite(I) && Number.isInteger(I - 0.5);
}

/**
 * True for nuclei that have a central transition whose second-order
 * quadrupolar shift is meaningful: half-integer spin strictly above 1/2.
 *
 * @param  {Number} I       Nuclear spin quantum number
 *
 * @return {Boolean}        Whether d_QIS is defined for this spin
 */
function hasCentralTransition(I) {
    return isHalfIntegerSpin(I) && I > 0.5;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PERTURBATION-THEORY VALIDITY THRESHOLD
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * d_QIS is a *second-order perturbation* result: it is the leading correction
 * in an expansion in the small parameter
 *
 *     x = |P_Q| / nu_0
 *
 * (quadrupolar product over Larmor frequency). The neglected third-order term
 * scales as x^3, so the relative error of d_QIS is of order x. Once x is no
 * longer small the reported shift is not trustworthy and the site really needs
 * exact diagonalisation rather than perturbation theory.
 *
 * QUAD_PERTURBATION_WARN_RATIO is the single place to tune where the app
 * starts warning. At x = 0.2 the third-order correction is already at the
 * ~20% level, which is well beyond the precision anyone comparing against
 * experiment would accept, so that is the default. Raise it to suppress
 * warnings, lower it to be stricter.
 */
const QUAD_PERTURBATION_WARN_RATIO = 0.2;

/**
 * Second-order quadrupolar-induced shift (in ppm) of the central transition
 * under MAS — the isotropic (rotation-invariant) centre-of-gravity term:
 *
 *   d_QIS = -(3/40) * (P_Q/nu0)^2 * [I(I+1) - 3/4] / [I^2 (2I-1)^2] * 1e6
 *
 * Equivalent to soprano's NMRFlags.Q_2_SHIFT contribution for the central
 * transition (see docs/adr/0008).
 *
 * Defined only for half-integer spin > 1/2; integer-spin nuclei have no
 * central transition and calling this for them is a programming error.
 *
 * @param  {Number} PQ      Quadrupolar product in Hz
 * @param  {Number} I       Nuclear spin quantum number (half-integer > 1/2)
 * @param  {Number} nu0     Larmor frequency of the nucleus in Hz
 *
 * @return {Number}         Second-order quadrupolar-induced shift in ppm
 */
function secondOrderShift(PQ, I, nu0) {
    if (!hasCentralTransition(I)) {
        throw Error('d_QIS is a central-transition quantity and is only ' +
                    'defined for half-integer spin > 1/2; got I = ' + I);
    }
    const x = PQ/nu0;
    return -(3.0/40.0)*x*x*(I*(I+1) - 0.75)/(I*I*(2*I - 1)*(2*I - 1))*1e6;
}

/**
 * Quadrupolar data for an atom at a given field. Returns null unless the
 * atom is a quadrupolar site (isotope spin > 1/2 with a defined quadrupole
 * moment) with EFG data.
 *
 * C_Q and P_Q are defined for every quadrupolar site, integer spin included.
 * d_QIS is not: it is a central-transition quantity, so it stays null for
 * integer-spin nuclei such as 14N no matter what B0 is.
 *
 * @param  {AtomImage} a    Atom
 * @param  {Number} B0      Magnetic field in T (only needed for qis)
 *
 * @return {Object}         {
 *                            spin,               nuclear spin I
 *                            CQ, PQ,             in Hz
 *                            qis,                in ppm, or null
 *                            hasCT,              whether a central transition exists
 *                            ratio,              |P_Q|/nu_0, or null
 *                            perturbationValid   ratio <= threshold, or null
 *                          }
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
    const hasCT = hasCentralTransition(iD.spin);

    let qis = null;
    let ratio = null;
    let perturbationValid = null;
    if (hasCT && B0 && iD.gamma) {
        const nu0 = larmorFrequency(iD.gamma, B0);
        qis = secondOrderShift(PQ, iD.spin, nu0);
        ratio = Math.abs(PQ)/nu0;
        perturbationValid = (ratio <= QUAD_PERTURBATION_WARN_RATIO);
    }

    return {
        spin: iD.spin,
        CQ: CQ,
        PQ: PQ,
        qis: qis,
        hasCT: hasCT,
        ratio: ratio,
        perturbationValid: perturbationValid
    };
}

export { dipolarCoupling, dipolarTensor, jCoupling,
         GAMMA_H, larmorFrequency, quadrupoleProduct, secondOrderShift,
         isHalfIntegerSpin, hasCentralTransition,
         QUAD_PERTURBATION_WARN_RATIO,
         quadrupolarData };
