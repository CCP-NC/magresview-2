import './MVCard.css';
import React from 'react';
import { chainClasses } from '../utils';

function MVCard(props) {
    const { title, badge, headerAction, className, style, children } = props;
    const hasHeader = title || badge || headerAction;

    return (
        <div className={chainClasses('mv-control', 'mv-card', className)} style={style}>
            {hasHeader && (
                <div className='mv-card-header'>
                    {title && <span className='mv-card-title'>{title}</span>}
                    <div className='mv-card-header-right'>
                        {badge && (
                            <span className={`mv-card-badge${badge.unset ? ' unset' : ''}`}>
                                {typeof badge === 'object' ? badge.text : badge}
                            </span>
                        )}
                        {headerAction}
                    </div>
                </div>
            )}
            <div className='mv-card-body'>
                {children}
            </div>
        </div>
    );
}

export default MVCard;
