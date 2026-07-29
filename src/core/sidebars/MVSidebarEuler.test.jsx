import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import MVSidebarEuler from './MVSidebarEuler';

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
    default: ({ children, onCheck, checked }) => (
        <label><input type='checkbox' checked={checked} onChange={(e) => onCheck(e.target.checked)} />{children}</label>
    ),
}));
vi.mock('../../controls/MVSwitch', () => ({
    default: ({ onClick }) => <div data-testid='switch' onClick={onClick} />,
}));
vi.mock('../../controls/MVModal', () => ({
    default: ({ children, title }) => <div data-testid='modal'>{title}{children}</div>,
}));
vi.mock('../../controls/MVCustomSelect', () => ({
    default: ({ children }) => <div>{children}</div>,
    MVCustomSelectOption: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../utils', () => ({
    saveContents: vi.fn(),
    copyContents: vi.fn(),
    chainClasses: (...args) => args.filter(Boolean).join(' '),
}));

vi.mock('../store', () => ({
    useEulerInterface: vi.fn(),
    useAppInterface: vi.fn(() => ({ advancedMode: false })),
}));

import { useEulerInterface } from '../store';
import { copyContents } from '../../utils';

function makeEulint(overrides = {}) {
    const configs = [
        { index: 0, id: 'c0', aFlip: 'identity', bFlip: 'identity', alpha: 10, beta: 20, gamma: 30, singular: false, active: true },
        { index: 1, id: 'c1', aFlip: 'flip-x', bFlip: 'identity', alpha: 40, beta: 50, gamma: 60, singular: false, active: false },
        { index: 2, id: 'c2', aFlip: 'flip-y', bFlip: 'flip-z', alpha: 70, beta: 80, gamma: 90, singular: false, active: false },
    ];
    return {
        atomA: {}, atomB: {},
        atomLabelA: 'Si1', atomLabelB: 'Si1',
        tensorA: 'ms', tensorB: 'efg',
        orderA: 'haeberlen', orderB: 'haeberlen',
        sequence: 'zyz', active: true,
        disksOn: true,
        orientationClass: 'discrete',
        configs,
        activeConfig: 0,
        cycleConfig: vi.fn(),
        csvTable: vi.fn(() => 'CSV'),
        hasMSData: true, hasEFGData: true,
        txtReport: () => '', txtSelfAngleTable: () => '',
        ...overrides,
    };
}

test('by default shows only the active angle set (single row), not the full table', () => {
    useEulerInterface.mockReturnValue(makeEulint());
    render(<MVSidebarEuler show />);

    // thead row + 1 body row
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('10.00'); // active config alpha
    expect(screen.queryByTestId('modal')).toBeNull();
});

test('Prev / Next buttons cycle the configuration', async () => {
    const user = userEvent.setup();
    const eulint = makeEulint();
    useEulerInterface.mockReturnValue(eulint);
    render(<MVSidebarEuler show />);

    await user.click(screen.getByText(/Next/));
    expect(eulint.cycleConfig).toHaveBeenCalledWith(1);
    await user.click(screen.getByText(/Prev/));
    expect(eulint.cycleConfig).toHaveBeenCalledWith(-1);
});

test('"Show all" opens a modal with the full table and CSV copy', async () => {
    const user = userEvent.setup();
    const eulint = makeEulint();
    useEulerInterface.mockReturnValue(eulint);
    render(<MVSidebarEuler show />);

    await user.click(screen.getByText(/Show all/));
    const modal = screen.getByTestId('modal');
    // full table inside the modal: thead + 3 body rows = 4 rows
    expect(within(modal).getAllByRole('row')).toHaveLength(4);

    await user.click(screen.getByText(/Copy CSV/));
    expect(copyContents).toHaveBeenCalledWith('CSV');
});

test('shows a message instead of a table for continuous orientations', () => {
    useEulerInterface.mockReturnValue(makeEulint({ orientationClass: 'continuous', configs: [] }));
    render(<MVSidebarEuler show />);
    expect(screen.getByText(/axially symmetric/)).toBeTruthy();
    expect(screen.queryByRole('row')).toBeNull();
});

test('"View Rotation Matrix" opens a modal displaying rotation matrix info and copy button', async () => {
    const user = userEvent.setup();
    const eulint = makeEulint({
        currentRotationMatrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        txtRotationMatrixReport: vi.fn(() => 'Matrix Report')
    });
    useEulerInterface.mockReturnValue(eulint);
    render(<MVSidebarEuler show />);

    await user.click(screen.getByText(/View Rotation Matrix/));
    const modal = screen.getByTestId('modal');
    expect(modal.textContent).toContain('Rotation Matrix');

    await user.click(screen.getByText(/Copy Matrix/));
    expect(copyContents).toHaveBeenCalledWith('Matrix Report');
});
