import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';

import MVModal from '../../controls/MVModal';
import { usePlotsInterface } from '../store';
import { PLOT_DIV_ID } from './constants';

const Plot = createPlotlyComponent(Plotly);

function buildAnnotations(peaks, labels, rangeX, peakW, xyData) {

    const overlapThreshold = Math.abs(rangeX[1] - rangeX[0]) / 20;

    // For Lorentzian mode, look up the y value at each peak from the rendered curve
    function getYatPeak(px) {
        if (peakW === 0 || !xyData || xyData.length === 0) return 1.0;
        let best = xyData[0];
        let bestDist = Math.abs(xyData[0].x - px);
        for (const pt of xyData) {
            const d = Math.abs(pt.x - px);
            if (d < bestDist) { bestDist = d; best = pt; }
        }
        return best.y;
    }

    const annotations = [];
    let lastX = -1e6;
    let lastLabel = '';
    let lastYshift = 0;

    for (let i = 0; i < peaks.length; i++) {
        const x = peaks[i];
        const lbl = labels[i];
        const dx = Math.abs(x - lastX);
        let showLabel, yshift;

        if (dx > overlapThreshold) {
            showLabel = lbl;
            yshift = 0;
            lastYshift = 0;
        } else {
            if (lbl === lastLabel) {
                showLabel = '';
                yshift = 0;
            } else {
                showLabel = lbl;
                yshift = lastYshift + 20;
                lastYshift = yshift;
            }
        }

        lastX = x;
        lastLabel = lbl;

        if (!showLabel) continue;

        const yPeak = getYatPeak(x);

        annotations.push({
            x,
            y: yPeak,
            xref: 'x',
            yref: 'y',
            text: `<b>${showLabel}</b>`,
            showarrow: true,
            arrowhead: 0,
            arrowcolor: 'rgba(180,60,60,0.7)',
            arrowwidth: 1.5,
            ax: 0,
            ay: -(30 + yshift),
            font: { size: 11, color: '#333' },
            bgcolor: 'rgba(255,255,255,0.75)',
            borderpad: 2,
        });
    }

    return annotations;
}

function MVPlot1D() {
    const pltint = usePlotsInterface();

    const show = (pltint.mode !== 'none') && (pltint.hasData) && (pltint.element);

    if (!show) {
        return null;
    }

    const seriesData = pltint.data?.[0];
    if (!seriesData) return null;

    const xyData = seriesData.data;     // [{x, y}, ...]
    const peaks  = seriesData.peaks;    // sorted peak positions
    const labels = seriesData.labels;   // atom labels for each peak

    // ---- Traces ----
    let traces;
    if (pltint.peakW > 0) {
        // Lorentzian line chart
        traces = [{
            x: xyData.map(p => p.x),
            y: xyData.map(p => p.y),
            type: 'scatter',
            mode: 'lines',
            name: 'Spectrum',
            line: { color: '#1f6cbf', width: 1.5 },
            hovertemplate: '%{x:.3f} ppm<extra></extra>',
        }];
    } else {
        // Stick chart — one bar per peak
        traces = [{
            x: peaks,
            y: peaks.map(() => 1.0),
            type: 'bar',
            name: 'Peaks',
            marker: { color: '#1f6cbf' },
            hovertemplate: '%{x:.3f} ppm<extra></extra>',
            width: peaks.map(() => 0.01),  // thin sticks
        }];
    }

    // ---- X-axis config ----
    let xAxisLabel = pltint.element ? pltint.element + ' ' : '';
    xAxisLabel += pltint.useRefTable ? 'Chemical shift (ppm)' : 'Shielding (ppm)';

    const xaxisConfig = {
        title: { text: xAxisLabel },
        showgrid: pltint.showGrid,
        visible: pltint.showAxes,
        automargin: true,
    };

    if (pltint.autoScaleX) {
        xaxisConfig.autorange = pltint.useRefTable ? 'reversed' : true;
    } else {
        const [xmin, xmax] = pltint.floatRangeX;
        xaxisConfig.autorange = false;
        // reversed order for chemical shift (larger values on the left)
        xaxisConfig.range = pltint.useRefTable ? [xmax, xmin] : [xmin, xmax];
    }

    // ---- Y-axis config ----
    const yaxisConfig = {
        title: { text: pltint.peakW > 0 ? 'Intensity' : '' },
        showgrid: pltint.showGrid,
        visible: pltint.showAxes,
        automargin: true,
        showticklabels: pltint.peakW > 0,
    };

    if (pltint.autoScaleY) {
        yaxisConfig.autorange = true;
    } else {
        const [ymin, ymax] = pltint.floatRangeY;
        yaxisConfig.autorange = false;
        yaxisConfig.range = [ymin, ymax];
    }

    // ---- Annotations (peak labels) ----
    const annotations = pltint.showLabels && peaks?.length > 0
        ? buildAnnotations(peaks, labels, pltint.floatRangeX, pltint.peakW, xyData)
        : [];

    // ---- Background image ----
    const images = [];
    const bkg = pltint.bkgImage;
    if (bkg) {
        images.push({
            source: bkg.url,
            xref: 'paper',
            yref: 'paper',
            x: 0,
            y: 1,
            sizex: 1,
            sizey: 1,
            sizing: 'stretch',
            opacity: 0.5,
            layer: 'below',
        });
    }

    const plotWidth  = bkg ? bkg.width  : 680;
    const plotHeight = bkg ? bkg.height : 480;

    const layout = {
        width:  plotWidth,
        height: plotHeight,
        margin: { t: 30, l: 65, r: 25, b: 60 },
        xaxis: xaxisConfig,
        yaxis: yaxisConfig,
        annotations,
        images,
        showlegend: false,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        bargap: 0,
    };

    const config = {
        responsive: false,
        scrollZoom: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'svg',
            filename: 'magresview_plot',
        },
    };

    return (
        <MVModal title="Spectral 1D plot" display={show}
            noFooter={true} resizable={true} draggable={true}
            onClose={() => { pltint.mode = 'none'; }}>
            <div style={{ backgroundColor: 'white', color: 'black' }}>
                <Plot
                    divId={PLOT_DIV_ID}
                    data={traces}
                    layout={layout}
                    config={config}
                />
            </div>
        </MVModal>
    );
}

export default MVPlot1D;