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

    const mainElement = cselElement.firstChild;
    expect(mainElement).toBeInTheDocument();

    const ddownElement = mainElement.nextSibling;
    expect(ddownElement).toBeInTheDocument();

    const firstOption = ddownElement.firstChild;
    expect(firstOption).toBeInTheDocument();

    const secondOption = firstOption.nextSibling;
    expect(secondOption).toBeInTheDocument();

    const thirdOption = secondOption.nextSibling;
    expect(thirdOption).not.toBeInTheDocument();

    // Now test selecting - use fireEvent for dropdown options since they have pointer-events: none when closed
    await user.click(mainElement);

    fireEvent.click(firstOption);
    expect(value).toBe('opt1');

    // the dropdown should close,
    // when we click on the option above
    // so we need to reopen it
    await user.click(mainElement);

    fireEvent.click(secondOption);
    expect(value).toBe('opt2');

    // Test opening and closing
    await user.click(mainElement);
    expect(cselElement.classList.contains('mv-cselect-closed')).toBe(false);
    fireEvent.mouseLeave(cselElement);
    expect(cselElement.classList.contains('mv-cselect-closed')).toBe(true);    

    cleanup();
});