import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Loader } from '@ccp-nc/crystvis-js/lib/loader.js';
import { Model } from '@ccp-nc/crystvis-js/lib/model.js';

import { FilesInterface, initialFilesState } from './FilesInterface';
import { MAX_SPINSYS_COUPLED_ATOMS } from '../../nmr';
import { mergeMagresText } from '../../../utils';

const FIXTURES_DIR = path.join(__dirname, '../../../utils/__fixtures__');

// Real Model and ModelView objects, not hand-rolled mocks. The gate branches on
// ModelView.model and ModelView.length, and a ModelView is not array-indexable,
// so mocks made of plain arrays would exercise code that never runs in the app.
function loadQuartz(name = 'quartz', parameters = {}) {
    const nmr = fs.readFileSync(path.join(FIXTURES_DIR, 'quartz.nmr.magres'), 'utf-8');
    const efg = fs.readFileSync(path.join(FIXTURES_DIR, 'quartz.efg.magres'), 'utf-8');
    const loader = new Loader();
    const s = loader.load(mergeMagresText(nmr, efg), 'magres', name);
    return new Model(s[name], { useNMRActiveIsotopes: true, ...parameters });
}

// Stand-in for the CrystVis instance. Only the handful of members the export
// interface touches; everything atom-shaped is genuine.
function makeApp(model, { modelName = 'quartz', extraModels = {} } = {}) {
    return {
        model,
        modelName,
        _models: { [modelName]: model, ...extraModels },
        _model_sources: { [modelName]: { extension: 'magres', fileName: `${modelName}.magres` } },
        selected: model ? model.view([]) : null,
        displayed: model ? model.all : null,
    };
}

function makeInterface(app, extra = {}) {
    return new FilesInterface(
        { ...initialFilesState, app_viewer: app, ...extra },
        vi.fn()
    );
}

const REFS = { Si: 300.0, O: 200.0 };

describe('FilesInterface spin system selection gate', () => {

    it('reports no_model when nothing is loaded', () => {
        const intf = makeInterface(null);

        expect(intf.selectionStatus).toBe('no_model');
        expect(intf.hasValidSelection).toBe(false);
        expect(intf.spinSystem).toBe(null);
    });

    it('reports none for an empty selection and builds nothing', () => {
        const model = loadQuartz();
        const app = makeApp(model);

        const intf = makeInterface(app, { files_mode: 'spinsys' });

        expect(intf.selectionStatus).toBe('none');
        expect(intf.spinSystem).toBe(null);
        expect(intf.fileValid).toBe(false);
        expect(intf.dimension).toBe(1);
        expect(intf.availableIsotopes).toEqual([]);
    });

    it('does not fall back to the displayed atoms when nothing is selected', () => {
        // The regression: getSel() used to widen an empty selection to every
        // displayed atom, so opening the panel on a supercell ran an O(N^2)
        // dipolar loop over the whole thing on every render.
        const model = loadQuartz();
        const app = makeApp(model);
        app.displayed = model.all;

        expect(app.displayed.length).toBeGreaterThan(0);
        expect(makeInterface(app, { files_mode: 'spinsys' }).spinSystem).toBe(null);
    });

    it('reports model_mismatch when the selection belongs to another model', () => {
        const active = loadQuartz('active');
        const other = loadQuartz('other');
        const app = makeApp(active, { modelName: 'active', extraModels: { other } });

        app.selected = other.view([0, 1, 2]);

        const intf = makeInterface(app, { files_mode: 'spinsys' });

        expect(intf.selectionStatus).toBe('model_mismatch');
        expect(intf.spinSystem).toBe(null);
        expect(intf.fileValid).toBe(false);
    });

    it('accepts a selection of every atom when the structure is small enough', () => {
        // Selecting everything is only a problem when everything is a lot. A
        // small cell selected in full is an ordinary thing to want to export.
        const model = loadQuartz();
        const app = makeApp(model);

        expect(model.length).toBeLessThanOrEqual(MAX_SPINSYS_COUPLED_ATOMS);
        app.selected = model.view([...Array(model.length).keys()]);

        const intf = makeInterface(app, { files_mode: 'spinsys', ms_references: REFS });

        expect(intf.selectionStatus).toBe('valid');
        expect(intf.spinSystem).not.toBe(null);
        expect(intf.fileValid).toBe(true);
    });

    it('accepts a cluster and reports its dimension', () => {
        const model = loadQuartz();
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, { files_mode: 'spinsys', ms_references: REFS });

        expect(intf.selectionStatus).toBe('valid');
        expect(intf.spinSystem.sites.length).toBe(3);
        // Quartz Si is 29Si, spin 1/2, so 2^3.
        expect(intf.dimension).toBe(8);
        expect(intf.fileValid).toBe(true);
    });

    it('ignores size when no couplings are asked for', () => {
        // Sites are O(N) and measure at under a millisecond for a few hundred.
        // There is nothing to protect the user from here.
        const model = loadQuartz('quartz', { supercell: [3, 3, 3] });
        const app = makeApp(model);
        app.selected = model.all;

        expect(app.selected.length).toBeGreaterThan(MAX_SPINSYS_COUPLED_ATOMS);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_includeD: false,
            files_includeJ: false,
            ms_references: REFS,
        });

        expect(intf.couplingsRequested).toBe(false);
        expect(intf.selectionStatus).toBe('valid');
        expect(intf.spinSystem.sites.length).toBe(app.selected.length);
        expect(intf.spinSystem.couplings).toEqual([]);
    });

    it('refuses couplings past the cap but keeps the sites', () => {
        const model = loadQuartz('quartz', { supercell: [3, 3, 3] });
        const app = makeApp(model);
        app.selected = model.all;

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_includeD: true,
            ms_references: REFS,
        });

        expect(intf.selectionStatus).toBe('couplings_too_large');
        expect(intf.hasValidSelection).toBe(false);
        // Still usable: the sites are what the isotope list and the reference
        // check are built from, and what the split archive exports.
        expect(intf.hasUsableSelection).toBe(true);
        expect(intf.spinSystem.sites.length).toBe(app.selected.length);
        expect(intf.spinSystem.couplings).toEqual([]);
        expect(intf.availableIsotopes.sort()).toEqual(['17O', '29Si']);
    });

    it('withholds the single spinsys file when couplings were refused', () => {
        // One file is one coupled system. Writing it without the couplings the
        // user asked for would be quietly wrong.
        const model = loadQuartz('quartz', { supercell: [3, 3, 3] });
        const app = makeApp(model);
        app.selected = model.all;

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_includeD: true,
            ms_references: REFS,
        });

        expect(intf.fileValid).toBe(false);
    });

    it('computes couplings for a selection inside the cap', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_includeD: true,
            ms_references: REFS,
        });

        expect(intf.selectionStatus).toBe('valid');
        expect(intf.spinSystem.couplings.length).toBe(3);
        expect(intf.fileValid).toBe(true);
    });

    it('exposes the cap so the UI does not hardcode its own number', () => {
        expect(makeInterface(null).maxCoupledAtoms).toBe(MAX_SPINSYS_COUPLED_ATOMS);
    });
});

