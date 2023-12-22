(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
    typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.UI = global.UI || {}, global.UI, global.fQuery));
})(this, (function (exports, ui, $) { 'use strict';

    /**
     * Convert a column number to name.
     * @param {number} num The number.
     * @return {string} The column name.
     */
    function colName(num) {
        const code = 65 + ((num - 1) % 26);
        const letter = String.fromCharCode(code);

        const nextNum = Math.round((num - 1) / 26);

        if (nextNum > 0) {
            return colName(nextNum) + letter;
        }

        return letter;
    }
    /**
     * Escape a string for Excel.
     * @param {string} string The input string.
     * @return {string} The escaped string.
     */
    function escape(string) {
        string = string.replace('&', '&amp;');
        string = string.replace('<', '&lt;');
        string = string.replace('>', '&gt;');
        string = string.replace('\x03', '');

        return string;
    }
    /**
     * Convert a date to Excel format.
     * @param {number} year The year.
     * @param {number} month The month.
     * @param {number} day The day.
     * @param {number} [hours] The hours.
     * @param {number} [minutes] The minutes.
     * @param {number} [seconds] The seconds.
     * @return {number} The Excel timestamp.
     */
    function formatDate(year, month, day, hours = 0, minutes = 0, seconds = 0) {
        const time = ((hours * 3600) + (minutes * 60) + seconds) / 86400;

        if (!year) {
            return time;
        }

        let leapAdjust = 1;
        if (year == 1900 && month <= 2) {
            leapAdjust = 0;
        }

        if (month > 2) {
            month -= 3;
        } else {
            month += 9;
            year--;
        }

        const century = year.substring(0, 2);
        const decade = year.substring(2);

        return Math.floor((146097 * century) / 4) + Math.floor((1461 * decade) / 4) + Math.floor((153 * (month + 2)) / 5) + day + 1721119 - 2415020 + leapAdjust;
    }

    const templates = {
        '[Content_Types].xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/_rels/.rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
            '<Override PartName="/xl/_rels/workbook.xml.rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '{sheets}' +
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '</Types>',
        '_rels/.rels':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
            '</Relationships>',
        'docProps/app.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
            '<TotalTime>0</TotalTime>' +
            '<Application>FrostUI-Tables</Application>' +
            '</Properties>',
        'docProps/core.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<dcterms:created xsi:type="dcterms:W3CDTF">{date}</dcterms:created>' +
            '<dc:language>en-US</dc:language>' +
            '<dcterms:modified xsi:type="dcterms:W3CDTF">{date}</dcterms:modified>' +
            '<cp:revision>1</cp:revision>' +
            '</cp:coreProperties>',
        'xl/_rels/workbook.xml.rels':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
            '{sheets}',
        'xl/worksheets/sheet1.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="{ref}"/><cols>{cols}</cols><sheetData>{rows}</sheetData></worksheet>',
        'xl/sharedStrings.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{cnt}" uniqueCount="{cnt}">{strings}</sst>',
        'xl/styles.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<fonts count="2"><font><name val="Calibri"/><family val="2"/></font><font><name val="Calibri"/><family val="2"/><b/></font></fonts>' +
            '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" /></cellStyleXfs>' +
            '<cellXfs count="8">' +
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
            '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '<xf numFmtId="20" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '<xf numFmtId="22" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>' +
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
            '</cellXfs>' +
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '</styleSheet>',
        'xl/workbook.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<fileVersion appName="FrostUI-Tables"/><sheets>' +
            '{sheets}' +
            '</sheets></workbook>',
    };

    let table = null;

    /**
     * Generate the CRC32 table.
     * @return {Uint32Array} The CRC32 table.
     */
    const generateTable = () => {
        if (!table) {
            table = new Uint32Array(256);

            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[i] = c >>> 0;
            }
        }

        return table;
    };

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
         * @return {number} The CRC32 hash.
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
         * @return {number} The CRC32 hash.
         */
        static update(data, crc, pos = 0, length = null) {
            if (length === null) {
                length = data.length;
            }

            crc ^= 0xffffffff;

            const table = generateTable();

            for (let i = length & 7; i--; ++pos) {
                crc = (crc >>> 8) ^ table[(crc ^ data[pos]) & 0xff];
            }

            for (let i = length >> 3; i--; pos += 8) {
                crc = (crc >>> 8) ^ table[(crc ^ data[pos]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 1]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 2]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 3]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 4]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 5]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 6]) & 0xff];
                crc = (crc >>> 8) ^ table[(crc ^ data[pos + 7]) & 0xff];
            }

            return (crc ^ 0xffffffff) >>> 0;
        }
    }

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
    class BitStream {
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

    /**
     * Get index of parent node.
     * @param {number} index The index.
     * @return {number} The parent index.
     */
    const getParent = (index) => {
        return ((index - 2) / 4 | 0) * 2;
    };

    /**
     * Get index of child node.
     * @param {number} index The index.
     * @return {number} The child index.
     */
    const getChild = (index) => {
        return 2 * index + 2;
    };

    /**
     * Heap Class
     * Based on https://github.com/imaya/zlib.js/blob/develop/src/heap.js
     * @class
     */
    class Heap {
        /**
         * New Heap constructor.
         * @param {number} [length] The size of the heap.
         */
        constructor(length) {
            this._buffer = new Uint16Array(length * 2);
            this.length = 0;
        }

        /**
         * Pop the top value off the heap.
         * @return {object} The top value from the heap.
         */
        pop() {
            const value = this._buffer[0];
            const index = this._buffer[1];

            this.length -= 2;
            this._buffer[0] = this._buffer[this.length];
            this._buffer[1] = this._buffer[this.length + 1];

            let parent = 0;
            while (true) {
                let current = getChild(parent);

                if (current >= this.length) {
                    break;
                }

                if (current + 2 < this.length && this._buffer[current + 2] > this._buffer[current]) {
                    current += 2;
                }

                if (this._buffer[current] > this._buffer[parent]) {
                    let swap = this._buffer[parent];
                    this._buffer[parent] = this._buffer[current];
                    this._buffer[current] = swap;

                    swap = this._buffer[parent + 1];
                    this._buffer[parent + 1] = this._buffer[current + 1];
                    this._buffer[current + 1] = swap;
                } else {
                    break;
                }

                parent = current;
            }

            return { index, value };
        }

        /**
         * Push a value onto the heap.
         * @param {number} index The index.
         * @param {number} value The value to push.
         */
        push(index, value) {
            let current = this.length;
            this._buffer[this.length++] = value;
            this._buffer[this.length++] = index;

            while (current > 0) {
                const parent = getParent(current);

                if (this._buffer[current] > this._buffer[parent]) {
                    let swap = this._buffer[current];
                    this._buffer[current] = this._buffer[parent];
                    this._buffer[parent] = swap;

                    swap = this._buffer[current + 1];
                    this._buffer[current + 1] = this._buffer[parent + 1];
                    this._buffer[parent + 1] = swap;

                    current = parent;
                } else {
                    break;
                }
            }
        }
    }

    let lengthCodeTable = null;

    /**
     * Generate the length codes.
     * @param {number} length The length.
     * @return {array} The LZ77 length codes.
     */
    const generateLengthCodes = (length) => {
        switch (true) {
            case (length === 3):
                return [257, length - 3, 0];
            case (length === 4):
                return [258, length - 4, 0];
            case (length === 5):
                return [259, length - 5, 0];
            case (length === 6):
                return [260, length - 6, 0];
            case (length === 7):
                return [261, length - 7, 0];
            case (length === 8):
                return [262, length - 8, 0];
            case (length === 9):
                return [263, length - 9, 0];
            case (length === 10):
                return [264, length - 10, 0];
            case (length <= 12):
                return [265, length - 11, 1];
            case (length <= 14):
                return [266, length - 13, 1];
            case (length <= 16):
                return [267, length - 15, 1];
            case (length <= 18):
                return [268, length - 17, 1];
            case (length <= 22):
                return [269, length - 19, 2];
            case (length <= 26):
                return [270, length - 23, 2];
            case (length <= 30):
                return [271, length - 27, 2];
            case (length <= 34):
                return [272, length - 31, 2];
            case (length <= 42):
                return [273, length - 35, 3];
            case (length <= 50):
                return [274, length - 43, 3];
            case (length <= 58):
                return [275, length - 51, 3];
            case (length <= 66):
                return [276, length - 59, 3];
            case (length <= 82):
                return [277, length - 67, 4];
            case (length <= 98):
                return [278, length - 83, 4];
            case (length <= 114):
                return [279, length - 99, 4];
            case (length <= 130):
                return [280, length - 115, 4];
            case (length <= 162):
                return [281, length - 131, 5];
            case (length <= 194):
                return [282, length - 163, 5];
            case (length <= 226):
                return [283, length - 195, 5];
            case (length <= 257):
                return [284, length - 227, 5];
            case (length === 258):
                return [285, length - 258, 0];
        }
    };

    /**
     * Generate the length code table.
     * @return {array} The length code table.
     */
    const generateLengthTable = () => {
        if (!lengthCodeTable) {
            lengthCodeTable = [];
            for (let i = 3; i <= 258; i++) {
                const c = generateLengthCodes(i);
                lengthCodeTable[i] = (c[2] << 24) | (c[1] << 16) | c[0];
            }
        }

        return lengthCodeTable;
    };

    /**
     * Get the distance code.
     * @param {number} dist The distance.
     * @return {array} The distance code.
     */
    const getDistanceCode = (dist) => {
        switch (true) {
            case (dist === 1):
                return [0, dist - 1, 0];
            case (dist === 2):
                return [1, dist - 2, 0];
            case (dist === 3):
                return [2, dist - 3, 0];
            case (dist === 4):
                return [3, dist - 4, 0];
            case (dist <= 6):
                return [4, dist - 5, 1];
            case (dist <= 8):
                return [5, dist - 7, 1];
            case (dist <= 12):
                return [6, dist - 9, 2];
            case (dist <= 16):
                return [7, dist - 13, 2];
            case (dist <= 24):
                return [8, dist - 17, 3];
            case (dist <= 32):
                return [9, dist - 25, 3];
            case (dist <= 48):
                return [10, dist - 33, 4];
            case (dist <= 64):
                return [11, dist - 49, 4];
            case (dist <= 96):
                return [12, dist - 65, 5];
            case (dist <= 128):
                return [13, dist - 97, 5];
            case (dist <= 192):
                return [14, dist - 129, 6];
            case (dist <= 256):
                return [15, dist - 193, 6];
            case (dist <= 384):
                return [16, dist - 257, 7];
            case (dist <= 512):
                return [17, dist - 385, 7];
            case (dist <= 768):
                return [18, dist - 513, 8];
            case (dist <= 1024):
                return [19, dist - 769, 8];
            case (dist <= 1536):
                return [20, dist - 1025, 9];
            case (dist <= 2048):
                return [21, dist - 1537, 9];
            case (dist <= 3072):
                return [22, dist - 2049, 10];
            case (dist <= 4096):
                return [23, dist - 3073, 10];
            case (dist <= 6144):
                return [24, dist - 4097, 11];
            case (dist <= 8192):
                return [25, dist - 6145, 11];
            case (dist <= 12288):
                return [26, dist - 8193, 12];
            case (dist <= 16384):
                return [27, dist - 12289, 12];
            case (dist <= 24576):
                return [28, dist - 16385, 13];
            case (dist <= 32768):
                return [29, dist - 24577, 13];
        }
    };

    /**
     * Get the length code.
     * @param {number} length The length.
     * @return {number} The length code.
     */
    const getLengthCode = (length) => {
        return generateLengthTable()[length];
    };

    /**
     * Lz77Match Class
     * Based on https://github.com/imaya/zlib.js/blob/develop/src/rawdeflate.js
     * @class
     */
    class Lz77Match {
        /**
         * New Lz77Match constructor.
         * @param {number} length The length of the match.
         * @param {number} backwardDistance The distanch to match position.
         */
        constructor(length, backwardDistance) {
            this.length = length;
            this._backwardDistance = backwardDistance;
        }

        /**
         * Get the LZ77 coded array.
         * @return {array} The LZ77 Array.
         */
        toLz77Array() {
            const codeArray = [];
            let pos = 0;

            const lengthCode = getLengthCode(this.length);
            codeArray[pos++] = lengthCode & 0xffff;
            codeArray[pos++] = (lengthCode >> 16) & 0xff;
            codeArray[pos++] = lengthCode >> 24;

            const distCode = getDistanceCode(this._backwardDistance);
            codeArray[pos++] = distCode[0];
            codeArray[pos++] = distCode[1];
            codeArray[pos++] = distCode[2];

            return codeArray;
        }
    }

    /**
     * Get the Huffman codes from the code lengths.
     * @param {Uint8Array} lengths The code lengths.
     * @return {Uint16Array} The Huffman codes.
     */
    const getCodesFromLengths = (lengths) => {
        const codes = new Uint16Array(lengths.length);
        const count = [];
        const startCode = [];
        let code = 0;

        for (let i = 0; i < lengths.length; i++) {
            count[lengths[i]] = (count[lengths[i]] | 0) + 1;
        }

        for (let i = 1; i <= 16; i++) {
            startCode[i] = code;
            code += count[i] | 0;
            code <<= 1;
        }

        for (let i = 0; i < lengths.length; i++) {
            code = startCode[lengths[i]];
            startCode[lengths[i]] += 1;
            codes[i] = 0;

            for (let j = 0; j < lengths[i]; j++) {
                codes[i] = (codes[i] << 1) | (code & 1);
                code >>>= 1;
            }
        }

        return codes;
    };

    /**
     * Get the lengths of a Huffman code.
     * @param {Uint32Array} freqs The frequency counts.
     * @param {number} limit The code length limit.
     * @return {Uint8Array} The code lengths.
     */
    const getLengths = (freqs, limit) => {
        const heap = new Heap(2 * 286);
        const length = new Uint8Array(freqs.length);

        for (let i = 0; i < freqs.length; i++) {
            if (freqs[i] > 0) {
                heap.push(i, freqs[i]);
            }
        }

        const nodes = new Array(heap.length / 2);
        const values = new Uint32Array(heap.length / 2);

        if (nodes.length === 1) {
            length[heap.pop().index] = 1;
            return length;
        }

        for (let i = 0; i < nodes.length; i++) {
            nodes[i] = heap.pop();
            values[i] = nodes[i].value;
        }

        const codeLengths = reversePackageMerge(values, values.length, limit);

        for (let i = 0; i < nodes.length; i++) {
            length[nodes[i].index] = codeLengths[i];
        }

        return length;
    };

    /**
     * Calculate the tree symbols.
     * @param {number} hLit The HLIT.
     * @param {Uint8Array} litLenLengths The literal lengths and length codes.
     * @param {number} hDist The HDIST.
     * @param {Uint8Array} distLengths The distance code lengths.
     * @return {object} The tree symbols.
     */
    const getTreeSymbols = (hLit, litLenLengths, hDist, distLengths) => {
        const src = new Uint32Array(hLit + hDist);
        const result = new Uint32Array(316);
        const freqs = new Uint8Array(19);

        let j = 0;

        for (let i = 0; i < hLit; i++) {
            src[j++] = litLenLengths[i];
        }

        for (let i = 0; i < hDist; i++) {
            src[j++] = distLengths[i];
        }

        let nResult = 0;

        for (let i = 0; i < src.length; i += j) {
            for (j = 1; i + j < src.length && src[i + j] === src[i]; j++) { }

            let runLength = j;

            if (src[i] === 0) {
                if (runLength < 3) {
                    while (runLength-- > 0) {
                        result[nResult++] = 0;
                        freqs[0]++;
                    }
                } else {
                    while (runLength > 0) {
                        let rpt = Math.min(runLength, 138);

                        if (rpt > runLength - 3 && rpt < runLength) {
                            rpt = runLength - 3;
                        }

                        if (rpt <= 10) {
                            result[nResult++] = 17;
                            result[nResult++] = rpt - 3;
                            freqs[17]++;
                        } else {
                            result[nResult++] = 18;
                            result[nResult++] = rpt - 11;
                            freqs[18]++;
                        }

                        runLength -= rpt;
                    }
                }
            } else {
                result[nResult++] = src[i];
                freqs[src[i]]++;
                runLength--;

                if (runLength < 3) {
                    while (runLength-- > 0) {
                        result[nResult++] = src[i];
                        freqs[src[i]]++;
                    }
                } else {
                    while (runLength > 0) {
                        let rpt = Math.min(runLength, 6);

                        if (rpt > runLength - 3 && rpt < runLength) {
                            rpt = runLength - 3;
                        }

                        result[nResult++] = 16;
                        result[nResult++] = rpt - 3;
                        freqs[16]++;

                        runLength -= rpt;
                    }
                }
            }
        }

        return {
            codes: result.subarray(0, nResult),
            freqs,
        };
    };

    /**
     * Find the optimal Huffman code.
     * @param {Uint32Array} freqs The value frequencies.
     * @param {number} symbols The number of symbols.
     * @param {number} limit The code length limit.
     * @return {Uint8Array} The code lengths.
     */
    const reversePackageMerge = (freqs, symbols, limit) => {
        const minimumCost = new Uint16Array(limit);
        const flag = new Uint8Array(limit);
        const codeLengths = new Uint8Array(symbols);
        const value = new Array(limit);
        const type = new Array(limit);
        const currentPosition = new Array(limit);
        let excess = (1 << limit) - symbols;
        const half = (1 << (limit - 1));

        minimumCost[limit - 1] = symbols;

        for (let i = 0; i < limit; i++) {
            if (excess < half) {
                flag[i] = 0;
            } else {
                flag[i] = 1;
                excess -= half;
            }
            excess <<= 1;
            minimumCost[limit - 2 - i] = (minimumCost[limit - 1 - i] / 2 | 0) + symbols;
        }

        minimumCost[0] = flag[0];

        value[0] = new Array(minimumCost[0]);
        type[0] = new Array(minimumCost[0]);

        for (let i = 0; i < limit; i++) {
            if (minimumCost[i] > 2 * minimumCost[i - 1] + flag[i]) {
                minimumCost[i] = 2 * minimumCost[i - 1] + flag[i];
            }

            value[i] = new Array(minimumCost[i]);
            type[i] = new Array(minimumCost[i]);
        }

        for (let i = 0; i < symbols; i++) {
            codeLengths[i] = limit;
        }

        for (let i = 0; i < minimumCost[limit - 1]; i++) {
            value[limit - 1][i] = freqs[i];
            type[limit - 1][i] = i;
        }

        for (let i = 0; i < limit; i++) {
            currentPosition[i] = 0;
        }

        if (flag[limit - 1] === 1) {
            codeLengths[0]--;
            currentPosition[limit - 1]++;
        }

        const takePackage = (i) => {
            const x = type[i][currentPosition[i]];

            if (x === symbols) {
                takePackage(i + 1);
                takePackage(i + 1);
            } else {
                codeLengths[x]--;
            }

            currentPosition[i]++;
        };

        for (let i = limit - 2; i >= 0; i--) {
            let t = 0;
            let next = currentPosition[i + 1];

            for (let j = 0; j < minimumCost[i]; j++) {
                const weight = value[i + 1][next] + value[i + 1][next + 1];

                if (weight > freqs[t]) {
                    value[i][j] = weight;
                    type[i][j] = symbols;
                    next += 2;
                } else {
                    value[i][j] = freqs[t];
                    type[i][j] = t;
                    t++;
                }
            }

            currentPosition[i] = 0;
            if (flag[i] === 1) {
                takePackage(i);
            }
        }

        return codeLengths;
    };

    /**
     * RawDeflate Class
     * Based on https://github.com/imaya/zlib.js/blob/develop/src/rawdeflate.js
     * @class
     */
    class RawDeflate {
        /**
         * New RawDeflate constructor.
         * @param {Uint8Array} input The input data.
         * @param {object} options The options to create the RawDeflate with.
         */
        constructor(input, options) {
            options = {
                lazy: 0,
                lz77MinLength: 3,
                lz77MaxLength: 258,
                ...options,
            };

            this._input = input;
            this._lazy = options.lazy;
            this._lz77MinLength = options.lz77MinLength;
            this._lz77MaxLength = options.lz77MaxLength;
            this._outputIndex = 0;
            this._output = new Uint8Array(0x8000);
        }

        /**
         * Compress the data.
         * @return {Uint8Array} The compressed data.
         */
        compress() {
            const stream = new BitStream(new Uint8Array(this._output.buffer), this._outputIndex);

            const bFinal = 1;
            const bType = 2;

            stream.writeBits(bFinal, 1, true);
            stream.writeBits(bType, 2, true);

            const data = this._lz77();

            const litLenLengths = getLengths(this.freqsLitLen, 15);
            const litLenCodes = getCodesFromLengths(litLenLengths);
            const distLengths = getLengths(this.freqsDist, 7);
            const distCodes = getCodesFromLengths(distLengths);

            // hlit, hdist
            let hLit; let hDist;
            for (hLit = 286; hLit > 257 && litLenLengths[hLit - 1] === 0; hLit--) { }
            for (hDist = 30; hDist > 1 && distLengths[hDist - 1] === 0; hDist--) { }

            // hclen
            const treeSymbols = getTreeSymbols(hLit, litLenLengths, hDist, distLengths);
            const treeLengths = getLengths(treeSymbols.freqs, 7);

            const transLengths = new Array(19);
            const hcLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
            for (let i = 0; i < 19; i++) {
                transLengths[i] = treeLengths[hcLengthOrder[i]];
            }

            let hcLen;
            for (hcLen = 19; hcLen > 4 && transLengths[hcLen - 1] === 0; hcLen--) { }

            const treeCodes = getCodesFromLengths(treeLengths);

            stream.writeBits(hLit - 257, 5, true);
            stream.writeBits(hDist - 1, 5, true);
            stream.writeBits(hcLen - 4, 4, true);

            for (let i = 0; i < hcLen; i++) {
                stream.writeBits(transLengths[i], 3, true);
            }

            for (let i = 0; i < treeSymbols.codes.length; i++) {
                const code = treeSymbols.codes[i];

                stream.writeBits(treeCodes[code], treeLengths[code], true);

                if (code >= 16) {
                    i++;

                    let bitLength;
                    switch (code) {
                        case 16:
                            bitLength = 2;
                            break;
                        case 17:
                            bitLength = 3;
                            break;
                        case 18:
                            bitLength = 7;
                            break;
                    }

                    stream.writeBits(treeSymbols.codes[i], bitLength, true);
                }
            }

            for (let i = 0; i < data.length; i++) {
                const literal = data[i];

                stream.writeBits(litLenCodes[literal], litLenLengths[literal], true);

                if (literal > 256) {
                    stream.writeBits(data[++i], data[++i], true);
                    const code = data[++i];
                    stream.writeBits(distCodes[code], distLengths[code], true);
                    stream.writeBits(data[++i], data[++i], true);
                } else if (literal === 256) {
                    break;
                }
            }

            this._output = stream.finish();
            this._outputIndex = this._output.length;

            return this._output;
        }

        /**
         * Compress the data.
         * @param {Uint8Array} data The input data.
         * @param {object} options The options to create the RawDeflate with.
         * @return {Uint8Array} The compressed data.
         */
        static compress(data, options) {
            return (new this(data, options)).compress();
        }

        /**
         * Calculate the LZ77 array.
         * @return {Uint16Array} The LZ77 array.
         */
        _lz77() {
            const lz77buf = new Uint16Array(this._input.length * 2);
            const freqsLitLen = new Uint32Array(286);
            const freqsDist = new Uint32Array(30);

            freqsLitLen[256] = 1;

            const table = {};
            let pos = 0;
            let skipLength = 0;
            let prevMatch;

            const writeMatch = (match, offset) => {
                const tempArray = match.toLz77Array();

                for (let i = 0; i < tempArray.length; i++) {
                    lz77buf[pos++] = tempArray[i];
                }

                freqsLitLen[tempArray[0]]++;
                freqsDist[tempArray[3]]++;

                skipLength = match.length + offset - 1;
                prevMatch = null;
            };

            for (let position = 0; position < this._input.length; position++) {
                let matchKey = 0;
                for (let i = 0; i < this._lz77MinLength; i++) {
                    if (position + i === this._input.length) {
                        break;
                    }

                    matchKey = (matchKey << 8) | this._input[position + i];
                }

                if (!(matchKey in table)) {
                    table[matchKey] = [];
                }

                const matchList = table[matchKey];

                if (skipLength-- > 0) {
                    matchList.push(position);
                    continue;
                }

                while (matchList.length > 0 && position - matchList[0] > 0x8000) {
                    matchList.shift();
                }

                if (position + this._lz77MinLength >= this._input.length) {
                    if (prevMatch) {
                        writeMatch(prevMatch, -1);
                    }

                    for (let i = 0; i < this._input.length - position; i++) {
                        const tmp = this._input[position + i];
                        lz77buf[pos++] = tmp;
                        freqsLitLen[tmp]++;
                    }
                    break;
                }

                if (matchList.length) {
                    const longestMatch = this._searchLongestMatch(position, matchList);

                    if (prevMatch) {
                        if (prevMatch.length < longestMatch.length) {
                            const tmp = this._input[position - 1];
                            lz77buf[pos++] = tmp;
                            freqsLitLen[tmp]++;

                            writeMatch(longestMatch, 0);
                        } else {
                            writeMatch(prevMatch, -1);
                        }
                    } else if (longestMatch.length < this._lazy) {
                        prevMatch = longestMatch;
                    } else {
                        writeMatch(longestMatch, 0);
                    }
                } else if (prevMatch) {
                    writeMatch(prevMatch, -1);
                } else {
                    const tmp = this._input[position];
                    lz77buf[pos++] = tmp;
                    freqsLitLen[tmp]++;
                }

                matchList.push(position);
            }

            lz77buf[pos++] = 256;
            freqsLitLen[256]++;
            this.freqsLitLen = freqsLitLen;
            this.freqsDist = freqsDist;

            return lz77buf.subarray(0, pos);
        }

        /**
         * Find the longest match from the list of matches.
         * @param {number} position The array position.
         * @param {array} matchList The list of matches.
         * @return {Lz77Match} The Lz77Match.
         */
        _searchLongestMatch(position, matchList) {
            let currentMatch;
            let matchMax = 0;
            const length = matchList.length;

            permatch:
            for (let i = 0; i < length; i++) {
                const match = matchList[length - i - 1];
                let matchLength = this._lz77MinLength;

                if (matchMax > this._lz77MaxLength) {
                    for (j = matchMax; j > this._lz77MinLength; j--) {
                        if (this._input[match + j - 1] !== this._input[position + j - 1]) {
                            continue permatch;
                        }
                    }

                    matchLength = matchMax;
                }

                while (matchLength < this._lz77MaxLength && position + matchLength < length && this._input[match + matchLength] === this._input[position + matchLength]) {
                    matchLength++;
                }

                if (matchLength > matchMax) {
                    currentMatch = match;
                    matchMax = matchLength;
                }

                if (matchLength === this._lz77MaxLength) {
                    break;
                }
            }

            return new Lz77Match(matchMax, position - currentMatch);
        }
    }

    const encoder = new TextEncoder;

    /**
     * Encode a string in binary.
     * @param {string} string The string.
     * @return {Uint8Array} The encoded string.
     */
    const encode = (string) => {
        return encoder.encode(string);
    };

    /**
     * Get the byte length of a string.
     * @param {string} string The string.
     * @return {number} The byte length.
     */
    const length = (string) => {
        return encode(string).length;
    };

    /**
     * Convert a number to an Int16Array.
     * @param {number} number The number.
     * @return {Int16Array} The Int16Array.
     */
    const signed16 = (number) => {
        return new Int16Array([number]);
    };

    /**
     * Convert a number to an Int32Array.
     * @param {number} number The number.
     * @return {Int32Array} The Int32Array.
     */
    const signed32 = (number) => {
        return new Int32Array([number]);
    };

    /**
     * Zip Class
     * Based on https://github.com/shuchkin/simplexlsxgen/blob/master/src/SimpleXLSXGen.php
     * @class
     */
    class Zip {
        /**
         * New Zip constructor.
         * @param {string} [type=octet/stream] The file type.
         */
        constructor(type = 'octet/stream') {
            this._type = type;
            this._dir = [];
            this._files = [];
            this._offset = 0;
            this._entries = 0;
        }

        /**
         * Add a file to the Zip.
         * @param {string} filename The filename.
         * @param {string} data The data.
         */
        addFile(filename, data) {
            const vNeeded = 10;

            const filenameLength = length(filename);

            data = encode(data);
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

            const offsetYear = now.getYear() - 1980;

            const seconds = `${offsetSeconds.toString(2)}`.padStart(5, '0');
            const minutes = `${now.getMinutes().toString(2)}`.padStart(6, '0');
            const hours = `${now.getHours().toString(2)}`.padStart(5, '0');
            const date = `${now.getDate().toString(2)}`.padStart(5, '0');
            const month = `${now.getMonth().toString(2)}`.padStart(4, '0');
            const year = `${offsetYear.toString(2)}`.padStart(7, '0');

            const modTime = parseInt(`${hours}${minutes}${seconds}`, 2);
            const modDate = parseInt(`${year}${month}${date}`, 2);

            const dir = [
                encode('\x50\x4b\x01\x02'), // dir signature
                signed16(0), // version made by
                signed16(vNeeded),
                signed16(0), // bit flag
                signed16(cMethod),
                signed16(modTime),
                signed16(modDate),
                signed32(crc32),
                signed32(compressedSize),
                signed32(uncompressedSize),
                signed16(filenameLength),
                signed16(0), // extra field length
                signed16(0), // file comment length
                signed16(0), // disk number start
                signed16(0), // internal file attributes
                signed32(32), // internal file attributes
                signed32(this._offset), // offset of local header
                encode(filename),
            ];

            this._dir.push(...dir);

            const file = [
                encode('\x50\x4b\x03\x04'), // zip signature
                signed16(vNeeded),
                signed16(0), // bit flag
                signed16(cMethod),
                signed16(modTime),
                signed16(modDate),
                signed32(crc32),
                signed32(compressedSize),
                signed32(uncompressedSize),
                signed16(filenameLength),
                signed16(0), // extra field length
                encode(filename),
                data,
            ];

            this._files.push(...file);

            this._offset += file.reduce((acc, file) => acc + file.byteLength, 0);
            this._entries++;
        }

        /**
         * Create the zip file.
         * @return {Blob} The zip file.
         */
        zip() {
            const dirLength = this._dir.reduce((acc, file) => acc + file.byteLength, 0);

            return new Blob(
                [
                    ...this._files,
                    ...this._dir,
                    encode('\x50\x4b\x05\x06'), // end of central directory
                    signed16(0), // number of this disk
                    signed16(0), // number of the disk with the start of the central directory
                    signed16(this._entries), // total entries on this disk
                    signed16(this._entries), // total entries
                    signed32(dirLength), // size of central dir
                    signed32(this._offset), // offset to start of central dir
                    signed16(0), // file comment length
                ],
                { type: this._type },
            );
        }
    }

    /**
     * Workbook Class
     * Based on https://github.com/shuchkin/simplexlsxgen/blob/master/src/SimpleXLSXGen.php
     * @class
     */
    class Workbook {
        /**
         * New Workbook constructor.
         */
        constructor() {
            this._current = 0;
            this._sheets = [];
            this._sKeys = {};
            this._sValues = [];
        }

        /**
         * Add a sheet to the Workbook.
         * @param {object} data The sheet data.
         * @param {string} [name] The name of the sheet.
         */
        addSheet(data, name = null) {
            this._current++;

            if (!name) {
                name = `Sheet${this._current}`;
            }

            this._sheets.push({
                name,
                data,
            });
        }

        /**
         * Create an xlsx file.
         * @return {Blob} The xlsx file.
         */
        create() {
            const zip = new Zip('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            for (let [filename, template] of Object.entries(templates)) {
                switch (filename) {
                    case '[Content_Types].xml':
                        const override = this._sheets.map((_, index) =>
                            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
                        ).join('');

                        template = template.replace('{sheets}', override);

                        zip.addFile(filename, template);
                        break;
                    case 'xl/_rels/workbook.xml.rels':
                        let relationships = this._sheets.map((_, index) =>
                            `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml\"/>\n`,
                        ).join('');

                        relationships += `<Relationship Id="rId${this._sheets.length + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

                        template = template.replace('{sheets}', relationships);

                        zip.addFile(filename, template);
                        break;
                    case 'xl/workbook.xml':
                        const sheets = this._sheets.map((sheet, index) =>
                            `<sheet name="${sheet.name}" sheetId="${index + 1}" state="visible" r:id="rId${index + 2}"/>`,
                        );

                        template = template.replace('{sheets}', sheets);

                        zip.addFile(filename, template);
                        break;
                    case 'docProps/core.xml':
                        const date = (new Date).toISOString().substring(0, 19) + 'Z';
                        template = template.replaceAll('{date}', date);

                        zip.addFile(filename, template);
                        break;
                    case 'xl/sharedStrings.xml':
                        if (!this._sValues.length) {
                            this._sValues.push('No Data');
                        }

                        const strings = this._sValues.map((string) =>
                            `<si><t>${string}</t></si>`,
                        ).join('\r\n');

                        template = template.replaceAll('{cnt}', `${this._sValues.length}`);
                        template = template.replace('{strings}', strings);

                        zip.addFile(filename, template);
                        break;
                    case 'xl/worksheets/sheet1.xml':
                        for (const [index, sheet] of this._sheets.entries()) {
                            filename = `xl/worksheets/sheet${index + 1}.xml`;
                            const xml = this._sheetToXml(sheet, template);

                            zip.addFile(filename, xml);
                        }

                        break;
                    default:
                        zip.addFile(filename, template);
                        break;
                }
            }

            return zip.zip();
        }

        /**
         * Convert a sheet object to an XML string.
         * @param {object} sheet The sheet.
         * @param {string} template The XML template.
         * @return {string} The XML string.
         */
        _sheetToXml(sheet, template) {
            const colLengths = {};
            const cols = [];
            const rows = [];
            let currentRow = 0;

            const addRow = (data, forceStyle = null) => {
                currentRow++;

                let row = `<row r="${currentRow}">`;
                let currentCol = 0;

                for (let value of data) {
                    currentCol++;

                    if (currentRow === 1) {
                        colLengths[currentCol] = 0;
                    }

                    if (!value) {
                        continue;
                    }

                    const cName = colName(currentCol) + currentRow;

                    value = `${value}`;

                    const length = value.length;

                    let cType; let cStyle; let cValue;

                    if (value === '0' || /^[-+]?[1-9]\d{0,14}$/.test(value)) {
                        cValue = value.trimStart('+');
                        if (length > 10) {
                            cStyle = 1; // 0
                        }
                    } else if (/^[-+]?(?:0|[1-9]\d*)\.\d+$/.test(value)) {
                        cValue = value.trimStart('+');
                    } else if (/^[-+]?\d+%$/.test(value)) {
                        value = parseInt(value) / 100;
                        cValue = value.toFixed(2);
                        cStyle = 2; // 0%
                    } else if (/^[-+]?\d+\.\d+%$/.test(value)) {
                        value = Math.round(parseFloat(value) * 100) / 10000;
                        cValue = value.toFixed(4);
                        cStyle = 3; // 0.00%
                    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                        cValue = formatDate(match[1], match[2], match[3]);
                        cStyle = 4; // mm-dd-yy
                    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                        cValue = formatDate(match[3], match[2], match[1]);
                        cStyle = 4; // mm-dd-yy
                    } else if (/\d{2}:\d{2}:\d{2}$/.test(value)) {
                        const match = value.match(/(\d{2}):(\d{2}):(\d{2})$/);
                        cValue = formatDate(0, 0, 0, match[1], match[2], match[3]);
                        cStyle = 5; // h:mm
                    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
                        const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
                        cValue = formatDate(match[1], match[2], match[3], match[4], match[5], match[6]);
                        cStyle = 6; // m/d/yy h:mm
                    } else if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(value)) {
                        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
                        cValue = formatDate(match[3], match[2], match[1], match[4], match[5], match[6]);
                        cStyle = 6; // m/d/yy h:mm
                    } else if (length > 160) {
                        cType = 'inlineStr';
                        cValue = escape(value);
                    } else {
                        if (/^[0-9+-.]+$/.test(value)) {
                            cStyle = 7; // align right
                        }

                        cType = 's'; // shared string

                        value = value.trimStart('\0');
                        value = escape(value);

                        const sKey = `~${value}`;

                        if (sKey in this._sKeys) {
                            cValue = this._sKeys[sKey];
                        } else {
                            this._sValues.push(value);
                            cValue = this._sValues.length - 1;
                            this._sKeys[sKey] = cValue;
                        }
                    }

                    colLengths[currentCol] = Math.max(length, colLengths[currentCol]);

                    const attributes = {
                        r: cName,
                    };

                    if (cType) {
                        attributes.t = cType;
                    }

                    if (forceStyle) {
                        cStyle = forceStyle;
                    }

                    if (cStyle) {
                        attributes.s = cStyle;
                    }

                    row += `<c ${Object.keys(attributes).map((attr) => `${attr}="${attributes[attr]}"`).join(' ')}>` +
                        (
                            cType === 'inlineStr' ?
                                `<is><t>${cValue}</t></is>` :
                                `<v>${cValue}</v>`
                        ) +
                        '</c>';
                }

                row += '</row>';
                rows.push(row);
            };

            if (sheet.data.header) {
                addRow(sheet.data.header, 8);
            }

            if (sheet.data.rows) {
                for (const data of sheet.data.rows) {
                    addRow(data);
                }
            }

            if (sheet.data.footer) {
                addRow(sheet.data.footer, 8);
            }

            for (const [key, max] of Object.entries(colLengths)) {
                cols.push(`<col min="${key}" max="${key}" width="${Math.min(max + 5, 60)}" />`);
            }

            const ref = `A1:${colName(cols.length)}${rows.length}`;

            template = template.replace('{ref}', ref);
            template = template.replace('{cols}', cols.join('\r\n'));
            template = template.replace('{rows}', rows.join('\r\n'));

            return template;
        }
    }

    /**
     * Build a data array from a DOM element.
     * @param {HTMLElement} element The element to parse.
     * @return {array} The parsed data.
     */
    function getDataFromDOM(element) {
        const tbody = $.findOne('tbody', element);
        return $.children(tbody, 'tr').map(
            (row) => $.children(row, 'td').map((cell) => $.getHTML(cell)),
        );
    }
    /**
     * Build a heading array from a DOM element.
     * @param {HTMLElement} element The element to parse.
     * @return {array} The parsed data.
     */
    function getHeadingsFromDOM(element) {
        const tbody = $.findOne('thead', element);
        const row = $.children(tbody, 'tr').shift();

        return $.children(row, 'th').map((cell) => ({
            text: $.getHTML(cell),
            class: $.getAttribute(cell, 'class'),
        }));
    }
    /**
     * Download a blob.
     * @param {Blob} blob The blob to save.
     * @param {string} filename The filename.
     */
    function saveBlob(blob, filename) {
        const link = $.create('a', {
            attributes: {
                href: URL.createObjectURL(blob),
                download: filename,
            },
        });
        $.append(document.body, link);
        $.click(link);
        $.detach(link);
    }

    /**
     * Generate a CSV file from the table.
     * @param {object} options The button options.
     */
    function csv(options) {
        if (!options.title) {
            options.title = $.getText('title');
        }

        if (!options.columns) {
            options.columns = this._getVisibleColumns();
        }

        const rows = [
            this._getHeadings(options.columns),
            ...this._getResultRows(options.columns),
        ];

        // build csv data
        const lines = [];

        for (const row of rows) {
            const line = row.map(
                (value) => {
                    value = `${value}`.replace(/"/g, '""');

                    if (value.indexOf(',') >= 0) {
                        return `"${value}"`;
                    }

                    return value;
                },
            ).join(',');

            lines.push(line);
        }

        const blob = new Blob(
            [
                lines.join('\r\n'),
            ],
            { type: 'text/csv;charset=utf-8;' },
        );

        saveBlob(blob, `${options.title}.csv`);
    }/**
     * Generate an excel file from the table.
     * @param {object} options The button options.
     */
    function excel(options) {
        if (!options.title) {
            options.title = $.getText('title');
        }

        if (!options.columns) {
            options.columns = this._getVisibleColumns();
        }

        const workbook = new Workbook();
        workbook.addSheet({
            header: this._getHeadings(options.columns),
            rows: this._getResultRows(options.columns),
        });

        const blob = workbook.create();

        saveBlob(blob, `${options.title}.xlsx`);
    }
    /**
     * Print the table.
     * @param {object} options The button options.
     */
    function print(options) {
        if (!options.title) {
            options.title = $.getText('title');
        }

        if (!options.columns) {
            options.columns = this._getVisibleColumns();
        }

        const win = window.open('', '');

        win.document.head.innerHTML = `<title>${options.title}</title>`;

        const styles = $.find('link, style');
        const newStyles = $.clone(styles);

        for (const element of newStyles) {
            if ($.tagName(element) === 'link') {
                const oldRel = $.getAttribute(element, 'href');
                const href = (new URL(oldRel, document.location)).href;
                $.setAttribute(element, { href });
            }
            win.document.head.appendChild(element);
        }

        const container = $.create('div');
        const table = this._buildTable(options.columns);
        const classes = $.getAttribute(this._node, 'class');
        $.addClass(table, classes);
        $.append(container, table);
        const tableHtml = $.getHTML(container);
        win.document.body.innerHTML = `<h1>${options.title}</h1>${tableHtml}`;

        setTimeout((_) => {
            win.print();
            win.close();
        }, 1000);
    }

    /**
     * Table Class
     * @class
     */
    class Table extends ui.BaseComponent {
        /**
         * New Table constructor.
         * @param {HTMLElement} node The input node.
         * @param {object} [options] The options to create the Table with.
         */
        constructor(node, options) {
            super(node, options);

            if (options && options.layout) {
                Object.assign(this._options.layout, options.layout);
            }

            this._data = [];
            this._results = [];
            this._filtered = 0;
            this._total = 0;

            this._getData = null;

            let data;
            if (this._options.getResults) {
                this._getResultsInit();
            } else if ($._isArray(this._options.data)) {
                data = this._options.data;
            } else {
                data = getDataFromDOM(this._node);
            }

            if (data) {
                this._data = data;
                this._getDataInit();
            }

            this._headings = getHeadingsFromDOM(this._node);

            this._columns = [];

            if (this._options.columns) {
                this._columns = this._options.columns;
            } else {
                this._columns = new Array(this._headings.length).fill();
            }

            this._columns = this._columns.map((column, index) => ({
                class: null,
                data: index,
                dir: 'asc',
                format: null,
                name: null,
                orderData: null,
                orderable: true,
                searchable: true,
                visible: true,
                createdCell: null,
                ...column,
            }));

            this._columnCount = this._columns.reduce((acc, v) => {
                if (v.visible) {
                    acc++;
                }

                return acc;
            }, 0);

            this._offset = 0;
            this._limit = this._options.paging ?
                this._options.length :
                Number.INFINITY;
            this._order = this._options.order.slice();
            this._term = null;

            const id = $.getAttribute(this._node, 'id');

            if (!id) {
                $.setAttribute(this._node, { id: ui.generateId('table') });
                this._id = true;
            }

            this._buildIndex();
            this._render();
            this._events();

            $.triggerEvent(this._node, 'init.ui.table');

            this._getData();
        }

        /**
         * Add a row to the data array.
         * @param {Array|object} row The row to add.
         */
        addRow(row) {
            this._data.push(row);
            this._buildIndex();

            this._total++;
            this._filtered++;

            if (this._options.getResults) {
                this._rowIndexes.push(this._data.length - 1);

                this._refreshResults();
                this._renderResults();
            } else {
                this._getData();
            }
        }

        /**
         * Clear all rows from the data array.
         */
        clear() {
            this._data = [];
            this._index = [];
            this._filterIndexes = null;
            this._rowIndexes = [];
            this._results = [];
            this._offset = 0;
            this._total = 0;
            this._filtered = 0;

            if (this._options.searching) {
                $.setValue(this._searchInput, '');
            }

            this._renderResults();
        }

        /**
         * Dispose the Table.
         */
        dispose() {
            if (this._id) {
                $.removeAttribute(this._node, 'id');
            }

            $.removeAttribute(this._node, 'aria-describedby');

            $.before(this._container, this._node);
            $.remove(this._container);
            $.empty(this._node);

            for (const child of $.children(this._original)) {
                $.append(this._node, child);
            }

            this._original = null;
            this._container = null;
            this._loader = null;
            this._theadRow = null;
            this._tbody = null;
            this._tfoot = null;
            this._infoContainer = null;
            this._pagination = null;
            this._lengthSelect = null;
            this._searchInput = null;
            this._columns = null;
            this._headings = null;
            this._order = null;
            this._data = null;
            this._index = null;
            this._filterIndexes = null;
            this._rowIndexes = null;
            this._results = null;
            this._request = null;
            this._getData = null;

            super.dispose();
        }

        /**
         * Get values for a single column.
         * @param {string} key The key to retrieve.
         * @param {object} [options] Options for getting the column.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         * @return {Array} The column values.
         */
        getColumn(key, { modified = true } = {}) {
            return modified ?
                this._rowIndexes.map((rowIndex) => $._getDot(this._data[rowIndex], `${key}`)) :
                this._data.map((row) => $._getDot(row, `${key}`));
        }

        /**
         * Get values for a single row.
         * @param {number} index The row index to retrieve.
         * @param {object} [options] Options for getting the row index.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         * @return {Array} The row values.
         */
        getRow(index, { modified = true } = {}) {
            const rowIndex = this._getIndex(index, { modified });

            return $._isPlainObject(this._data[rowIndex]) ?
                { ...this._data[rowIndex] } :
                [...this._data[rowIndex]];
        }

        /**
         * Get a single value from a row.
         * @param {number} index The row index to retrieve.
         * @param {string} key The key to retrieve.
         * @param {object} [options] Options for getting the row index.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         * @return {*} The value.
         */
        getValue(index, key, { modified = true } = {}) {
            const rowIndex = this._getIndex(index, { modified });

            return $._getDot(this._data[rowIndex], `${key}`);
        }

        /**
         * Toggle a column as hidden.
         * @param {number} index The column index.
         */
        hideColumn(index) {
            this._columns[index].visible = false;

            this._renderResults();
        }

        /**
         * Get the Table information.
         * @return {object} The Table information.
         */
        info() {
            return {
                end: this._offset + this._results.length,
                filtered: this._filtered,
                start: this._offset,
                total: this._total,
            };
        }

        /**
         * Set the Table length.
         * @param {number} length The length.
         */
        length(length) {
            if (!this._options.paging) {
                return;
            }

            this._limit = length;
            this._offset -= (this._offset % this._limit);

            $.triggerEvent(this._node, 'length.ui.table');

            this._getData();
        }

        /**
         * Trigger the loading indicator.
         * @param {object} [options] Options for the loading indicator.
         * @param {Boolean} [options.show=true] Whether to show the loading indicator.
         */
        loading({ show = true } = {}) {
            if (show) {
                $.triggerEvent(this._node, 'processing.ui.table');
                $.show(this._loader);
            } else {
                $.hide(this._loader);
                $.triggerEvent(this._node, 'processed.ui.table');
            }
        }

        /**
         * Set the Table order data.
         * @param {array} order The order data.
         */
        order(order) {
            if (!this._options.ordering) {
                return;
            }

            this._order = order;

            $.triggerEvent(this._node, 'order.ui.table');

            this._getData();
        }

        /**
         * Set the Table page.
         * @param {array} page The page.
         */
        page(page) {
            if (!this._options.paging) {
                return;
            }

            this._offset = (page - 1) * this._limit;

            $.triggerEvent(this._node, 'page.ui.table');

            this._getData();
        }

        /**
         * Redraw the Table.
         */
        refresh() {
            this._renderResults();
        }

        /**
         * Reload the Table data.
         * @param {object} [options] Options for reloading the data
         * @param {Boolean} [options.reset=false] Whether to reset the offset.
         */
        reload({ reset = false } = {}) {
            if (reset) {
                this._offset = 0;
            }

            this._getData();
        }

        /**
         * Remove a row from the data array.
         * @param {number} index The row index to remove.
         * @param {object} [options] Options for getting the row index.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         */
        removeRow(index, { modified = true } = {}) {
            const rowIndex = this._getIndex(index, { modified });

            this._data = this._data.filter((_, dataIndex) => dataIndex !== rowIndex);

            this._buildIndex();
            this._refreshResults();
            this._renderResults();
        }

        /**
         * Search the Table for a term.
         * @param {string} term The term to search for.
         */
        search(term) {
            if (!this._options.searching) {
                return;
            }

            $.setValue(this._searchInput, term);
            this._term = term;

            $.triggerEvent(this._node, 'search.ui.table');

            if (this._options.getResults) {
                this._getData();
                return;
            }

            if (this._term) {
                this._filterIndexes = [];

                const escapedFilter = $._escapeRegExp(this._term);
                const regExp = new RegExp(escapedFilter, 'i');

                // filter results
                for (const [index, result] of this._data.entries()) {
                    for (const column of this._columns) {
                        if (!column.searchable) {
                            continue;
                        }

                        const value = $._getDot(result, `${column.data}`);

                        if (regExp.test(value)) {
                            this._filterIndexes.push(index);
                        }
                    }
                }

                this._filtered = this._filterIndexes.length;
            } else {
                this._filterIndexes = null;
                this._filtered = this._total;
            }

            this._getData();
        }

        /**
         * Set values for a single column.
         * @param {string} key The key to set.
         * @param {Array} column The column values.
         * @param {object} [options] Options for getting the row index.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         */
        setColumn(key, column, { modified = true } = {}) {
            this._data = this._data.map((row, index) => {
                const rowIndex = modified ?
                    this._rowIndexes.findIndex((otherIndex) => otherIndex == index) :
                    index;

                if (rowIndex >= 0) {
                    $._setDot(row, `${key}`, column[rowIndex]);
                }

                return row;
            });

            this._buildIndex();
            this._refreshResults();
            this._renderResults();
        }

        /**
         * Set values for a single row.
         * @param {number} index The row index to set.
         * @param {Array|object} row The row values.
         * @param {object} [options] Options for getting the row index.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         */
        setRow(index, row, { modified = true } = {}) {
            const rowIndex = this._getIndex(index, { modified });

            this._data[rowIndex] = row;

            this._buildIndex();
            this._refreshResults();
            this._renderResults();
        }

        /**
         * Set a single value for a row.
         * @param {number} index The row index to set.
         * @param {string} key The key to set.
         * @param {*} value The value to set.
         * @param {object} [options] Options for getting the row index.
         * @param {Boolean} [options.modified=true] Whether to use modified indexes.
         */
        setValue(index, key, value, { modified = true } = {}) {
            const rowIndex = this._getIndex(index, { modified });

            $._setDot(this._data[rowIndex], `${key}`, value);

            this._buildIndex();
            this._refreshResults();
            this._renderResults();
        }

        /**
         * Toggle a column as visible.
         * @param {number} index The column index.
         */
        showColumn(index) {
            this._columns[index].visible = true;

            this._renderResults();
        }
    }

    /**
     * Initialize preloaded get data.
     */
    function _getDataInit() {
        this._total = this._data.length;
        this._filtered = this._total;

        this._getData = (_) => {
            this.loading();

            this._rowIndexes = this._filterIndexes;

            // order
            if (this._options.ordering) {
                const order = this._getOrder();
                this._rowIndexes = this._getOrderedIndexes(order, this._rowIndexes);
            }

            if (!this._rowIndexes) {
                this._rowIndexes = $._range(this._offset, this._offset + this._limit);
            }

            this.loading({ show: false });
            this._refreshResults();
            this._renderResults();
        };
    }
    /**
     * Initialize get data from callback.
     */
    function _getResultsInit() {
        const load = $._debounce(() => {
            const options = {};

            if (this._term) {
                options.term = this._term;
            }

            if (this._options.ordering) {
                options.order = {
                    ...this._order.map(([column, dir]) => ({ column, dir })),
                };
            }

            if (this._options.paging) {
                options.offset = this._offset;
                options.limit = this._limit;
            }

            options.columns = {
                ...this._columns.map((column) => {
                    const data = {};

                    if (column.name) {
                        data.name = column.name;
                    }

                    return {
                        ...data,
                        data: column.data,
                        orderable: column.orderable,
                        searchable: column.searchable,
                    };
                }),
            };

            const request = Promise.resolve(this._options.getResults(options));

            request.then((response) => {
                if (this._request !== request) {
                    return;
                }

                this._total = response.total;
                this._filtered = response.filtered;
                this._data = response.results;

                this._refreshResults();
                this._rowIndexes = $._range(0, this._results.length - 1);

                this.loading({ show: false });
                this._renderResults();

                this._request = null;
            }).catch((_) => {
                if (this._request !== request) {
                    return;
                }

                this.loading({ show: false });

                this._request = null;
            });

            this._request = request;
        }, this._options.debounce);

        this._getData = (_) => {
            // cancel last request
            if (this._request && this._request.cancel) {
                this._request.cancel();
            }

            this._request = null;

            this.loading();

            load();
        };
    }

    /**
     * Attach events for the Table.
     */
    function _events() {
        if (this._options.lengthChange) {
            $.addEvent(this._lengthSelect, 'change.ui.table', (_) => {
                const length = $.getValue(this._lengthSelect);
                this.length(length);
            });
        }

        if (this._options.searching) {
            $.addEvent(this._searchInput, 'input.ui.table', $._debounce((_) => {
                const term = $.getValue(this._searchInput);
                this.search(term);
            }));
        }

        if (this._options.ordering) {
            const handleSort = (e) => {
                const index = $.index(e.currentTarget);

                if (!this._columns[index].orderable) {
                    return;
                }

                e.preventDefault();

                const defaultDir = this._columns[index].dir;
                let currentDir = null;

                for (const [col, dir] of this._order) {
                    if (col != index) {
                        continue;
                    }

                    currentDir = dir;
                    break;
                }

                let nextDir = defaultDir;
                if (currentDir === defaultDir) {
                    nextDir = defaultDir === 'asc' ?
                        'desc' :
                        'asc';
                }

                let order;
                if (e.shiftKey) {
                    if (!currentDir) {
                        order = [...this._order, [index, nextDir]];
                    } else if (currentDir === defaultDir) {
                        order = this._order.map(([col, dir]) => {
                            if (col == index) {
                                dir = nextDir;
                            }

                            return [col, dir];
                        });
                    } else {
                        order = this._order.filter(([col]) => {
                            return col != index;
                        });
                    }
                } else {
                    order = [[index, nextDir]];
                }

                this.order(order);
            };

            $.addEventDelegate(this._theadRow, 'click.ui.table', 'th', handleSort);

            $.addEventDelegate(this._theadRow, 'keydown.ui.table', 'th', (e) => {
                switch (e.code) {
                    case 'Enter':
                    case 'NumpadEnter':
                    case 'Space':
                        handleSort(e);
                        break;
                }
            });
        }

        if (this._options.paging) {
            $.addEventDelegate(this._pagination, 'click.ui.table', '[data-ui-page]', (e) => {
                e.preventDefault();

                let page = $.getDataset(e.currentTarget, 'uiPage');

                switch (page) {
                    case 'first':
                        page = 1;
                        break;
                    case 'prev':
                        page = this._page - 1;
                        break;
                    case 'next':
                        page = this._page + 1;
                        break;
                    case 'last':
                        page = this._totalPages;
                        break;
                }

                this.page(page);
            });
        }
    }

    /**
     * Render a table for specific columns.
     * @param {array} columns The columns to render.
     * @return {HTMLElement} The table element.
     */
    function _buildTable(columns) {
        const table = $.create('table');
        const thead = $.create('thead');
        const tr = $.create('tr');

        for (const heading of this._getHeadings(columns)) {
            const th = $.create('th', {
                text: heading,
            });
            $.append(tr, th);
        }

        $.append(thead, tr);
        $.append(table, thead);

        const tbody = $.create('tbody');
        for (const row of this._getResultRows(columns)) {
            const tr = $.create('tr');

            for (const value of row) {
                const td = $.create('td', {
                    text: value,
                });
                $.append(tr, td);
            }

            $.append(tbody, tr);
        }

        $.append(table, tbody);

        return table;
    }
    /**
     * Get headings for specific columns.
     * @param {array} columns The columns to get.
     * @return {array} The headings.
     */
    function _getHeadings(columns) {
        const headings = [];

        for (const [index, heading] of this._headings.entries()) {
            if (!columns.includes(index)) {
                continue;
            }

            headings.push(heading.text);
        }

        return headings;
    }
    /**
     * Get an index (optionally modified).
     * @param {number} index The index to get.
     * @param {object} [options] Options for getting the row index.
     * @param {Boolean} [options.modified=true] Whether to use modified indexes.
     * @return {number} The index.
     */
    function _getIndex(index, { modified = true } = {}) {
        return modified ?
            this._rowIndexes[index] :
            index;
    }
    /**
     * Get results for specific columns.
     * @param {array} columns The columns to get.
     * @return {array} The results.
     */
    function _getResultRows(columns) {
        const rows = [];

        for (const result of this._results) {
            const row = [];
            for (const [index, column] of this._columns.entries()) {
                if (!columns.includes(index)) {
                    continue;
                }

                const value = $._getDot(result, `${column.data}`);

                row.push(value);
            }
            rows.push(row);
        }

        return rows;
    }
    /**
     * Get the visible columns.
     * @return {array} The visible columns.
     */
    function _getVisibleColumns() {
        const columns = [];

        for (const [index, column] of this._columns.entries()) {
            if (!column.visible) {
                return;
            }

            columns.push(index);
        }

        return columns;
    }
    /**
     * Refresh the results.
     */
    function _refreshResults() {
        if (this._options.getResults) {
            this._results = this._data;
        } else {
            this._results = this._rowIndexes.map((rowIndex) => this._data[rowIndex]);
        }

        if (this._options.paging) {
            this._page = 1 + (this._offset / this._limit);
            this._totalPages = Math.ceil(this._filtered / this._limit) || 1;
        }
    }

    /**
     * Rebuild the index.
     */
    function _buildIndex() {
        if (this._options.getResults || !this._options.ordering) {
            return;
        }

        this._index = [];
        for (const column of this._columns) {
            if (!column.orderable) {
                continue;
            }

            this._index[column.data] = [];

            const valueLookup = {};

            for (const [index, result] of this._data.entries()) {
                const value = $._getDot(result, `${column.data}`);

                if (!(value in valueLookup)) {
                    valueLookup[value] = [];
                }

                valueLookup[value].push(index);
            }

            const values = Object.keys(valueLookup).sort((a, b) => {
                if ($._isNumeric(a) && $._isNumeric(b)) {
                    return a - b;
                }

                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                return aLower.localeCompare(bLower);
            });

            for (const value of values) {
                this._index[column.data].push(valueLookup[value]);
            }
        }
    }
    /**
     * Get real column ordering data.
     * @return {Array} The column ordering data.
     */
    function _getOrder() {
        const order = [];

        for (const [index, direction] of this._order) {
            if (this._columns[index].orderData) {
                order.push(...this._columns[index.orderData]);
            } else {
                order.push([index, direction]);
            }
        }

        return order;
    }
    /**
     * Get a range of data indexes for filtered rows, based on order data.
     * @param {Array} order The order data.
     * @param {Array} [onlyRows=null] The filtered rows.
     * @param {number} [offset] The starting offset.
     * @param {number} [limit] The maximum rows to return.
     * @param {number} [orderIndex=0] The order index.
     * @return {Array} The data indexes.
     */
    function _getOrderedIndexes(order, onlyRows = null, offset = this._offset, limit = this._limit, orderIndex = 0) {
        const [index, direction] = order[orderIndex];
        const key = this._columns[index].data;
        let rowLookup = this._index[key];

        if (direction === 'desc') {
            rowLookup = rowLookup.slice().reverse();
        }

        let current = 0;
        const results = [];
        for (const rows of rowLookup) {
            let filteredRows = onlyRows ?
                rows.filter((row) => onlyRows.includes(row)) :
                rows;

            if (direction === 'desc') {
                filteredRows = filteredRows.slice().reverse();
            }

            if (offset > current + filteredRows.length || !filteredRows.length) {
                current += rows.length;
                continue;
            }

            const sortedRows = filteredRows.length > 1 && orderIndex < order.length - 1 ?
                this._getOrderedIndexes(order, filteredRows, 0, Math.min(filteredRows.length, limit - results.length), orderIndex + 1) :
                rows;

            for (const row of sortedRows) {
                current++;

                if (current <= offset) {
                    continue;
                }

                results.push(row);

                if (results.length == limit) {
                    return results;
                }
            }
        }

        return results;
    }

    /**
     * Render the Table.
     */
    function _render() {
        this._original = $.clone(this._node);
        $.empty(this._node);

        this._container = $.create('div', {
            class: this.constructor.classes.container,
        });

        this._loader = $.create('div', {
            class: this.constructor.classes.loader,
        });

        const loaderIcon = $.create('span', {
            class: this.constructor.classes.loaderIcon,
        });
        $.append(this._loader, loaderIcon);

        $.addClass(this._node, this.constructor.classes.table);

        const thead = $.create('thead');
        $.append(this._node, thead);

        this._theadRow = $.create('tr');
        $.append(thead, this._theadRow);

        this._tbody = $.create('tbody');
        $.append(this._node, this._tbody);

        const tfoot = $.findOne('tfoot', this._original);
        if (tfoot) {
            this._tfoot = $.clone(tfoot);
            $.append(this._node, this._tfoot);
        }

        $.hide(this._loader);
        $.after(this._node, this._container);
        $.append(this._container, this._loader);

        if (this._options.layout.top) {
            this._renderLayoutRow(this._options.layout.top, this.constructor.classes.topRow);
        }

        const tableContainer = $.create('div', {
            class: this.constructor.classes.tableContainer,
        });

        $.append(tableContainer, this._node);
        $.append(this._container, tableContainer);

        if (this._options.layout.bottom) {
            this._renderLayoutRow(this._options.layout.bottom, this.constructor.classes.bottomRow);
        }
        if (this._infoContainer) {
            $.setAttribute(this._node, {
                'aria-describedby': $.getAttribute(this._infoContainer, 'id'),
            });
        }
    }
    /**
     * Render the table buttons.
     * @param {HTMLElement} container The container to render in.
     */
    function _renderButtons(container) {
        const btnGroup = $.create('div', {
            class: this.constructor.classes.buttonGroup,
        });

        for (const button of this._options.buttons) {
            const btn = $.create('button', {
                class: this.constructor.classes.button,
                text: !button.text && button.type in this._options.lang.buttons ?
                    this._options.lang.buttons[button.type] :
                    button.text,
                attributes: {
                    'type': 'button',
                    'aria-controls': $.getAttribute(this._node, 'id'),
                },
            });

            $.addEvent(btn, 'click.ui.table', (e) => {
                e.preventDefault();

                if (button.callback) {
                    button.callback.bind(this)();
                } else if (button.type in this.constructor.buttons) {
                    this.constructor.buttons[button.type].bind(this)(button);
                }
            });

            $.append(btnGroup, btn);
        }

        $.append(container, btnGroup);
    }
    /**
     * Render the table headings.
     */
    function _renderHeadings() {
        const children = $.children(this._theadRow);

        const headings = {};

        for (const child of children) {
            const index = $.getDataset(child, 'uiIndex');

            if (!this._columns[index].visible) {
                $.detach(child);
            } else {
                headings[index] = child;
            }
        }

        let lastCell;
        for (const [index, heading] of this._headings.entries()) {
            if (!this._columns[index].visible) {
                continue;
            }

            let cell;
            if (index in headings) {
                cell = headings[index];
            } else {
                cell = $.create('th', {
                    class: this.constructor.classes.tableHeading,
                    html: heading.text,
                    dataset: {
                        uiIndex: index,
                    },
                });

                if (heading.class) {
                    $.addClass(cell, heading.class);
                }

                if (this._options.ordering && this._columns[index].orderable) {
                    $.addClass(cell, this.constructor.classes.tableSort);
                    $.setAttribute(cell, {
                        'tabindex': 0,
                        'aria-controls': $.getAttribute(this._node, 'id'),
                    });
                }

                if (!lastCell) {
                    $.append(this._theadRow, cell);
                } else {
                    $.insertAfter(cell, lastCell);
                }
            }

            lastCell = cell;

            if (!this._options.ordering || !this._columns[index].orderable) {
                continue;
            }

            let dir;
            for (const order of this._order) {
                if (order[0] != index) {
                    continue;
                }

                dir = order[1];
                break;
            }

            switch (dir) {
                case 'asc':
                    $.addClass(cell, this.constructor.classes.tableSortAsc);
                    $.removeClass(cell, this.constructor.classes.tableSortDesc);
                    $.setAttribute(cell, { 'aria-sort': 'ascending' });
                    break;
                case 'desc':
                    $.addClass(cell, this.constructor.classes.tableSortDesc);
                    $.removeClass(cell, this.constructor.classes.tableSortAsc);
                    $.setAttribute(cell, { 'aria-sort': 'descending' });
                    break;
                default:
                    $.removeClass(cell, [
                        this.constructor.classes.tableSortAsc,
                        this.constructor.classes.tableSortDesc,
                    ]);
                    $.removeAttribute(cell, 'aria-sort');
                    break;
            }

            const text = $.getText(cell);

            if (dir === 'asc' || (!dir && this._columns[index].dir === 'desc')) {
                $.setAttribute(cell, { 'aria-label': `${text}${this._options.lang.aria.sortDescending}` });
            } else {
                $.setAttribute(cell, { 'aria-label': `${text}${this._options.lang.aria.sortAscending}` });
            }
        }
    }
    /**
     * Render the table info.
     */
    function _renderInfo() {
        $.empty(this._infoContainer);

        const start = this._offset + 1;
        const end = this._offset + this._results.length;
        let infoText = this._filtered < this._total ?
            this._options.lang.infoFiltered :
            this._options.lang.info;

        const replacements = {
            start,
            end,
            filtered: this._filtered,
            total: this._total,
        };

        for (const [key, value] of Object.entries(replacements)) {
            infoText = infoText.replace(`{${key}}`, value);
        }

        if (this._options.infoCallback) {
            infoText = this._options.infoCallback(start, end, this._total, this._filtered, text);
        }

        const text = $.create('small', {
            text: infoText,
        });
        $.append(this._infoContainer, text);
    }
    /**
     * Render the table info container in a container.
     * @param {HTMLElement} container The container to render in.
     */
    function _renderInfoContainer(container) {
        const id = ui.generateId('table-info');

        this._infoContainer = $.create('div', {
            class: this.constructor.classes.infoContainer,
            attributes: {
                id,
                'role': 'status',
                'aria-live': 'polite',
            },
        });

        $.append(container, this._infoContainer);
    }
    /**
     * Render a layout row in a container.
     * @param {Array} columns The columns to render.
     * @param {string} rowClass The row class.
     */
    function _renderLayoutRow(columns, rowClass) {
        const row = $.create('div', {
            class: rowClass,
        });

        for (const elements of columns.split(',')) {
            const column = $.create('div', {
                class: this.constructor.classes.column,
            });

            for (const element of elements.split('|')) {
                if (!(element in this.constructor.layout)) {
                    continue;
                }

                const container = $.create('div', {
                    class: this.constructor.classes.columnContainer,
                });

                this.constructor.layout[element].bind(this)(container);

                $.append(column, container);
            }

            $.append(row, column);
        }

        $.append(this._container, row);
    }
    /**
     * Render the length select in a container.
     * @param {HTMLElement} container The container to render in.
     */
    function _renderLengthSelect(container) {
        if (!this._options.lengthChange || !this._options.paging) {
            return;
        }

        const lengthContainer = $.create('div', {
            class: this.constructor.classes.lengthContainer,
        });

        const label = $.create('label', {
            class: this.constructor.classes.lengthLabel,
        });
        $.append(lengthContainer, label);

        const labelText = $.create('small', {
            class: this.constructor.classes.lengthLabelText,
            text: this._options.lang.perPage,
        });
        $.append(label, labelText);

        const inputContainer = $.create('div', {
            class: this.constructor.classes.lengthInputContainer,
            style: {
                width: 'initial',
            },
        });
        $.append(label, inputContainer);

        this._lengthSelect = $.create('select', {
            class: this._options.inputStyle === 'filled' ?
                this.constructor.classes.lengthInputFilled :
                this.constructor.classes.lengthInputOutline,
            attributes: {
                'aria-controls': $.getAttribute(this._node, 'id'),
            },
        });
        $.append(inputContainer, this._lengthSelect);

        for (const length of this._options.lengths) {
            const option = $.create('option', {
                value: length,
                text: length,
            });

            if (length == this._limit) {
                $.setAttribute(option, { checked: true });
            }

            $.append(this._lengthSelect, option);
        }

        if (this._options.inputStyle === 'filled') {
            const ripple = $.create('div', {
                class: this.constructor.classes.lengthInputRipple,
            });
            $.append(inputContainer, ripple);
        }

        $.append(container, lengthContainer);
    }
    /**
     * Render a pagination item.
     * @param {object} options Options for rendering the pagnination item.
     * @return {HTMLElement} The pagnination item.
     */
    function _renderPageItem(options) {
        const container = $.create('div', {
            class: this.constructor.classes.pageItem,
        });

        const link = $.create('button', {
            html: options.icon || options.text || options.page,
            class: this.constructor.classes.pageLink,
            attributes: {
                'type': 'button',
                'title': options.text ?
                    `${options.text} ${this._options.lang.page}` :
                    `${this._options.lang.page} ${options.page}`,
                'role': 'link',
                'aria-controls': $.getAttribute(this._node, 'id'),
            },
            dataset: {
                uiPage: options.page,
            },
        });
        $.append(container, link);

        return container;
    }
    /**
     * Render the pagination.
     */
    function _renderPagination() {
        const setDisabled = (container, disabled) => {
            const link = $.findOne(':scope > [data-ui-page]', container);

            if (disabled) {
                $.addClass(container, this.constructor.classes.pageDisabled);
                $.setAttribute(link, {
                    'aria-disabled': true,
                    'tabindex': -1,
                });
            } else {
                $.removeClass(container, this.constructor.classes.pageDisabled);
                $.removeAttribute(link, 'aria-disabled');
                $.removeAttribute(link, 'tabindex');
            }
        };

        const children = $.children(this._pagination);

        let firstPage;
        let prevPage;
        let nextPage;
        let lastPage;

        if (children.length) {
            firstPage = children.shift();
            prevPage = children.shift();
            lastPage = children.pop();
            nextPage = children.pop();
        } else {
            firstPage = this._renderPageItem({
                text: this._options.lang.paginate.first,
                icon: this._options.icons.first,
                page: 'first',
            });
            $.append(this._pagination, firstPage);

            prevPage = this._renderPageItem({
                text: this._options.lang.paginate.previous,
                icon: this._options.icons.previous,
                page: 'prev',
            });
            $.append(this._pagination, prevPage);

            nextPage = this._renderPageItem({
                text: this._options.lang.paginate.next,
                icon: this._options.icons.next,
                page: 'next',
            });
            $.append(this._pagination, nextPage);

            lastPage = this._renderPageItem({
                text: this._options.lang.paginate.last,
                icon: this._options.icons.last,
                page: 'last',
            });
            $.append(this._pagination, lastPage);
        }

        setDisabled(firstPage, this._page == 1);
        setDisabled(prevPage, this._page == 1);
        setDisabled(nextPage, this._page == this._totalPages);
        setDisabled(lastPage, this._page == this._totalPages);

        let startPage = Math.max(this._page - 5, 1);
        let endPage = Math.min(this._page + 5, this._totalPages);

        while (endPage - startPage > 4) {
            if (this._page - startPage > endPage - this._page) {
                startPage++;
            } else {
                endPage--;
            }
        }

        const pageLinks = {};

        for (const child of children) {
            const link = $.findOne(':scope > [data-ui-page]', child);
            const page = $.getDataset(link, 'uiPage');

            if (page < startPage || page > endPage) {
                $.detach(child);
            } else {
                pageLinks[page] = child;
            }
        }

        let lastLink = prevPage;
        for (let current = startPage; current <= endPage; current++) {
            let pageItem;
            if (current in pageLinks) {
                pageItem = pageLinks[current];
            } else {
                pageItem = this._renderPageItem({
                    page: current,
                });
                $.insertAfter(pageItem, lastLink);
            }

            if (current == this._page) {
                $.addClass(pageItem, this.constructor.classes.pageActive);
            } else {
                $.removeClass(pageItem, this.constructor.classes.pageActive);
            }

            lastLink = pageItem;
        }
    }
    /**
     * Render the pagination container in a container.
     * @param {HTMLElement} container The container to render in.
     */
    function _renderPaginationContainer(container) {
        const paginationContainer = $.create('div', {
            class: this.constructor.classes.paginationContainer,
        });
        $.append(container, paginationContainer);

        this._pagination = $.create('div', {
            class: this.constructor.classes.pagination,
        });
        $.append(paginationContainer, this._pagination);
    }
    /**
     * Render the table results.
     */
    function _renderResults() {
        $.triggerEvent(this._node, 'preDraw.ui.table');

        $.empty(this._tbody);

        this._renderHeadings();

        if (this._options.headerCallback) {
            this._options.headerCallback(this._head, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
        }

        if (this._options.paging) {
            this._renderPagination();
        }

        if (this._options.info) {
            this._renderInfo();
        }

        if (!this._results.length) {
            const row = $.create('tr');

            const cell = $.create('td', {
                class: this.constructor.classes.emptyCell,
                html: this._term ?
                    this._options.lang.noResults :
                    this._options.lang.noData,
                attributes: {
                    colspan: this._columnCount,
                },
            });
            $.append(row, cell);

            $.append(this._tbody, row);
        } else {
            for (const [index, result] of this._results.entries()) {
                const row = this._renderRow(result, index);

                if (this._options.rowCallback) {
                    this._options.rowCallback(row, result, index, this._offset + index, this._rowIndexes[index]);
                }

                $.append(this._tbody, row);

                if (this._options.createdRow) {
                    this._options.createdRow(row, result, index);
                }
            }
        }

        if (this._options.drawCallback) {
            this._options.drawCallback();
        }

        if (this._tfoot && this._options.footerCallback) {
            this._options.footerCallback(this._tfoot, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
        }

        $.triggerEvent(this._node, 'draw.ui.table');
    }
    /**
     * Render a result row.
     * @param {Array|object} data The row data.
     * @param {number} rowIndex The row index.
     * @return {HTMLElement} The table row.
     */
    function _renderRow(data, rowIndex) {
        const row = $.create('tr');

        for (const [index, column] of this._columns.entries()) {
            if (!column.visible) {
                continue;
            }

            const value = $._getDot(data, `${column.data}`);

            const cell = $.create('td', {
                html: column.format ?
                    column.format(value) :
                    value,
            });

            if (column.class) {
                $.addClass(column.class);
            }

            if (column.createdCell) {
                column.createdCell(cell, value, data, rowIndex, index);
            }

            $.append(row, cell);
        }

        return row;
    }
    /**
     * Render the search in a container.
     * @param {HTMLElement} container The container to render in.
     */
    function _renderSearch(container) {
        if (!this._options.searching) {
            return;
        }

        const searchContainer = $.create('div', {
            class: this.constructor.classes.searchContainer,
        });

        const inputContainer = $.create('div', {
            class: this.constructor.classes.searchInputContainer,
            style: {
                width: '200px',
            },
        });
        $.append(searchContainer, inputContainer);

        this._searchInput = $.create('input', {
            class: this._options.inputStyle === 'filled' ?
                this.constructor.classes.searchInputFilled :
                this.constructor.classes.searchInputOutline,
            attributes: {
                'type': 'search',
                'placeholder': this._options.lang.search,
                'aria-controls': $.getAttribute(this._node, 'id'),
            },
        });
        $.append(inputContainer, this._searchInput);

        if (this._options.inputStyle === 'filled') {
            const ripple = $.create('div', {
                class: this.constructor.classes.searchInputRipple,
            });
            $.append(inputContainer, ripple);
        }

        $.append(container, searchContainer);
    }

    // Table default options
    Table.defaults = {
        buttons: [],
        layout: {
            top: 'search,buttons|length',
            bottom: 'info,pagination',
        },
        lang: {
            info: 'Showing results {start} to {end} of {total}',
            infoFiltered: 'Showing results {start} to {end} of {filtered} (filtered from {total} total)',
            noData: 'No data available',
            noResults: 'No results to show',
            page: 'Page',
            perPage: 'Per Page',
            search: 'Search',
            paginate: {
                first: 'First',
                last: 'Last',
                next: 'Next',
                previous: 'Previous',
            },
            buttons: {
                csv: 'CSV',
                excel: 'Excel',
                print: 'Print',
            },
            aria: {
                sortAscending: ': activate to sort column ascending',
                sortDescending: ': activate to sort column descending',
            },
        },
        icons: {
            first: '&laquo;',
            last: '&raquo',
            next: '&gt;',
            previous: '&lt;',
        },
        inputStyle: 'filled',
        createdRow: null,
        drawCallback: null,
        footerCallback: null,
        headerCallback: null,
        infoCallback: null,
        preDrawCallback: null,
        rowCallback: null,
        columns: null,
        order: [[0, 'asc']],
        lengths: [10, 25, 50, 100],
        length: 10,
        debounce: 250,
        info: true,
        lengthChange: true,
        ordering: true,
        paging: true,
        searching: true,
    };

    // Table classes
    Table.classes = {
        bottomRow: 'd-md-flex justify-content-between mx-n2',
        button: 'btn btn-table',
        buttonGroup: 'btn-group btn-group-sm mt-1',
        column: 'd-md-flex',
        columnContainer: 'text-center px-2 mb-1',
        container: 'position-relative mb-2',
        emptyCell: 'text-center py-3',
        infoContainer: 'text-center text-md-start mb-2 mb-md-0 w-100',
        lengthContainer: 'd-flex justify-content-center justify-content-md-start w-100 mb-1',
        lengthInputContainer: 'form-input d-inline-block',
        lengthInputFilled: 'input-filled input-sm',
        lengthInputOutline: 'input-outline input-sm',
        lengthInputRipple: 'ripple-line',
        lengthLabel: 'mb-1 mb-md-0',
        lengthLabelText: 'me-2',
        loader: 'position-absolute top-50 start-50 translate-middle z-1',
        loaderIcon: 'spinner-border text-primary',
        pageActive: 'active',
        pageDisabled: 'disabled',
        pageItem: 'page-item',
        pageLink: 'page-link ripple',
        pagination: 'pagination pagination-sm mx-auto me-md-0',
        paginationContainer: 'd-flex w-100',
        searchContainer: 'w-100 mb-1',
        searchInputContainer: 'form-input mx-auto me-md-0',
        searchInputFilled: 'input-filled input-sm',
        searchInputOutline: 'input-outline input-sm',
        searchInputRipple: 'ripple-line',
        table: 'table table-bordered',
        tableContainer: 'table-responsive',
        tableHeading: 'fw-bold',
        tableSort: 'table-sort',
        tableSortAsc: 'table-sort-asc',
        tableSortDesc: 'table-sort-desc',
        topRow: 'd-md-flex justify-content-between mb-2 mx-n2',
    };

    // Table buttons
    Table.buttons = { csv, excel, print };

    // Table layout
    Table.layout = {
        buttons(container) {
            this._renderButtons(container);
        },
        search(container) {
            this._renderSearch(container);
        },
        length(container) {
            this._renderLengthSelect(container);
        },
        info(container) {
            this._renderInfoContainer(container);
        },
        pagination(container) {
            this._renderPaginationContainer(container);
        },
    };

    // Table init
    ui.initComponent('table', Table);

    // Table prototype
    const proto = Table.prototype;

    proto._buildIndex = _buildIndex;
    proto._buildTable = _buildTable;
    proto._events = _events;
    proto._getDataInit = _getDataInit;
    proto._getHeadings = _getHeadings;
    proto._getIndex = _getIndex;
    proto._getOrder = _getOrder;
    proto._getOrderedIndexes = _getOrderedIndexes;
    proto._getResultRows = _getResultRows;
    proto._getResultsInit = _getResultsInit;
    proto._getVisibleColumns = _getVisibleColumns;
    proto._refreshResults = _refreshResults;
    proto._render = _render;
    proto._renderButtons = _renderButtons;
    proto._renderHeadings = _renderHeadings;
    proto._renderInfo = _renderInfo;
    proto._renderInfoContainer = _renderInfoContainer;
    proto._renderLayoutRow = _renderLayoutRow;
    proto._renderLengthSelect = _renderLengthSelect;
    proto._renderPageItem = _renderPageItem;
    proto._renderPagination = _renderPagination;
    proto._renderPaginationContainer = _renderPaginationContainer;
    proto._renderResults = _renderResults;
    proto._renderRow = _renderRow;
    proto._renderSearch = _renderSearch;

    exports.Table = Table;

}));
//# sourceMappingURL=frost-ui-tables.js.map
