import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import MVModal from './MVModal';

test('renders title and content when displayed', () => {
    render(
        <MVModal title="Test Modal" display={true}>
            <div>Modal Body</div>
        </MVModal>
    );

    expect(screen.getByText('Test Modal')).toBeTruthy();
    expect(screen.getByText('Modal Body')).toBeTruthy();
});

test('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
        <MVModal title="Test Modal" display={true} onClose={handleClose}>
            <div>Modal Body</div>
        </MVModal>
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
});

test('does not call onClose on Escape if display is false', () => {
    const handleClose = vi.fn();
    render(
        <MVModal title="Test Modal" display={false} onClose={handleClose}>
            <div>Modal Body</div>
        </MVModal>
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
});
