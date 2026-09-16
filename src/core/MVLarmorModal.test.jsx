import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import MVLarmorModal from './MVLarmorModal';
import { useAppInterface } from './store';

vi.mock('./store', () => ({
    useAppInterface: vi.fn(),
}));

const AL = { element: 'Al', isotope: 27, isotopeData: { spin: 2.5, gamma: 69763300.0 } };
const H  = { element: 'H',  isotope: 1,  isotopeData: { spin: 0.5, gamma: 267522128.0 } };
const NA = { element: 'Na', isotope: 23, isotopeData: { spin: 1.5, gamma: 70808493.0 } };

describe('MVLarmorModal', () => {
    let mockAppint;

    beforeEach(() => {
        mockAppint = {
            B0: '14.1',
            viewer: {
                model: {
                    // Every atom in the model, regardless of selection
                    all: { atoms: [AL, H, NA] }
                },
                // A selection that does NOT cover the whole model: the dialog
                // must ignore it, since B0 is a property of the instrument.
                selected: { atoms: [NA], length: 1 },
                displayed: { atoms: [AL, H, NA] }
            }
        };
        useAppInterface.mockReturnValue(mockAppint);
    });

    // inputs[0] = B0, inputs[1] = 1H master, then one per NMR-active isotope
    const inputs = () => screen.getAllByRole('textbox');

    it('renders master B0 and 1H frequency and isotope rows', () => {
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        expect(screen.getByText('Spectrometer field')).toBeInTheDocument();
        expect(screen.getByText('5/2')).toBeInTheDocument();
        expect(screen.getByText('3/2')).toBeInTheDocument();
        expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    // Regression guard for #7: listing getSel(app) showed only the selection.
    it('lists every isotope in the model, not just the selection', () => {
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        expect(screen.getByText('Al')).toBeInTheDocument();
        expect(screen.getByText('Na')).toBeInTheDocument();
        expect(screen.getByText('H')).toBeInTheDocument();
        // B0, 1H master, + one row each for Al, H, Na
        expect(inputs()).toHaveLength(5);
    });

    it('commits updated B0 on clicking OK', () => {
        const close = vi.fn();
        render(<MVLarmorModal display={true} close={close} />);

        expect(inputs()[0].value).toBe('14.1');
        fireEvent.change(inputs()[0], { target: { value: '9.4' } });
        fireEvent.click(screen.getByRole('button', { name: 'OK' }));

        expect(mockAppint.B0).toBe('9.4');
        expect(close).toHaveBeenCalled();
    });

    it('discards changes on clicking Cancel', () => {
        const close = vi.fn();
        render(<MVLarmorModal display={true} close={close} />);

        fireEvent.change(inputs()[0], { target: { value: '18.8' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(mockAppint.B0).toBe('14.1'); // unchanged
        expect(close).toHaveBeenCalled();
    });

    it('synchronizes 1H frequency when B0 changes', () => {
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        // 14.1 T -> approx 600.339 MHz
        expect(parseFloat(inputs()[1].value)).toBeCloseTo(600.339, 1);

        fireEvent.change(inputs()[1], { target: { value: '400.0' } });
        expect(parseFloat(inputs()[0].value)).toBeCloseTo(9.395, 2);
    });

    // Regression guard for #3. A controlled input whose value is reformatted
    // on every keystroke cannot be typed into: "6" becomes "6.000" with the
    // caret at the end, so the next digit lands in the decimals. fireEvent
    // .change with a complete string does not catch this — only real typing.
    it('lets the 1H frequency be typed digit by digit', async () => {
        const user = userEvent.setup();
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        const h1 = inputs()[1];
        await user.clear(h1);
        await user.type(h1, '400');

        expect(h1.value).toBe('400');
        expect(parseFloat(inputs()[0].value)).toBeCloseTo(9.395, 2);
    });

    it('lets an isotope frequency be typed digit by digit', async () => {
        const user = userEvent.setup();
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        // Rows are sorted by element: Al, H, Na -> Al is inputs()[2]
        const al = inputs()[2];
        await user.clear(al);
        await user.type(al, '104');

        expect(al.value).toBe('104');
        // B0 = 2*pi*nu / |gamma|
        const expectedB0 = (104e6 * 2 * Math.PI) / AL.isotopeData.gamma;
        expect(parseFloat(inputs()[0].value)).toBeCloseTo(expectedB0, 3);
    });

    it('allows a field to be cleared while typing', async () => {
        const user = userEvent.setup();
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        const h1 = inputs()[1];
        await user.clear(h1);

        expect(h1.value).toBe('');
        // B0 is left alone rather than being zeroed by an unparseable input
        expect(inputs()[0].value).toBe('14.1');
    });

    it('reformats an edited field once it loses focus', async () => {
        const user = userEvent.setup();
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        const h1 = inputs()[1];
        await user.clear(h1);
        await user.type(h1, '400');
        await user.tab();

        // Back to the canonical derived rendering
        expect(h1.value).toBe('400.000');
    });

    it('propagates an edit on one isotope to all the others', async () => {
        const user = userEvent.setup();
        render(<MVLarmorModal display={true} close={vi.fn()} />);

        const al = inputs()[2];
        await user.clear(al);
        await user.type(al, '104');
        await user.tab();

        const b0 = parseFloat(inputs()[0].value);
        const na = parseFloat(inputs()[4].value);   // Na row
        const expectedNa = Math.abs(NA.isotopeData.gamma) * b0 / (2 * Math.PI) / 1e6;
        expect(na).toBeCloseTo(expectedNa, 2);
    });

    it('renders with no model loaded', () => {
        mockAppint.viewer = { model: null };
        render(<MVLarmorModal display={true} close={vi.fn()} />);
        expect(screen.getByText(/No model atoms loaded/)).toBeInTheDocument();
    });

});
