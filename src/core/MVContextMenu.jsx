/**
 * MVContextMenu — right-click context menu shown on atom right-click.
 */

import './MVContextMenu.css';
import React, { useEffect, useRef } from 'react';
import { useSelInterface, useAppInterface } from './store';
import useDipInterface from './store/interfaces/DipInterface';
import useEulerInterface from './store/interfaces/EulerInterface';

function MVContextMenu() {
    const selint  = useSelInterface();
    const appint  = useAppInterface();
    const dipint  = useDipInterface();
    const eulint  = useEulerInterface();
    const menuRef = useRef(null);

    const atom = selint.contextAtom;
    const pos  = selint.contextPos;

    // Close when clicking anywhere outside the menu
    useEffect(() => {
        if (!atom) return;
        const handleOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                selint.clearContextMenu();
            }
        };
        // Small delay so the pointerdown that opened the menu doesn't also close it
        const id = setTimeout(() => {
            document.addEventListener('pointerdown', handleOutside);
        }, 50);
        return () => {
            clearTimeout(id);
            document.removeEventListener('pointerdown', handleOutside);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [atom]);

    if (!atom || !pos) return null;

    // Clamp so menu doesn't overflow the viewport
    const menuW = 200;
    const menuH = 220;
    const left = Math.min(pos.x, window.innerWidth  - menuW - 8);
    const top  = Math.min(pos.y, window.innerHeight - menuH - 8);

    const close = () => selint.clearContextMenu();
    const act = (fn) => () => { fn(); close(); };

    const isSelected = (selint.selected?._indices || []).includes(
        ...([] /* placeholder; we check lazily below */)
    );
    void isSelected; // unused var — checking membership per-atom is done in helpers

    return (
        <div className='mv-ctx-menu' style={{ left, top }} ref={menuRef}>
            <div className='mv-ctx-header'>{atom.crystLabel}</div>

            {/* ── Selection actions ── */}
            <button className='mv-ctx-item'
                onClick={act(() => selint.addToSelection(atom))}>
                Add to selection
            </button>
            <button className='mv-ctx-item'
                onClick={act(() => selint.removeFromSelection(atom))}>
                Remove from selection
            </button>
            <button className='mv-ctx-item'
                onClick={act(() => selint.selectSameElement(atom))}>
                Select all {atom.element}
            </button>

            <div className='mv-ctx-divider' />

            {/* ── Mode shortcuts ── */}
            <button className='mv-ctx-item'
                onClick={act(() => {
                    appint.sidebar = 'dip';
                    dipint.centralAtom = atom;
                })}>
                Show dipolar couplings
            </button>
            <button className='mv-ctx-item'
                onClick={act(() => {
                    appint.sidebar = 'euler';
                    eulint.setAtomA(atom);
                })}>
                Set as Euler atom A
            </button>
            <button className='mv-ctx-item'
                onClick={act(() => {
                    appint.sidebar = 'euler';
                    eulint.setAtomB(atom);
                })}>
                Set as Euler atom B
            </button>
        </div>
    );
}

export default MVContextMenu;
