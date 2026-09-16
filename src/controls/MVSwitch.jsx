import './MVSwitch.css';
import { chainClasses } from '../utils';

/**
 * Two-state toggle.
 *
 * props:
 *   on        : current state
 *   onClick   : called when toggled
 *   disabled  : renders dimmed and ignores both pointer and keyboard input
 *   title     : hover text. When the switch is disabled this is where the
 *               *reason* belongs, so the explanation is available without
 *               hunting for a note elsewhere on the page.
 */
function MVSwitch(props) {

    const style = {
        '--color-true': props.colorTrue || 'var(--ok-color-2)',
        '--color-false': props.colorFalse || 'var(--err-color-2)'
    };

    const disabled = !!props.disabled;

    function toggle() {
        if (disabled || !props.onClick) return;
        props.onClick();
    }

    function onKeyDown(e) {
        // Space and Enter are the expected activators for role="switch"
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggle();
        }
    }

    return (<div className={chainClasses('mv-control mv-switch',
                                         props.on? 'mv-switch-true' : 'mv-switch-false',
                                         disabled? 'mv-switch-disabled' : '')}
        style={style}
        role='switch'
        aria-checked={!!props.on}
        aria-disabled={disabled}
        aria-label={props.label}
        title={props.title}
        tabIndex={disabled ? -1 : 0}
        onClick={toggle}
        onKeyDown={onKeyDown}>
        <div className='mv-switch-thumb'></div>
    </div>);
}

export default MVSwitch;
