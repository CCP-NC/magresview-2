import { render, screen } from '@testing-library/react';
import MVField from './MVField';

test('renders label and control children', () => {
    render(
        <MVField label="Tensor">
            <input type="text" data-testid="field-input" />
        </MVField>
    );

    expect(screen.getByText('Tensor')).toBeTruthy();
    expect(screen.getByTestId('field-input')).toBeTruthy();
});
