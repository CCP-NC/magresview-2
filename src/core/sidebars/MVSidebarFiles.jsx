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
import MVRange from '../../controls/MVRange';
import MVTooltip from '../../controls/MVTooltip';
import { tooltip_files_merge, tooltip_files_precision} from './tooltip_messages';

import { useFilesInterface } from '../store';
import { saveContents } from '../../utils';

const saveFile = (c, fn) => { saveContents(c, fn); }

const mergeOption = (fileint) => {
    if (fileint.hasCIFLabels) {
        return (<MVCheckBox checked={fileint.mergeByLabel} onCheck={(v) => { fileint.mergeByLabel = v; }}>
            Merge by label &nbsp;
            <MVTooltip tooltipText={tooltip_files_merge} />
            </MVCheckBox>);
    } else {
        // force the mergeByLabel to be false
        // if there are no CIF labels
        fileint.mergeByLabel = false;
        // blank return
        return (<></>);
    }
}
const eulerOption = (fileint) => {
    return (<MVCheckBox checked={fileint.includeEuler} onCheck={(v) => { fileint.includeEuler = v; }}>Include Euler angles</MVCheckBox>);
}

function selectFileFormat(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3> File format:</h3>
        <MVCustomSelect title={'File type'} zorder={3} selected={fileint.fileFormat} onSelect={(v) => { fileint.fileFormat = v; }}>
            <MVCustomSelectOption value={'fixed'}>Fixed width</MVCustomSelectOption>
            <MVCustomSelectOption value={'csv'}>CSV</MVCustomSelectOption>
            <MVCustomSelectOption value={'tsv'}>Tab separated</MVCustomSelectOption>
        </MVCustomSelect>
    </div>);
}

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

function setPrecision(fileint) {
    return (<MVRange 
        min={0} 
        max={8} 
        step={1} 
        value={fileint.precision} 
        tooltip={tooltip_files_precision}
        onChange={(p) => { fileint.precision = p; }}>
            Precision
        </MVRange>
        );
}


// eslint-disable-next-line
function spinSysOptions(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3>Options:</h3>
        <MVCheckBox checked={fileint.includeMS} onCheck={(v) => { fileint.includeMS = v; }}>MS tensors</MVCheckBox>
        <MVCheckBox checked={fileint.includeEFG} onCheck={(v) => { fileint.includeEFG = v; }}>EFG tensors</MVCheckBox>
        {/* <MVCheckBox checked={fileint.includeJ} onCheck={(v) => { fileint.includeJ = v; }}>J couplings</MVCheckBox> */}
        <MVCheckBox checked={fileint.includeD} onCheck={(v) => { fileint.includeD = v; }}>Dipolar couplings</MVCheckBox>
        {/* if EFG is selected, show quadrupole selector */}
        {fileint.spinSysIncludeEFG ? selectquadorder(fileint) : null}
        {mergeOption(fileint)}

    </div>);
}


function msTableOptions(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3>Options:</h3>
        {/* <MVCheckBox checked={fileint.includeMS} onCheck={(v) => { fileint.includeMS = v; }}>MS tensors</MVCheckBox> */}
        {eulerOption(fileint)}
        {mergeOption(fileint)}
        {setPrecision(fileint)}
    </div>);
        
}

function efgTableOptions(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3>Options:</h3>
        {/* <MVCheckBox checked={fileint.includeEFG} onCheck={(v) => { fileint.includeEFG = v; }}>EFG tensors</MVCheckBox> */}
        {eulerOption(fileint)}
        {/* <MVCheckBox checked={fileint.includeQuadrupole} onCheck={(v) => { fileint.includeQuadrupole = v; }}>Quadrupole moments</MVCheckBox> */}
        {mergeOption(fileint)}
        {setPrecision(fileint)}
    </div>);
}

// eslint-disable-next-line
function dipTableOptions(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3>Options:</h3>
        {/* <MVCheckBox checked={fileint.includeD} onCheck={(v) => { fileint.includeD = v; }}>Dipolar couplings</MVCheckBox> */}
        {eulerOption(fileint)}
        {mergeOption(fileint)}
        {setPrecision(fileint)}
    </div>);
}
// eslint-disable-next-line
function iscTableOptions(fileint) {
    return (<div className='.mv-sidebar-grid'>
        <h3>Options:</h3>
        {/* <MVCheckBox checked={fileint.includeJ} onCheck={(v) => { fileint.includeJ = v; }}>J couplings</MVCheckBox> */}
        {eulerOption(fileint)}
        {mergeOption(fileint)}
        {setPrecision(fileint)}
    </div>);
}


function MVSidebarFiles(props) {

    const fileint = useFilesInterface();

    return (<MagresViewSidebar title='Report files' show={props.show}>
        <div className='mv-sidebar-block'>
            <p>
                Export the chosen data for the currently selected atoms. If no atoms are selected, the whole system will be exported.
            </p>
            <p>
                The isotopes are set in the Select and display tab.
            </p>
            <h3>Output:</h3>
            <MVCustomSelect selected={fileint.fileType} onSelect={(v) => { fileint.fileType = v; }}>
                <MVCustomSelectOption value='ms' icon={<MVIcon icon='ms' color='var(--ms-color-3)' />}>MS</MVCustomSelectOption>
                <MVCustomSelectOption value='efg' icon={<MVIcon icon='efg' color='var(--efg-color-3)' />}>EFG</MVCustomSelectOption>
                <MVCustomSelectOption value='dip' icon={<MVIcon icon='dip' color='var(--dip-color-3)' />}>Dipolar coupling</MVCustomSelectOption>
                <MVCustomSelectOption value='isc' icon={<MVIcon icon='jcoup' color='var(--jcoup-color-3)' />}>J coupling</MVCustomSelectOption>
                {/* <MVCustomSelectOption value='spinsys' icon={<GiSpinningTop style={{color: 'var(--spinsys-color-3)'}}/>}>SpinSys</MVCustomSelectOption> */}
            </MVCustomSelect>
            {/* check-boxes for what to include in spinsys output. Only show if fileint.fileType === 'spinsys' */}
            {fileint.fileType === 'ms'  ? msTableOptions(fileint)  : null}
            {fileint.fileType === 'efg' ? efgTableOptions(fileint) : null}
            {fileint.fileType === 'dip' ? dipTableOptions(fileint) : null}
            {fileint.fileType === 'isc' ? iscTableOptions(fileint) : null}
            {/* {fileint.fileType === 'spinsys' ? spinSysOptions(fileint) : null} */}
            {/* file type options */}
            {selectFileFormat(fileint)}
            <MVButton onClick={() => { saveFile(fileint.generateFile(), fileint.fileName); }} disabled={!fileint.fileValid}>Save file</MVButton>
        </div>
    </MagresViewSidebar>);
}

export default MVSidebarFiles;