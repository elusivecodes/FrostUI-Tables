/**
 * Table Helpers
 */

Object.assign(Table.prototype, {

    /**
     * Render a table for specific columns.
     * @param {array} columns The columns to render.
     * @returns {HTMLElement} The table element.
     */
    _buildTable(columns) {
        const table = dom.create('table');
        const thead = dom.create('thead');
        const tr = dom.create('tr');

        for (const heading of this._getHeadings(columns)) {
            const th = dom.create('th', {
                text: heading
            });
            dom.append(tr, th);
        }

        dom.append(thead, tr);
        dom.append(table, thead);

        const tbody = dom.create('tbody');
        for (const row of this._getResultRows(columns)) {
            const tr = dom.create('tr');

            for (const value of row) {
                const td = dom.create('td', {
                    text: value
                });
                dom.append(tr, td);
            }

            dom.append(tbody, tr);
        }

        dom.append(table, tbody);

        return table;
    },

    /**
     * Get headings for specific columns.
     * @param {array} columns The columns to get.
     * @returns {array} The headings.
     */
    _getHeadings(columns) {
        const headings = [];

        for (const [index, heading] of this._headings.entries()) {
            if (!columns.includes(index)) {
                continue;
            }

            headings.push(heading.text);
        }

        return headings;
    },

    /**
     * Get an index (optionally modified).
     * @param {number} index The index to get.
     * @param {Boolean} [modified=true] Whether to use modified indexes.
     * @returns {number} The index.
     */
    _getIndex(index, modified = true) {
        return modified ?
            this._rowIndexes[index] :
            index;
    },

    /**
     * Get results for specific columns.
     * @param {array} columns The columns to get.
     * @returns {array} The results.
     */
    _getResultRows(columns) {
        const rows = [];

        for (const result of this._results) {
            const row = [];
            for (const [index, column] of this._columns.entries()) {
                if (!columns.includes(index)) {
                    continue;
                }

                const value = Core.getDot(result, `${column.data}`);

                row.push(value);
            }
            rows.push(row);
        }

        return rows;
    },

    /**
     * Get the visible columns.
     * @returns {array} The visible columns.
     */
    _getVisibleColumns() {
        const columns = [];

        for (const [index, column] of this._columns.entries()) {
            if (!column.visible) {
                return;
            }

            columns.push(index);
        }

        return columns;
    },

    /**
     * Refresh the results.
     */
    _refreshResults() {
        if (this._getResults) {
            this._results = this._data;
        } else {
            this._results = this._rowIndexes.map(rowIndex => this._data[rowIndex]);
        }
    },

    /**
     * Download a blob.
     * @param {Blob} blob The blob to save.
     * @param {string} filename The filename.
     */
    _saveBlob(blob, filename) {
        const link = dom.create('a', {
            attributes: {
                href: URL.createObjectURL(blob),
                download: filename
            }
        });
        dom.append(document.body, link);
        dom.click(link);
        dom.detach(link);
    }

});
