/**
 * The referencing gradient is one calibration shared by everything that turns
 * a shielding into a shift. These tests pin that down at the single point all
 * of it flows through, getNMRData, plus the MS interface that owns the state.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Loader } from '@ccp-nc/crystvis-js/lib/loader.js';
import { Model } from '@ccp-nc/crystvis-js/lib/model.js';

import { getNMRData, referencingGradient } from './utils';
import { MSInterface, initialMSState, msSetReferences } from './interfaces/MSInterface';
import { Events } from './listeners';

const FIXTURES_DIR = path.join(__dirname, '../../utils/__fixtures__');

function quartzView() {
    const magres = fs.readFileSync(path.join(FIXTURES_DIR, 'quartz.nmr.magres'), 'utf-8');
    const loader = new Loader();
    const model = new Model(loader.load(magres, 'magres', 'quartz')['quartz'], { useNMRActiveIsotopes: true });
    return { model, view: model.view([0, 1, 2]) };
}

describe('referencingGradient', () => {

    it('defaults to -1 when nothing is set', () => {
        expect(referencingGradient(undefined, 'Si')).toBe(-1);
        expect(referencingGradient({}, 'Si')).toBe(-1);
        expect(referencingGradient({ Si: '' }, 'Si')).toBe(-1);
    });

    it('survives a half-typed field rather than returning NaN', () => {
        // The table holds raw text, so these states are reachable by typing.
        expect(referencingGradient({ Si: '-' }, 'Si')).toBe(-1);
        expect(referencingGradient({ Si: 'abc' }, 'Si')).toBe(-1);
    });

    it('accepts a number or its string form', () => {
        expect(referencingGradient({ Si: -0.95 }, 'Si')).toBe(-0.95);
        expect(referencingGradient({ Si: '-0.95' }, 'Si')).toBe(-0.95);
    });

    it('does not mistake a legitimate zero for unset', () => {
        expect(referencingGradient({ Si: '0' }, 'Si')).toBe(0);
    });
});

describe('getNMRData chemical shifts', () => {

    it('reduces to reference minus shielding at the default gradient', () => {
        const { view } = quartzView();
        const [, sigma] = getNMRData(view, 'iso', 'ms');
        const [units, cs] = getNMRData(view, 'cs', 'ms', { Si: 300 });

        expect(units).toBe('ppm');
        cs.forEach((v, i) => expect(v).toBeCloseTo(300 - sigma[i], 8));
    });

    it('applies a non-default gradient', () => {
        const { view } = quartzView();
        const [, sigma] = getNMRData(view, 'iso', 'ms');
        const [, cs] = getNMRData(view, 'cs', 'ms', { Si: 300 }, { Si: '-0.8' });

        cs.forEach((v, i) => expect(v).toBeCloseTo(300 - 0.8 * sigma[i], 8));
    });

    it('is unchanged by an explicit -1', () => {
        const { view } = quartzView();
        const [, implicit] = getNMRData(view, 'cs', 'ms', { Si: 300 });
        const [, explicit] = getNMRData(view, 'cs', 'ms', { Si: 300 }, { Si: '-1' });

        expect(explicit).toEqual(implicit);
    });

    it('still reports null for an element with no reference', () => {
        const { view } = quartzView();
        const [, cs] = getNMRData(view, 'cs', 'ms', { Si: '' }, { Si: '-0.8' });

        expect(cs.every(v => v === null)).toBe(true);
    });

    it('adds the reference rather than subtracting it, so a positive gradient flips the sense', () => {
        const { view } = quartzView();
        const [, sigma] = getNMRData(view, 'iso', 'ms');
        const [, cs] = getNMRData(view, 'cs', 'ms', { Si: 0 }, { Si: '1' });

        cs.forEach((v, i) => expect(v).toBeCloseTo(sigma[i], 8));
    });
});

describe('MSInterface referencing state', () => {

    function makeInterface(extra = {}) {
        const { model } = quartzView();
        return new MSInterface(
            { ...initialMSState, app_viewer: { model }, ...extra },
            vi.fn()
        );
    }

    it('offers a gradient for every element in the model, defaulting to -1', () => {
        const intf = makeInterface();

        expect(Object.keys(intf.gradientTable).sort()).toEqual(['O', 'Si']);
        expect(intf.gradientTable.Si).toBe('-1');
    });

    it('shows a set gradient instead of the default', () => {
        const intf = makeInterface({ ms_gradients: { Si: '-0.9' } });

        expect(intf.gradientTable.Si).toBe('-0.9');
        expect(intf.gradientTable.O).toBe('-1');
        expect(intf.getGradient('Si')).toBe(-0.9);
    });

    it('stores references and gradients together', () => {
        const next = msSetReferences(
            { ms_references: {}, ms_gradients: {} },
            { Si: 300 },
            { Si: '-0.9' }
        );

        expect(next.ms_references).toEqual({ Si: 300 });
        expect(next.ms_gradients).toEqual({ Si: '-0.9' });
    });

    it('redraws labels, colour scales and plots when either changes', () => {
        // Gradient feeds all three, so none of them may keep a stale shift.
        const next = msSetReferences({ ms_references: {}, ms_gradients: {} }, { Si: 300 }, { Si: '-0.9' });

        expect(next.listen_update).toEqual(
            expect.arrayContaining([Events.MS_LABELS, Events.CSCALE, Events.PLOTS_RECALC])
        );
    });

    it('clears gradients alongside references on reset', () => {
        const next = msSetReferences({ ms_references: { Si: 300 }, ms_gradients: { Si: '-0.9' } }, null);

        expect(next.ms_references).toEqual({});
        expect(next.ms_gradients).toEqual({});
    });
});
