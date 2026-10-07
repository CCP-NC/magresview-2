import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import MVCheckBox from './MVCheckBox';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

test('renders MVCheckBox', async () => {
    const user = userEvent.setup();

    // Container component
    function TestComp(props) {
        const [ state, setState ] = useState(true);

        return (<MVCheckBox title='cbox' checked={state} onCheck={() => {setState(!state);}}>
            <span data-testid='label'>CheckBox Label</span>
        </MVCheckBox>);
    }

    render(<TestComp />);

    const checkBoxElement = screen.getByTitle('cbox');
    const checkLabelElement = screen.getByTestId('label');
    const inputElement = screen.getByRole('checkbox');

    expect(checkBoxElement).toBeInTheDocument();
    expect(inputElement).toBeInTheDocument();
    expect(checkLabelElement).toBeInTheDocument();

    await user.click(inputElement);
    expect(inputElement).toHaveProperty('checked', false);

    await user.click(inputElement);
    expect(inputElement).toHaveProperty('checked', true);

    cleanup();
});

test('respects disabled prop', async () => {
    let clicked = false;

    render(
        <MVCheckBox title='disabled-cbox' checked={false} disabled={true} onCheck={() => { clicked = true; }}>
            <span>Disabled Label</span>
        </MVCheckBox>
    );

    const inputElement = screen.getByRole('checkbox');
    const container = screen.getByTitle('disabled-cbox');

    expect(inputElement).toBeDisabled();
    expect(container).toHaveClass('mv-checkbox-disabled');

    fireEvent.click(inputElement);
    expect(clicked).toBe(false);

    cleanup();
});