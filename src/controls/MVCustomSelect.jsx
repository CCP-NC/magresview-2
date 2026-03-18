import './controls.css';
import './MVCustomSelect.css';

import React, { useState, cloneElement, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaCaretDown } from 'react-icons/fa';

import { chainClasses } from '../utils';

function MVCustomSelectOption(props) {

    const onClick = props.onClick || (() => {});

    return (
        <div className='mv-control mv-cselect-opt' onClick={onClick}>
            {props.icon? props.icon : <span></span>}
            {props.children}
        </div>
    );
}

function MVCustomSelect(props) {

    const [show, setShow] = useState(false);
    const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Gather the options — use React.Children.toArray for robustness
    const options = React.Children.toArray(props.children).filter((c) => c.type === MVCustomSelectOption);
    const values = options.map((o) => o.props.value);

    const selected = values.findIndex((v) => v === props.selected);
    const onSelect = props.onSelect || (() => {});

    // If disabled while open, must close
    useEffect(() => {
        if (props.disabled) setShow(false);
    }, [props.disabled]);

    const openDropdown = useCallback(() => {
        if (props.disabled) return;
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropPos({ top: rect.bottom, left: rect.left, width: rect.width });
        }
        setShow(true);
    }, [props.disabled]);

    // Close when clicking outside — but NOT when clicking inside the portal dropdown itself
    useEffect(() => {
        if (!show) return;
        const handler = (e) => {
            const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
            const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
            if (!inTrigger && !inDropdown) {
                setShow(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [show]);

    // Dropdown rendered into document.body via portal — immune to any ancestor overflow/z-index
    const dropdown = show ? createPortal(
        <div
            ref={dropdownRef}
            className='mv-control mv-cselect-ddown mv-cselect-ddown-portal'
            style={{
                position: 'fixed',
                top: dropPos.top,
                left: dropPos.left,
                width: dropPos.width,
                zIndex: 10000,
            }}
            onMouseLeave={() => setShow(false)}
        >
            {options.map((o, i) =>
                cloneElement(o, { key: i, onClick: () => { setShow(false); onSelect(values[i]); } })
            )}
        </div>,
        document.body
    ) : null;

    return (
        <>
            <div
                ref={triggerRef}
                className={chainClasses('mv-control', 'mv-cselect',
                    show ? null : 'mv-cselect-closed',
                    props.disabled ? 'mv-cselect-disabled' : null)}
                title={props.title}
            >
                <div className='mv-control mv-cselect-main' onClick={openDropdown}>
                    {options[selected]}
                    <span className='mv-cselect-main-caret'><FaCaretDown /></span>
                </div>
            </div>
            {dropdown}
        </>
    );
}

export { MVCustomSelectOption };
export default MVCustomSelect;