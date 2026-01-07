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

import { shallowEqual, useSelector, useDispatch } from 'react-redux';

import { makeSelector, BaseInterface, getSel, getNMRData } from '../utils';
import { tableRow, eulerFromRotation, dipolarCoupling, jCoupling } from '../../../utils';

const initialFilesState = {
    files_seltype: 'ms',
    files_includeJ: true,
    files_includeD: true,
    files_includeEFG: true,
    files_includeMS: true,
    files_includeEuler: false,
    files_quadrupole_order: 2,
    files_mergeByLabel: false, // If true, merge results for all sites with the same label
    files_multiplicity: {},
    files_fileFormat: 'csv',
    files_tabWidth: 16, // Width for the fixed-width format
    files_precision: 5, // Number of decimal places for the floats
};

class FilesInterface extends BaseInterface {

    get fileType() {
        return this.state.files_seltype;
    }

    set fileType(v) {
        this.dispatch({
            type: 'set',
            key: 'files_seltype',
            value: v
        });
    }

    get fileName() {
        let app = this.state.app_viewer;
        let mname = app.modelName;
        let type = this.state.files_seltype;
        const ext = this.state.files_fileFormat === 'csv' ? 'csv' : 'txt';
        if (mname) {
            return `mvtable_${mname}_${type}.${ext}`;
        }
        else {
            return 'N/A';
        }
    }

    get fileValid() {
        // Can we generate a file with these parameters?
        let app = this.state.app_viewer;
        if (!app || !app.model)
            return false;

        switch(this.state.files_seltype) {
            case 'ms':
                return this.hasMSData;
            case 'efg':
                return this.hasEFGData;
            case 'isc':
                return this.hasISCData;
            case 'spinsys':
                return (this.hasMSData && this.includeMS) || (this.hasEFGData && this.includeEFG) || this.includeD || (this.hasISCData && this.includeJ);
            default:
                break;
        }

        return true;
    }

