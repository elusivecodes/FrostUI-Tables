/**
 * CRC32 Class
 * Based on https://github.com/imaya/zlib.js/blob/develop/src/crc32.js
 * @class
 */
class CRC32 {

    /**
     * Get the CRC32 hash value.
     * @param {Uint8Array} data The data to hash.
     * @param {number} [pos] The data position.
     * @param {number} [length] The data length.
     * @returns {number} The CRC32 hash.
     */
    static calc(data, pos = 0, length = null) {
        return this.update(data, 0, pos, length);
    }

    /**
     * Update the CRC32 hash value.
     * @param {Uint8Array} data The data to hash.
     * @param {number} crc The CRC32 hash.
     * @param {number} [pos] The data position.
     * @param {number} [length] The data length.
     * @returns {number} The CRC32 hash.
     */
    static update(data, crc, pos = 0, length = null) {
        if (length === null) {
            length = data.length;
        }

        crc ^= 0xffffffff;

        for (let i = length & 7; i--; ++pos) {
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos]) & 0xff];
        }

        for (let i = length >> 3; i--; pos += 8) {
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 1]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 2]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 3]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 4]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 5]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 6]) & 0xff];
            crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 7]) & 0xff];
        }

        return (crc ^ 0xffffffff) >>> 0;
    }

    /**
     * Generate the CRC32 table.
     * @returns {array} The CRC32 table.
     */
    static get _table() {
        if (!this.__table) {
            this.__table = new Uint32Array(256);

            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
                }
                this.__table[i] = c >>> 0;
            }
        }

        return this.__table;
    }

}
