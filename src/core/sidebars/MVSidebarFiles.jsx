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

import './MVSidebarFiles.css';

import MagresViewSidebar from './MagresViewSidebar';

import MVButton from '../../controls/MVButton';
import MVCustomSelect, { MVCustomSelectOption } from '../../controls/MVCustomSelect';
import MVIcon from '../../icons/MVIcon';
import { GiSpinningTop } from 'react-icons/gi';

import MVCheckBox from '../../controls/MVCheckBox';

import { useFilesInterface } from '../store';
import { saveContents } from '../../utils';

const saveFile = (c, fn) => { saveContents('data:,' + c, fn); }

function selectquadorder(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h4>Quadrupole order:</h4>
        <MVCustomSelect selected={fileint.spinSysQuadrupoleOrder} onSelect={(v) => { fileint.spinSysQuadrupoleOrder = v; }}>
            <MVCustomSelectOption value={0}>0</MVCustomSelectOption>
            <MVCustomSelectOption value={1}>1</MVCustomSelectOption>
            <MVCustomSelectOption value={2}>2</MVCustomSelectOption>
        </MVCustomSelect>
    </div>);

}


function spinSysOptions(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3>Include:</h3>
        <MVCheckBox checked={fileint.spinSysIncludeMS} onCheck={(v) => { fileint.spinSysIncludeMS = v; }}>MS tensors</MVCheckBox>
        <MVCheckBox checked={fileint.spinSysIncludeEFG} onCheck={(v) => { fileint.spinSysIncludeEFG = v; }}>EFG tensors</MVCheckBox>
        {/* <MVCheckBox checked={fileint.spinSysIncludeJ} onCheck={(v) => { fileint.spinSysIncludeJ = v; }}>J couplings</MVCheckBox> */}
        <MVCheckBox checked={fileint.spinSysIncludeD} onCheck={(v) => { fileint.spinSysIncludeD = v; }}>Dipolar couplings</MVCheckBox>
        {/* if EFG is selected, show quadrupole selector */}
        {fileint.spinSysIncludeEFG ? selectquadorder(fileint) : null}

    </div>);
}

function MVSidebarFiles(props) {

    const fileint = useFilesInterface();

    return (<MagresViewSidebar title='Report files' show={props.show}>
        <div className='mv-sidebar-block'>
            <h3>File type:</h3>
            <MVCustomSelect selected={fileint.fileType} onSelect={(v) => { fileint.fileType = v; }}>
                <MVCustomSelectOption value='ms' icon={<MVIcon icon='ms' color='var(--ms-color-3)' />}>MS table</MVCustomSelectOption>
                <MVCustomSelectOption value='efg' icon={<MVIcon icon='efg' color='var(--efg-color-3)' />}>EFG table</MVCustomSelectOption>
                <MVCustomSelectOption value='dip' icon={<MVIcon icon='dip' color='var(--dip-color-3)' />}>Dipolar coupling table</MVCustomSelectOption>
                <MVCustomSelectOption value='isc' icon={<MVIcon icon='jcoup' color='var(--jcoup-color-3)' />}>J coupling table</MVCustomSelectOption>
                <MVCustomSelectOption value='spinsys' icon={<GiSpinningTop style={{color: 'var(--spinsys-color-3)'}}/>}>SpinSys</MVCustomSelectOption>
            </MVCustomSelect>
            {/* check-boxes for what to include in spinsys output. Only show if fileint.fileType === 'spinsys' */}
            {fileint.fileType === 'spinsys' ? spinSysOptions(fileint) : null}
            <MVButton onClick={() => { saveFile(fileint.generateFile(), fileint.fileName); }} disabled={!fileint.fileValid}>Save file</MVButton>
        </div>
    </MagresViewSidebar>);
}

export default MVSidebarFiles;