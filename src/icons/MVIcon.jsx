import './MVIcon.css';

import React from 'react';

import MSIcon from './ms.svg?react';
import EFGIcon from './efg.svg?react';
import DipIcon from './dip.svg?react';
import JcoupIcon from './jcoup.svg?react';
import EulerIcon from './euler.svg?react';

const icons = {
    ms: MSIcon,
    efg: EFGIcon,
    dip: DipIcon,
    jcoup: JcoupIcon,
    euler: EulerIcon,
};

function MVIcon(props) {

    if (!(props.icon in icons)) {
        throw new Error('Invalid icon in MVIcon');
    }

    const Icon = icons[props.icon];
    const color = (props.color || '#ffffff');

    return (
        <span className='mv-icon-wrapper' style={{'--path-fill': color}}>
            <Icon className='mv-icon' {...props}/>
        </span>
        );
}

export default MVIcon;