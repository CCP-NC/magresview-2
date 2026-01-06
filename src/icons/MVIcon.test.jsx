import { cleanup, render, screen } from '@testing-library/react';
import MVIcon from './MVIcon';

test('render MVIcon', () => {
    render(<MVIcon icon='ms' color='#ff0000' data-testid='icon'/>);

    const iconElement = screen.getByTestId('icon');
    expect(iconElement).toBeInTheDocument();
    // The color is applied to the wrapper span, not the icon itself
    const wrapperElement = iconElement.parentElement;
    expect(wrapperElement.style.getPropertyValue('--path-fill')).toBe('#ff0000');

    cleanup();
});