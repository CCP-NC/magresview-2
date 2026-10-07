import { describe, it, expect } from 'vitest';
import { crc32, createStoredZip } from './utils-zip';

describe('utils-zip', () => {
    describe('crc32', () => {
        it('computes correct checksum for empty buffer', () => {
            expect(crc32(new Uint8Array(0))).toBe(0);
        });

        it('computes correct checksum for standard check value "123456789"', () => {
            const bytes = new TextEncoder().encode('123456789');
            // Standard IEEE 802.3 CRC32 check value is 0xCBF43926 = 3421780262
            expect(crc32(bytes)).toBe(3421780262);
        });
    });

    describe('createStoredZip', () => {
        it('creates a valid empty zip archive', () => {
            const zip = createStoredZip([]);
            expect(zip.length).toBe(22); // Only EOCD
            const view = new DataView(zip.buffer);
            expect(view.getUint32(0, true)).toBe(0x06054b50); // EOCD signature
            expect(view.getUint16(8, true)).toBe(0); // 0 entries
            expect(view.getUint16(10, true)).toBe(0);
        });

        it('packages text and binary files correctly', () => {
            const files = [
                { name: 'test.txt', data: 'Hello World!\n' },
                { name: 'data.bin', data: new Uint8Array([1, 2, 3, 4, 5]) }
            ];

            const zip = createStoredZip(files);
            const view = new DataView(zip.buffer);

            // First local file header
            expect(view.getUint32(0, true)).toBe(0x04034b50);
            const nameLen1 = view.getUint16(26, true);
            expect(nameLen1).toBe(8); // 'test.txt'.length

            // Search for EOCD at the end
            const eocdOffset = zip.length - 22;
            expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
            expect(view.getUint16(eocdOffset + 8, true)).toBe(2); // 2 entries
            expect(view.getUint16(eocdOffset + 10, true)).toBe(2);
        });

        it('accepts an object map of files', () => {
            const files = {
                'model_1.spinsys': 'spinsys { ... }',
                'model_2.spinsys': 'spinsys { ... }'
            };

            const zip = createStoredZip(files);
            const view = new DataView(zip.buffer);
            const eocdOffset = zip.length - 22;
            expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
            expect(view.getUint16(eocdOffset + 10, true)).toBe(2);
        });
    });
});
