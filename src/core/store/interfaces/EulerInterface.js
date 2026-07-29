/**
 * MagresView 2.0
 *
 * A web interface to visualize and interact with computed NMR data in the Magres
 * file format.
 *
 * Author: Simone Sturniolo
 *
 * Copyright 2022 Science and Technology Facilities Council
 * This software is distributed under the terms of the MIT License
 * Please refer to the file LICENSE for the text of the license
 * 
 */

import { Events } from '../listeners';
import { makeSelector, DataCheckInterface } from '../utils';
import { eulerBetweenTensors } from '../../../utils';

import { shallowEqual, useSelector, useDispatch } from 'react-redux';

import CrystVis from '@ccp-nc/crystvis-js';

const LC = CrystVis.LEFT_CLICK;
const RC = CrystVis.RIGHT_CLICK;

const initialEulerState = {
    eul_atom_A: null,
    eul_newatom_A: null,
    eul_tensor_A: 'ms',
    eul_order_A: 'haeberlen',
    eul_atom_B: null,
    eul_newatom_B: null,
    eul_tensor_B: 'ms',
    eul_order_B: 'haeberlen',
    eul_convention: 'zyz',          // Euler sequence (name kept for session/export compatibility)
    eul_active: true,               // active (true) vs passive (false) rotation sense
    eul_disks_on: true,             // show the Euler disks in the viewer
    eul_orientation: null,          // live RelativeTensorOrientation
    eul_configs: [],                // plain PAS-frame configuration list for the table
    eul_orientation_class: null,    // 'discrete' | 'continuous' | 'indeterminate' | null
    eul_active_config: 0            // index into eul_configs
};

const tensorValues = new Set(['ms', 'efg', 'cryst', 'dipolar']);
const orderValues = new Set(['increasing', 'decreasing', 'haeberlen', 'nqr']);
const sequenceValues = new Set(['zyz', 'zxz']);

// Natural PAS ordering per tensor type. These all place an axial tensor's unique
// axis on Z, giving a clean discrete Euler gauge; users may still override.
const recommendedOrder = { ms: 'haeberlen', efg: 'nqr', cryst: 'increasing', dipolar: 'haeberlen' };
const orderLabel = { increasing: 'Increasing', decreasing: 'Decreasing', haeberlen: 'Haeberlen', nqr: 'NQR' };
const tensorLabel = { ms: 'Shielding', efg: 'EFG', cryst: 'Crystal frame', dipolar: 'Dipolar (A\u2192B)' };

function makeCallback(dispatch, ending = 'A') {
    return function cback(a, e) {
        dispatch({
            type: 'update',
            data: {
                ['eul_newatom_' + ending]: a,
                listen_update: [Events.EUL_ANGLES]
            }
        });
    };
}

// Rebuild the orientation (inputs changed).
function makeEulerAction(data) {
    return { type: 'update', data: { ...data, listen_update: [Events.EUL_ANGLES] } };
}

// Toggle the disks on/off.
function makeDisksAction(data) {
    return { type: 'update', data: { ...data, listen_update: [Events.EUL_DISKS] } };
}

// Change the active configuration (animate only).
function makeConfigAction(data) {
    return { type: 'update', data: { ...data, listen_update: [Events.EUL_CONFIG] } };
}

class EulerInterface extends DataCheckInterface {

    get hasModel() {
        let app = this.state.app_viewer;
        return (app && this.state.app_viewer.model);
    }

