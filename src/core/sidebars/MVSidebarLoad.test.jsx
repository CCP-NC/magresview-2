import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import MVSidebarLoad from './MVSidebarLoad';

// Keep sidebar shell simple for this interaction test.
vi.mock('./MagresViewSidebar', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

// Keep file/session widgets minimal; they are unrelated to this test.
vi.mock('../../controls/MVFile', () => ({
    default: () => <div data-testid='mv-file' />,
}));
vi.mock('../../controls/MVBox', () => ({
    default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../controls/MVButton', () => ({
    default: ({ children, onClick, disabled }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));
vi.mock('../../controls/MVCheckBox', () => ({
    default: ({ children }) => <label>{children}</label>,
}));
vi.mock('../../controls/MVCustomSelect', () => ({
    default: ({ children }) => <div>{children}</div>,
    MVCustomSelectOption: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../controls/MVTooltip', () => ({
    default: () => <span />,
}));
vi.mock('../../controls/MVRange', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

// Avoid real store/session coupling.
vi.mock('../store', () => ({
    useAppInterface: vi.fn(),
    default: {},
}));
vi.mock('../store/session', () => ({
    downloadSession: vi.fn(),
    parseSessionDocument: vi.fn(),
    SESSION_EXTENSION: 'mvsession',
}));

import { useAppInterface } from '../store';

test('clicking delete icon does not bubble into row selection display()', async () => {
    const user = userEvent.setup();

    const appint = {
        initialised: true,
        models: ['model_a', 'model_b'],
        currentModelName: 'model_a',
        loadAsMol: null,
        useNMRIsotopes: true,
        vdwScaling: 1,
        autosaveWarning: false,
        display: vi.fn(),
        reload: vi.fn(),
        delete: vi.fn(),
        load: vi.fn(),
        restoreSession: vi.fn(),
    };

    useAppInterface.mockReturnValue(appint);

    render(<MVSidebarLoad show />);

    const deleteIcons = screen.getAllByTitle('Delete model');
    await user.click(deleteIcons[1]);

    expect(appint.delete).toHaveBeenCalledTimes(1);
    expect(appint.delete).toHaveBeenCalledWith('model_b');
    expect(appint.display).not.toHaveBeenCalledWith('model_b');
});
