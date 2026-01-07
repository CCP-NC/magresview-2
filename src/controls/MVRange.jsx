import './MVRange.css';
import './MVText.css'; 

import React, { useState, useRef, useEffect } from 'react';

import { regularExpressions, useId } from '../utils';
import MVText from './MVText';
import MVTooltip from './MVTooltip';

function MVRange(props) {

    // Range definition
    const min = 'min' in props? props.min : 0;
    const max = 'max' in props? props.max : 100;
    const defaultValue = 'default' in props? props.default : (min + max) / 2;
    const step = 'step' in props? props.step : 1;

    function toNumber(v) {
        v = parseFloat(v);
        // The slider already constrains to min/max
        // and steps correctly, so let's allow the user
        // to enter any value they want here.

        // v = Math.min(v, max);
        // v = Math.max(v, min);
        // round to the nearest step
        // v = Math.round(v / step) * step;
        
        // fix rounding errors
        v = parseFloat(v.toFixed(6));
        return v;
    }

    const in_val = (props.value != null? toNumber(props.value) : defaultValue);
    const id = useId('range');

    const [text, setText] = useState(in_val.toString());

    // Style (custom color)
    var style = {};
    if (props.color) {
        style['--outline-color'] = props.color;
        style['--thumb-color'] = props.color;
    }

    let tooltip = <></>;
    if (props.tooltip) {
        tooltip = <MVTooltip tooltipText={props.tooltip}/>;
    }

    function acceptValue(v) {
        v = toNumber(v);

        if (props.onChange)
            props.onChange(v);
    }

    let stateRef = useRef();
    stateRef.current = [text, setText];

    // Update the text value if the props one changed and if necessary
    useEffect(() => {
        const [text, setText] = stateRef.current;

        if (parseFloat(text) !== in_val)
            setText(in_val.toString());
    }, [in_val]);


    return (
        <div className='mv-control'>
            {/* label and tooltip if there is one */}
           <span className='mv-tooltip'>
                {props.children? <label htmlFor={id} className='mv-rangelabel'>{props.children}</label> : <></>}
                &nbsp;
                {tooltip}
            </span>
            <span className='mv-control mv-range' style={style}>
                <input className='mv-range-slider' type='range' id={id} onInput={(e) => { acceptValue(e.target.value); }}
                 min={min} max={max} step={step} value={in_val} disabled={props.disabled}/>
                <MVText size={4} filter={regularExpressions.float} value={text} onChange={setText} onSubmit={acceptValue} disabled={props.disabled}/>
            </span>
        </div>);
}

export default MVRange;