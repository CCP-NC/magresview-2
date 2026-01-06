/**
 * Listeners for the rendering of labels
 */

import { addPrefix, getSel, getNMRData, formatNumber } from '../utils';

function makeLabelListener(name, shiftfunc) {
    // Factory for a function that will be used for both MS and EFG with
    // minimal differences
    
    const pre_view = addPrefix(name, 'view');
    const pre_references = addPrefix(name, 'references');
    const pre_type = addPrefix(name, 'labels_type');

    function listener(state) {

        let app = state.app_viewer;
        let current_view = state[pre_view];
        let ref_table = state[pre_references];

        
        // color from theme
        let color = state.app_theme[name + 'Color1'];
        

        // Current view holds the LAST one used; we need to update that
        // What would be the "new" view?
        let next_view = getSel(app);

        // Aliases
        const mode = state[pre_type];

        if (current_view && (current_view !== next_view || mode === 'none')) {
            // Remove old labels
            current_view.removeLabels(name);
        }

        let label_texts;
        if (mode !== 'none') {

            if (name !== 'sel_sites') {
                // Get the data
                let [units, values] = getNMRData(next_view, mode, name, ref_table);
                // get precision depending on name
                let precision = state[addPrefix(name, 'precision')];
                
                // use formatNumber to get the right number of decimals
                label_texts = values.map((v) => formatNumber(v, units, precision));
                
            }
            else {
                // Non-NMR labels
                if (mode === 'element') {
                    label_texts = next_view.atoms.map((a) => a.element);
                }
                else if (mode === 'isotope') {
                    label_texts = next_view.atoms.map((a) => a.isotope + a.element);
                }
                else if (mode === 'labels') {
                    label_texts = next_view.atoms.map((a) => a.crystLabel);
                }
            }

            next_view.addLabels(label_texts, name, (a, i) => ({ 
                color: color,  
                shift: shiftfunc(a.radius),
                height: 0.0225
            }));
        }

        return {
            [pre_view]: next_view,
        };
    }

    return listener;
}

// Make specific instances of the listener
const selLabelListener = makeLabelListener('sel_sites', (r) => ([r, r, 0]));
const msLabelListener = makeLabelListener('ms', (r) => ([1.414*r, 0.0, 0.0]));
const efgLabelListener = makeLabelListener('efg', (r) => ([r, -r, 0.0]));

export { selLabelListener, msLabelListener, efgLabelListener };