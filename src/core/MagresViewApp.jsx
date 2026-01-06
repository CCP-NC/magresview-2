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

import { chainClasses } from '../utils';
import { useAppInterface } from './store';

import MagresViewHeader from './MagresViewHeader';
import MagresViewScreenshot from './MagresViewScreenshot';

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

    let appint = useAppInterface();

    const appRef = useRef(appint);
    const appWindowRef = useRef(null); // reference to the DOM element

    useEffect(() => {
        // Clear any existing canvases before initializing
        if (appWindowRef.current) {
            while (appWindowRef.current.firstChild) {
                appWindowRef.current.removeChild(appWindowRef.current.firstChild);
            }
        }
        
        appRef.current.initialise(appWindowRef.current);

        return () => {
            console.log('Destroying app');
            if (appRef.current && typeof appRef.current.destroy === 'function') {
                appRef.current.destroy();
            }
        }
    }, []);


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

    // keyboad shortcuts
    // TODO: move elsewhere!
    useEffect(() => {
        // keyboard
        function handleKeyDown(e) {
            // let sidebarList = ['load', 'select', 'ms', 'efg', 'dip', 'jcoup', 'euler', 'plots', 'files'];
            if (e.key === 'Escape') {
                appRef.current.sidebar = 'none';
            }
            // // number keys index the sidebars
            // else if (e.key >= '1' && e.key <= '9') {
            //     let idx = parseInt(e.key) - 1;
            //     if (idx < sidebarList.length) {
            //         appRef.current.sidebar = sidebarList[idx];
            //     }
            // }
            else if (e.key === 'l') {
                appRef.current.sidebar = 'load';
            }
            else if (e.key === 's') {
                appRef.current.sidebar = 'select';
            }
            else if (e.key === 'm') {
                appRef.current.sidebar = 'ms';
            }
            else if (e.key === 'e') {
                appRef.current.sidebar = 'efg';
            }
            else if (e.key === 'd') {
                appRef.current.sidebar = 'dip';
            }
            else if (e.key === 'j') {
                appRef.current.sidebar = 'jcoup';
            }
            else if (e.key === 'u') {
                appRef.current.sidebar = 'euler';
            }
            else if (e.key === 'p') {
                appRef.current.sidebar = 'plots';
            }
            else if (e.key === 'f') {
                appRef.current.sidebar = 'files';
            }

        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
        // disable es lint warning
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
      <div
        className={chainClasses(
          "mv-main-page",
          "theme-" + appint.theme,
          hovered ? "has-drag" : ""
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <MagresViewHeader />
        <MVSidebarLoad show={appint.sidebar === "load"} />
        <MVSidebarSelect show={appint.sidebar === "select"} />
        <MVSidebarMS show={appint.sidebar === "ms"} />
        <MVSidebarEFG show={appint.sidebar === "efg"} />
        <MVSidebarDip show={appint.sidebar === "dip"} />
        <MVSidebarJCoup show={appint.sidebar === "jcoup"} />
        <MVSidebarEuler show={appint.sidebar === "euler"} />
        <MVSidebarPlots show={appint.sidebar === "plots"} />
        <MVSidebarFiles show={appint.sidebar === "files"} />
        <div id="mv-appwindow" className="mv-background" ref={appWindowRef} />
        <MagresViewScreenshot />
        <div className="drag-overlay" />
        {/* Modals */}
        <MVPlot1D />
      </div>
    );
}

function MagresViewApp() {

    return (
        <div className='mv-main-app'>
            <MagresViewPage />
        </div>
    );
}

export default MagresViewApp;