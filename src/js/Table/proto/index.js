/**
 * Table Index
 */

Object.assign(Table.prototype, {

    _buildIndex() {
        this._index = [];
        for (const [index, column] of this._columns.entries()) {
            if (!column.orderable) {
                return false
            }

            const key = column.key || index;
            this._index[key] = [];

            const valueLookup = {};

            for (const [rowIndex, result] of this._data.entries()) {
                const value = result[key];

                if (!(value in valueLookup)) {
                    valueLookup[value] = [];
                }

                valueLookup[value].push(rowIndex);
            }

            const values = Object.keys(valueLookup).sort((a, b) => {
                if (Core.isNumeric(a) && Core.isNumeric(b)) {
                    return a - b;
                }

                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                return aLower.localeCompare(bLower);
            });

            for (const value of values) {
                this._index[key].push(valueLookup[value])
            }
        }
    },

    _getOrderedIndexes(onlyRows = null, offset = this._offset, limit = this._limit, orderIndex = 0) {
        const [index, direction] = this._order[orderIndex];
        const key = this._columns[index].key || index;
        let rowLookup = this._index[key];

        if (direction === 'desc') {
            rowLookup = rowLookup.slice().reverse();
        }

        let current = 0;
        const results = [];
        for (const rows of rowLookup) {
            let filteredRows = onlyRows ?
                rows.filter(row => onlyRows.includes(row)) :
                rows;

            if (direction === 'desc') {
                filteredRows = filteredRows.slice().reverse();
            }

            if (offset > current + filteredRows.length || !filteredRows.length) {
                current += rows.length;
                continue;
            }

            const sortedRows = filteredRows.length > 1 && orderIndex < this._order.length - 1 ?
                this._getOrderedIndexes(filteredRows, 0, Math.min(filteredRows.length, limit - results.length), orderIndex + 1) :
                rows;

            for (const row of sortedRows) {
                current++;

                if (current < offset) {
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

});
