/**
 * Spectrometer field dialog.
 *
 * There is exactly one external field B0 in the app (ADR 0009). Every nucleus
 * in a physical sample sits in the same magnet, so the Larmor frequencies
 * listed here are not independent settings: each one is just a different way
 * of naming the same B0. Type into any of them and all the others follow.
 */

import './MVLarmorModal.css';

import React, { useState, useEffect } from 'react';

import MVModal from '../controls/MVModal';
import MVText from '../controls/MVText';
import { useAppInterface } from './store';
import { parseB0 } from './store/utils';
import { GAMMA_H, larmorFrequency } from '../utils';

// Decimal places used when a field is *displayed* (i.e. not being typed into).
//
// B0_DP has to be fine enough that back-solving B0 from a typed frequency and
// then re-deriving the frequency from that B0 round-trips to within the
// displayed frequency precision. At ~10 T, 6 dp is a relative precision of
// ~1e-7, i.e. tens of Hz at 600 MHz — comfortably below the 1 kHz that
// FREQ_DP = 3 shows. Dropping B0_DP to 4 makes "400.000 MHz" come back as
// "399.998 MHz", which looks like a bug to the user.
const B0_DP = 6;
const FREQ_DP = 3;

function formatSpin(I) {
    if (I === null || I === undefined) return '—';
    if (Number.isInteger(I)) return String(I);
    return `${Math.round(I * 2)}/2`;
}

// Trim a computed field value to something a human wants to look at, without
// leaving trailing zeros: 9.395000 -> '9.395'
function trimB0(x) {
    return String(Number(x.toFixed(B0_DP)));
}

// Every isotope present anywhere in the current model, not just the current
// selection: B0 is a property of the instrument, not of what happens to be
// highlighted in the viewer.
function modelIsotopes(app) {
    const atoms = app?.model?.all?.atoms ?? [];

    const seen = new Set();
    const isotopes = [];
    for (const a of atoms) {
        const key = `${a.isotope}${a.element}`;
        if (seen.has(key) || !a.isotopeData) continue;
        seen.add(key);
        isotopes.push({
            key,
            element: a.element,
            isotope: a.isotope,
            spin: a.isotopeData.spin,
            gamma: a.isotopeData.gamma,
        });
    }
    isotopes.sort((a, b) => a.element.localeCompare(b.element) || (a.isotope - b.isotope));
    return isotopes;
}

function MVLarmorModal({ display, close }) {
    const appint = useAppInterface();

    // B0 in tesla, as a string. This is the one piece of state the dialog owns;
    // it is committed to the store only on OK.
    const [b0Text, setB0Text] = useState(() => String(appint.B0));

    // The frequency fields are *derived* from b0Text, but a controlled input
    // whose value is recomputed on every keystroke cannot be typed into: type
    // "6" while aiming for "600" and the field immediately reformats to
    // "6.000" with the caret at the end, so the next digit lands in the
    // decimals and the value never grows. So the field currently being edited
    // keeps its own raw text until it loses focus, and only the *other* fields
    // reformat live.
    const [draft, setDraft] = useState(null);   // { key, text } | null

    // Re-initialise whenever the dialog is opened
    useEffect(() => {
        if (display) {
            setB0Text(String(appint.B0));
            setDraft(null);
        }
        // Deliberately keyed on `display` alone: reopening resyncs, but a store
        // update while the dialog is open must not stomp on what is being typed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [display]);

    const numB0 = parseB0(b0Text);

    // What a field should show: its own draft text if it is being edited,
    // otherwise the value derived from the current B0.
    function shown(key, derived) {
        return (draft && draft.key === key) ? draft.text : derived;
    }

    // Edit a frequency field: remember the raw text, and if it parses to a real
    // frequency, back-solve B0 = 2*pi*nu / |gamma|.
    function editFrequency(key, text, gamma) {
        setDraft({ key, text });
        const nu = parseFloat(text);
        if (!isNaN(nu) && nu > 0 && gamma) {
            setB0Text(trimB0((nu * 1e6 * 2 * Math.PI) / Math.abs(gamma)));
        }
    }

    function onAccept() {
        const finalB0 = parseB0(b0Text);
        if (finalB0 !== null) {
            appint.B0 = String(finalB0);
        }
        close();
    }

    const isotopes = modelIsotopes(appint.viewer);
    const freq1H = numB0 !== null ? (larmorFrequency(GAMMA_H, numB0) / 1e6) : null;

    return (
        <MVModal
            title='Spectrometer field'
            display={display}
            hasOverlay={true}
            draggable={true}
            onClose={close}
            onAccept={onAccept}
        >
            <div className='mv-larmor-modal'>
                <div className='mv-larmor-master'>
                    <div className='mv-larmor-field-item'>
                        <label>B<sub>0</sub> field</label>
                        <div className='mv-larmor-input-row'>
                            <MVText
                                size='7'
                                value={shown('B0', b0Text)}
                                onChange={(v) => { setDraft({ key: 'B0', text: v }); setB0Text(v); }}
                                onBlur={() => setDraft(null)}
                                filter='[0-9]*(?:\.[0-9]*)?'
                            />
                            <span>T</span>
                        </div>
                    </div>
                    <div className='mv-larmor-field-item'>
                        <label>&sup1;H frequency</label>
                        <div className='mv-larmor-input-row'>
                            <MVText
                                size='7'
                                value={shown('1H', freq1H !== null ? freq1H.toFixed(FREQ_DP) : '')}
                                onChange={(v) => editFrequency('1H', v, GAMMA_H)}
                                onBlur={() => setDraft(null)}
                                filter='[0-9]*(?:\.[0-9]*)?'
                            />
                            <span>MHz</span>
                        </div>
                    </div>
                </div>

                <div className='mv-larmor-note'>
                    All nuclei share one magnet, so these are alternative names for the
                    same B<sub>0</sub> — editing any one of them moves all the others.
                </div>

                <div className='mv-larmor-table'>
                    <div className='mv-larmor-row mv-larmor-header'>
                        <div>Isotope</div>
                        <div>Spin</div>
                        <div>&gamma; (10<sup>7</sup> rad s<sup>&minus;1</sup> T<sup>&minus;1</sup>)</div>
                        <div>&nu;<sub>0</sub> (MHz)</div>
                    </div>
                    {isotopes.length === 0 ? (
                        <div className='mv-larmor-empty'>
                            No model atoms loaded. Set B<sub>0</sub> above.
                        </div>
                    ) : (
                        isotopes.map(iso => {
                            const isNMR = !!iso.gamma;
                            const derived = (isNMR && numB0 !== null)
                                ? (larmorFrequency(iso.gamma, numB0) / 1e6).toFixed(FREQ_DP)
                                : '';

                            return (
                                <div key={iso.key} className='mv-larmor-row'>
                                    <div className='mv-larmor-iso'>
                                        <sup>{iso.isotope}</sup>{iso.element}
                                    </div>
                                    <div>{formatSpin(iso.spin)}</div>
                                    <div>{isNMR ? (iso.gamma / 1e7).toFixed(2) : '—'}</div>
                                    <div>
                                        {isNMR ? (
                                            <MVText
                                                size='7'
                                                value={shown(iso.key, derived)}
                                                onChange={(v) => editFrequency(iso.key, v, iso.gamma)}
                                                onBlur={() => setDraft(null)}
                                                filter='[0-9]*(?:\.[0-9]*)?'
                                            />
                                        ) : (
                                            <span title='Not NMR active'>—</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </MVModal>
    );
}

export default MVLarmorModal;
