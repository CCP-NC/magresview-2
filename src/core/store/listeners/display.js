import { centerDisplayed } from '../../../utils';

function displayListener(state) {

    const app = state.app_viewer;
    const toDisplay = state.app_model_queued;

    let data = {};

    // Apply theme
    app.theme = state.app_theme;

    if (app && toDisplay) {
        app.displayModel(toDisplay);
        data = {
            app_default_displayed: app.displayed,
            app_model_queued: null
        };

        // Center model
        centerDisplayed(app);
        
        // fix cell color to match theme
        app.model.box.color = state.app_theme.FwdColor3;
    }

    return data;
}

export { displayListener };