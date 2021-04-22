/**
 * BitStream Class
 * Based on https://github.com/imaya/zlib.js/blob/develop/src/bitstream.js
 * @class
 */
class BitStream {

    /**
     * New BitStream constructor.
     * @param {Uint8Array} buffer The buffer to write to.
     * @param {number} [index] The index to start writing at.
     * @returns {BitStream} A new BitStream object.
     */
    constructor(buffer, index = 0) {
        this._buffer = buffer;
        this._index = index;
        this._bitIndex = 0;

        if (this._buffer.length <= this._index) {
            this._expandBuffer();
        }
    }

    /**
     * Finish writing and return the buffer.
     * @returns {Uint8Array} The buffer.
     */
    finish() {
        let index = this._index;

        if (this._bitIndex > 0) {
            this._buffer[index] <<= 8 - this._bitIndex;
            this._buffer[index] = this.constructor._reverseTable[this._buffer[index]];
            index++;
        }

        return this._buffer.subarray(0, index);
    }

    /**
     * Write bits to the buffer.
     * @param {number} number The number to write.
     * @param {number} n The number of bits to write.
     * @param {number} [reverse] Whether to write in reverse order.
     */
    writeBits(number, n, reverse) {
        if (reverse && n > 1) {
            number = n > 8 ?
                this.constructor.rev32(number) >> (32 - n) :
                this.constructor._reverseTable[number] >> (8 - n);
        }

        let current = this._buffer[this._index];

        if (n + this._bitIndex < 8) {
            current = (current << n) | number;
            this._bitIndex += n;
        } else {
            for (let i = 0; i < n; i++) {
                current = (current << 1) | ((number >> n - i - 1) & 1);

                if (++this._bitIndex === 8) {
                    this._bitIndex = 0;
                    this._buffer[this._index++] = this.constructor._reverseTable[current];
                    current = 0;

                    if (this._index === this._buffer.length) {
                        this._expandBuffer();
                    }
                }
            }
        }

        this._buffer[this._index] = current;
    }

    /**
     * Expand the buffer size.
     */
    _expandBuffer() {
        const oldBuffer = this._buffer;
        const oldLength = oldBuffer.length;

        this._buffer = new Uint8Array(oldLength << 1);
        this._buffer.set(oldBuffer);
    }

    /**
     * Reverse the bit order.
     * @param {number} number The number to reverse.
     * @returns {number} The reversed number.
     */
    static rev32(n) {
        return (this._reverseTable[n & 0xff] << 24) |
            (this._reverseTable[n >>> 8 & 0xff] << 16) |
            (this._reverseTable[n >>> 16 & 0xff] << 8) |
            this._reverseTable[n >>> 24 & 0xff];
    }

    /**
     * Generate the reverse table.
     * @returns {array} The reverse table.
     */
    static get _reverseTable() {
        if (!this.__reverseTable) {
            this.__reverseTable = new Uint8Array(256);

            for (let i = 0; i < 256; ++i) {
                let n = i;
                let r = n;
                let s = 7;
                for (n >>>= 1; n; n >>>= 1) {
                    r <<= 1;
                    r |= n & 1;
                    --s;
                }

                this.__reverseTable[i] = (r << s & 0xff) >>> 0;
            }
        }

        return this.__reverseTable;
    }

}
