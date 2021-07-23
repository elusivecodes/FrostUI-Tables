/**
 * Table API
 */

Object.assign(Table.prototype, {

    /**
     * Add a row to the data array.
     * @param {Array|object} row The row to add.
     * @returns {Table} The Table.
     */
    addRow(row) {
        this._data.push(row);
        this._buildIndex();

        this._total++;
        this._filtered++;

        if (!this._getResults) {
            this._getData();
        } else {
            this._rowIndexes.push(this._data.length - 1);

            this._refreshResults();
            this._renderResults();
        }

        return this;
    },

    /**
     * Clear all rows from the data array.
     * @returns {Table} The Table.
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

        if (this._settings.searching) {
            dom.setValue(this._searchInput, '');
        }

        this._renderResults();

        return this;
    },

    /**
     * Get values for a single column.
     * @param {string} key The key to retrieve.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {Array} The column values.
     */
    getColumn(key, modified = true) {
        return modified ?
            this._rowIndexes.map(rowIndex => Core.getDot(this._data[rowIndex], `${key}`)) :
            this._data.map(row => Core.getDot(row, `${key}`));
    },

    /**
     * Get values for a single row.
     * @param {number} index The row index to retrieve.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {Array} The row values.
     */
    getRow(index, modified = true) {
        const rowIndex = this._getIndex(index, modified);

        return Core.isPlainObject(this._data[rowIndex]) ?
            { ...this._data[rowIndex] } :
            [...this._data[rowIndex]];
    },

    /**
     * Get a single value from a row.
     * @param {number} index The row index to retrieve.
     * @param {string} key The key to retrieve.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {*} The value.
     */
    getValue(index, key, modified = true) {
        const rowIndex = this._getIndex(index, modified);

        return Core.getDot(this._data[rowIndex], `${key}`);
    },

    /**
     * Toggle a column as hidden.
     * @param {number} index The column index.
     * @returns {Table} The Table.
     */
    hideColumn(index) {
        this._columns[index].visible = false;

        this._renderResults();

        return this;
    },

    /**
     * Remove a row from the data array.
     * @param {number} index The row index to remove.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {Table} The Table.
     */
    removeRow(index, modified = true) {
        const rowIndex = this._getIndex(index, modified);

        this._data = this._data.filter((_, dataIndex) => dataIndex !== rowIndex);

        this._buildIndex();

        return this;
    },

    /**
     * Set values for a single column.
     * @param {string} key The key to set.
     * @param {Array} column The column values.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {Table} The Table.
     */
    setColumn(key, column, modified = true) {
        this._data = this._data.map((row, index) => {
            const dataIndex = modified ?
                this._rowIndexes.indexOf(index) :
                index;

            if (dataIndex >= 0) {
                Core.setDot(row, `${key}`, column[dataIndex]);
            }

            return row;
        });

        this._buildIndex();
        this._refreshResults();
        this._renderResults();

        return this;
    },

    /**
     * Set values for a single row.
     * @param {number} index The row index to set.
     * @param {Array|object} row The row values.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {Table} The Table.
     */
    setRow(index, row, modified = true) {
        const rowIndex = this._getIndex(index, modified);

        this._data[rowIndex] = row;

        this._buildIndex();
        this._refreshResults();
        this._renderResults();

        return this;
    },

    /**
     * Set a single value for a row.
     * @param {number} index The row index to set.
     * @param {string} key The key to set.
     * @param {*} value The value to set.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {Table} The Table.
     */
    setValue(index, key, value, modified = true) {
        const rowIndex = this._getIndex(index, modified);

        Core.setDot(this._data[rowIndex], `${key}`, value);

        this._buildIndex();
        this._refreshResults();
        this._renderResults();

        return this;
    },

    /**
     * Toggle a column as visible.
     * @param {number} index The column index.
     * @returns {Table} The Table.
     */
    showColumn(index) {
        this._columns[index].visible = true;

        this._renderResults();

        return this;
    }

});
