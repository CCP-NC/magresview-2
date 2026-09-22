/**
 * MagresView 2.0
 *
 * Export Interface (rebuilt on the unified SpinSystem model).
 * Handles report tables and spin system simulator exports (SIMPSON, mrsimulator).
 */

import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { makeSelector, BaseInterface } from '../utils';
import {
    buildSpinSystem,
    generateReportTable,
    toSimpson,
    toSimpsonSplitZip,
    toMrsimulator,
    MAX_SPINSYS_COUPLED_ATOMS,
} from '../../nmr';

const initialFilesState = {
    files_mode: 'tables', // 'tables' | 'spinsys'
    files_seltype: 'ms',  // 'ms' | 'efg' | 'dip' | 'isc'
    files_spinsys_target: 'simpson', // 'simpson' | 'mrsimulator'
    files_includeMS: true,
    files_includeEFG: true,
    files_includeD: false, // off by default for spinsys
    files_includeJ: false, // off by default for spinsys
    files_includeEuler: false, // for report tables
    files_includeAngles: true, // for simulator export
    files_includeCrossTerms: true,
    files_msIsotropic: false,
    files_quadrupole_order: 2,
    files_mergeByLabel: false, // If true, merge results for all sites with the same label
    files_averageGroups: '',
    files_observedNucleus: '',
    files_dipolarCutoff: null,
    files_dipolarHomonuclear: false,
    files_gradients: {},
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

    get fileName() {
        const app = this.state.app_viewer;
        const mname = app?.modelName || 'model';

        if (this.mode === 'spinsys') {
            if (this.spinsysTarget === 'mrsimulator') {
                return `${mname}_spinsys.json`;
            }
            return `${mname}.spinsys`;
        }

        const type = this.fileType;
        const ext = this.fileFormat === 'fixed' ? 'txt' : this.fileFormat;
        return `mvtable_${mname}_${type}.${ext}`;
    }

    get splitFileName() {
        const app = this.state.app_viewer;
        const mname = app?.modelName || 'model';
        return `${mname}_spinsys.zip`;
    }

    get hasMSData() {
        const app = this.state.app_viewer;
        return Boolean(app?.model?.hasArray('ms'));
    }

    get hasEFGData() {
        const app = this.state.app_viewer;
        return Boolean(app?.model?.hasArray('efg'));
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
        return this.state.files_includeEFG;
    }

    set includeEFG(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeEFG',
            value: v,
        });
    }

    get includeD() {
        return this.state.files_includeD;
    }

    set includeD(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeD',
            value: v,
        });
    }

    get includeJ() {
        return this.state.files_includeJ;
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

    get includeCrossTerms() {
        return this.state.files_includeCrossTerms ?? true;
    }

    set includeCrossTerms(v) {
        this.dispatch({
            type: 'set',
            key: 'files_includeCrossTerms',
            value: v,
        });
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

    get gradients() {
        return this.state.files_gradients || {};
    }

    setGradient(element, value) {
        const next = { ...this.gradients, [element]: value };
        this.dispatch({
            type: 'set',
            key: 'files_gradients',
            value: next,
        });
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
     * Build a SpinSystem from a view. Shared by spin system export, the split
     * archive and the report tables, which differ only in which couplings they
     * ask for.
     */
    _buildSystem(view, { includeD, includeJ }) {
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

    get feasibility() {
        if (this.spinsysTarget === 'mrsimulator') {
            return this.spinSystem?.mrsimulatorFeasibility || 'silent';
        }
        return this.spinSystem?.feasibility || 'silent';
    }

    get availableIsotopes() {
        return this.spinSystem?.isotopes || [];
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

        // A single spinsys file is one coupled system, so if couplings were
        // asked for and we refused to compute them, the file would quietly be
        // wrong. Withhold it rather than export something incomplete.
        if (this.selectionStatus !== 'valid') return false;

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

    /**
     * Whether the split archive can be written.
     *
     * The archive is one single-site file per site, and a lone site has
     * nothing to couple to, so the coupling cap does not apply. Exporting a
     * few thousand sites one-to-one is the whole point of this button and it
     * should keep working on selections far too large to simulate together.
     */
    get splitZipValid() {
        if (this.mode !== 'spinsys' || this.spinsysTarget !== 'simpson') return false;
        if (!this.hasUsableSelection) return false;

        const sys = this.spinSystem;
        if (!sys || !sys.canExport) return false;

        return (this.hasMSData && this.includeMS) || (this.hasEFGData && this.includeEFG);
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

        const sys = this.spinSystem;
        if (!sys) return null;

        // spinsys mode
        if (this.spinsysTarget === 'mrsimulator') {
            const data = toMrsimulator(sys, {
                include_ms: this.includeMS,
                include_efg: this.includeEFG,
                include_dip: this.includeD,
                include_j: this.includeJ,
                include_angles: this.includeAngles,
                ms_isotropic: this.msIsotropic,
            });
            return JSON.stringify(data, null, 2);
        }

        return toSimpson(sys, {
            observed_nucleus: this.observedNucleus || null,
            q_order: this.spinSysQuadrupoleOrder,
            include_ms: this.includeMS,
            include_efg: this.includeEFG,
            include_dip: this.includeD,
            include_j: this.includeJ,
            include_angles: this.includeAngles,
            include_cross_terms: this.includeCrossTerms,
            ms_isotropic: this.msIsotropic,
            precision: this.precision,
            filename: this.fileName,
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
            q_order: this.spinSysQuadrupoleOrder,
            include_ms: this.includeMS,
            include_efg: this.includeEFG,
            include_angles: this.includeAngles,
            ms_isotropic: this.msIsotropic,
            precision: this.precision,
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
