/**
 * Lattice reduction for the minimum-image search.
 *
 * Rounding to the nearest cell and then trying +-1 neighbours is only exact
 * when the lattice vectors are close to orthogonal. On a strongly sheared cell
 * it can pick an image that is not the shortest, by several Angstrom, so the
 * search is done in a reduced basis instead. The reduction depends on the cell
 * alone, so it is computed once per model.
 */

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function lll(basis, delta = 0.99) {
    const b = basis.map(v => v.slice());
    const n = b.length;
    const mu = Array.from({ length: n }, () => new Array(n).fill(0));
    const bstar = [];
    const bnorm = [];

    const gramSchmidt = () => {
        for (let i = 0; i < n; i++) {
            bstar[i] = b[i].slice();
            for (let j = 0; j < i; j++) {
                mu[i][j] = dot(b[i], bstar[j]) / bnorm[j];
                for (let k = 0; k < 3; k++) bstar[i][k] -= mu[i][j] * bstar[j][k];
            }
            bnorm[i] = dot(bstar[i], bstar[i]);
        }
    };

    gramSchmidt();
    let k = 1;
    while (k < n) {
        for (let j = k - 1; j >= 0; j--) {
            const q = Math.round(mu[k][j]);
            if (q !== 0) {
                for (let c = 0; c < 3; c++) b[k][c] -= q * b[j][c];
                gramSchmidt();
            }
        }
        if (bnorm[k] >= (delta - mu[k][k - 1] ** 2) * bnorm[k - 1]) {
            k++;
        } else {
            [b[k], b[k - 1]] = [b[k - 1], b[k]];
            gramSchmidt();
            k = Math.max(k - 1, 1);
        }
    }
    return b;
}

/**
 * Shorten each vector by any +-1 combination of the other two until none helps.
 * LLL leaves a basis that is very nearly Minkowski reduced; this closes the gap.
 */
function minkowskiPolish(basis) {
    const b = basis.map(v => v.slice());
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 0; i < 3; i++) {
            const [j, k] = [(i + 1) % 3, (i + 2) % 3];
            let best = dot(b[i], b[i]);
            let bestVec = null;
            for (let cj = -1; cj <= 1; cj++) {
                for (let ck = -1; ck <= 1; ck++) {
                    if (cj === 0 && ck === 0) continue;
                    const v = [0, 1, 2].map(c => b[i][c] + cj * b[j][c] + ck * b[k][c]);
                    const n2 = dot(v, v);
                    if (n2 < best - 1e-12) {
                        best = n2;
                        bestVec = v;
                    }
                }
            }
            if (bestVec) {
                b[i] = bestVec;
                improved = true;
            }
        }
    }
    return b;
}

function invert3(m) {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    return [
        [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
        [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
        [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
    ];
}

/**
 * Lattice-reduce three cell vectors (rows).
 *
 * @param  {Array<Array<number>>} cell Cell rows
 * @return {{basis: Array<Array<number>>, inverse: Array<Array<number>>}} Reduced rows and the inverse of that matrix
 */
export function reduceCell(cell) {
    const basis = minkowskiPolish(lll(cell));
    return { basis, inverse: invert3(basis) };
}

const cache = new WeakMap();

/**
 * Reduced basis for a model, computed once and cached against the model object.
 *
 * @param  {object} model CrystVis model with a `cell` getter
 * @return {{basis: Array<Array<number>>, inverse: Array<Array<number>>}|null}
 */
export function getReducedCell(model) {
    if (cache.has(model)) return cache.get(model);
    const cell = model.cell;
    const reduced = cell && cell.length === 3 ? reduceCell(cell) : null;
    cache.set(model, reduced);
    return reduced;
}
