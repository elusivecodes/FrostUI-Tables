/**
 * Zip Class
 * Based on https://github.com/shuchkin/simplexlsxgen/blob/master/src/SimpleXLSXGen.php
 * @class
 */
class Zip {

    /**
     * New Zip constructor.
     * @param {string} [type=octet/stream] The file type.
     * @returns {Zip} A new Zip object.
     */
    constructor(type = 'octet/stream') {
        this._type = type;
        this._dir = [];
        this._files = [];
        this._offset = 0;
        this._entries = 0;
        this._encoder = new TextEncoder;
    }

    /**
     * Add a file to the Zip.
     * @param {string} filename The filename.
     * @param {string} data The data.
     * @returns {Zip} The Zip object.
     */
    addFile(filename, data) {
        const vNeeded = 10;

        const filenameLength = this._length(filename);

        data = this._encode(data);
        const uncompressedSize = data.byteLength;

        const crc32 = CRC32.calc(data);

        let compressedSize = uncompressedSize;
        let cMethod = 0;

        if (uncompressedSize >= 256) {
            data = RawDeflate.compress(data);
            compressedSize = data.byteLength;
            cMethod = 8;
        }

        const now = new Date;

        let offsetSeconds = now.getSeconds();
        if (offsetSeconds >= 32) {
            offsetSeconds -= 32;
        }

        let offsetYear = now.getYear() - 1980;

        const seconds = `${offsetSeconds.toString(2)}`.padStart(5, '0');
        const minutes = `${now.getMinutes().toString(2)}`.padStart(6, '0');
        const hours = `${now.getHours().toString(2)}`.padStart(5, '0');
        const date = `${now.getDate().toString(2)}`.padStart(5, '0');
        const month = `${now.getMonth().toString(2)}`.padStart(4, '0');
        const year = `${offsetYear.toString(2)}`.padStart(7, '0');

        const modTime = parseInt(`${hours}${minutes}${seconds}`, 2);
        const modDate = parseInt(`${year}${month}${date}`, 2);

        const dir = [
            this._encode("\x50\x4b\x01\x02"), // dir signature
            this._signed16(0), // version made by
            this._signed16(vNeeded),
            this._signed16(0), // bit flag
            this._signed16(cMethod),
            this._signed16(modTime),
            this._signed16(modDate),
            this._signed32(crc32),
            this._signed32(compressedSize),
            this._signed32(uncompressedSize),
            this._signed16(filenameLength),
            this._signed16(0), // extra field length
            this._signed16(0), // file comment length
            this._signed16(0), // disk number start
            this._signed16(0), // internal file attributes
            this._signed32(32), // internal file attributes
            this._signed32(this._offset), // offset of local header
            this._encode(filename)
        ];

        this._dir.push(...dir);

        const file = [
            this._encode("\x50\x4b\x03\x04"), // zip signature
            this._signed16(vNeeded),
            this._signed16(0), // bit flag
            this._signed16(cMethod),
            this._signed16(modTime),
            this._signed16(modDate),
            this._signed32(crc32),
            this._signed32(compressedSize),
            this._signed32(uncompressedSize),
            this._signed16(filenameLength),
            this._signed16(0), // extra field length
            this._encode(filename),
            data
        ];

        this._files.push(...file);

        this._offset += file.reduce((acc, file) => acc + file.byteLength, 0);
        this._entries++;

        return this;
    }

    /**
     * Create the zip file.
     * @returns {Blob} The zip file.
     */
    zip() {
        const dirLength = this._dir.reduce((acc, file) => acc + file.byteLength, 0);

        return new Blob(
            [
                ...this._files,
                ...this._dir,
                this._encode("\x50\x4b\x05\x06"), // end of central directory
                this._signed16(0), // number of this disk
                this._signed16(0), // number of the disk with the start of the central directory
                this._signed16(this._entries), // total entries on this disk
                this._signed16(this._entries), // total entries
                this._signed32(dirLength), // size of central dir
                this._signed32(this._offset), // offset to start of central dir
                this._signed16(0) // file comment length
            ],
            { type: this._type }
        );
    }

    /**
     * Encode a string in binary.
     * @param {string} string The string.
     * @returns {Uint8Array} The encoded string.
     */
    _encode(string) {
        return this._encoder.encode(string);
    }

    /**
     * Get the byte length of a string.
     * @param {string} string The string.
     * @returns {number} The byte length.
     */
    _length(string) {
        return this._encode(string).length;
    }

    /**
     * Convert a number to an Int16Array.
     * @param {number} number The number.
     * @returns {Int16Array} The Int16Array.
     */
    _signed16(number) {
        return new Int16Array([number]);
    }

    /**
     * Convert a number to an Int32Array.
     * @param {number} number The number.
     * @returns {Int32Array} The Int32Array.
     */
    _signed32(number) {
        return new Int32Array([number]);
    }

}
