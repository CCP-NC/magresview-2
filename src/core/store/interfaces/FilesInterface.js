/**
 * MagresView 2.0
 *
 * Export Interface (rebuilt on the unified SpinSystem model).
 * Handles report tables and spin system simulator exports (SIMPSON, mrsimulator).
 */

import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { makeSelector, BaseInterface, referencingGradient } from '../utils';
import {
    Site,
    buildSpinSystem,
    generateReportTable,
    toSimpson,
    toSimpsonSplitZip,
    toMrsimulator,
    crossTermsApply,
    getSimplificationWarnings,
    MAX_SPINSYS_COUPLED_ATOMS,
} from '../../nmr';

const initialFilesState = {
    files_mode: 'tables', // 'tables' | 'spinsys'
    files_seltype: 'ms',  // 'ms' | 'efg' | 'dip' | 'isc'
    files_spinsys_target: 'simpson', // 'simpson' | 'mrsimulator'
    files_spinsys_scope: 'system', // 'system' (one coupled file) | 'site' (one per site)
    files_includeMS: true,
    files_includeEFG: true,
    files_includeD: false, // off by default for spinsys
    files_includeJ: false, // off by default for spinsys
    files_includeEuler: false, // for report tables
    files_includeAngles: true, // for simulator export
    files_msIsotropic: false,
    files_quadrupole_order: 2, // 1 | 2; EFG unticked is what turns it off
    files_mergeByLabel: false, // If true, keep only the first site of each label
    files_averageGroups: '',
    files_observedNucleus: '',
    files_dipolarCutoff: null,
    files_dipolarHomonuclear: false,
    files_fileFormat: 'csv', // 'csv' | 'fixed' | 'tsv'
    files_tabWidth: 16,      // Width for fixed-width format
    files_precision: 5,      // Decimal places
};

class FilesInterface extends BaseInterface {

    get mode() {
        return this.state.files_mode || 'tables';
    }

    set mode(v) {
        this.dispatch({
            type: 'set',
            key: 'files_mode',
            value: v,
        });
    }

    get fileType() {
        return this.state.files_seltype;
    }

    set fileType(v) {
        this.dispatch({
            type: 'set',
            key: 'files_seltype',
            value: v,
        });
    }

    get spinsysTarget() {
        return this.state.files_spinsys_target || 'simpson';
    }

    set spinsysTarget(v) {
        this.dispatch({
            type: 'set',
            key: 'files_spinsys_target',
            value: v,
        });
    }

    /**
     * Whether we are exporting one coupled system or one isolated site at a time.
     *
     * This is the first choice the user makes in spin system mode because it
     * decides which of the other options can mean anything: an isolated site
     * has nothing to couple to and no relative orientation to preserve.
     *
     * @return {string} 'system' | 'site'
     */
    get spinsysScope() {
        return this.state.files_spinsys_scope || 'system';
    }

    set spinsysScope(v) {
        this.dispatch({
            type: 'set',
            key: 'files_spinsys_scope',
            value: v,
        });
    }

    get perSite() {
        return this.mode === 'spinsys' && this.spinsysScope === 'site';
    }

    /**
     * Per-site SIMPSON export is a ZIP of one .spinsys per site, because a
     * .spinsys file holds exactly one system. mrsimulator represents
     * independent sites natively, so it stays a single JSON either way.
     */
    get isZipExport() {
        return this.perSite && this.spinsysTarget === 'simpson';
    }

    get fileName() {
        const app = this.state.app_viewer;
        const mname = app?.modelName || 'model';

        if (this.mode === 'spinsys') {
            if (this.spinsysTarget === 'mrsimulator') {
                return `${mname}_spinsys.json`;
            }
            return this.perSite ? `${mname}_spinsys.zip` : `${mname}.spinsys`;
        }

        const type = this.fileType;
        const ext = this.fileFormat === 'fixed' ? 'txt' : this.fileFormat;
        return `mvtable_${mname}_${type}.${ext}`;
    }

