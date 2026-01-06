import _ from 'lodash';

import { Line } from '@nivo/line'

import { useState, useEffect } from 'react';

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
    // Minimum range for x axis
    const MIN_X_RANGE = 1; // ppm

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

    function getXlims() {
        let xlims = [pltint.floatRangeX[0], pltint.floatRangeX[1]];

        if (pltint.autoScaleX) {
            let data = pltint.data[0].peaks;
            let range = Math.abs(data[data.length - 1] - data[0]);
            // make sure the range is not too small
            if (range < MIN_X_RANGE) {
                range = MIN_X_RANGE;
            }

            xlims = [data[0] - range * 0.15, data[data.length - 1] + range * 0.15];
            // xlims = ['auto', 'auto'] // setting it to auto seems to crash it...!?
        }        
        return xlims;
    }

    function getYlims() {
        let ylims = [pltint.floatRangeY[0], pltint.floatRangeY[1]];
        // if auto scale is on, let nivo do the work
        if (pltint.autoScaleY) {
            ylims = ['auto', 'auto'];
        }
        return ylims;
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

    const show = (pltint.mode !== 'none') && (pltint.hasData) && (pltint.element);

    // if not showing, return null
    if (!show) {
        return null;
    }

    let lineprops = {};
    // y axis properties
    let leftaxis = {}
    // Custom mode-dependent properties
    if (pltint.peakW > 0) {
        lineprops = {
            enablePoints: false,                
            enableArea: false,  
        }
        leftaxis = {
            legend: 'Intensity',
            legendOffset: -40,
            legendPosition: 'middle'
        }
    // if it's zero, draw bars
    } else if (pltint.peakW === 0) {
        lineprops = {
            pointSymbol: ((p) => {
                return (<rect x = {-p.size / 4} width={p.size / 2} height={(height-(state.top+state.bottom)) * 0.5} color={p.borderColor} 
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
            <strong>x:</strong> {point.data.xFormatted}
            {/* <strong>y:</strong> {point.data.yFormatted} */}
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
    // what should we label the x axis?
    // include the element symbol if we have one
    let xlegend = pltint.element? pltint.element + ' ' : '';
    // if we're using reference table, then we're plotting chemical shifts
    if (pltint.useRefTable) {
        xlegend += 'Chemical shift (ppm)';
    } else {
        xlegend += 'Shielding (ppm)';
    }

    // x axis properties
    let bottomaxis = {
        orient: 'bottom',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        // if pltint.useRefTable is true, then we're plotting chemical shifts
        // use element symbol in the label
        legend: xlegend,
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
                min: getXlims()[0],
                max: getXlims()[1],
                reverse: pltint.useRefTable? true : false
            }}
            yScale={{
                type: 'linear',
                min: getYlims()[0],
                max: getYlims()[1],
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