import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';

import MVRadioButton, { MVRadioGroup } from './MVRadioButton';

function TestGroup(props) {
    const [selected, setSelected] = useState('a');

    return (
        <MVRadioGroup label='Group' name='test_radio'
                      selected={selected}
                      onSelect={(v) => { setSelected(v); props.onSelect?.(v); }}>
            <MVRadioButton value='a'>A</MVRadioButton>
            <MVRadioButton value='b'>B</MVRadioButton>
            <MVRadioButton value='c' disabled={props.disableC} title='c-radio'>C</MVRadioButton>
        </MVRadioGroup>
    );
}

test('selects radio buttons in a group', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<TestGroup onSelect={onSelect} />);

    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(3);
    expect(radios[0]).toBeChecked();

    await user.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith('b');
    expect(radios[1]).toBeChecked();
});

test('disabled radio button cannot be selected', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<TestGroup onSelect={onSelect} disableC={true} />);

    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeDisabled();
    expect(screen.getByTitle('c-radio')).toHaveClass('mv-radio-disabled');

    // pointer-events: none — clicking must not change the selection
    await user.click(radios[2]).catch(() => {});
    expect(onSelect).not.toHaveBeenCalledWith('c');
    expect(radios[0]).toBeChecked();
});
