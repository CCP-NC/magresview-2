/**
 * MagresView 2.0
 *
 * A web interface to visualize and interact with computed NMR data in the Magres
 * file format.
 *
 * Copyright 2022 Science and Technology Facilities Council
 * This software is distributed under the terms of the MIT License
 * Please refer to the file LICENSE for the text of the license
 *
 * MVTensorTable — a reusable modal that shows a formatted table of tensor
 * details (eigenvalues, isotropy, anisotropy, asymmetry) for each atom in the
 * current selection. Designed to be dropped into any tensor sidebar (MS, EFG,
 * HF, ...) by passing the crystvis viewer and the tensor array name.
 */

import './MVTensorTable.css';

import React from 'react';

import MVModal from './MVModal';

// Which atoms to tabulate: the current selection, or the displayed atoms if
// nothing is explicitly selected.
function getTableAtoms(app) {
    if (!app) {
        return [];
    }
    const sel = app.selected;
    const view = (sel && sel.length > 0) ? sel : app.displayed;
    return view ? view.atoms : [];
}

function fmt(value, precision) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '—';
    }
    return value.toFixed(precision);
}

function MVTensorTable(props) {

    const app = props.app;
    const tensorType = props.tensorType;
    const units = props.units ?? '';
    const precision = props.precision ?? 2;

    let rows = [];
    if (props.display && app && app.model && app.model.hasArray(tensorType)) {
        const atoms = getTableAtoms(app);
        rows = atoms.map((a) => {
            const T = a.getArrayValue(tensorType);
            const evals = T ? T.eigenvalues : [null, null, null];
            return {
                index: a.index,
                label: a.crystLabel,
                species: a.element,
                evals,
                iso: T ? T.isotropy : null,
                aniso: T ? T.anisotropy : null,
                asymm: T ? T.asymmetry : null,
            };
        });
    }

    const unitSuffix = units ? ` (${units})` : '';

    return (
        <MVModal title={(props.title ?? 'Tensor details')} display={props.display} hasOverlay={false}
                 draggable={true} resizable={true} noFooter={true}
                 className='mv-tensor-table-modal'
                 onClose={props.onClose}>
            <div className='mv-tensor-table-wrapper'>
                {rows.length === 0 ?
                    <div className='mv-tensor-table-empty'>No tensor data for the current selection.</div>
                    :
                    <table className='mv-tensor-table'>
                        <thead>
                            <tr>
                                <th>Index</th>
                                <th>Label</th>
                                <th>Species</th>
                                <th>Eigenvalues{unitSuffix}</th>
                                <th>Isotropy{unitSuffix}</th>
                                <th>Anisotropy{unitSuffix}</th>
                                <th>Asymmetry</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.index}</td>
                                    <td>{r.label}</td>
                                    <td>{r.species}</td>
                                    <td className='mv-tensor-table-evals'>
                                        {`[${fmt(r.evals[0], precision)}, ${fmt(r.evals[1], precision)}, ${fmt(r.evals[2], precision)}]`}
                                    </td>
                                    <td>{fmt(r.iso, precision)}</td>
                                    <td>{fmt(r.aniso, precision)}</td>
                                    <td>{fmt(r.asymm, precision)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
            </div>
        </MVModal>
    );
}

export default MVTensorTable;
