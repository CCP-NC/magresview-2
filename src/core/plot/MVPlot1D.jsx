import _ from 'lodash';

import { Line } from '@nivo/line'

import { useState } from 'react';

import MVModal from '../../controls/MVModal';
import { usePlotsInterface } from '../store';

import ImageLayer from './ImageLayer';

function MVPlot1D(props) {

    // State used for margins
    const [state, setState] = useState({
        top: 20,
        left: 50,
        right: 20,
        bottom: 50
    });

    const pltint = usePlotsInterface();

    const image = pltint.bkgImage;

    let width = 640;
    let height = 480;

    if (image) {
        width = image.width;
        height = image.height;
    }

    function setMargins(data={}) {
        setState({
            ...state,
            ...data
        });
    }

    function imgLayer() {

        if (image) {
            return <ImageLayer image={image} margins={state} setMargins={setMargins} />
        }

        return null;
    }

    let layers = [imgLayer, 'grid', 'axes', 'areas', 'crosshair', 
                  'lines', 'points', 'markers', 'slices', 'mesh', 'legends'];

    if (!pltint.showGrid)
        layers = _.without(layers, 'grid');
 
    if (!pltint.showAxes)
        layers = _.without(layers, 'axes');

    const show = (pltint.mode !== 'none');

    let lineprops = {};
    // y axis properties
    let leftaxis = {}
    // Custom mode-dependent properties
    switch (pltint.mode) {
        case 'line-1d':
            lineprops = {
                enablePoints: false,                
                enableArea: true,  
            }
            leftaxis = {
                legend: 'Intensity',
                legendOffset: -40,
                legendPosition: 'middle'
            }


            break;
        case 'bars-1d':
            lineprops = {
                pointSymbol: ((p) => {
                    return (<rect x = {-p.size / 4} width={p.size / 2} height={(height-(state.top+state.bottom)) * 0.75} color={p.borderColor} 
                                  fill={p.color} strokeWidth={p.borderWidth}></rect>);
                }),
                pointLabelYOffset: 0,
                lineWidth: 0
            };
            // y axis properties
            leftaxis = {
                // no axis label
                legend: '',
                // no ticks
                tickValues: 0,
            };

            break;
        default: 
            break;
    }
    
    // function to return the nearest peak to a give x value
    const getNearestPeak = (x) => {
        let nearest = null;
        let idx = 0;
        let min = 1e10;
        let peaks = pltint.data[0].peaks
        let labels = pltint.data[0].labels
        
        for (let i=0; i<peaks.length; i++) {
            let d = peaks[i];
            let dx = Math.abs(d - x);
            if (dx < min) {
                min = dx;
                nearest = d;
                idx = i;
            }
        }
        if (nearest) {
            return {x: nearest, label: labels[idx]};
        }
        return null;

    }
    
    const renderNearestPeak = (p) => {
        if (p) {
            return (
                <div>
                    <strong>{p.label}</strong>: {p.x.toFixed(2)} ppm
                </div>
            );
        }
    }



    const tooltip = ({ point }) => (
        // find nearest peak to the point
        <div
            style={{
                background: 'white',
                padding: '9px 12px',
                border: '1px solid #ccc',
            }}
        >
            {/* show nearest peak x and label */}
            {renderNearestPeak(getNearestPeak(point.data.x))}
            {/* show intensity */}
            <strong>x:</strong> {point.data.xFormatted} <br/>
            <strong>y:</strong> {point.data.yFormatted}
        </div>
    )

    const markers = () => {
        if (pltint.data.length > 0 && pltint.showLabels) {
            let markers = [];
            let peaks = pltint.data[0].peaks;
            let labels = pltint.data[0].labels;
            // set threshold for considering the labels to be overlapping
            // set it to 1/5 of the width of the plot
            const overlap_threshold = (pltint.floatRangeX[1] - pltint.floatRangeX[0]) / 20; // in ppm
            

            let last_x = -1e6;
            let last_label = '';
            let last_offset = 5;
            let label = '';
            let new_labels = [];
            let offsets = [];
            let offset = 5;
            // loop over peaks and figure out non-overlapping labels
            // TODO: I wrote as separate loops so as to be able to 
            // add more complex combined labels later. But SVG doens't handle
            // text wrapping, so this is not needed for now.
            for (let i=0; i<peaks.length; i++) {
                let x = peaks[i];
                let dx = Math.abs(x - last_x);
                if (dx > overlap_threshold) {
                    label = labels[i];
                    last_x = x;
                    last_label = label;
                    offset = 5;
                    last_offset = offset;
                    
                }
                else {
                    if (labels[i] === last_label) {
                        label = '';
                        offset = 5;
                    }
                    else {
                        last_label = labels[i];
                        label = labels[i]
                        offset = last_offset + 20;
                        last_offset = offset;
                    }
                }
                // push the label to the array
                new_labels.push(label);
                offsets.push(offset);
            }

            // add marker to the list
            for (let i=0; i<peaks.length; i++) {
                let x = peaks[i];
                if (new_labels[i] !== '') {
                    markers.push({
                        axis: 'x',
                        value: x,
                        lineStyle: { stroke: "var(--ms-color-2)", strokeWidth: 2 , opacity: 0.5},
                        legend: new_labels[i],
                        textStyle: { fontSize: 12, fill: "black", fontWeight: "bold"},
                        legendOffsetY: offsets[i],
                        legendOffsetX: -10,
                        legendOrientation: 'horizontal',
                    });
                }
            }
            return markers;
        }
        return [];
    }
    

    // x axis properties
    let bottomaxis = {
        orient: 'bottom',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        // if pltint.useRefTable is true, then we're plotting chemical shifts
        legend: pltint.useRefTable ? 'Chemical shift/ppm' : 'Shielding/ppm',
        legendOffset: 36,
        legendPosition: 'middle',
    };


    return (<MVModal title="Spectral 1D plot" display={show}
        noFooter={true} resizable={true} draggable={true} onClose={() => { pltint.mode = 'none'; }}>
        <div style={{backgroundColor: 'white', color: 'black'}}>
        {show? 
            // if show is true, then we're in one of the plot modes
            <Line
            {...lineprops}
            isInteractive={true}
            useMesh={true}
            // enableSlices='x'
            enableCrosshair={true}
            xFormat=" >-.3f"
            yFormat=" >-.3f"
            width={width}
            height={height} 
            colors={{ scheme: 'category10' }}
            // add marker for each peak in data
            markers={markers()}
            data={pltint.data}
            margin={state}
            xScale={{
                type: 'linear',
                min: pltint.floatRangeX[0],
                max: pltint.floatRangeX[1],
                reverse: pltint.useRefTable? true : false
            }}
            yScale={{
                type: 'linear',
                min: pltint.floatRangeY[0],
                max: pltint.floatRangeY[1]
            }}
            layers={layers}
            axisBottom={bottomaxis}
            axisLeft={leftaxis}
            motionConfig="gentle"
            tooltip={tooltip}
            />           
        : null }
        </div>
    </MVModal>);
}

export default MVPlot1D;