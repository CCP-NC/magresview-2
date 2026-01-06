import { cleanup, render, screen } from '@testing-library/react';
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