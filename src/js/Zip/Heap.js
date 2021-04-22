/**
 * Heap Class
 * Based on https://github.com/imaya/zlib.js/blob/develop/src/heap.js
 * @class
 */
class Heap {

    /**
     * New Heap constructor.
     * @param {number} [length] The size of the heap.
     * @returns {Heap} A new Heap object.
     */
    constructor(length) {
        this._buffer = new Uint16Array(length * 2);
        this.length = 0;
    }

    /**
     * Pop the top value off the heap.
     * @returns {object} The top value from the heap.
     */
    pop() {
        const value = this._buffer[0];
        const index = this._buffer[1];

        this.length -= 2;
        this._buffer[0] = this._buffer[this.length];
        this._buffer[1] = this._buffer[this.length + 1];

        let parent = 0;
        while (true) {
            let current = this.constructor._getChild(parent);

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
            const parent = this.constructor._getParent(current);

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

    /**
     * Get index of parent node.
     * @param {number} index The index.
     * @returns {number} The parent index.
     */
    static _getParent(index) {
        return ((index - 2) / 4 | 0) * 2;
    }

    /**
     * Get index of child node.
     * @param {number} index The index.
     * @returns {number} The child index.
     */
    static _getChild(index) {
        return 2 * index + 2;
    }

}
