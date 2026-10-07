import { describe, it, expect } from 'vitest';
import { computeMinimumImageDisplacement } from './dipolar';

const mockModel = cell => ({ periodic: true, cell });

function mulberry32(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function bruteForce(r, cell, range = 6) {
    let best = null;
    let bestSq = Infinity;
    for (let a = -range; a <= range; a++) {
        for (let b = -range; b <= range; b++) {
            for (let c = -range; c <= range; c++) {
                const v = [0, 1, 2].map(k => r[k] + a * cell[0][k] + b * cell[1][k] + c * cell[2][k]);
                const n2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
                if (n2 < bestSq) { bestSq = n2; best = v; }
            }
        }
    }
    return Math.sqrt(bestSq);
}

function checkAgainstBruteForce(cell, nPairs = 300, seed = 1) {
    const model = mockModel(cell);
    const rand = mulberry32(seed);
    // Random points inside the cell parallelepiped
    const randPoint = () => {
        const f = [rand(), rand(), rand()];
        return [0, 1, 2].map(k => f[0] * cell[0][k] + f[1] * cell[1][k] + f[2] * cell[2][k]);
    };
    let worst = 0;
    for (let n = 0; n < nPairs; n++) {
        const p1 = randPoint();
        const p2 = randPoint();
        const r = computeMinimumImageDisplacement(p1, p2, model);
        const got = Math.hypot(...r);
        const expected = bruteForce([p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]], cell);
        worst = Math.max(worst, Math.abs(got - expected));
    }
    return worst;
}

describe('computeMinimumImageDisplacement', () => {
    it('is exact on a strongly sheared cell (z row [27, 3, 5])', () => {
        const cell = [[10, 0, 0], [0, 10, 0], [27, 3, 5]];
        expect(checkAgainstBruteForce(cell, 400, 7)).toBeLessThan(1e-9);
    });

    it('is exact on a strongly sheared cell (y row [19, 2, 0])', () => {
        const cell = [[10, 0, 0], [19, 2, 0], [0, 0, 10]];
        expect(checkAgainstBruteForce(cell, 400, 11)).toBeLessThan(1e-9);
    });

    it('is unchanged on orthorhombic and hexagonal cells', () => {
        const ortho = [[5, 0, 0], [0, 7, 0], [0, 0, 9]];
        const hex = [[4, 0, 0], [-2, 2 * Math.sqrt(3), 0], [0, 0, 6]];
        expect(checkAgainstBruteForce(ortho, 200, 3)).toBeLessThan(1e-9);
        expect(checkAgainstBruteForce(hex, 200, 5)).toBeLessThan(1e-9);

        const r = computeMinimumImageDisplacement([0.5, 0.5, 0.5], [4.5, 6.5, 8.5], mockModel(ortho));
        expect(r[0]).toBeCloseTo(-1, 12);
        expect(r[1]).toBeCloseTo(-1, 12);
        expect(r[2]).toBeCloseTo(-1, 12);
    });

    it('returns the plain displacement for a non-periodic model', () => {
        expect(computeMinimumImageDisplacement([0, 0, 0], [1, 2, 3], null)).toEqual([1, 2, 3]);
        expect(computeMinimumImageDisplacement([0, 0, 0], [1, 2, 3], { periodic: false })).toEqual([1, 2, 3]);
    });

    it('returns a lattice translate of the raw displacement', () => {
        const cell = [[10, 0, 0], [0, 10, 0], [27, 3, 5]];
        const raw = [3.3, 17.1, -9.4];
        const r = computeMinimumImageDisplacement([0, 0, 0], raw, mockModel(cell));
        // Solve (raw - r) = n . cell for integer n
        const d = [0, 1, 2].map(k => raw[k] - r[k]);
        const n2 = d[2] / 5;
        const n1 = (d[1] - 3 * n2) / 10;
        const n0 = (d[0] - 27 * n2) / 10;
        for (const n of [n0, n1, n2]) expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-9);
    });
});
