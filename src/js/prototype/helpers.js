import $ from '@fr0st/query';

/**
 * Render a table for specific columns.
 * @param {array} columns The columns to render.
 * @return {HTMLElement} The table element.
 */
export function _buildTable(columns) {
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
};

/**
 * Get headings for specific columns.
 * @param {array} columns The columns to get.
 * @return {array} The headings.
 */
export function _getHeadings(columns) {
    const headings = [];

    for (const [index, heading] of this._headings.entries()) {
        if (!columns.includes(index)) {
            continue;
        }

        headings.push(heading.text);
    }

    return headings;
};

/**
 * Get an index (optionally modified).
 * @param {number} index The index to get.
 * @param {object} [options] Options for getting the row index.
 * @param {Boolean} [options.modified=true] Whether to use modified indexes.
 * @return {number} The index.
 */
export function _getIndex(index, { modified = true } = {}) {
    return modified ?
        this._rowIndexes[index] :
        index;
};

/**
 * Get results for specific columns.
 * @param {array} columns The columns to get.
 * @return {array} The results.
 */
export function _getResultRows(columns) {
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
};

/**
 * Get the visible columns.
 * @return {array} The visible columns.
 */
export function _getVisibleColumns() {
    const columns = [];

    for (const [index, column] of this._columns.entries()) {
        if (!column.visible) {
            return;
        }

        columns.push(index);
    }

    return columns;
};

/**
 * Refresh the results.
 */
export function _refreshResults() {
    if (this._options.getResults) {
        this._results = this._data;
    } else {
        this._results = this._rowIndexes.map((rowIndex) => this._data[rowIndex]);
    }
};
