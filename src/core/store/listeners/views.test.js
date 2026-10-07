import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Loader } from '@ccp-nc/crystvis-js/lib/loader.js';
import { Model } from '@ccp-nc/crystvis-js/lib/model.js';

import { resolveViews } from './views';
import { mergeMagresText } from '../../../utils';

const FIXTURES_DIR = path.join(__dirname, '../../../utils/__fixtures__');

// Real Models, because the whole point of these guards is which Model a given
// ModelView belongs to.
function loadQuartz(name) {
    const nmr = fs.readFileSync(path.join(FIXTURES_DIR, 'quartz.nmr.magres'), 'utf-8');
    const efg = fs.readFileSync(path.join(FIXTURES_DIR, 'quartz.efg.magres'), 'utf-8');
    const loader = new Loader();
    const s = loader.load(mergeMagresText(nmr, efg), 'magres', name);
    return new Model(s[name], { useNMRActiveIsotopes: true });
}

function state(model, overrides = {}) {
    return {
        app_default_displayed: model.all,
        sel_selected_view: null,
        sel_displayed_view: null,
        ...overrides,
    };
}

describe('resolveViews', () => {

    it('keeps views that belong to the active model', () => {
        const model = loadQuartz('quartz');
        const sel = model.view([0, 1, 2]);
        const displ = model.view([0, 1, 2, 3]);

        const out = resolveViews(
            state(model, { sel_selected_view: sel, sel_displayed_view: displ }),
            model
        );

        expect(out.sel).toBe(sel);
        expect(out.displ).toBe(displ);
        expect(out.staleSel).toBe(false);
        expect(out.staleDispl).toBe(false);
    });

    it('drops a selection left behind by another model', () => {
        const active = loadQuartz('active');
        const other = loadQuartz('other');

        const out = resolveViews(
            state(active, { sel_selected_view: other.view([0, 1, 2]) }),
            active
        );

        expect(out.sel).toBe(null);
        // Flagged so the listener can clear the store key too, rather than let
        // SelInterface keep reporting three selected atoms that are not shown.
        expect(out.staleSel).toBe(true);
    });

    it('falls back to the whole model when the displayed view is stale', () => {
        const active = loadQuartz('active');
        const other = loadQuartz('other');

        const out = resolveViews(
            state(active, { sel_displayed_view: other.view([0, 1]) }),
            active
        );

        expect(out.displ).toBe(active.all);
        expect(out.staleDispl).toBe(true);
    });

    it('falls back to the whole model when there is no displayed view at all', () => {
        const model = loadQuartz('quartz');

        const out = resolveViews(
            { sel_selected_view: null, sel_displayed_view: null, app_default_displayed: null },
            model
        );

        expect(out.displ).toBe(model.all);
        expect(out.staleDispl).toBe(false);
    });

    it('flags nothing when every view is current', () => {
        const model = loadQuartz('quartz');
        const out = resolveViews(state(model), model);

        expect(out.staleSel).toBe(false);
        expect(out.staleDispl).toBe(false);
    });
});
