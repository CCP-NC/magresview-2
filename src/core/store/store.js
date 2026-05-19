import { createStore } from 'redux';
import { autosaveSession } from './session';

// Initial state, merged from segments
import { initialAppState } from './interfaces/AppInterface';
import { initialSelState } from './interfaces/SelInterface';
import { initialCScaleState } from './interfaces/CScaleInterface';
import { initialMSState } from './interfaces/MSInterface';
import { initialEFGState } from './interfaces/EFGInterface';
import { initialDipState } from './interfaces/DipInterface';
import { initialJCoupState } from './interfaces/JCoupInterface';
import { initialEulerState } from './interfaces/EulerInterface';
import { initialPlotsState } from './interfaces/PlotsInterface';
import { initialFilesState } from './interfaces/FilesInterface';
import makeMasterListener, { initialListenerState } from './listeners';

// Merging together
const initialState = {
    ...initialAppState,
    ...initialSelState,
    ...initialCScaleState,
    ...initialMSState,
    ...initialEFGState,
    ...initialDipState,
    ...initialJCoupState,
    ...initialEulerState,
    ...initialFilesState,
    ...initialPlotsState,
    ...initialListenerState
};

// Reducer
function storeReducer(state=initialState, action={type: 'none'}) {
    switch(action.type) {
        case 'set':
            // Set a single value
            state = {
                ...state,
                [action.key]: action.value,
            };
            break;
        case 'update':
            // Set multiple values
            state = {
                ...state,
                ...action.data
            };
            break;
        case 'call':
            // Do complex stuff with state
            let args = [state].concat(action.arguments);
            let data = action.function(...args);
            state = {
                ...state,
                ...data
            };
            break;
        default:
            break;
    }

    return state;
};

const magresStore = createStore(storeReducer);
magresStore.subscribe(makeMasterListener(magresStore));

// ── Autosave to localStorage ──────────────────────────────────────────────────
// Debounce autosaves so rapid dispatch bursts don't thrash localStorage.
// The beforeunload handler flushes any pending save immediately when the user
// navigates away / closes the tab, ensuring the last state is captured.
let _autosaveTimer = null;
magresStore.subscribe(() => {
    clearTimeout(_autosaveTimer);
    _autosaveTimer = setTimeout(() => autosaveSession(magresStore), 2000);
});

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        clearTimeout(_autosaveTimer);
        autosaveSession(magresStore);
    });
}

export default magresStore;