describe('FilesInterface split archive', () => {

    it('exports a site per file for a selection far past the coupling cap', () => {
        // The point of the archive: thousands of individually simulated sites,
        // none of which couple to anything.
        const model = loadQuartz('quartz', { supercell: [3, 3, 3] });
        const app = makeApp(model);
        app.selected = model.all;

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_includeD: true,
            ms_references: REFS,
        });

        expect(app.selected.length).toBeGreaterThan(MAX_SPINSYS_COUPLED_ATOMS);
        expect(intf.splitZipValid).toBe(true);
        expect(intf.generateSplitZip()).toBeInstanceOf(Uint8Array);
    });

    it('never computes couplings, even under the cap', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_includeD: true,
            ms_references: REFS,
        });

        const spy = vi.spyOn(intf, '_buildSystem');
        intf.generateSplitZip();

        expect(spy).toHaveBeenCalledWith(
            app.selected,
            { includeD: false, includeJ: false }
        );
    });

    it('is unavailable without a selection', () => {
        const model = loadQuartz('quartz');
        const intf = makeInterface(makeApp(model), { files_mode: 'spinsys' });

        expect(intf.splitZipValid).toBe(false);
        expect(intf.generateSplitZip()).toBe(null);
    });

    it('is unavailable when a shielding reference is missing', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, { files_mode: 'spinsys', ms_references: {} });

        expect(intf.splitZipValid).toBe(false);
    });
});

describe('FilesInterface report tables', () => {

    it('falls back to the displayed atoms and builds only on save', () => {
        const model = loadQuartz();
        const app = makeApp(model);
        app.displayed = model.view([0, 1, 2, 3]);

        const intf = makeInterface(app, {
            files_mode: 'tables',
            files_seltype: 'ms',
            ms_references: REFS,
        });

        expect(intf.fileValid).toBe(true);
        // Nothing eager: the spin system getter stays out of the tables path.
        expect(intf.spinSystem).toBe(null);

        const table = intf.generateFile();
        expect(table).toContain('# MS Table generated by MagresView 2');
        expect(table).toContain('Si_1,29Si');
    });

    it('ignores a selection left behind by another model', () => {
        const active = loadQuartz('active');
        const other = loadQuartz('other');
        const app = makeApp(active, { modelName: 'active', extraModels: { other } });

        app.displayed = active.view([0, 1, 2]);
        app.selected = other.view([0, 1, 2, 3, 4]);

        const intf = makeInterface(app, {
            files_mode: 'tables',
            files_seltype: 'ms',
            ms_references: REFS,
        });

        // Three rows from the active model, not five from the stale one.
        const rows = intf.generateFile().split('\n').filter(l => /^(Si|O)_/.test(l));
        expect(rows.length).toBe(3);
    });
});