    get hasMSData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('ms')));
    }

    get hasEFGData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('efg')));
    }

    // ── Euler specification ──────────────────────────────────────────────────

    get sequence() {
        return this.state.eul_convention;
    }

    set sequence(v) {
        if (!sequenceValues.has(v))
            throw Error('Invalid Euler sequence');
        this.dispatch(makeEulerAction({ eul_convention: v }));
    }

    get active() {
        return this.state.eul_active;
    }

    set active(v) {
        this.dispatch(makeEulerAction({ eul_active: !!v }));
    }

    _getOrder(ending = 'A') {
        return this.state['eul_order_' + ending];
    }

    _setOrder(v, ending = 'A') {
        if (!orderValues.has(v))
            throw Error('Invalid PAS ordering');
        this.dispatch(makeEulerAction({ ['eul_order_' + ending]: v }));
    }

    get orderA() { return this._getOrder('A'); }
    set orderA(v) { this._setOrder(v, 'A'); }
    get orderB() { return this._getOrder('B'); }
    set orderB(v) { this._setOrder(v, 'B'); }

    // ── Atom picking ─────────────────────────────────────────────────────────

    _getAtomLabel(ending = 'A') {
        let a = this.state['eul_atom_' + ending];
        return a ? a.crystLabel : 'Not selected';
    }

    setAtomA(atom) {
        if (!atom) return;
        this.dispatch(makeEulerAction({ eul_newatom_A: atom }));
    }

    setAtomB(atom) {
        if (!atom) return;
        this.dispatch(makeEulerAction({ eul_newatom_B: atom }));
    }

    get atomA() { return this.state.eul_atom_A; }
    get atomLabelA() { return this._getAtomLabel('A'); }
    get atomB() { return this.state.eul_atom_B; }
    get atomLabelB() { return this._getAtomLabel('B'); }

    _setTensorType(v, ending = 'A') {
        if (!tensorValues.has(v))
            throw Error('Invalid NMR tensor for Euler angles');
        this.dispatch(makeEulerAction({ ['eul_tensor_' + ending]: v }));
    }

    get tensorA() { return this.state.eul_tensor_A; }
    set tensorA(v) { this._setTensorType(v, 'A'); }
    get tensorB() { return this.state.eul_tensor_B; }
    set tensorB(v) { this._setTensorType(v, 'B'); }

    // Set a side's tensor type and snap its ordering to that tensor's natural
    // convention (overridable afterwards). One dispatch → one rebuild.
    setTensor(side, v) {
        if (!tensorValues.has(v))
            throw Error('Invalid NMR tensor for Euler angles');
        this.dispatch(makeEulerAction({
            ['eul_tensor_' + side]: v,
            ['eul_order_' + side]: recommendedOrder[v] ?? 'haeberlen'
        }));
    }

    // A human-readable warning when an axial tensor's chosen ordering puts its
    // unique axis on X (no simple Euler gauge); null otherwise. Recommends the
    // tensor's natural ordering, which places the unique axis on Z.
    get gaugeWarning() {
        const o = this.state.eul_orientation;
        const free = o && o.freeRotation;
        if (!free || !free.problematic) return null;
        const onX = free.onX || {};
        const sides = [];
        if (onX.source) sides.push(['A', this.state.eul_tensor_A]);
        if (onX.target) sides.push(['B', this.state.eul_tensor_B]);
        return sides.map(([side, t]) =>
            `Tensor ${side} (${tensorLabel[t] ?? t}) is axially symmetric, but the ` +
            `${orderLabel[this._getOrder(side)]} ordering puts its unique axis on X, which has ` +
            `no simple Euler-angle gauge. Switch ${side} to ${orderLabel[recommendedOrder[t] ?? 'haeberlen']} ` +
            `ordering to get a discrete solution.`
        ).join(' ');
    }

    // Swap the A and B picks (atom, tensor and ordering together) and rebuild.
    // Routed through eul_newatom_* so the listener cleans up the old A atom's
    // disks/labels. Only meaningful when both atoms are picked.
    swapAB() {
        const a = this.state.eul_atom_A, b = this.state.eul_atom_B;
        if (!a || !b) return;
        this.dispatch(makeEulerAction({
            eul_newatom_A: b,
            eul_newatom_B: a,
            eul_tensor_A: this.state.eul_tensor_B,
            eul_tensor_B: this.state.eul_tensor_A,
            eul_order_A: this.state.eul_order_B,
            eul_order_B: this.state.eul_order_A
        }));
    }

    // ── Disks & configurations ───────────────────────────────────────────────

    get disksOn() {
        return this.state.eul_disks_on;
    }

    set disksOn(v) {
        this.dispatch(makeDisksAction({ eul_disks_on: !!v }));
    }

    get orientationClass() {
        return this.state.eul_orientation_class;
    }

    // A short note for the discrete axial case explaining the zeroed gauge angle.
    get gaugeNote() {
        const o = this.state.eul_orientation;
        if (!o || this.state.eul_orientation_class !== 'discrete' || !o.axial) return null;
        if (o.axial.source && o.axial.target)
            return 'Both tensors are axially symmetric: α and γ are free gauges (set to 0); β is the angle between the unique axes.';
        if (o.axial.target)
            return 'Tensor B is axially symmetric: γ is a free gauge (set to 0). The ring marks the free rotation about its unique axis.';
        if (o.axial.source)
            return 'Tensor A is axially symmetric: α is a free gauge (set to 0). The ring marks the free rotation about its unique axis.';
        return null;
    }

    get hasDiscrete() {
        return this.state.eul_orientation_class === 'discrete';
    }

    /** Configuration rows for the table (angles in degrees, active flag set). */
    get configs() {
        const active = this.state.eul_active_config;
        return (this.state.eul_configs || []).map((c) => ({
            index: c.index,
            id: c.id,
            aFlip: c.aFlip,
            bFlip: c.bFlip,
            alpha: c.euler[0] * 180 / Math.PI,
            beta: c.euler[1] * 180 / Math.PI,
            gamma: c.euler[2] * 180 / Math.PI,
            singular: c.singular,
            active: c.index === active
        }));
    }

    get activeConfig() {
        return this.state.eul_active_config;
    }

    set activeConfig(i) {
        const n = (this.state.eul_configs || []).length;
        if (n === 0 || i < 0 || i >= n) return;
        this.dispatch(makeConfigAction({ eul_active_config: i }));
    }

    cycleConfig(delta) {
        const n = (this.state.eul_configs || []).length;
        if (n === 0) return;
        const i = ((this.state.eul_active_config + delta) % n + n) % n;
        this.dispatch(makeConfigAction({ eul_active_config: i }));
    }

    // ── Current (active configuration) angles, in degrees ────────────────────

    _activeConfig() {
        return (this.state.eul_configs || [])[this.state.eul_active_config] ?? null;
    }

    _angle(i, rad = false) {
        const c = this._activeConfig();
        if (!c) return 'N/A';
        return c.euler[i] * (rad ? 1.0 : 180 / Math.PI);
    }

    get alpha() { return this._angle(0); }
    get beta() { return this._angle(1); }
    get gamma() { return this._angle(2); }
    get alphaRad() { return this._angle(0, true); }
    get betaRad() { return this._angle(1, true); }
    get gammaRad() { return this._angle(2, true); }

    // ── Click binding ────────────────────────────────────────────────────────

    bind() {
        const dispatch = this._dispatcher;
        const handler = this.state.app_click_handler;

        if (!handler)
            return;

        // Left-click assigns atom A, right-click assigns atom B.
        handler.setCallback('eul', LC, makeCallback(dispatch, 'A'));
        handler.setCallback('eul', RC, makeCallback(dispatch, 'B'));
    }

    unbind() {
        const handler = this.state.app_click_handler;

        if (!handler)
            return;

        handler.setCallback('eul', LC);
        handler.setCallback('eul', RC);

        this.dispatch(makeEulerAction({
            eul_newatom_A: null,
            eul_newatom_B: null
        }));
    }

    // ── Text export ──────────────────────────────────────────────────────────

    txtReport() {
        let report = 'Euler angles between tensors:\n';
        report += `${this.tensorA} on ${this.atomLabelA}\nand\n`;
        report += `${this.tensorB} on ${this.atomLabelB}\n\n`;
        report += `Sequence: ${this.sequence.toUpperCase()} (${this.active ? 'active' : 'passive'})\n\n`;
        report += `Degrees:\n${this.alpha}    ${this.beta}    ${this.gamma}\n\n`;
        report += `Radiants:\n${this.alphaRad}     ${this.betaRad}     ${this.gammaRad}`;
        return report;
    }

    /** CSV of all equivalent configurations (angles in degrees). */
    csvTable() {
        const rows = this.configs;
        let csv = '#,A flip,B flip,alpha (deg),beta (deg),gamma (deg)\n';
        rows.forEach((c) => {
            csv += `${c.index + 1},${c.aFlip},${c.bFlip},${c.alpha.toFixed(4)},${c.beta.toFixed(4)},${c.gamma.toFixed(4)}\n`;
        });
        return csv;
    }

    txtSelfAngleTable() {
        // Full table of MS-to-EFG tensor angles for each atom (non-interactive
        // export; still uses the local math per ADR-0002).
        if (!(this.hasMSData && this.hasEFGData)) {
            throw Error('Both MS and EFG tensors are needed to compute the table');
        }

        let targ = this.state.app_viewer.selected;
        targ = (targ.length > 0) ? targ : this.state.app_viewer.displayed;

        const data = targ.map((a) => [a.crystLabel, a.getArrayValue('ms'), a.getArrayValue('efg')]);

        let table = `Euler angles between MS and EFG tensors in radiants, convention: ${this.sequence.toUpperCase()}\n`;
        let conv = this.sequence;

        data.forEach((d) => {
            let [label, ms, efg] = d;
            let [alpha, beta, gamma] = eulerBetweenTensors(ms, efg, conv);
            table += `${label}    ${alpha}    ${beta}    ${gamma}\n`;
        });

        return table;
    }
}

function useEulerInterface() {
    let state = useSelector(makeSelector('eul', ['app_viewer', 'app_click_handler']), shallowEqual);
    let dispatcher = useDispatch();
    return new EulerInterface(state, dispatcher);
}

export default useEulerInterface;
export { initialEulerState, EulerInterface };
