import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import MVSidebarPlots from './MVSidebarPlots';

vi.mock('./MagresViewSidebar', () => ({
    default: ({ children }) => <div>{children}</div>,
    MVAdvancedSection: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../controls/MVButton', () => ({
    default: ({ children, onClick, disabled }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));
vi.mock('../../controls/MVCheckBox', () => ({
    default: ({ children }) => <label>{children}</label>,
}));
vi.mock('../../controls/MVText', () => ({ default: () => <input /> }));
vi.mock('../../controls/MVRange', () => ({ default: () => <input type='range' /> }));
vi.mock('../../controls/MVTooltip', () => ({ default: () => <span /> }));
vi.mock('../../controls/MVCustomSelect', () => ({
    default: ({ children }) => <div>{children}</div>,
    MVCustomSelectOption: ({ children }) => <div>{children}</div>,
}));
// Keep the real switch semantics (disabled, title, aria-checked) — they are
// what this suite is checking.
vi.mock('../store', () => ({
    usePlotsInterface: vi.fn(),
    useMSInterface: vi.fn(() => ({ showRefTable: false, getReference: () => 10 })),
    useAppInterface: vi.fn(() => ({ showLarmorModal: false, advancedMode: false })),
}));

import { usePlotsInterface } from '../store';

const NO_QUAD = { applied: false, nShifted: 0, nUnreliable: 0, maxRatio: null };

function makePltint(overrides = {}) {
    return {
        app: {}, hasData: true, mode: 'line1d', elements: ['Al'], element: 'Al',
        setDefaultElement: vi.fn(),
        useRefTable: true, q2Shifts: false,
        quadEligibility: 'ok', canQuadShift: true, quadInfo: NO_QUAD,
        B0: '14.1', larmorH: 600.3,
        peakW: 0.5, broadeningType: 'lorentzian', showLabels: false,
        showXAxis: true, showYAxis: true, showGrid: true,
        rangeX: [0, 100], rangeY: [0, 5], autoScaleX: true, autoScaleY: true,
        xSteps: 801, setRange: vi.fn(),
        downloadSVG: vi.fn(), downloadData: vi.fn(),
        ...overrides,
    };
}

describe('MVSidebarPlots quadrupolar shift control', () => {

    beforeEach(() => vi.clearAllMocks());

    it('is off by default even when eligible', () => {
        usePlotsInterface.mockReturnValue(makePltint());
        render(<MVSidebarPlots show />);
        // 3 switches: plot on/off, shielding/shift, d_iso/d_obs
        const sw = screen.getAllByRole('switch')[2];
        expect(sw).toHaveAttribute('aria-checked', 'false');
        expect(sw).toHaveAttribute('aria-disabled', 'false');
    });

    it('shows as on once enabled', () => {
        usePlotsInterface.mockReturnValue(makePltint({ q2Shifts: true }));
        render(<MVSidebarPlots show />);
        expect(screen.getAllByRole('switch')[2]).toHaveAttribute('aria-checked', 'true');
    });

    // Every disabled state must carry its reason on the control itself, not
    // only in a note somewhere below it.
    it.each([
        ['not-quadrupolar', /not quadrupolar/i],
        ['integer-spin',    /no central transition/i],
        ['shielding-mode',  /shift, not a shielding/i],
        ['no-efg',          /No EFG data/i],
        ['no-field',        /valid spectrometer field/i],
    ])('explains why it is disabled: %s', (eligibility, pattern) => {
        usePlotsInterface.mockReturnValue(makePltint({
            quadEligibility: eligibility, canQuadShift: false, q2Shifts: true
        }));
        render(<MVSidebarPlots show />);

        const sw = screen.getAllByRole('switch')[2];
        expect(sw).toHaveAttribute('aria-disabled', 'true');
        // Never shows "on" while it is not actually doing anything
        expect(sw).toHaveAttribute('aria-checked', 'false');
        expect(sw.getAttribute('title')).toMatch(pattern);
        // and the same reason appears in the sidebar body
        expect(screen.getByText(pattern)).toBeInTheDocument();
    });

    // 'no-element' also covers the transient state during a model swap, where
    // there are no atoms to say anything about. Asserting "not quadrupolar"
    // there would be a claim about an empty set.
    it('does not nag before an element is chosen', () => {
        usePlotsInterface.mockReturnValue(makePltint({
            element: null, quadEligibility: 'no-element', canQuadShift: false
        }));
        render(<MVSidebarPlots show />);
        expect(screen.getAllByRole('switch')[2].getAttribute('title')).toBeNull();
        expect(screen.queryByText(/quadrupolar/i)).toBeNull();
    });

    // pointer-events:none stops the mouse, but the JS guard has to stop
    // everything else too — otherwise the switch is only cosmetically disabled.
    it('cannot be toggled while disabled, by pointer or keyboard', () => {
        const pltint = makePltint({ quadEligibility: 'shielding-mode', canQuadShift: false });
        usePlotsInterface.mockReturnValue(pltint);
        render(<MVSidebarPlots show />);

        const sw = screen.getAllByRole('switch')[2];
        expect(sw).not.toHaveAttribute('tabindex', '0');   // not keyboard reachable

        fireEvent.click(sw);
        fireEvent.keyDown(sw, { key: 'Enter' });
        fireEvent.keyDown(sw, { key: ' ' });
        expect(pltint.q2Shifts).toBe(false);               // setter never ran
    });

    it('can be toggled by keyboard when enabled', () => {
        const pltint = makePltint();
        usePlotsInterface.mockReturnValue(pltint);
        render(<MVSidebarPlots show />);

        const sw = screen.getAllByRole('switch')[2];
        expect(sw).toHaveAttribute('tabindex', '0');
        fireEvent.keyDown(sw, { key: ' ' });
        expect(pltint.q2Shifts).toBe(true);
    });

    it('reports what the listener actually did', () => {
        usePlotsInterface.mockReturnValue(makePltint({
            q2Shifts: true,
            quadInfo: { applied: true, nShifted: 4, nUnreliable: 0, maxRatio: 0.10 }
        }));
        render(<MVSidebarPlots show />);
        expect(screen.getByText(/4 peaks shifted by/)).toBeInTheDocument();
    });

    it('warns about sites beyond perturbation validity', () => {
        usePlotsInterface.mockReturnValue(makePltint({
            q2Shifts: true,
            quadInfo: { applied: true, nShifted: 4, nUnreliable: 1, maxRatio: 0.28 }
        }));
        render(<MVSidebarPlots show />);
        expect(screen.getByText(/1 of 4 shifted sites exceeds/)).toBeInTheDocument();
        expect(screen.getByText(/0\.28/)).toBeInTheDocument();
        expect(screen.getByText(/should not be trusted/)).toBeInTheDocument();
    });

    it('stays quiet when nothing was shifted', () => {
        usePlotsInterface.mockReturnValue(makePltint({ q2Shifts: true }));
        render(<MVSidebarPlots show />);
        expect(screen.queryByText(/shifted by/)).toBeNull();
        expect(screen.queryByText(/should not be trusted/)).toBeNull();
    });

});
