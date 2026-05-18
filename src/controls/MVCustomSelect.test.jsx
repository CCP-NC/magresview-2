import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import MVCustomSelect, { MVCustomSelectOption } from './MVCustomSelect';
import userEvent from '@testing-library/user-event';
import React from 'react';

test('render MVCustomSelect', async () => {
    const user = userEvent.setup();
    
    var value = null;
    render(<MVCustomSelect title='mv-cselect' onSelect={(v) => {value = v;}}>
        <MVCustomSelectOption value='opt1'>Option 1</MVCustomSelectOption>
        <MVCustomSelectOption value='opt2'>Option 2</MVCustomSelectOption>
        <div>Does not belong</div>
    </MVCustomSelect>);

    const cselElement = screen.getByTitle('mv-cselect');
    expect(cselElement).toBeInTheDocument();

    const mainElement = cselElement.querySelector('.mv-cselect-main');
    expect(mainElement).toBeInTheDocument();

    // Dropdown renders as a portal into document.body — must open first
    await user.click(mainElement);
    const ddownElement = document.querySelector('.mv-cselect-ddown-portal');
    expect(ddownElement).toBeInTheDocument();

    const opts = ddownElement.querySelectorAll('.mv-cselect-opt');
    expect(opts).toHaveLength(2); // non-option <div> is filtered out

    const firstOption = opts[0];
    const secondOption = opts[1];

    fireEvent.click(firstOption);
    expect(value).toBe('opt1');

    // the dropdown closes after a click, so reopen for second option
    await user.click(mainElement);
    const ddownElement2 = document.querySelector('.mv-cselect-ddown-portal');
    fireEvent.click(ddownElement2.querySelectorAll('.mv-cselect-opt')[1]);
    expect(value).toBe('opt2');

    // Test opening and closing via mouseLeave on the portal dropdown
    await user.click(mainElement);
    expect(cselElement.classList.contains('mv-cselect-closed')).toBe(false);
    const ddownElement3 = document.querySelector('.mv-cselect-ddown-portal');
    fireEvent.mouseLeave(ddownElement3);
    expect(cselElement.classList.contains('mv-cselect-closed')).toBe(true);    

    cleanup();
});