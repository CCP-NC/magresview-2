import './MVCScaleBar.css';
import React from 'react';
import ColorScale from 'color-scales';
import colormap from 'colormap';


function get_colorbar(min, max, units, cmap, hidden=false) {
    if (hidden) {
        return null;
    }
    if (min === undefined || max === undefined) {
        return null;
    }

    // ncolors must be odd to display correctly
    const nshades = 11;

    let color_spec = colormap({
        colormap: cmap,
        nshades: nshades,
        format: 'hex',
        alpha: 1
    });

    let cscale = new ColorScale(0, 1, color_spec, 1.0);
    // make table with one row and nshades columns and color the cells
    let cells = [];
    let ticks = [];
    let tick_labels = [];
    // values is a range from 0 to 1 (inclusive) with nshades elements
    let values = Array.from(Array(nshades).keys()).map(x => x/(nshades-1));
    let colors = values.map((v) => cscale.getColor(v).toHexString());
    
    // indices of the ticks and tick labels
    const first = 0;
    const middle = ((colors.length-1)/2);
    const last = colors.length-1;

    for (let i = 0; i < colors.length; i++) {
        const key_stub = i.toString();
        cells.push(<td className='mv-cscale-bar' style={{backgroundColor: colors[i]}} key={'c'+i} ></td>);
        // only show ticks for the first, middle and last color
        if (i === first || i === middle || i === last) {
            ticks.push(<td className='mv-cscale-tick' key={'t'+key_stub}>|</td>);
        } else {
            ticks.push(<td className='mv-cscale-tick' key={'t'+key_stub}></td>);
        }
        tick_labels.push(<td className='mv-cscale-tick-label' key={'l'+key_stub}></td>);
    }

    // round and display the min, middle and max values
    tick_labels[first] = <td
                            className='mv-cscale-tick-label'
                            key={'l0'}
                            >{min.toFixed(2)}</td>;
    tick_labels[middle] = <td 
                            className='mv-cscale-tick-label'
                            key={'l'+(((tick_labels.length-1)/2)).toString()}
                            >{((min+max)/2).toFixed(2)}</td>;
    // add units to final cell
    tick_labels[last] = <td
                            className='mv-cscale-tick-label'
                            key={'l' + (tick_labels.length-1).toString()}
                            >{max.toFixed(2) + ' ' + units}</td>;

    return (
            <table className='mv-cscale-table'>
                <tbody>
                <tr>
                    {cells}
                </tr>
                <tr>
                    {ticks}
                </tr>
                <tr>
                    {tick_labels}
                </tr>
                </tbody>
            </table>

    );
}



function MVCScaleBar(props) {

    return (
    <div className='mv-cscalebar'>
            {get_colorbar(props.lims[0], props.lims[1], props.units, props.cmap, props.hidden)}
    </div>);

}

export default MVCScaleBar;