import './MVField.css';
import React from 'react';
import { chainClasses } from '../utils';

function MVField(props) {
    const { label, layout = 'column', className, style, children } = props;

    return (
        <div className={chainClasses('mv-control', 'mv-field', `mv-field-${layout}`, className)} style={style}>
            {label && <label className='mv-field-label'>{label}</label>}
            <div className='mv-field-control'>
                {children}
            </div>
        </div>
    );
}

export default MVField;
