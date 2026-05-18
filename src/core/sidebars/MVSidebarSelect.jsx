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

import './MVSidebarSelect.css';

import MagresViewSidebar from './MagresViewSidebar';
import MVModal from '../../controls/MVModal';
import { useSelInterface } from '../store';

import MVCheckBox from '../../controls/MVCheckBox';
import MVButton from '../../controls/MVButton';
import MVRadioButton, { MVRadioGroup } from '../../controls/MVRadioButton';
import MVText from '../../controls/MVText';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVTooltip from '../../controls/MVTooltip';
import { tooltip_label_by, tooltip_selection_mode, tooltip_isotopes} from './tooltip_messages';


import React, { useState, useEffect, useRef } from 'react';


// ── Isotope Modal ────────────────────────────────────────────────────────────

function MVIsotopeModal({ display, onClose }) {
    const selint = useSelInterface();
    const selintRef = useRef(selint);
    selintRef.current = selint;

    // bySite: { [crystLabel]: isotopeMassString }
    const [bySite, setBySite] = useState({});

    // Re-initialise every time modal opens
    useEffect(() => {
        if (!display) return;
        const si = selintRef.current;
        const selAtoms = si.selected?.atoms ?? [];
        const atoms = selAtoms.length > 0
            ? selAtoms
            : (si.defaultDisplayed?.atoms ?? []);
        const init = {};
        atoms.forEach(a => {
            if (!(a.crystLabel in init)) {
                init[a.crystLabel] = String(a.isotope);
            }
        });
        setBySite(init);
    }, [display]);

    const app = selint.app;
    if (!app?.model) return null;

    // Use the current selection as source; fall back to defaultDisplayed
    const selAtoms = selint.selected?.atoms ?? [];
    const baseAtoms = selAtoms.length > 0
        ? selAtoms
        : (selint.defaultDisplayed?.atoms ?? []);

    // Build ordered element list and site lists per element
    const elementOrder = [];
    const elementData = {}; // el → { elementData, sites: [{ label, element }] }
    baseAtoms.forEach(a => {
        if (!elementData[a.element]) {
            elementOrder.push(a.element);
            elementData[a.element] = { elementData: a.elementData, sites: [] };
        }
        if (!elementData[a.element].sites.find(s => s.label === a.crystLabel)) {
            elementData[a.element].sites.push({ label: a.crystLabel, element: a.element });
        }
    });
    elementOrder.sort();

    // Build a flat options array — must be passed as the sole {child} so that
    // MVCustomSelect receives it as a plain array (not nested inside [false, array])
    function isoOptions(eData, el, isMixed) {
        const opts = Object.keys(eData.isotopes)
            .filter(k => !isNaN(parseInt(k)))
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(A => <MVCustomSelectOption key={A} value={A}>{A}{el}</MVCustomSelectOption>);
        if (isMixed) {
            opts.unshift(<MVCustomSelectOption key='mixed' value=''>mixed</MVCustomSelectOption>);
        }
        return opts;
    }

    // Determine the "current" isotope for a whole element in bySite state
    function elementCurrent(el) {
        const sites = elementData[el]?.sites ?? [];
        if (sites.length === 0) return null;
        const vals = sites.map(s => bySite[s.label]).filter(Boolean);
        return vals.every(v => v === vals[0]) ? vals[0] : 'mixed';
    }

    function applyToAllElement(el, A) {
        const sites = elementData[el]?.sites ?? [];
        setBySite(prev => {
            const next = { ...prev };
            sites.forEach(s => { next[s.label] = A; });
            return next;
        });
    }

    function handleOK() {
        Object.entries(bySite).forEach(([label, A]) => {
            selintRef.current.setIsotopeForSite(label, A);
        });
        onClose();
    }

    return (
        <MVModal
            title='Isotope settings'
            display={display}
            hasOverlay={true}
            draggable={true}
            onClose={onClose}
            onAccept={handleOK}
        >
            <div className='mv-iso-modal'>
                {/* ── By element ────────────────────────────────────── */}
                <section className='mv-iso-section'>
                    <h4 className='mv-iso-section-title'>By element
                        <span className='mv-iso-section-hint'>— applies to all sites of that element</span>
                    </h4>
                    <div className='mv-iso-el-grid'>
                        {elementOrder.map(el => {
                            const { elementData: eData } = elementData[el];
                            const current = elementCurrent(el);
                            const isMixed = current === 'mixed';
                            return (
                                <React.Fragment key={el}>
                                    <span className='mv-iso-el-symbol'>{el}</span>
                                    <MVCustomSelect
                                        selected={isMixed ? '' : current}
                                        onSelect={A => applyToAllElement(el, A)}
                                    >
                                        {isoOptions(eData, el, isMixed)}
                                    </MVCustomSelect>
                                    <button
                                        className='mv-iso-apply-btn'
                                        disabled={!current || isMixed}
                                        onClick={() => applyToAllElement(el, current)}
                                        title={`Set all ${el} sites to ${current}${el}`}
                                    >
                                        Apply&nbsp;to&nbsp;all
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </section>

                <div className='mv-iso-divider' />

                {/* ── By site ───────────────────────────────────────── */}
                <section className='mv-iso-section'>
                    <h4 className='mv-iso-section-title'>By site</h4>
                    <div className='mv-iso-site-list'>
                        {elementOrder.map(el => (
                            <div key={el} className='mv-iso-site-group'>
                                <span className='mv-iso-site-group-el'>{el}</span>
                                <div className='mv-iso-site-rows'>
                                    {elementData[el].sites.map(({ label }) => (
                                        <div key={label} className='mv-iso-site-row'>
                                            <span className='mv-iso-site-label'>{label}</span>
                                            <MVCustomSelect
                                                selected={bySite[label] ?? ''}
                                                onSelect={A => setBySite(prev => ({ ...prev, [label]: A }))}
                                            >
                                                {isoOptions(elementData[el].elementData, el)}
                                            </MVCustomSelect>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </MVModal>
    );
}

function MVSidebarSelect(props) {

    const selint = useSelInterface();
    const [isoModalOpen, setIsoModalOpen] = useState(false);

    function closeIsoModal() {
        setIsoModalOpen(false);
        props.onIsoModalClose?.();
    }

    console.log('[MVSidebarSelect rendered]');

    function selectMode(v) {
        selint.selectionMode = v;
    }

    function labelMode(v) {
        selint.labelMode = v;
    }

    function setR(v) {
        selint.selectionSphereR = v;
    }

    function setN(v) {
        selint.selectionBondN = v;
    }

    return (<MagresViewSidebar show={props.show} title='Select and display'>
        <div className='mv-sidebar-block'>
            <MVCheckBox checked={selint.highlightSelected} onCheck={(v) => { selint.highlightSelected = v }}>Highlight selected</MVCheckBox>        
            <MVCheckBox checked={selint.showCell} onCheck={(v) => { selint.showCell = v }}>Show unit cell</MVCheckBox>        
            <span className='sep-1' />  
            {/* drop down for label by mode */}
            <div className='mv-sidebar-tooltip-grid'>
                <h4>Label by</h4>
                <MVTooltip tooltipText={tooltip_label_by} />
            </div>
            {/* default is none */}
            <MVCustomSelect onSelect={(v) => { labelMode(v); }} selected={selint.labelMode} name='label_mode_dropdown'>
                <MVCustomSelectOption value='none'>None</MVCustomSelectOption>
                <MVCustomSelectOption value='labels'>Crystallographic labels</MVCustomSelectOption>
                <MVCustomSelectOption value='element'>Element</MVCustomSelectOption>
                <MVCustomSelectOption value='isotope'>Isotope</MVCustomSelectOption>
            </MVCustomSelect>
            <span className='sep-1' />
            <div className='mv-sidebar-tooltip-grid'>
                <MVRadioGroup label='Selection mode' onSelect={selectMode} selected={selint.selectionMode} name='selec_mode_radio'>
                    <MVRadioButton value='atom'>Atom</MVRadioButton>
                    <MVRadioButton value='element'>Element</MVRadioButton>
                    <MVRadioButton value='label'>Crystallographic label</MVRadioButton>
                    <MVRadioButton value='sphere'>Sphere, radius =&nbsp;
                        <MVText size='5' value={selint.selectionSphereR} filter='[0-9]*(?:\.[0-9]*)?' onChange={setR} onSubmit={setR} />&nbsp;  &#8491;
                    </MVRadioButton>
                    <MVRadioButton value='molecule'>Molecule</MVRadioButton>
                    <MVRadioButton value='bonds'>Bonds, max distance = &nbsp;
                        <MVText size='3' value={ selint.selectionBondN } filter='[0-9]*' onChange={setN} onSubmit={setN} />
                    </MVRadioButton>
                </MVRadioGroup>
                <MVTooltip tooltipText={tooltip_selection_mode} />
            </div>
        </div>
        <span className='sep-1' />
        <div className='mv-sidebar-block'>
            <div className='mv-sidebar-grid'>
                <MVButton onClick={() => { selint.selected = selint.displayed }}>Select visible</MVButton>
                <MVButton onClick={() => { selint.selected = null }}>Select none</MVButton>                
                <MVButton onClick={() => { selint.displayed = selint.selected }}>Display selected</MVButton>
                <MVButton onClick={() => { selint.displayed = null }}>Reset displayed</MVButton>                
            </div>
            <MVButton style={{width: '100%', marginTop: '0.4em'}} onClick={() => { selint.invertSelection() }}>Invert selection</MVButton>
        </div>
        <span className='sep-1' />
        <div className='mv-iso-sidebar-btn-row'>
            <div className='mv-iso-sidebar-label'>
                <h3>Isotopes</h3>
                <MVTooltip tooltipText={tooltip_isotopes} />
            </div>
            <MVButton onClick={() => setIsoModalOpen(true)}>Set isotopes…</MVButton>
        </div>
        <MVIsotopeModal display={isoModalOpen || !!props.isoModalOpen} onClose={closeIsoModal} />
        <div className='mv-sidebar-block'>
            <h3>Selection controls:</h3>
            <ul>
                <li><tt>CLICK</tt> to select an atom/element/etc.</li>
                <li><tt>SHIFT+CLICK</tt> to add to or remove from the selection</li>
            </ul>
        </div>
    </MagresViewSidebar>);
}

export default MVSidebarSelect;