let reverseTable = null;

/**
 * Generate the reverse table.
 * @return {Uint8Array} The reverse table.
 */
const buildReverseTable = () => {
    if (reverseTable === null) {
        reverseTable = new Uint8Array(256);

        for (let i = 0; i < 256; ++i) {
            let n = i;
            let r = n;
            let s = 7;
            for (n >>>= 1; n; n >>>= 1) {
                r <<= 1;
                r |= n & 1;
                --s;
            }

            reverseTable[i] = (r << s & 0xff) >>> 0;
        }
    }

    return reverseTable;
};

/**
 * Reverse the bit order.
 * @param {number} n The number to reverse.
 * @return {number} The reversed number.
 */
const rev = (n) => {
    return buildReverseTable()[n];
};

/**
 * Reverse the bit order (32-bit).
 * @param {number} n The number to reverse.
 * @return {number} The reversed number.
 */
const rev32 = (n) => {
    const reverseTable = buildReverseTable();

    return (reverseTable[n & 0xff] << 24) |
        (reverseTable[n >>> 8 & 0xff] << 16) |
        (reverseTable[n >>> 16 & 0xff] << 8) |
        reverseTable[n >>> 24 & 0xff];
};

/**
 * BitStream Class
 * Based on https://github.com/imaya/zlib.js/blob/develop/src/bitstream.js
 * @class
 */
export default class BitStream {
    /**
     * New BitStream constructor.
     * @param {Uint8Array} buffer The buffer to write to.
     * @param {number} [index] The index to start writing at.
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
     * @return {Uint8Array} The buffer.
     */
    finish() {
        let index = this._index;

        if (this._bitIndex > 0) {
            this._buffer[index] <<= 8 - this._bitIndex;
            this._buffer[index] = rev(this._buffer[index]);
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
                rev32(number) >> (32 - n) :
                rev(number) >> (8 - n);
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
                    this._buffer[this._index++] = rev(current);
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
}
