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

const PER_SITE = { files_mode: 'spinsys', files_spinsys_scope: 'site' };

describe('FilesInterface per-site export', () => {

    it('exports a site per file for a selection far past the coupling cap', () => {
        // The point of per-site scope: thousands of individually simulated
        // sites, none of which couple to anything.
        const model = loadQuartz('quartz', { supercell: [3, 3, 3] });
        const app = makeApp(model);
        app.selected = model.all;

        const intf = makeInterface(app, {
            ...PER_SITE,
            files_includeD: true,
            ms_references: REFS,
        });

        expect(app.selected.length).toBeGreaterThan(MAX_SPINSYS_COUPLED_ATOMS);
        expect(intf.fileValid).toBe(true);
        expect(intf.isZipExport).toBe(true);
        expect(intf.fileName).toBe('quartz_spinsys.zip');
        expect(intf.generateFile()).toBeInstanceOf(Uint8Array);
    });

    it('reads couplings as off, whatever the checkboxes say', () => {
        // An isolated site has nothing to couple to, so the scope decides and
        // the cost guard, the warnings and the writers all agree without each
        // having to special-case it.
        const model = loadQuartz('quartz', { supercell: [3, 3, 3] });
        const app = makeApp(model);
        app.selected = model.all;

        const intf = makeInterface(app, {
            ...PER_SITE,
            files_includeD: true,
            files_includeJ: true,
            ms_references: REFS,
        });

        expect(intf.includeD).toBe(false);
        expect(intf.includeJ).toBe(false);
        expect(intf.couplingsRequested).toBe(false);
        expect(intf.selectionStatus).toBe('valid');
    });

    it('forces includeJ to false when the file carries no ISC data', () => {
        const model = loadQuartz('quartz'); // quartz has MS and EFG, but no ISC
        const app = makeApp(model);
        app.selected = model.view([0, 1]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_spinsys_scope: 'system',
            files_includeJ: true,
            ms_references: REFS,
        });

        expect(intf.hasISCData).toBe(false);
        expect(intf.includeJ).toBe(false);
    });

    it('forces includeEFG to false when selection has no quadrupolar nuclei', () => {
        const model = loadQuartz('quartz'); // quartz has MS and EFG
        const app = makeApp(model);
        // Atoms 0 and 1 are 29Si (spin 1/2), so no quadrupolar nuclei in selection
        app.selected = model.view([0, 1]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_spinsys_scope: 'system',
            files_includeEFG: true,
            ms_references: REFS,
        });

        expect(intf.hasEFGData).toBe(true);
        expect(intf.hasQuadrupolarNuclei).toBe(false);
        expect(intf.includeEFG).toBe(false);
    });

    it('enables includeEFG when selection has quadrupolar nuclei', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        // Atom 3 is 17O (spin 5/2, quadrupolar)
        app.selected = model.view([0, 3]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_spinsys_scope: 'system',
            files_includeEFG: true,
            ms_references: REFS,
        });

        expect(intf.hasEFGData).toBe(true);
        expect(intf.hasQuadrupolarNuclei).toBe(true);
        expect(intf.includeEFG).toBe(true);
    });

    it('never computes couplings, even under the cap', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, {
            ...PER_SITE,
            files_includeD: true,
            ms_references: REFS,
        });

        const spy = vi.spyOn(intf, '_buildSystem');
        intf.generateFile();

        expect(spy).toHaveBeenCalledWith(
            app.selected,
            { includeD: false, includeJ: false }
        );
    });

    it('is unavailable without a selection', () => {
        const model = loadQuartz('quartz');
        const intf = makeInterface(makeApp(model), PER_SITE);

        expect(intf.fileValid).toBe(false);
        expect(intf.generateSplitZip()).toBe(null);
    });

    it('is unavailable when a shielding reference is missing', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, { ...PER_SITE, ms_references: {} });

        expect(intf.fileValid).toBe(false);
    });
});

describe('FilesInterface quadrupole and cross-terms', () => {

    function quartzInterface(extra = {}) {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        // Two Si and an O: quartz O is 17O, spin 5/2, so quadrupole-active.
        app.selected = model.view([0, 1, 3]);
        return makeInterface(app, { files_mode: 'spinsys', ms_references: REFS, ...extra });
    }

    it('derives cross-terms from second-order quadrupole', () => {
        expect(quartzInterface({ files_quadrupole_order: 2 }).includeCrossTerms).toBe(true);
    });

    it('withholds cross-terms at first order', () => {
        // Second-order objects do not belong with a first-order quadrupole.
        // SIMPSON applies them anyway and silently returns a different answer.
        expect(quartzInterface({ files_quadrupole_order: 1 }).includeCrossTerms).toBe(false);
    });

    it('withholds cross-terms when EFG is unticked', () => {
        // A quadrupole_x_* line whose nucleus has no quadrupole line is a fatal
        // SIMPSON error, which the old independent checkbox let users produce.
        const intf = quartzInterface({ files_includeEFG: false });

        expect(intf.includeCrossTerms).toBe(false);
        expect(intf.effectiveQuadrupoleOrder).toBe(0);
        expect(intf.generateFile()).not.toContain('quadrupole_x_');
    });

    it('writes cross-terms alongside the quadrupole lines they depend on', () => {
        const out = quartzInterface({ files_includeEFG: true, files_includeD: true }).generateFile();

        expect(out).toContain('quadrupole_x_shift');
        // Every cross-term index must name a nucleus that emitted a quadrupole.
        const quadrupoles = new Set(
            [...out.matchAll(/^quadrupole (\d+) /gm)].map(m => m[1])
        );
        for (const m of out.matchAll(/^quadrupole_x_(?:shift|dipole) (\d+)/gm)) {
            expect(quadrupoles.has(m[1])).toBe(true);
        }
    });
});

