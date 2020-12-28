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

        if (this._getResults) {
            this._rowIndexes.push(this._data.length - 1);
        }

        this._buildIndex();

        return this;
    },

    /**
     * Get values for a single column.
     * @param {string} key The key to retrieve.
     * @returns {Array} The column values.
     */
    getColumn(key) {
        return this._data.map(row => Core.getDot(row, key));
    },

    /**
     * Get values for a single row.
     * @param {number} index The row index to retrieve.
     * @returns {Array} The row values.
     */
    getRow(index) {
        return this._data[index];
    },

    /**
     * Get a single value from a row.
     * @param {number} index The row index to retrieve.
     * @param {string} key The key to retrieve.
     * @returns {*} The value.
     */
    getValue(index, key) {
        return Core.getDot(this._data[index], key);
    },

    /**
     * Toggle a column as hidden.
     * @param {number} index The column index.
     * @returns {Table} The Table.
     */
    hideColumn(index) {
        this._columns[index].visible = false;

        return this;
    },

    /**
     * Remove a row from the data array.
     * @param {number} index The row index to remove.
     * @returns {Table} The Table.
     */
    removeRow(index) {
        this._data = this._data.filter((_, rowIndex) => rowIndex !== index);

        this._buildIndex();

        return this;
    },

    /**
     * Set values for a single column.
     * @param {string} key The key to set.
     * @param {Array} column The column values.
     * @returns {Table} The Table.
     */
    setColumn(key, column) {
        this._data = this._data.map((row, index) => {
            Core.setDot(row, key, column[index]);
            return row;
        });

        this._buildIndex();

        return this;
    },

    /**
     * Set values for a single row.
     * @param {number} index The row index to set.
     * @param {Array|object} row The row values.
     * @returns {Table} The Table.
     */
    setRow(index, row) {
        this._data[index] = row;

        this._buildIndex();

        return this;
    },

    /**
     * Set a single value for a row.
     * @param {number} index The row index to set.
     * @param {string} key The key to set.
     * @param {*} value The value to set.
     * @returns {Table} The Table.
     */
    setValue(index, key, value) {
        Core.setDot(this._data[index], key, value);

        this._buildIndex();

        return this;
    },

    /**
     * Toggle a column as visible.
     * @param {number} index The column index.
     * @returns {Table} The Table.
     */
    showColumn(index) {
        this._columns[index].visible = true;

        return this;
    }

});