    get hasMSData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('ms')));            
    }

    get hasEFGData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('efg')));            
    }

    get hasISCData() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model.hasArray('isc')));        
    }

    get hasCIFLabels() {
        let app = this.state.app_viewer;
        return (app && app.model && (app.model._has_cif_labels));            
    }

    get includeD() {
        return this.state.files_includeD;
    }

    set includeD(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_includeD: v
            }
        });
    }

    get includeJ() {
        return this.state.files_includeJ;
    }

    set includeJ(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_includeJ: v
            }
        });
    }
    
    get includeEFG() {
        return this.state.files_includeEFG;
    }

    set includeEFG(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_includeEFG: v
            }
        });
    }

    get includeMS() {
        return this.state.files_includeMS;
    }

    set includeMS(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_includeMS: v
            }
        });
    }

    get includeEuler() {
        return this.state.files_includeEuler;
    }

    set includeEuler(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_includeEuler: v
            }
        });
    }


    get mergeByLabel() {
        return this.state.files_mergeByLabel;
    }

    set mergeByLabel(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_mergeByLabel: v
            }
        });
    }

    get fileFormat() {
        return this.state.files_fileFormat;
    }

    set fileFormat(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_fileFormat: v
            }
        });
    }

    get tabWidth() {
        return this.state.files_tabWidth;
    }

    set tabWidth(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_tabWidth: v
            }
        });
    }

    get precision() {
        return this.state.files_precision;
    }

    set precision(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_precision: v
            }
        });
    }


    get spinSysQuadrupoleOrder() {
        return this.state.files_quadrupole_order;
    }

    set spinSysQuadrupoleOrder(v) {
        this.dispatch({
            type: 'update',
            data: {
                files_quadrupole_order: v
            }
        });
    }

    get spinSysOptions() {
        return {
            includeD: this.state.files_includeD,
            includeJ: this.state.files_includeJ,
            includeEFG: this.state.files_includeEFG,
            includeMS: this.state.files_includeMS,
            quadrupoleOrder: this.spinSysQuadrupoleOrder
        };
        }
        



    generateFile() {

        let contents = '';

        // What are the atoms?
        const app = this.state.app_viewer;
        let view = null;

        if (app && app.model) {
            view = getSel(app);
        }
        
        if (!view) {
            return null;
        }

        // get/update the multiplicities of the current selection
        // note this can't be called after the view is merged!
        let multiplicity = view.unique_labels_multiplicity;

        // should we merge equivalent atoms?
        if (this.mergeByLabel) {
            view = view.uniqueSites();
         }

        switch(this.state.files_seltype) {

            case 'ms':
                contents = this._msMakeTable(view, multiplicity);
                break;
            case 'efg':
                contents = this._efgMakeTable(view, multiplicity);
                break;
            case 'dip':
                contents = this._dipMakeTable(view, multiplicity);
                break;
            case 'isc':
                contents = this._iscMakeTable(view, multiplicity);
                break;
            case 'spinsys':
                contents = this._spinsysMakeTable(view, this.spinSysOptions);
                break;
            default:
                return null;
        }

        return contents;
    }

    _get_labels(view) {
        // if we have CIF labels, use them
        if (view._model._has_cif_labels) {
            return view.atoms.map((a) => a.crystLabel);
        }

        // otherwise just use the element
        return view.atoms.map((a) => a.element);
    }

    _get_indices(view) {
        // The global index of the atom would be this:
        // return view.atoms.map((a) => a.index);
        // But we want the index within the species label
        // to be more in line with the .magres specification
        // we also want the indices to start at 1
        
        // if we have CIF labels, we'll use the label index
        if (view._model._has_cif_labels) {
            return view.atoms.map((a) => a.labelIndex + 1);
        }
        // otherwise use the species index
        return view.atoms.map((a) => a.speciesIndex + 1);
    }


    // Table generators
    _msMakeTable(view, multiplicity) {

        const tabW = this.tabWidth;
        const prec = this.precision;
        const fileFormat = this.fileFormat;
        const rowOptions = {width:tabW, precision:prec, format:fileFormat};
        const conv = this.state.eul_convention;

        let table = '# MS Table generated by MagresView 2\n';
        if (this.includeEuler)
            table += `# Euler angles convention: ${conv}\n`;

        // Header
        let header = ['Label', 'Isotope', 'No. in label']
        if (this.mergeByLabel) {
            header = header.concat(['Multiplicity']);
        }
        if (this.includeMS) { 
            header = header.concat(['s_iso/ppm', 'Anisotropy/ppm', 'Asymmetry']);
        }

        if (this.includeEuler) {
            header = header.concat(['alpha', 'beta', 'gamma']);
        }
        table += tableRow(header, rowOptions);

        // Get the NMR data
        const iso = getNMRData(view, 'iso', 'ms')[1];
        const aniso = getNMRData(view, 'aniso', 'ms')[1];
        const asymm = getNMRData(view, 'asymm', 'ms')[1];

        // Euler angles
        const euler = view.atoms.map((a) => {
            const T = a.getArrayValue('ms');
            return eulerFromRotation(T.haeberlen_eigenvectors, conv).map((x) => (x*180.0/Math.PI));
        });

        const species_labels = this._get_labels(view);
        const indices = this._get_indices(view);


        view.atoms.forEach((a, i) => {
            let table_values = [
                species_labels[i],
                a.isotope + a.element,
                indices[i],
            ];

            if (this.mergeByLabel) {
                // if the multiplicity is not defined, throw an error
                if (multiplicity[a.crystLabel] === undefined) {
                    throw new Error(`Multiplicity of ${a.crystLabel} is not defined`);
                }
                table_values = table_values.concat([multiplicity[a.crystLabel]]);
            }

            // MS data
            if (this.includeMS) {
                table_values = table_values.concat([iso[i], aniso[i], asymm[i]]);
            }
            
            // Euler angles
            if (this.includeEuler) {
                table_values = table_values.concat(euler[i]);
            }

            table += tableRow(table_values, rowOptions);
        });

        return table;
    }

    _efgMakeTable(view, multiplicity) {

        const tabW = this.tabWidth;
        const prec = this.precision;
        const fileFormat = this.fileFormat;
        const rowOptions = {width:tabW, precision:prec, format:fileFormat};
        const conv = this.state.eul_convention;

        let table = '# EFG Table generated by MagresView 2\n';
        if (this.includeEuler)
            table += `# Euler angles convention: ${conv}\n`;

        // Header
        let header = ['Label', 'Isotope', 'No. in label']
        if (this.mergeByLabel) {
            header = header.concat(['Multiplicity']);
        }
        if (this.includeEFG) {
            header = header.concat(['Vzz/au', 'Anisotropy/au', 'Asymmetry', 'Q/MHz']);
        }

        if (this.includeEuler) {
            header = header.concat(['alpha', 'beta', 'gamma']);
        }
        table += tableRow(header, rowOptions);

        // Get the NMR data
        const Vzz = getNMRData(view, 'e_z', 'efg')[1];
        const aniso = getNMRData(view, 'aniso', 'efg')[1];
        const asymm = getNMRData(view, 'asymm', 'efg')[1];
        const Q = getNMRData(view, 'Q', 'efg')[1]; // in MHz already

        // Euler angles
        const euler = view.atoms.map((a) => {
            const T = a.getArrayValue('efg');
            return eulerFromRotation(T.haeberlen_eigenvectors, conv).map((x) => (x*180.0/Math.PI));
        });

        const species_labels = this._get_labels(view);
        const indices = this._get_indices(view);

        view.atoms.forEach((a, i) => {
            let table_values = [
                species_labels[i],
                a.isotope + a.element,
                indices[i],
            ];

            if (this.mergeByLabel) {
                // if the multiplicity is not defined, throw an error
                if (multiplicity[a.crystLabel] === undefined) {
                    throw new Error(`Multiplicity of ${a.crystLabel} is not defined`);
                }
                table_values = table_values.concat([multiplicity[a.crystLabel]]);
            }

            // EFG data
            if (this.includeEFG) {
                table_values = table_values.concat([Vzz[i], aniso[i], asymm[i], Q[i]]);
            }    

            // Euler angles
            if (this.includeEuler) {
                table_values = table_values.concat(euler[i]);
            }

            table += tableRow(table_values, rowOptions);
        });

        return table;
    }

    _dipMakeTable(view, multiplicity) {

        const tabW = this.tabWidth;
        const prec = this.precision;
        const fileFormat = this.fileFormat;
        const rowOptions = {width: tabW, precision: prec, format: fileFormat};

        let table = '# Dipolar coupling table generated by MagresView 2\n';

        // Header
        let header = ['Label 1', 'Isotope 1', 'Index 1',
                      'Label 2', 'Isotope 2', 'Index 2'];
        if (this.mergeByLabel) {
            header = header.concat(['Multiplicity 1', 'Multiplicity 2']);
        }
        header = header.concat(['D/kHz', 'r_x/Ang', 'r_y/Ang', 'r_z/Ang']);
        table += tableRow(header, rowOptions);

        const atoms = view.atoms;

        const species_labels = this._get_labels(view);
        const indices = this._get_indices(view);


        atoms.forEach((a1, i) => {
            atoms.slice(i+1).forEach((a2, j) => {

                let [D, r] = dipolarCoupling(a1, a2);

                // convert to kHz
                D /= 1000.0;
                let table_values = [
                    species_labels[i],
                    a1.isotope + a1.element,
                    indices[i],
                    species_labels[j],
                    a2.isotope + a2.element,
                    indices[j],
                ];

                if (this.mergeByLabel) {
                    // if the multiplicity is not defined, throw an error
                    if (multiplicity[a1.crystLabel] === undefined) {
                        throw new Error(`Multiplicity of ${a1.crystLabel} is not defined`);
                    }
                    if (multiplicity[a2.crystLabel] === undefined) {
                        throw new Error(`Multiplicity of ${a2.crystLabel} is not defined`);
                    }
                    table_values = table_values.concat([multiplicity[a1.crystLabel], multiplicity[a2.crystLabel]]);
                }

                table_values = table_values.concat([D, r[0], r[1], r[2]]);

                // add row to table
                table += tableRow(table_values, rowOptions);
            });
        });

        return table;
    }

    _iscMakeTable(view, multiplicity) {

        const tabW = this.tabWidth;
        const prec = this.precision;
        const fileFormat = this.fileFormat;
        const rowOptions = {width: tabW, precision: prec, format: fileFormat};

        let table = '# J coupling table generated by MagresView 2\n';

        // Header
        let header = ['Label 1', 'Isotope 1', 'Index 1',
                      'Label 2', 'Isotope 2', 'Index 2'];
        if (this.mergeByLabel) {
            header = header.concat(['Multiplicity 1', 'Multiplicity 2']);
        }
        header = header.concat(['J/Hz']);

        // add header to table
        table += tableRow(header, rowOptions);

        const atoms = view.atoms;
        const species_labels = this._get_labels(view);
        const indices = this._get_indices(view);


        atoms.forEach((a1, i) => {
            atoms.slice(i+1).forEach((a2, j) => {

                const J = jCoupling(a1, a2);

                if(!J)
                    return; // No data
                let table_values = [
                    species_labels[i],
                    a1.isotope + a1.element,
                    indices[i],
                    species_labels[j],
                    a2.isotope + a2.element,
                    indices[j],
                ];

                if (this.mergeByLabel) {
                    // if the multiplicity is not defined, throw an error
                    if (multiplicity[a1.crystLabel] === undefined) {
                        throw new Error(`Multiplicity of ${a1.crystLabel} is not defined`);
                    }
                    if (multiplicity[a2.crystLabel] === undefined) {
                        throw new Error(`Multiplicity of ${a2.crystLabel} is not defined`);
                    }
                    table_values = table_values.concat([multiplicity[a1.crystLabel], multiplicity[a2.crystLabel]]);
                }

                table_values = table_values.concat([J]);

                // add row to table
                table += tableRow(table_values, rowOptions);
            });
        });

        return table;
    }

    _spinsysMakeTable(view, options) {
        // properties can contain 'shift', 'quadrupole', 'dipole' and 'jcoupling'
        // Follow the soprano function here:
        // https://github.com/CCP-NC/soprano/blob/master/soprano/calculate/nmr/simpson.py

        const tabW = this.tabWidth;
        const prec = this.precision;
        const conv = this.state.eul_convention;
        let table = '{spinsys\n';

        // channels: show unique isotopes + element label
        table += 'channels ';
        const nuclei = view.atoms.map((a) => (a.isotope + a.element));
        const isotopes = new Set(nuclei);
        table += Array.from(isotopes).join('    ');
        table += '\n'
        
        // nuclei
        table += '    nuclei ';
        table += nuclei.join('    ');
        table += '\n'

        if (options.includeMS) {

            // if there is no MS data, throw warning and skip
            if (!this.hasMSData) {
                console.warn('No MS data found. Skipping MS data in spinsys table.');
            } else {
                // Get the NMR data
                // isotropic shift
                const msiso = getNMRData(view, 'iso', 'ms')[1];
                // reduced anisotropy
                const msaniso = getNMRData(view, 'reduced_aniso', 'ms')[1];
                // asymmetry parameter
                const msasymm = getNMRData(view, 'asymm', 'ms')[1];
                // Euler angles
                // Euler angles
                const euler = view.atoms.map((a) => {
                    const T = a.getArrayValue('ms');
                    return eulerFromRotation(T.haeberlen_eigenvectors, conv).map((x) => (x*180.0/Math.PI));
                });

                view.atoms.forEach((a, i) => {
                    table += tableRow([
                        'shift',
                        i + 1, // 1-indexed
                        -msiso[i].toFixed(prec).toString()+'p',   // -isotropy (note minus sign!)
                        -msaniso[i].toFixed(prec).toString()+'p', // -reduced anisotropy (note minus sign!)
                        msasymm[i],  // asymmetry
                        euler[i][0], // alpha
                        euler[i][1], // beta
                        euler[i][2], // gamma
                    ], tabW, prec);
                });
            }
        } // end shift

        if (options.includeEFG) {
            if (!this.hasEFGData) {
                console.warn('No EFG data found. Skipping EFG data in spinsys table.');
                alert('No EFG data found. Skipping EFG data in spinsys table.');
            }
            else {
                // Get the NMR data
                // quadrupolar coupling
                const q_order = options.quadrupoleOrder;

                
                if (q_order > 0) {
                    if (q_order >2) {
                        console.warn('Warning: quadrupole order > 2 not supported')
                    }

                    const Q = getNMRData(view, 'Q', 'efg')[1]
                    const efgasym = getNMRData(view, 'asymm', 'efg')[1];
                    const efgeuler = view.atoms.map((a) => {
                        const T = a.getArrayValue('efg');
                        return eulerFromRotation(T.haeberlen_eigenvectors, conv).map((x) => (x*180.0/Math.PI));
                    });

                    view.atoms.forEach((a, i) => {
                        let cq = Q[i]
                        if (cq && cq !== 0.0) {
                            table += tableRow([
                                'quadrupole',
                                i + 1, // 1-indexed
                                q_order,
                                cq * 1e6, // quadrupolar coupling TODO: what units?? Currently Hz
                                efgasym[i],
                                efgeuler[i][0], // alpha
                                efgeuler[i][1], // beta
                                efgeuler[i][2], // gamma
                            ], tabW, prec);
                        }
                    });
                }
            }
        }

        if (options.includeD) {
            const atoms = view.atoms;
            atoms.forEach((a1, i) => {
                atoms.slice(i+1).forEach((a2, j) => {
                    let [D, r] = dipolarCoupling(a1, a2);
                    // angles TODO: check convention soprano has the angles the other way round
                    const a = Math.atan2(-r[1], -r[0]) % (2*Math.PI);
                    const b = Math.acos(-r[2]) % (2*Math.PI);
                    // convert to degrees
                    const a_deg = a*180.0/Math.PI;
                    const b_deg = b*180.0/Math.PI;

                    // convert D from Hz to rad/s
                    // soprano seems to do this, but MGV1 not...?
                    // D *= 2*Math.PI;

                    table += tableRow([
                        'dipole',
                        j + 1, // 1-indexed
                        i + 1, // 1-indexed
                        D,
                        a_deg,
                        b_deg,
                        0.0,
                    ], tabW, prec);
                });
            });
        }
        // TODO: what are the rest of the jcoupling columns ?
        // if (options.includeJ) {
            // if (!this.hasJData) {
            //     console.warn('No J data found. Skipping J data in spinsys table.');
            // }
            // else {
            //     const atoms = view.atoms;
            //     atoms.forEach((a1, i) => {
            //         atoms.slice(i+1).forEach((a2, j) => {
            //             const J = jCoupling(a1, a2);

            //             if(J) {

            //                 table += tableRow([
            //                     'jcoupling',
            //                     j + 1, // 1-indexed
            //                     i + 1, // 1-indexed
            //                     J
            //                 ], tabW, prec);
            //             }
            //         });
            //     });
            // }
        // }





        // add closing bracket
        table += '}';

        return table;
    }
}

// Hook for interface
function useFilesInterface() {
    let state = useSelector(makeSelector('files', ['app_viewer', 
                                                   'app_default_displayed', 
                                                   'eul_convention']), 
                            shallowEqual);
    let dispatcher = useDispatch();

    let intf = new FilesInterface(state, dispatcher);

    return intf;
}

export default useFilesInterface;
export { initialFilesState };