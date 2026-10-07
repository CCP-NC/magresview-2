import _ from 'lodash';
import colormap from 'colormap';
import ColorScale from 'color-scales';

/*
 * Merges together all the outputs of multiple async processes into a single
 * argument to pass to a callback, according the outputs are in Object form.
 */
class CallbackMerger {
    
    constructor(n, callback) {
        this._callback = callback;
        this._n = n;

        this._arg = {};
    }

    call(arg) {
        
        if (this._n <= 0) {
            throw Error('CallbackMerger has completed its iterations');
        }

        _.merge(this._arg, arg);
        this._n -= 1;
        if (this._n === 0) {
            this._callback(this._arg);
        }
    }
}

/**
 * A custom class that acts like an Enum type
 */
class Enum {

    constructor(values={}) {

        if (Array.isArray(values)) {
            values = _.fromPairs(values.map((x, i) => [x, i]));
        }

        for (let key in values) {
            let v = values[key];

            Object.defineProperty(this, key, {
                get: () => v
            });
        }
    }

}

/**
 * Average atom position for a ModelView
 * 
 * @param  {ModelView} mview    ModelView to compute the average position for
 * 
 * @return {float[]}            Average position
 */
function averagePosition(mview) {

    const positions = mview.map((a) => a.xyz);
    let average = positions.reduce((x, s) => x.map((v, i) => v+s[i]), 
                                   [0, 0, 0]);
    average = average.map((x) => x/positions.length);

    return average;
}


/**
 * Center the camera on the displayed atoms (with a custom shift)
 * 
 * @param  {CrystVis} app   Reference to the visualizer app
 */
function centerDisplayed(app) {
    const pos = averagePosition(app.displayed);
    app.centerCamera(pos, [-0.05, 0]);
}

/**
 * Return a color scale with a specified map and number of intermediate
 * shades
 * 
 * @param  {Number} min    Smallest value of the range mapping to the color scale
 * @param  {Number} max    Largest value of the range
 * @param  {String} scale  Name of the scale (from package colormap; default is 'jet')
 * @param  {Number} shades Number of shades
 * 
 * @return {ColorScale}    Color scale
 */
function getColorScale(min=0, max=1, scale='jet', shades=10) {
    
    let colors = colormap({
        colormap: scale,
        nshades: shades,
        format: 'hex',
        alpha: 1
    });

    // If min and max are equal we get an error so fix that
    max = (max === min)? max+1e-8 : max;

    let cscale = new ColorScale(min, max, colors, 1.0);

    return cscale;
}

/**
 * Merge the values from an object into another, but without creating
 * new values if they were absent to begin with.
 * 
 * @param  {Object} a The object to update
 * @param  {Object} b The object containing the updated values
 * 
 * @return {Object}   The updated object
 */
function mergeOnly(a, b) {

    let c = {};

    for (let k in a) {
        c[k] = (k in b)? b[k] : a[k];
    }

    return c;
}

/**
 * Helper to escape CSV fields according to RFC 4180
 *
 * @param  {any} v Field value
 * @return {String}  Escaped field
 */
