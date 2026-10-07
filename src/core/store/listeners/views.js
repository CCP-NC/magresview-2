import { centerDisplayed } from '../../../utils';

/**
 * Work out which selected and displayed views actually apply to `model`.
 *
 * A ModelView remembers the model it was cut from, and switching models can
 * leave one behind that still points at the model we just left. Pairing atoms
 * across models gives nonsense, because the cell parameters do not match.
 *
 * Split out from the listener so it can be tested without a WebGL renderer.
 *
 * @param  {Object} state The store state
 * @param  {Model}  model The active model
 * @return {{sel: ?ModelView, displ: ModelView, staleSel: bool, staleDispl: bool}}
 */
function resolveViews(state, model) {
    let sel = state.sel_selected_view;
    let displ = state.sel_displayed_view || state.app_default_displayed;

    const staleSel = !!sel && sel.model !== model;
    const staleDispl = !!displ && displ.model !== model;

    if (staleSel) sel = null;
    if (staleDispl || !displ) displ = model.all;

    return { sel, displ, staleSel, staleDispl };
}

function viewsListener(state) {

    let app = state.app_viewer;
    let model = app.model;

    if (!model) {
        return {};
    }

    const { sel, displ, staleSel, staleDispl } = resolveViews(state, model);

    // Assign new selection
    if (sel) {
        if (sel !== app.selected) app.selected = sel;
    } else if (app.selected && app.selected.length > 0) {
        app.selected = model.view([]);
    }

    model.all.hide();

    // Deal with ghosts
    Object.values(state.sel_ghosts_requests).forEach((s, i) => {
        // Make each of these visible but translucent
        s.show();
        s.setProperty('opacity', 0.5);
    });

    // Doing this after the ghosts means any overlap will be fixed here
    app.displayed = displ;
    displ.setProperty('opacity', 1.0);

    // Center model
    if (sel && sel === displ) {
        // Center on the displayed view
        centerDisplayed(app);
    }

    // Clear the dropped views in the store as well, so that everything reading
    // sel_selected_view agrees with what is on screen. Write back only what we
    // actually dropped, to avoid churning the store on every views update.
    const data = {};
    if (staleSel) data.sel_selected_view = null;
    if (staleDispl) data.sel_displayed_view = null;

    return data;
}

export { viewsListener, resolveViews };
