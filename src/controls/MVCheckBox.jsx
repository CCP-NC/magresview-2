import './MVCheckBox.css';

import React from 'react';

import { useId, chainClasses } from '../utils';

function MVCheckBox(props) {

    const id = useId('checkbox');

    var style = {};
    if (props.color) {
        style['--check-color'] = props.color;
    }

    const onCheck = props.onCheck || (() => {});
    const disabled = Boolean(props.disabled);

    return (
        <span
            className={chainClasses('mv-control', 'mv-checkbox', disabled ? 'mv-checkbox-disabled' : null)}
            style={style}
            title={props.title}
        >
            <input
                id={id}
                type='checkbox'
                checked={props.checked}
                disabled={disabled}
                onChange={(e) => {
                    if (!disabled) {
                        onCheck(e.target.checked);
                    }
                }}
            />
            <label htmlFor={id}/>{props.children}
        </span>
    );
}

export default MVCheckBox;