    get mimeType() {
        if (this.isZipExport) return 'application/zip';
        if (this.mode === 'spinsys' && this.spinsysTarget === 'mrsimulator') return 'application/json';
        if (this.mode === 'tables' && this.fileFormat === 'csv') return 'text/csv';
        return 'text/plain';
    }

    get hasMSData() {
        const app = this.state.app_viewer;
        return Boolean(app?.model?.hasArray('ms'));
    }

    get hasEFGData() {
        const app = this.state.app_viewer;
        return Boolean(app?.model?.hasArray('efg'));
    }

    /**
     * Whether the current selection contains at least one quadrupole-active nucleus
     * (spin > 1/2 with an EFG tensor in the model).
     */
    get hasQuadrupolarNuclei() {
        if (!this.hasEFGData) return false;
        const sites = this.spinSystem?.sites;
        if (!sites || sites.length === 0) return false;
        return sites.some(s => s.isQuadrupoleActive);
    }

    get hasISCData() {
        const app = this.state.app_viewer;
        return Boolean(app?.model?.hasArray('isc'));
    }

    get hasCIFLabels() {
        const app = this.state.app_viewer;
        return Boolean(app?.model?._has_cif_labels);
    }

    get includeMS() {
        return this.state.files_includeMS;
    }

    set includeMS(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeMS',
            value: v,
        });
    }

    get includeEFG() {
        return !this.hasQuadrupolarNuclei ? false : this.state.files_includeEFG;
    }

    set includeEFG(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeEFG',
            value: v,
        });
    }

    /**
     * Couplings are meaningless in per-site scope, so they read as off there
     * rather than being merely hidden. Everything downstream — the coupling
     * cost guard, the warnings, the writers — then agrees without each having
     * to know about the scope switch.
     */
    get includeD() {
        return this.perSite ? false : this.state.files_includeD;
    }

    set includeD(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeD',
            value: v,
        });
    }

    get includeJ() {
        return (this.perSite || !this.hasISCData) ? false : this.state.files_includeJ;
    }

    set includeJ(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeJ',
            value: v,
        });
    }

    get includeEuler() {
        return this.state.files_includeEuler;
    }

    set includeEuler(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeEuler',
            value: v,
        });
    }

    get includeAngles() {
        return this.state.files_includeAngles ?? true;
    }

    set includeAngles(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeAngles',
            value: v,
        });
    }

    /**
     * Second-order cross-terms are derived, never chosen.
     *
     * They are second-order objects, so they only belong with a second-order
     * quadrupole; and SIMPSON hard-errors on a quadrupole_x_* line whose
     * nucleus has no quadrupole line, which is what an independent checkbox
     * used to let the user produce.
     */
    get includeCrossTerms() {
        return crossTermsApply(this.includeEFG, this.spinSysQuadrupoleOrder);
    }

    get msIsotropic() {
        return this.state.files_msIsotropic ?? false;
    }

    set msIsotropic(v) {
        this.dispatch({
            type: 'set',
            key: 'files_msIsotropic',
            value: v,
        });
    }

    get spinSysQuadrupoleOrder() {
        return this.state.files_quadrupole_order ?? 2;
    }

    set spinSysQuadrupoleOrder(v) {
        this.dispatch({
            type: 'set',
            key: 'files_quadrupole_order',
            value: v,
        });
    }

    /**
     * Order actually written. The EFG checkbox is the on/off switch, so
     * unticking it means order 0 rather than a separate "0 (off)" entry in
     * the order dropdown.
     */
    get effectiveQuadrupoleOrder() {
        return this.includeEFG ? this.spinSysQuadrupoleOrder : 0;
    }

    get mergeByLabel() {
        return this.state.files_mergeByLabel;
    }

    set mergeByLabel(v) {
        this.dispatch({
            type: 'set',
            key: 'files_mergeByLabel',
            value: v,
        });
    }

    get averageGroups() {
        return this.state.files_averageGroups || '';
    }

    set averageGroups(v) {
        this.dispatch({
            type: 'set',
            key: 'files_averageGroups',
            value: v,
        });
    }

    get observedNucleus() {
        return this.state.files_observedNucleus || '';
    }

    set observedNucleus(v) {
        this.dispatch({
            type: 'set',
            key: 'files_observedNucleus',
            value: v,
        });
    }

    get dipolarCutoff() {
        return this.state.files_dipolarCutoff;
    }

    set dipolarCutoff(v) {
        this.dispatch({
            type: 'set',
            key: 'files_dipolarCutoff',
            value: v,
        });
    }

    get dipolarHomonuclear() {
        return this.state.files_dipolarHomonuclear ?? false;
    }

    set dipolarHomonuclear(v) {
        this.dispatch({
            type: 'set',
            key: 'files_dipolarHomonuclear',
            value: v,
        });
    }

    /**
     * Referencing gradients, owned by the MS tab alongside the references
     * themselves. Export reads them; it does not keep its own copy, because a
     * file whose shifts disagree with the labels on screen would be worse than
     * useless.
     *
     * Coerced to numbers here: the state holds raw text from the input field,
     * so intermediate values like "-" must not reach the builder as NaN.
     */
    get gradients() {
        const raw = this.state.ms_gradients || {};
        const out = {};
        for (const el of Object.keys(raw)) {
            out[el] = referencingGradient(raw, el);
        }
        return out;
    }

    gradientFor(element) {
        return referencingGradient(this.state.ms_gradients, element);
    }

    get fileFormat() {
        return this.state.files_fileFormat;
    }

    set fileFormat(v) {
        this.dispatch({
            type: 'set',
            key: 'files_fileFormat',
            value: v,
        });
    }

    get tabWidth() {
        return this.state.files_tabWidth;
    }

    set tabWidth(v) {
        this.dispatch({
            type: 'set',
            key: 'files_tabWidth',
            value: v,
        });
    }

    get precision() {
        return this.state.files_precision;
    }

    set precision(v) {
        this.dispatch({
            type: 'set',
            key: 'files_precision',
            value: v,
        });
    }

    /**
     * Whether the current settings actually ask for pairwise couplings.
     * Everything else about a spin system is per-site and effectively free.
     */
    get couplingsRequested() {
        return this.includeD || this.includeJ;
    }

    /**
     * Why we can or cannot build a spin system from the current selection.
     *
     * Spin system export works on an explicit selection only. There is no
     * fall back to "everything displayed": that is how a whole supercell used
     * to end up in an O(N^2) dipolar coupling loop on every render.
     *
     * Note that size only disqualifies a selection when couplings are wanted.
     * Sites are cheap at any N, so a large selection is still fine for the
     * split archive and for per-site tables.
     *
     * @return {string} 'valid' | 'no_model' | 'none' | 'model_mismatch'
     *                  | 'couplings_too_large'
     */
    get selectionStatus() {
        const app = this.state.app_viewer;
        if (!app || !app.model) return 'no_model';

        const sel = app.selected;
        if (!sel || sel.length === 0) return 'none';

        // A ModelView carries the model it was cut from. Switching models can
        // leave one of these behind pointing at the model we just left.
        if (sel.model !== app.model) return 'model_mismatch';

        if (this.couplingsRequested && sel.length > MAX_SPINSYS_COUPLED_ATOMS) {
            return 'couplings_too_large';
        }

        return 'valid';
    }

    get hasValidSelection() {
        return this.selectionStatus === 'valid';
    }

    /**
     * Whether we have a usable selection at all, couplings aside. True for the
     * oversized case, because sites are still buildable there.
     */
    get hasUsableSelection() {
        const status = this.selectionStatus;
        return status === 'valid' || status === 'couplings_too_large';
    }

    get selectedCount() {
        const app = this.state.app_viewer;
        return app?.selected?.length || 0;
    }

    /**
     * Largest selection we will compute couplings for, for UI copy.
     */
    get maxCoupledAtoms() {
        return MAX_SPINSYS_COUPLED_ATOMS;
    }

    /**
     * How average groups enter the spin system. SIMPSON keeps every member as a
     * spin with jump-averaged tensors, which only makes sense in one coupled
     * file. mrsimulator cannot represent coupled equivalent spins, and report
     * tables and per-site files have no couplings, so they get one site per group.
     */
    get averageGroupMode() {
        return this.spinsysTarget === 'simpson' && !this.perSite ? 'expand' : 'collapse';
    }

    /**
     * Build a SpinSystem from a view. Shared by spin system export, the split
     * archive and the report tables, which differ only in which couplings they
     * ask for.
     */
    _buildSystem(view, { includeD, includeJ, averageGroupMode = this.averageGroupMode }) {
        const app = this.state.app_viewer;
        const mname = app.modelName || 'model';
        const sourceInfo = app._model_sources?.[mname];
        const sourceFilename = sourceInfo?.fileName
            || (sourceInfo?.extension ? `${mname}.${sourceInfo.extension}` : `${mname}.magres`);

        return buildSpinSystem(view, {
            references: this.state.ms_references || {},
            gradients: this.gradients,
            includeD,
            includeJ,
            dipolarCutoff: this.dipolarCutoff,
            dipolarHomonuclear: this.dipolarHomonuclear,
            mergeByLabel: this.mergeByLabel,
            averageGroups: this.averageGroups,
            averageGroupMode,
            sourceFilename,
            mergedFrom: sourceInfo?.mergedFrom || null,
            modelName: mname,
        });
    }

    /**
     * The spin system behind the panel readout and the single-file export.
     *
     * Built for any usable selection, however large, because that is what
     * feeds the isotope list and the shielding reference check. Couplings are
     * included only when they are both wanted and affordable; past the cap the
     * sites are still here, and it is fileValid that withholds the single-file
     * export rather than this getter returning nothing.
     *
     * Report tables and the split archive do not come through here. They build
     * their own systems on demand, so neither pays for couplings it will throw
     * away.
     *
     * Cached per interface instance. useFilesInterface() constructs a fresh
     * instance on every render, so this memoises within a render and no
     * further: do not hold an instance across dispatches.
     */
    get spinSystem() {
        if (this._spinSystem !== undefined) return this._spinSystem;

        const withCouplings = this.selectionStatus === 'valid';

        this._spinSystem = this.hasUsableSelection
            ? this._buildSystem(this.state.app_viewer.selected, {
                includeD: withCouplings && this.includeD,
                includeJ: withCouplings && this.includeJ,
            })
            : null;

        return this._spinSystem;
    }

    get missingReferences() {
        return this.spinSystem?.missingReferences || [];
    }

    get warnings() {
        return this.spinSystem?.warnings || [];
    }

    get dimension() {
        return this.spinSystem?.dimension || 1;
    }

    get spinHalfEquivalent() {
        return this.spinSystem?.spinHalfEquivalent || 0;
    }

    get siteCount() {
        return this.spinSystem?.sites.length || 0;
    }

    /**
     * Dimension of the biggest single site.
     *
     * In per-site scope this, not the product over every site, is what each
     * file costs to simulate. Reporting 6e7 for a job that is really a few
     * thousand two-level problems is worse than reporting nothing.
     */
    get largestSiteDimension() {
        const sites = this.spinSystem?.sites || [];
        if (sites.length === 0) return 1;
        return Math.max(...sites.map(s => 2 * (s.spin ?? 0.5) + 1));
    }

    get feasibility() {
        if (this.spinsysTarget === 'mrsimulator') {
            return this.spinSystem?.mrsimulatorFeasibility || 'silent';
        }
        return this.spinSystem?.feasibility || 'silent';
    }

    get availableIsotopes() {
        return this.spinSystem?.isotopes || [];
    }

    /**
     * The full set of choices behind an export, in one object.
     *
     * Passed to the writers so the file header can state exactly what was
     * asked for, and to getSimplificationWarnings so the panel and the file
     * agree on the caveats.
     */
    get exportSettings() {
        return {
            scope: this.spinsysScope,
            target: this.spinsysTarget,
            includeMS: this.includeMS,
            includeEFG: this.includeEFG,
            includeD: this.includeD,
            includeJ: this.includeJ,
            quadrupoleOrder: this.effectiveQuadrupoleOrder,
            includeCrossTerms: this.includeCrossTerms,
            includeAngles: this.includeAngles,
            msIsotropic: this.msIsotropic,
            mergeByLabel: this.mergeByLabel,
            averageGroups: this.averageGroups,
            observedNucleus: this.observedNucleus,
            dipolarHomonuclear: this.dipolarHomonuclear,
        };
    }

    /**
     * Warnings about the current combination of system and settings, shown in
     * the panel and written into the exported file.
     */
    get simplificationWarnings() {
        const sys = this.spinSystem;
        if (!sys) return [];
        return [
            ...getSimplificationWarnings(sys, this.exportSettings),
            ...(sys.warnings || []).map(text => ({ level: 'notice', text })),
        ];
    }

    get fileValid() {
        const app = this.state.app_viewer;
        if (!app || !app.model) return false;

        if (this.mode === 'tables') {
            switch (this.fileType) {
                case 'ms':
                    return this.hasMSData;
                case 'efg':
                    return this.hasEFGData;
                case 'dip':
                    return true;
                case 'isc':
                    return this.hasISCData;
                default:
                    return false;
            }
        }

        // A full spin system is one coupled system, so if couplings were asked
        // for and we refused to compute them, the file would quietly be wrong.
        // Withhold it rather than export something incomplete. Per-site export
        // has no couplings by construction, so the cap does not apply and a few
        // thousand sites remain perfectly exportable.
        if (!this.perSite && this.selectionStatus !== 'valid') return false;
        if (this.perSite && !this.hasUsableSelection) return false;

        const sys = this.spinSystem;
        if (!sys) return false;

        // Hard block if missing shielding reference (ADR-0010)
        if (!sys.canExport) return false;

        // Must have at least one active tensor or coupling
        const hasContent =
            (this.hasMSData && this.includeMS) ||
            (this.hasEFGData && this.includeEFG) ||
            this.includeD ||
            (this.hasISCData && this.includeJ);

        return hasContent;
    }

    generateFile() {
        const app = this.state.app_viewer;
        if (!app || !app.model) return null;

        if (this.mode === 'tables') {
            // Tables keep the old behaviour: no selection means every displayed
            // atom. That is affordable here because we only build on save, not
            // on every render.
            let view = app.selected;
            if (!view || view.length === 0 || view.model !== app.model) {
                view = app.displayed;
            }
            if (!view) return null;

            const tableSys = this._buildSystem(view, {
                includeD: this.fileType === 'dip',
                includeJ: this.fileType === 'isc',
            });

            const multiplicity = view?.unique_labels_multiplicity || {};
            return generateReportTable(tableSys, this.fileType, {
                tabWidth: this.tabWidth,
                precision: this.precision,
                format: this.fileFormat,
                includeEuler: this.includeEuler,
                eulerConvention: this.state.eul_convention || 'zyz',
                mergeByLabel: this.mergeByLabel,
                multiplicity,
            });
        }

        // Per-site SIMPSON export is a ZIP of single-site files.
        if (this.isZipExport) return this.generateSplitZip();

        const sys = this.spinSystem;
        if (!sys) return null;

        const settings = this.exportSettings;

        if (this.spinsysTarget === 'mrsimulator') {
            const data = toMrsimulator(sys, {
                include_ms: this.includeMS,
                include_efg: this.includeEFG,
                include_dip: this.includeD,
                include_j: this.includeJ,
                include_angles: this.includeAngles,
                ms_isotropic: this.msIsotropic,
                settings,
            });
            return JSON.stringify(data, null, 2);
        }

        return toSimpson(sys, {
            observed_nucleus: this.observedNucleus || null,
            q_order: this.effectiveQuadrupoleOrder,
            include_ms: this.includeMS,
            include_efg: this.includeEFG,
            include_dip: this.includeD,
            include_j: this.includeJ,
            include_angles: this.includeAngles,
            ms_isotropic: this.msIsotropic,
            precision: this.precision,
            filename: this.fileName,
            settings,
        });
    }

    generateSplitZip() {
        const app = this.state.app_viewer;
        if (!app || !app.model) return null;
        if (!this.hasUsableSelection) return null;

        // Every file in the archive holds a single site, and toSimpsonSplitZip
        // drops couplings anyway, so never pay for the pairwise loop here.
        const sys = this._buildSystem(app.selected, { includeD: false, includeJ: false });

        const mname = app.modelName || 'model';
        return toSimpsonSplitZip(sys, mname, {
            observed_nucleus: this.observedNucleus || null,
            q_order: this.effectiveQuadrupoleOrder,
            include_ms: this.includeMS,
            include_efg: this.includeEFG,
            include_angles: this.includeAngles,
            ms_isotropic: this.msIsotropic,
            precision: this.precision,
            settings: { ...this.exportSettings, scope: 'site' },
        });
    }

    /**
     * Generate the preview text for the current export configuration.
     * Unlike generateFile() which produces a Uint8Array ZIP for per-site SIMPSON,
     * this always returns a human-readable text string suitable for live modal display.
     *
     * @return {string} Generated file content or explanatory placeholder text
     */
    generatePreviewText() {
        const app = this.state.app_viewer;
        if (!app || !app.model) {
            return '# No model loaded.';
        }

        if (this.mode === 'tables') {
            let view = app.selected;
            if (!view || view.length === 0 || view.model !== app.model) {
                view = app.displayed;
            }
            if (!view) return '# No atoms displayed or selected.';

            const tableSys = this._buildSystem(view, {
                includeD: this.fileType === 'dip',
                includeJ: this.fileType === 'isc',
            });

            return generateReportTable(tableSys, this.fileType, {
                tabWidth: this.tabWidth,
                precision: this.precision,
                format: this.fileFormat,
                includeEuler: this.includeEuler,
                mergeByLabel: this.mergeByLabel,
            });
        }

        // spinsys mode
        if (!this.hasUsableSelection) {
            return '# No atoms selected.\n# Select the atoms you want in the spin system to see the generated output.';
        }

        if (this.selectionStatus === 'model_mismatch') {
            return '# Selection belongs to a different model.\n# Select atoms in the currently active model.';
        }

        if (this.missingReferences.length > 0) {
            return (
                `# Export blocked (ADR-0010):\n` +
                `# Missing shielding reference for element(s): ${this.missingReferences.join(', ')}.\n` +
                `# Set references in the MS tab to generate chemical shifts.`
            );
        }

        if (!this.perSite && this.selectionStatus === 'couplings_too_large') {
            return (
                `# Couplings too large:\n` +
                `# ${this.selectedCount} atoms selected exceeds the ${this.maxCoupledAtoms}-atom limit for computing couplings.\n` +
                `# Turn couplings off or switch to 'One file per site' to simulate.`
            );
        }

        // Per-site SIMPSON preview: generate the .spinsys text for each site
        if (this.isZipExport) {
            const sys = this._buildSystem(app.selected, { includeD: false, includeJ: false });
            if (!sys || !sys.canExport) return '# Cannot generate spin system.';

            const mname = app.modelName || 'model';
            const options = {
                observed_nucleus: this.observedNucleus || null,
                q_order: this.effectiveQuadrupoleOrder,
                include_ms: this.includeMS,
                include_efg: this.includeEFG,
                include_angles: this.includeAngles,
                ms_isotropic: this.msIsotropic,
                precision: this.precision,
                settings: { ...this.exportSettings, scope: 'site' },
            };

            const sites = sys.sites || [];
            if (sites.length === 0) return '# No sites to export.';

            const files = [];
            for (let i = 0; i < sites.length; i++) {
                const origSite = sites[i];
                const isolatedSite = new Site({ ...origSite, index: 0 });
                const singleSys = {
                    sites: [isolatedSite],
                    couplings: [],
                    warnings: [],
                    missingReferences: [],
                    canExport: true,
                    metadata: {
                        ...sys.metadata,
                        exportedIndices: origSite.atomIndices || [],
                        sites: [{
                            siteIndex: 0,
                            label: origSite.label,
                            isotope: origSite.isotope,
                            element: origSite.element,
                            atomIndices: origSite.atomIndices || [],
                            position: origSite.position,
                            isAverageGroup: Boolean(origSite.isAverageGroup),
                            averageGroupPattern: origSite.averageGroupPattern || null,
                            reference: origSite.reference,
                            gradient: origSite.gradient,
                        }],
                    },
                    dimension: 2 * (isolatedSite.spin ?? 0.5) + 1,
                    spinHalfEquivalent: Math.log2(2 * (isolatedSite.spin ?? 0.5) + 1),
                };

                const safeLabel = origSite.label.replace(/[^a-zA-Z0-9_-]/g, '_');
                const filename = `${mname}_${safeLabel}.spinsys`;
                const content = toSimpson(singleSys, {
                    ...options,
                    filename,
                    include_dip: false,
                    include_j: false,
                    settings: { ...(options.settings || {}), scope: 'site' },
                });

                if (sites.length > 1) {
                    files.push(
                        `# ==============================================================================\n` +
                        `# Archive file ${i + 1} of ${sites.length}: ${filename}\n` +
                        `# ==============================================================================\n\n` +
                        content
                    );
                } else {
                    files.push(content);
                }
            }
            return files.join('\n\n');
        }

        const sys = this.spinSystem;
        if (!sys) return '# Cannot build spin system.';

        const settings = this.exportSettings;

        if (this.spinsysTarget === 'mrsimulator') {
            const data = toMrsimulator(sys, {
                include_ms: this.includeMS,
                include_efg: this.includeEFG,
                include_dip: this.includeD,
                include_j: this.includeJ,
                include_angles: this.includeAngles,
                ms_isotropic: this.msIsotropic,
                settings,
            });
            return JSON.stringify(data, null, 2);
        }

        return toSimpson(sys, {
            observed_nucleus: this.observedNucleus || null,
            q_order: this.effectiveQuadrupoleOrder,
            include_ms: this.includeMS,
            include_efg: this.includeEFG,
            include_dip: this.includeD,
            include_j: this.includeJ,
            include_angles: this.includeAngles,
            ms_isotropic: this.msIsotropic,
            precision: this.precision,
            filename: this.fileName,
            settings,
        });
    }
}

// Hook for interface
function useFilesInterface() {
    const state = useSelector(
        makeSelector('files', [
            'app_viewer',
            'app_default_displayed',
            'eul_convention',
            'ms_references',
            'ms_gradients',
            // app_viewer is a stable mutable instance, so a selection change
            // is invisible to shallowEqual unless we watch the view itself.
            // Without this, selectionStatus never refreshes and the panel goes
            // on claiming nothing is selected.
            'sel_selected_view',
        ]),
        shallowEqual
    );
    const dispatcher = useDispatch();
    return new FilesInterface(state, dispatcher);
}

export default useFilesInterface;
export { initialFilesState, FilesInterface };
