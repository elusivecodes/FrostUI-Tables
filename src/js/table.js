import $ from '@fr0st/query';
import { BaseComponent, generateId } from '@fr0st/ui';
import { getDataFromDOM, getHeadingsFromDOM } from './helpers.js';

/**
 * Table Class
 * @class
 */
export default class Table extends BaseComponent {
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
            $.setAttribute(this._node, { id: generateId('table') });
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