function escapeCSVField(v) {
    if (v === null || v === undefined) {
        return '';
    }
    const str = String(v);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Make a single row of an ASCII table with a fixed field width
 * 
 * @param  {Array}  values      Values to include in the row
 * @param  {Object} options     Options for the table
 *                               - width: Width of each field of the row (default: 20) 
 *                               - precision: Digits used for numerical values (default: 5)
 *                               - format: 'fixed', 'csv', or 'tsv'
 * 
 * @return {String}        Compiled row
 */
function tableRow(values, options) {
    let defaults = {
        width: 20,
        precision: 5,
        format: 'fixed' // or CSV or Tab separated
    };
    let {width, precision, format} = mergeOnly(defaults, options);
    format = (format || 'fixed').toLowerCase();

    return values.reduce((s, v) => {        
        if (Number.isFinite(v) && !Number.isInteger(v)) {
            v = v.toFixed(precision);
        }
        else if (v === null || v === undefined) {
            v = '';
        }
        else {
            v = v.toString();
        }
        const ns = width - v.length;

        if (format === 'csv') {
            return s + ',' + escapeCSVField(v);
        }
        else if (format === 'fixed') {
            return s + ' '.repeat(ns > 0 ? ns : 0) + v;
        }
        else if (format === 'tsv') {
            return s + '\t' + v;
        }
        else {
            throw Error('Unknown format: ' + format);
        }

    }, '').slice(1) + '\n';

}

/** 
 * Make a single row of a comma-separated values table
 * 
 * @param  {Array}  values      Values to include in the row
 * @param  {Number} precision   Digits used for numerical values
 * 
 * @return {String}        Compiled row
 */
function csvRow(values, precision=5) {
    return values.reduce((s, v) => {
        if (Number.isFinite(v) && !Number.isInteger(v)) {
            v = v.toFixed(precision);
        }
        else if (v === null || v === undefined) {
            v = '';
        }
        else {
            v = v.toString();
        }
        return s + ',' + escapeCSVField(v);
    }, '').slice(1) + '\n';
}

/**
 * Infer MIME type from file extension
 */
function inferMimeType(filename) {
    if (!filename) return 'text/plain;charset=utf-8';
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'csv': return 'text/csv;charset=utf-8';
        case 'json': return 'application/json;charset=utf-8';
        case 'zip': return 'application/zip';
        case 'png': return 'image/png';
        case 'cif':
        case 'xyz':
        case 'magres':
        case 'spinsys':
        case 'in':
        case 'txt':
        default:
            return 'text/plain;charset=utf-8';
    }
}

/**
 * Download a file using Blob and URL.createObjectURL
 * 
 * @param  {String|Blob|Uint8Array|ArrayBuffer} data The data content of the file
 * @param  {String} filename The name of the file to download
 * @param  {String} [mimeType] Optional MIME type
 */
function saveContents(data, filename, mimeType) {
    let blob;
    if (data instanceof Blob) {
        blob = data;
    } else if (typeof data === 'string' && data.startsWith('data:image/')) {
        // Base64 data URL (e.g. from canvas .toDataURL())
        const parts = data.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(parts[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        blob = new Blob([u8arr], { type: mime });
    } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const mime = mimeType || inferMimeType(filename);
        blob = new Blob([data], { type: mime });
    } else {
        const mime = mimeType || inferMimeType(filename);
        blob = new Blob([data], { type: mime });
    }

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        const download = document.createElement('a');
        download.setAttribute('download', filename);
        download.setAttribute('href', url);
        download.style.display = 'none';
        document.body.appendChild(download);
        download.click();
        document.body.removeChild(download);
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }
}

/**
 * Download a PNG screenshot from data take from a Canvas
 * 
 * @param  {String} data     Data URL retrieved with the .toDataURL() method
 * @param  {[type]} filename Filename to save
 */
function saveImage(data, filename='image.png') {
    saveContents(data, filename);
}

/**
 * Load an image from a file, return a promise
 * 
 * @param  {File}   file    File with the image to load
 * 
 * @return {Promise}        Promise that gets fulfilled once the image is loaded; resolves with an HTMLImageElement containing the image
 */
function loadImage(file) {

    let reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = ((e) => { 
            // Make it into a data URL
            var img = new Image();
            img.src = e.target.result;
            img.decode().then(() => {
                resolve(img);
            });
        });
        reader.readAsDataURL(file);
    });
}

/**
 * Copy something to the clipboard
 * 
 * @param  {String} data Content to copy
 */
function copyContents(data) {
    navigator.clipboard.writeText(data);
}


export { CallbackMerger, Enum, getColorScale, mergeOnly, 
         averagePosition, centerDisplayed,
         saveImage, loadImage, saveContents, copyContents, tableRow, csvRow,
        };
