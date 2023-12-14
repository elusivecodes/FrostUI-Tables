import $ from '@fr0st/query';

/**
 * Rebuild the index.
 */
export function _buildIndex() {
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
};

/**
 * Get real column ordering data.
 * @return {Array} The column ordering data.
 */
export function _getOrder() {
    const order = [];

    for (const [index, direction] of this._order) {
        if (this._columns[index].orderData) {
            order.push(...this._columns[index.orderData]);
        } else {
            order.push([index, direction]);
        }
    }

    return order;
};

/**
 * Get a range of data indexes for filtered rows, based on order data.
 * @param {Array} order The order data.
 * @param {Array} [onlyRows=null] The filtered rows.
 * @param {number} [offset] The starting offset.
 * @param {number} [limit] The maximum rows to return.
 * @param {number} [orderIndex=0] The order index.
 * @return {Array} The data indexes.
 */
export function _getOrderedIndexes(order, onlyRows = null, offset = this._offset, limit = this._limit, orderIndex = 0) {
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
};