describe('FilesInterface referencing gradient', () => {

    it('defaults to -1 and reports it in the header', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, { files_mode: 'spinsys', ms_references: REFS });

        expect(intf.gradientFor('Si')).toBe(-1.0);
        expect(intf.generateFile()).toContain('Si: reference = 300 ppm, gradient = -1');
    });

    it('reads the gradient the MS tab owns, not a copy of its own', () => {
        // One calibration everywhere. A file whose shifts disagree with the
        // labels on screen would be worse than useless.
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0, 1, 2]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            ms_references: REFS,
            ms_gradients: { Si: '-0.9' },
        });

        expect(intf.gradientFor('Si')).toBe(-0.9);
        const out = intf.generateFile();
        expect(out).toContain('gradient is d(shift)/d(shielding)');
        expect(out).toContain('Si: reference = 300 ppm, gradient = -0.9');
    });

    it('applies the gradient to the shift it writes', () => {
        const model = loadQuartz('quartz');
        const app = makeApp(model);
        app.selected = model.view([0]);

        const shiftOf = (gradients) => {
            const intf = makeInterface(app, { files_mode: 'spinsys', ms_references: REFS, ms_gradients: gradients });
            return intf.spinSystem.sites[0].shift_iso;
        };

        const sigma = makeInterface(app, { files_mode: 'spinsys', ms_references: REFS })
            .spinSystem.sites[0].ms.isotropy;

        expect(shiftOf({})).toBeCloseTo(300 - sigma, 8);
        expect(shiftOf({ Si: '-0.5' })).toBeCloseTo(300 - 0.5 * sigma, 8);
    });

    it('falls back to -1 rather than NaN while the field is mid-edit', () => {
        const intf = makeInterface(null, { ms_gradients: { Si: '-' } });

        expect(intf.gradientFor('Si')).toBe(-1.0);
        expect(intf.gradients.Si).toBe(-1.0);
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

describe('FilesInterface generatePreviewText', () => {

    it('returns prompt when no atoms are selected', () => {
        const model = loadQuartz();
        const app = makeApp(model);
        const intf = makeInterface(app, { files_mode: 'spinsys' });

        expect(intf.generatePreviewText()).toContain('No atoms selected');
    });

    it('returns preview string for valid coupled SIMPSON spin system', () => {
        const model = loadQuartz();
        const app = makeApp(model);
        app.selected = model.view([0, 1]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_spinsys_target: 'simpson',
            ms_references: REFS,
        });

        const preview = intf.generatePreviewText();
        expect(preview).toContain('# SIMPSON spin system generated by MagresView 2');
        expect(preview).toContain('spinsys {');
        expect(preview).toContain('nuclei 29Si 29Si');
    });

    it('returns preview JSON for mrsimulator target', () => {
        const model = loadQuartz();
        const app = makeApp(model);
        app.selected = model.view([0, 1]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_spinsys_target: 'mrsimulator',
            ms_references: REFS,
        });

        const preview = intf.generatePreviewText();
        expect(preview).toContain('"sites"');
        expect(preview).toContain('"couplings"');
    });

    it('returns text for per-site SIMPSON archive preview', () => {
        const model = loadQuartz();
        const app = makeApp(model);
        app.selected = model.view([0, 1]);

        const intf = makeInterface(app, {
            files_mode: 'spinsys',
            files_spinsys_scope: 'site',
            files_spinsys_target: 'simpson',
            ms_references: REFS,
        });

        const preview = intf.generatePreviewText();
        expect(preview).toContain('Archive file 1 of 2');
        expect(preview).toContain('spinsys {');
    });
});

describe('FilesInterface average groups', () => {
    function ethanolApp() {
        const text = fs.readFileSync(path.join(__dirname, '../../nmr/__fixtures__/ethanol.magres'), 'utf-8');
        const s = new Loader().load(text, 'magres', 'ethanol');
        const model = new Model(s['ethanol'], { useNMRActiveIsotopes: true });
        const app = makeApp(model, { modelName: 'ethanol' });
        app.selected = model.view(model.atoms.map(a => a.index));
        return app;
    }

    const base = {
        files_mode: 'spinsys',
        files_averageGroups: 'CH3',
        ms_references: { H: 30.0, C: 180.0, O: 200.0 },
    };

    it('keeps every methyl spin for a SIMPSON system file', () => {
        const intf = makeInterface(ethanolApp(), { ...base, files_spinsys_target: 'simpson' });

        expect(intf.averageGroupMode).toBe('expand');
        expect(intf.spinSystem.sites.length).toBe(9);
    });

    it('collapses the group for mrsimulator and says what is lost', () => {
        const intf = makeInterface(ethanolApp(), { ...base, files_spinsys_target: 'mrsimulator', files_includeD: true });

        expect(intf.averageGroupMode).toBe('collapse');
        expect(intf.spinSystem.sites.length).toBe(7);
        const warning = intf.simplificationWarnings.find(w => /cannot represent coupled equivalent spins/.test(w.text));
        expect(warning.level).toBe('warning');
    });
});
