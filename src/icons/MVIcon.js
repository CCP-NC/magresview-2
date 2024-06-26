import './MVIcon.css';

import React from 'react';

import { ReactComponent as MSIcon } from './ms.svg';
import { ReactComponent as EFGIcon } from './efg.svg';
import { ReactComponent as DipIcon } from './dip.svg';
import { ReactComponent as JcoupIcon } from './jcoup.svg';
import { ReactComponent as EulerIcon } from './euler.svg';

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
        <Icon className='mv-icon' style={{'--path-fill': color}} {...props}/>
        );
}

export default MVIcon;