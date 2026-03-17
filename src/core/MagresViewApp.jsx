/**
 * MagresView 2.0
 *
 * A web interface to visualize and interact with computed NMR data in the Magres
 * file format.
 *
 * Author: Simone Sturniolo
 *
 * Copyright 2022 Science and Technology Facilities Council
 * This software is distributed under the terms of the MIT License
 * Please refer to the file LICENSE for the text of the license
 * 
 */

import './themes.css';
import '../controls/controls.css';
import './MagresViewApp.css';
import React, { useEffect, useRef, useState } from 'react';

import { useHotkeys } from './hotkeys/useHotkeys';
import MVHotkeyHelp from './hotkeys/MVHotkeyHelp';

import { chainClasses } from '../utils';
import { useAppInterface, useSelInterface, useDipInterface, useEulerInterface, useJCoupInterface } from './store';

import MagresViewHeader from './MagresViewHeader';
import MagresViewScreenshot from './MagresViewScreenshot';
import MVStatusBar from './MVStatusBar';
import MVModeOverlay from './MVModeOverlay';
import MVModeToolbar from './MVModeToolbar';

import MVSidebarLoad from './sidebars/MVSidebarLoad';
import MVSidebarSelect from './sidebars/MVSidebarSelect';
import MVSidebarMS from './sidebars/MVSidebarMS';
import MVSidebarEFG from './sidebars/MVSidebarEFG';
import MVSidebarDip from './sidebars/MVSidebarDip';
import MVSidebarJCoup from './sidebars/MVSidebarJCoup';
import MVSidebarEuler from './sidebars/MVSidebarEuler';
import MVSidebarPlots from './sidebars/MVSidebarPlots';
import MVSidebarFiles from './sidebars/MVSidebarFiles';

import MVPlot1D from './plot/MVPlot1D';

function MagresViewPage() {

    const [hovered, setHovered] = useState(false);
    const { helpOpen, setHelpOpen } = useHotkeys();

    let appint = useAppInterface();
    let selint = useSelInterface();
    let dipint = useDipInterface();
    let eulint = useEulerInterface();
    let jcint  = useJCoupInterface();

    const appRef = useRef(appint);
    const pageRef = useRef(null);

    // Keep interface refs current so effects can safely access latest state
    const selRef = useRef(selint);
    const dipRef = useRef(dipint);
    const eulRef = useRef(eulint);
    const jcRef  = useRef(jcint);
    selRef.current = selint;
    dipRef.current = dipint;
    eulRef.current = eulint;
    jcRef.current  = jcint;

    useEffect(() => {
        // Focus the page container so hotkeys work immediately on load,
        // before the user has clicked anywhere.
        pageRef.current?.focus({ preventScroll: true });

        // Clear any existing canvases before initializing (prevents double canvas in StrictMode)
        const container = document.getElementById('mv-appwindow');
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
        
        appRef.current.initialise('#mv-appwindow');

        return () => {
            console.log('Destroying app');
            if (appRef.current && appRef.current.viewer && typeof appRef.current.viewer.destroy === 'function') {
                appRef.current.viewer.destroy();
            }
        };
    }, []);

    // Centralised click-handler bind/unbind.
    // The active sidebar determines which interface owns mouse clicks:
    //   dip   → dipolar coupling picker  (always bound; isOn auto-enabled on entry)
    //   jcoup → J-coupling picker         (always bound; isOn auto-enabled on entry)
    //   euler → Euler-angle atom picker
    //   any other sidebar → normal atom selection (always enabled)
    const sidebar = appint.sidebar;
    useEffect(() => {
        const sel = selRef.current;
        const dip = dipRef.current;
        const eul = eulRef.current;
        const jc  = jcRef.current;

        if (sidebar === 'dip') {
            sel.unbind();
            dip.bind();   // isOn was auto-enabled by sidebar setter
            jc.unbind();
            eul.unbind();
        } else if (sidebar === 'jcoup') {
            sel.unbind();
            dip.unbind();
            jc.bind();    // isOn was auto-enabled by sidebar setter
            eul.unbind();
        } else if (sidebar === 'euler') {
            sel.unbind();
            dip.unbind();
            jc.unbind();
            eul.bind();
        } else {
            // All other sidebars: selection always active.
            sel.bind();
            dip.unbind();
            jc.unbind();
            eul.unbind();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sidebar]);


    // Handling the dragging events
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        setHovered(true);        
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        setHovered(false);        
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            appint.load(e.dataTransfer.files)
            e.dataTransfer.clearData()
        }        
        setHovered(false);
    }

    return (<div ref={pageRef}
                 className={chainClasses('mv-main-page', 'theme-' + appint.themeName, hovered? 'has-drag' : '' )}
                 tabIndex={-1}
                 onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
                <MagresViewHeader onHelpOpen={() => setHelpOpen(true)} />
                <MVHotkeyHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
                <MVModeToolbar />
                <MVSidebarLoad show={appint.sidebar === 'load'} />
                <MVSidebarSelect show={appint.sidebar === 'select'} />
                <MVSidebarMS show={appint.sidebar === 'ms'} />
                <MVSidebarEFG show={appint.sidebar === 'efg'} />
                <MVSidebarDip show={appint.sidebar === 'dip'} />
                <MVSidebarJCoup show={appint.sidebar === 'jcoup'} />
                <MVSidebarEuler show={appint.sidebar === 'euler'} />
                <MVSidebarPlots show={appint.sidebar === 'plots'} />
                <MVSidebarFiles show={appint.sidebar === 'files'} />
                <div id='mv-appwindow' className='mv-background'/>
                <MVModeOverlay />
                <MVStatusBar />
                <MagresViewScreenshot />
                <div className='drag-overlay' />
            { /* Modals */ }
                <MVPlot1D />
            </div>);
}

function MagresViewApp() {

    return (
        <div className='mv-main-app'>
            <MagresViewPage />
        </div>
    );
}

export default MagresViewApp;