/**
 * Utilities for creating uncompressed (stored) ZIP archives.
 * Implements PKZIP format with method 0 (stored) and CRC32 checksums.
 */

// Precompute CRC32 lookup table (polynomial 0xEDB88320)
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
}

/**
 * Compute the IEEE 802.3 CRC-32 checksum of a byte array.
 * 
 * @param  {Uint8Array} bytes Input data
 * @return {number}           32-bit unsigned integer checksum
 */
export function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create an uncompressed (stored) ZIP archive from a set of files.
 * 
 * @param  {Array|Object} files  Files to include. Either:
 *                               - Array of { name: string, data: string|Uint8Array }
 *                               - Object mapping { [filename: string]: string|Uint8Array }
 * @return {Uint8Array}          The complete ZIP archive binary data
 */
export function createStoredZip(files) {
    const encoder = new TextEncoder();
    const entries = Array.isArray(files)
        ? files
        : Object.entries(files).map(([name, data]) => ({ name, data }));

    const processed = entries.map(entry => {
        const nameBytes = encoder.encode(entry.name);
        const dataBytes = typeof entry.data === 'string'
            ? encoder.encode(entry.data)
            : (entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data));
        const checksum = crc32(dataBytes);
        return {
            nameBytes,
            dataBytes,
            crc: checksum,
            uncompressedSize: dataBytes.length,
            compressedSize: dataBytes.length
        };
    });

    let totalSize = 0;
    for (const p of processed) {
        totalSize += 30 + p.nameBytes.length + p.dataBytes.length; // Local file header + data
        totalSize += 46 + p.nameBytes.length;                     // Central directory header
    }
    totalSize += 22; // End of Central Directory record

    const out = new Uint8Array(totalSize);
    const view = new DataView(out.buffer);
    let offset = 0;
    const localOffsets = [];

    // 1. Local file headers and file data
    for (const p of processed) {
        localOffsets.push(offset);

        view.setUint32(offset, 0x04034b50, true);       // Local file header signature (PK\x03\x04)
        view.setUint16(offset + 4, 20, true);           // Version needed to extract (2.0)
        view.setUint16(offset + 6, 0x0800, true);       // General purpose bit flag (UTF-8 filename)
        view.setUint16(offset + 8, 0, true);            // Compression method: 0 (Stored)
        view.setUint16(offset + 10, 0, true);           // Last mod file time
        view.setUint16(offset + 12, 0, true);           // Last mod file date
        view.setUint32(offset + 14, p.crc, true);       // CRC-32
        view.setUint32(offset + 18, p.compressedSize, true);   // Compressed size
        view.setUint32(offset + 22, p.uncompressedSize, true); // Uncompressed size
        view.setUint16(offset + 26, p.nameBytes.length, true); // Filename length
        view.setUint16(offset + 28, 0, true);           // Extra field length
        offset += 30;

        out.set(p.nameBytes, offset);
        offset += p.nameBytes.length;

        out.set(p.dataBytes, offset);
        offset += p.dataBytes.length;
    }

    const cdOffset = offset;

    // 2. Central directory headers
    for (let i = 0; i < processed.length; i++) {
        const p = processed[i];
        const localOffset = localOffsets[i];

        view.setUint32(offset, 0x02014b50, true);       // Central directory header signature (PK\x01\x02)
        view.setUint16(offset + 4, 20, true);           // Version made by (2.0)
        view.setUint16(offset + 6, 20, true);           // Version needed to extract (2.0)
        view.setUint16(offset + 8, 0x0800, true);       // General purpose bit flag (UTF-8 filename)
        view.setUint16(offset + 10, 0, true);           // Compression method: 0 (Stored)
        view.setUint16(offset + 12, 0, true);           // Last mod file time
        view.setUint16(offset + 14, 0, true);           // Last mod file date
        view.setUint32(offset + 16, p.crc, true);       // CRC-32
        view.setUint32(offset + 20, p.compressedSize, true);   // Compressed size
        view.setUint32(offset + 24, p.uncompressedSize, true); // Uncompressed size
        view.setUint16(offset + 28, p.nameBytes.length, true); // Filename length
        view.setUint16(offset + 30, 0, true);           // Extra field length
        view.setUint16(offset + 32, 0, true);           // Comment length
        view.setUint16(offset + 34, 0, true);           // Disk number start
        view.setUint16(offset + 36, 0, true);           // Internal file attributes
        view.setUint32(offset + 38, 0, true);           // External file attributes
        view.setUint32(offset + 42, localOffset, true); // Relative offset of local header
        offset += 46;

        out.set(p.nameBytes, offset);
        offset += p.nameBytes.length;
    }

    const cdSize = offset - cdOffset;

    // 3. End of Central Directory record (EOCD)
    view.setUint32(offset, 0x06054b50, true);           // EOCD signature (PK\x05\x06)
    view.setUint16(offset + 4, 0, true);                // Number of this disk
    view.setUint16(offset + 6, 0, true);                // Disk where central directory starts
    view.setUint16(offset + 8, processed.length, true); // Number of central directory records on this disk
    view.setUint16(offset + 10, processed.length, true);// Total number of central directory records
    view.setUint32(offset + 12, cdSize, true);          // Size of central directory
    view.setUint32(offset + 16, cdOffset, true);        // Offset of start of central directory
    view.setUint16(offset + 20, 0, true);               // Comment length

    return out;
}
