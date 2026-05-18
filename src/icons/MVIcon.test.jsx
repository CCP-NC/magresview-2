import { cleanup, render, screen } from '@testing-library/react';
import MVIcon from './MVIcon';

test('render MVIcon', () => {
    render(<MVIcon icon='ms' color='#ff0000' data-testid='icon'/>);

    const iconElement = screen.getByTestId('icon');
    expect(iconElement).toBeInTheDocument();
    // The color is applied as the `color` style on the wrapper span
    const wrapperElement = iconElement.parentElement;
    expect(wrapperElement).toHaveStyle('color: #ff0000');

    cleanup();
});