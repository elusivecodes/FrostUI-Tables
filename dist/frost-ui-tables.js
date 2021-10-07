/**
 * FrostUI-Tables v1.1.3
 * https://github.com/elusivecodes/FrostUI-Tables
 */
(function(global, factory) {
    'use strict';

    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory;
    } else {
        factory(global);
    }

})(window, function(window) {
    'use strict';

    if (!window) {
        throw new Error('FrostUI-Tables requires a Window.');
    }

    if (!('UI' in window)) {
        throw new Error('FrostUI-Tables requires FrostUI.');
    }

    const Core = window.Core;
    const dom = window.dom;
    const UI = window.UI;
    const document = window.document;

    /**
     * Table Class
     * @class
     */
    class Table extends UI.BaseComponent {

        /**
         * New Table constructor.
         * @param {HTMLElement} node The input node.
         * @param {object} [settings] The options to create the Table with.
         * @returns {Table} A new Table object.
         */
        constructor(node, settings) {
            super(node, settings);

            if (settings && settings.layout) {
                Object.assign(this._settings.layout, settings.layout);
            }

            this._data = [];

            this._getData = null;
            this._getResults = null;

            let data;
            if (Core.isFunction(this._settings.getResults)) {
                this._getResultsCallbackInit();
                this._getResultsInit();
            } else if (Core.isArray(this._settings.data)) {
                data = this._settings.data;
            } else {
                data = this.constructor._getDataFromDOM(this._node);
            }

            if (data) {
                this._data = data;
                this._getDataInit();
            }

            this._headings = this.constructor._getHeadingsFromDOM(this._node);

            this._columns = [];

            if (this._settings.columns) {
                this._columns = this._settings.columns;
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
                ...column
            }));

            this._columnCount = this._columns.reduce((acc, v) => {
                if (v.visible) {
                    acc++;
                }

                return acc;
            }, 0);

            this._offset = 0;
            this._limit = this._settings.paging ?
                this._settings.length :
                Number.INFINITY;
            this._order = this._settings.order.slice();
            this._term = null;

            this._buildIndex();
            this._render();
            this._events();

            dom.triggerEvent(this._node, 'init.ui.table');

            this._getData();
        }

        /**
         * Dispose the Table.
         */
        dispose() {
            dom.before(this._container, this._node);
            dom.remove(this._container);
            dom.empty(this._node);

            for (const child of dom.children(this._original)) {
                dom.append(this._node, child);
            }

            this._original = null;
            this._container = null;
            this._loader = null;
            this._thead = null;
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
            this._getResults = null;

            super.dispose();
        }

        /**
         * Get the Table information.
         * @returns {object} The Table information.
         */
        info() {
            return {
                end: this._offset + this._results.length,
                filtered: this._filtered,
                start: this._offset,
                total: this._total
            };
        }

        /**
         * Set the Table length.
         * @param {number} length The length.
         * @returns {Table} The Table.
         */
        length(length) {
            if (!this._settings.paging) {
                return this;
            }

            this._limit = length;
            this._offset -= (this._offset % this._limit);

            dom.triggerEvent(this._node, 'length.ui.table');

            this._getData();

            return this;
        }

        /**
         * Trigger the loading indicator.
         * @param {Boolean} [show=true] Whether to show the loading indicator.
         * @returns {Table} The Table.
         */
        loading(show = true) {
            if (show) {
                dom.triggerEvent(this._node, 'processing.ui.table');
                dom.show(this._loader);
            } else {
                dom.hide(this._loader);
                dom.triggerEvent(this._node, 'processed.ui.table');
            }

            return this;
        }

        /**
         * Set the Table order data.
         * @param {array} order The order data.
         * @returns {Table} The Table.
         */
        order(order) {
            if (!this._settings.ordering) {
                return this;
            }

            this._order = order;

            dom.triggerEvent(this._node, 'order.ui.table');

            this._getData();

            return this;
        }

        /**
         * Set the Table page.
         * @param {array} page The page.
         * @returns {Table} The Table.
         */
        page(page) {
            if (!this._settings.paging) {
                return this;
            }

            this._offset = (page - 1) * this._limit;

            dom.triggerEvent(this._node, 'page.ui.table');

            this._getData();

            return this;
        }

        /**
         * Redraw the Table.
         * @returns {Table} The Table.
         */
        refresh() {
            this._renderResults();

            return this;
        }

        /**
         * Reload the Table data.
         * @param {Boolean} [reset=false] Whether to reset the offset.
         * @returns {Table} The Table.
         */
        reload(reset = false) {
            if (reset) {
                this._offset = 0;
            }

            this._getData();

            return this;
        }

        /**
         * Search the Table for a term.
         * @param {string} term The term to search for.
         * @returns {Table} The table.
         */
        search(term) {
            if (!this._settings.searching) {
                return this;
            }

            dom.setValue(this._searchInput, term);
            this._term = term;

            dom.triggerEvent(this._node, 'search.ui.table');

            if (this._getResults) {
                this._getData();

                return this;
            }

            if (this._term) {
                this._filterIndexes = [];

                const escapedFilter = Core.escapeRegExp(this._term);
                const regExp = new RegExp(escapedFilter, 'i');

                // filter results
                for (const [index, result] of this._data.entries()) {
                    for (const column of this._columns) {
                        if (!column.searchable) {
                            continue;
                        }

                        const value = Core.getDot(result, `${column.data}`);

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

            return this;
        }

    }


    // Default buttons
    Table.buttons = {
        csv(button) {
            if (!button.title) {
                button.title = dom.getText('title');
            }

            if (!button.columns) {
                button.columns = this._getVisibleColumns();
            }

            const rows = [
                this._getHeadings(button.columns),
                ...this._getResultRows(button.columns)
            ];

            // build csv data
            const lines = [];

            for (const row of rows) {
                const line = row.map(
                    value => {
                        value = `${value}`.replace(/"/g, '""');

                        if (value.indexOf(',') >= 0) {
                            return `"${value}"`;
                        }

                        return value;
                    }
                ).join(',');

                lines.push(line);
            }

            const blob = new Blob(
                [
                    lines.join("\r\n")
                ],
                { type: 'text/csv;charset=utf-8;' }
            );

            this._saveBlob(blob, `${button.title}.csv`);
        },
        excel(button) {
            if (!button.title) {
                button.title = dom.getText('title');
            }

            if (!button.columns) {
                button.columns = this._getVisibleColumns();
            }

            const workbook = new Workbook();
            workbook.addSheet({
                header: this._getHeadings(button.columns),
                rows: this._getResultRows(button.columns)
            });

            const blob = workbook.create();

            this._saveBlob(blob, `${button.title}.xlsx`);
        },
        print(button) {
            if (!button.title) {
                button.title = dom.getText('title');
            }

            if (!button.columns) {
                button.columns = this._getVisibleColumns();
            }

            const win = window.open('', '');

            win.document.head.innerHTML = `<title>${button.title}</title>`;

            const styles = dom.find('link, style');
            const newStyles = dom.clone(styles);

            for (const element of newStyles) {
                if (dom.tagName(element) === 'link') {
                    const oldRel = dom.getAttribute(element, 'href');
                    const newRel = (new URL(oldRel, document.location)).href;
                    dom.setAttribute(element, 'href', newRel);
                }
                win.document.head.appendChild(element);
            }

            const container = dom.create('div');
            const table = this._buildTable(button.columns);
            const classes = dom.getAttribute(this._node, 'class');
            dom.addClass(table, classes);
            dom.append(container, table);
            const tableHtml = dom.getHTML(container);
            win.document.body.innerHTML = `<h1>${button.title}</h1>${tableHtml}`;

            setTimeout(_ => {
                win.print();
                win.close();
            }, 1000);
        }
    };


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


    /**
     * Table Events
     */

    Object.assign(Table.prototype, {

        /**
         * Attach events for the Table.
         */
        _events() {
            if (this._settings.lengthChange) {
                dom.addEvent(this._lengthSelect, 'change.ui.table', e => {
                    const value = dom.getValue(e.currentTarget);
                    this.length(value);
                });
            }

            if (this._settings.searching) {
                // debounced search event
                const searchDebounced = Core.debounce(term => {
                    this.search(term);
                }, this._settings.debounceInput);

                dom.addEvent(this._searchInput, 'input.ui.table', e => {
                    const value = dom.getValue(e.currentTarget);
                    searchDebounced(value);
                });
            }

            if (this._settings.ordering) {
                dom.addEventDelegate(this._thead, 'click.ui.table', 'th', e => {
                    e.preventDefault();

                    const index = dom.index(e.currentTarget);

                    if (!this._columns[index].orderable) {
                        return;
                    }

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
                });
            }

            if (this._settings.paging) {
                dom.addEventDelegate(this._pagination, 'click.ui.table', '[data-ui-page]', e => {
                    e.preventDefault();

                    const page = dom.getDataset(e.currentTarget, 'uiPage');
                    this.page(page);
                });
            }
        }

    });


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


    /**
     * Table Index
     */

    Object.assign(Table.prototype, {

        /**
         * Rebuild the index.
         */
        _buildIndex() {
            if (this._getResults || !this._settings.ordering) {
                return;
            }

            this._index = [];
            for (const column of this._columns) {
                if (!column.orderable) {
                    return false
                }

                this._index[column.data] = [];

                const valueLookup = {};

                for (const [index, result] of this._data.entries()) {
                    const value = Core.getDot(result, `${column.data}`);

                    if (!(value in valueLookup)) {
                        valueLookup[value] = [];
                    }

                    valueLookup[value].push(index);
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
                    this._index[column.data].push(valueLookup[value])
                }
            }
        },

        /**
         * Get real column ordering data.
         * @returns {Array} The column ordering data.
         */
        _getOrder() {
            const order = [];

            for (const [index, direction] of this._order) {
                if (this._columns[index].orderData) {
                    order.push(...this._columns[index.orderData]);
                } else {
                    order.push([index, direction]);
                }
            }

            return order;
        },

        /**
         * Get a range of data indexes for filtered rows, based on order data.
         * @param {Array} order The order data.
         * @param {Array} [onlyRows=null] The filtered rows.
         * @param {number} [offset] The starting offset.
         * @param {number} [limit] The maximum rows to return.
         * @param {number} [orderIndex=0] The order index.
         * @returns {Array} The data indexes.
         */
        _getOrderedIndexes(order, onlyRows = null, offset = this._offset, limit = this._limit, orderIndex = 0) {
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
                    rows.filter(row => onlyRows.includes(row)) :
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

    });


    /**
     * Table Init
     */

    Object.assign(Table.prototype, {

        /**
         * Initialize preloaded get data.
         */
        _getDataInit() {
            this._total = this._data.length;
            this._filtered = this._total;

            this._getData = _ => {
                this.loading();

                this._rowIndexes = this._filterIndexes;

                // order
                if (this._settings.ordering) {
                    const order = this._getOrder();
                    this._rowIndexes = this._getOrderedIndexes(order, this._rowIndexes);
                }

                if (!this._rowIndexes) {
                    this._rowIndexes = Core.range(this._offset, this._offset + this._limit);
                }

                this.loading(false);
                this._refreshResults();
                this._renderResults();
            };
        },

        /**
         * Initialize get data from callback.
         */
        _getResultsInit() {
            this._getData = _ => {

                // cancel last request
                if (this._request && this._request.cancel) {
                    this._request.cancel();
                    this._request = null;
                }

                const options = {};

                if (this._term) {
                    options.term = this._term;
                }

                if (this._settings.ordering) {
                    options.order = this._order.map(([column, dir]) => ({ column, dir }));
                }

                if (this._settings.paging) {
                    options.offset = this._offset;
                    options.limit = this._limit;
                }

                options.columns = this._columns.map(column => ({
                    name: column.name,
                    data: column.data,
                    orderable: column.orderable,
                    searchable: column.searchable
                }));

                this.loading();
                const request = this._getResults(options);

                request.then(response => {
                    if (this._request !== request) {
                        return;
                    }

                    this._total = response.total;
                    this._filtered = response.filtered;
                    this._data = response.results;

                    this._refreshResults();
                    this._rowIndexes = Core.range(0, this._results.length - 1);

                    this.loading(false);
                    this._renderResults();
                }).catch(_ => {
                    this.loading(false);
                }).finally(_ => {
                    if (this._request === request) {
                        this._request = null;
                    }
                });
            };
        },

        /**
         * Initialize get data callback.
         */
        _getResultsCallbackInit() {
            this._getResults = options => {

                const request = this._settings.getResults(options);
                this._request = Promise.resolve(request);

                this._request.then(response => {
                    this._data = response.results;

                    return response;
                });

                return this._request;
            };
        }

    });


    /**
     * Table Render
     */

    Object.assign(Table.prototype, {

        /**
         * Render the Table.
         */
        _render() {
            this._original = dom.clone(this._node);
            dom.empty(this._node);

            this._container = dom.create('div', {
                class: this.constructor.classes.container
            });

            this._loader = dom.create('div', {
                class: this.constructor.classes.loader
            });

            const loaderIcon = dom.create('span', {
                class: this.constructor.classes.loaderIcon
            });
            dom.append(this._loader, loaderIcon);

            dom.addClass(this._node, this.constructor.classes.table);

            this._thead = dom.create('thead');
            dom.append(this._node, this._thead);

            this._tbody = dom.create('tbody');
            dom.append(this._node, this._tbody);

            if (dom.findOne('tfoot', this._original)) {
                this._tfoot = dom.create('tfoot');
                dom.append(this._node, this._tfoot);
            }

            dom.hide(this._loader);
            dom.after(this._node, this._container);
            dom.append(this._container, this._loader);

            if (this._settings.layout.top) {
                this._renderLayoutRow(this._settings.layout.top, this.constructor.classes.topRow);
            }

            dom.append(this._container, this._node);

            if (this._settings.layout.bottom) {
                this._renderLayoutRow(this._settings.layout.bottom, this.constructor.classes.bottomRow);
            }
        },

        /**
         * Render the table buttons.
         * @param {HTMLElement} container The container to render in.
         */
        _renderButtons(container) {
            const btnGroup = dom.create('div', {
                class: this.constructor.classes.buttonGroup
            });

            for (const button of this._settings.buttons) {
                const btn = dom.create('button', {
                    class: this.constructor.classes.button,
                    text: !button.text && button.type in this._settings.lang.buttons ?
                        this._settings.lang.buttons[button.type] :
                        button.text
                });

                dom.addEvent(btn, 'click.ui.table', e => {
                    e.preventDefault();

                    if (button.callback) {
                        button.callback.bind(this)();
                    } else if (button.type in this.constructor.buttons) {
                        this.constructor.buttons[button.type].bind(this)(button);
                    }
                });

                dom.append(btnGroup, btn);
            }

            dom.append(container, btnGroup);
        },

        /**
         * Render the table headings.
         */
        _renderHeadings() {
            dom.empty(this._thead);

            const row = dom.create('tr');

            for (const [index, heading] of this._headings.entries()) {
                if (!this._columns[index].visible) {
                    continue;
                }

                const cell = dom.create('th', {
                    class: this.constructor.classes.tableHeading,
                    html: heading.text
                });

                if (heading.class) {
                    dom.addClass(cell, heading.class);
                }

                dom.append(row, cell);

                if (!this._settings.ordering || !this._columns[index].orderable) {
                    continue;
                }

                const sortClasses = [this.constructor.classes.tableSort];
                let ariaLabel;

                for (const order of this._order) {
                    if (order[0] != index) {
                        continue;
                    }

                    const text = dom.getText(cell);

                    if (order[1] == 'asc') {
                        sortClasses.push(this.constructor.classes.tableSortAsc);
                        ariaLabel = `${text}${this._settings.lang.aria.sortDescending}`;
                    } else {
                        sortClasses.push(this.constructor.classes.tableSortDesc);
                        ariaLabel = `${text}${this._settings.lang.aria.sortAscending}`;
                    }
                }

                dom.addClass(cell, sortClasses);

                if (ariaLabel) {
                    dom.setAttribute(cell, 'aria-label', ariaLabel);
                }
            }

            dom.append(this._thead, row);
        },

        /**
         * Render the table info.
         */
        _renderInfo() {
            dom.empty(this._infoContainer);

            const start = this._offset + 1;
            const end = this._offset + this._results.length;
            let infoText = this._filtered < this._total ?
                this._settings.lang.infoFiltered :
                this._settings.lang.info;

            const replacements = {
                start,
                end,
                filtered: this._filtered,
                total: this._total
            };

            for (const [key, value] of Object.entries(replacements)) {
                infoText = infoText.replace(`{${key}}`, value);
            }

            if (this._settings.infoCallback) {
                infoText = this._settings.infoCallback(start, end, this._total, this._filtered, text);
            }

            const text = dom.create('small', {
                text: infoText
            });
            dom.append(this._infoContainer, text);
        },

        /**
         * Render the table info container in a container.
         * @param {HTMLElement} container The container to render in.
         */
        _renderInfoContainer(container) {
            this._infoContainer = dom.create('div', {
                class: this.constructor.classes.infoContainer
            });

            dom.append(container, this._infoContainer);
        },

        /**
         * Render a layout row in a container.
         * @param {Array} columns The columns to render.
         * @param {string} rowClass The row class.
         */
        _renderLayoutRow(columns, rowClass) {
            const row = dom.create('div', {
                class: rowClass
            });

            for (const elements of columns.split(',')) {
                const column = dom.create('div', {
                    class: this.constructor.classes.column
                });

                for (const element of elements.split('|')) {
                    if (!(element in this.constructor.layout)) {
                        continue;
                    }

                    const container = dom.create('div', {
                        class: this.constructor.classes.columnContainer
                    });

                    this.constructor.layout[element].bind(this)(container);

                    dom.append(column, container);
                }

                dom.append(row, column);
            }

            dom.append(this._container, row);
        },

        /**
         * Render the length select in a container.
         * @param {HTMLElement} container The container to render in.
         */
        _renderLengthSelect(container) {
            if (!this._settings.lengthChange || !this._settings.paging) {
                return;
            }

            const lengthContainer = dom.create('div', {
                class: this.constructor.classes.lengthContainer
            });

            const label = dom.create('label', {
                class: this.constructor.classes.lengthLabel
            });
            dom.append(lengthContainer, label);

            const labelText = dom.create('small', {
                class: this.constructor.classes.lengthLabelText,
                text: this._settings.lang.perPage
            });
            dom.append(label, labelText);

            const inputContainer = dom.create('div', {
                class: this.constructor.classes.lengthInputContainer,
                style: {
                    width: 'initial'
                }
            });
            dom.append(label, inputContainer);

            this._lengthSelect = dom.create('select', {
                class: this._settings.inputStyle === 'filled' ?
                    this.constructor.classes.lengthInputFilled :
                    this.constructor.classes.lengthInputOutline
            });
            dom.append(inputContainer, this._lengthSelect);

            for (const length of this._settings.lengths) {
                const option = dom.create('option', {
                    value: length,
                    text: length
                });

                if (length == this._limit) {
                    dom.setAttribute(option, 'checked', true);
                }

                dom.append(this._lengthSelect, option);
            }

            if (this._settings.inputStyle === 'filled') {
                const ripple = dom.create('div', {
                    class: this.constructor.classes.lengthInputRipple
                });
                dom.append(inputContainer, ripple);
            }

            dom.append(container, lengthContainer);
        },

        /**
         * Render a pagination item.
         * @param {object} options Options for rendering the pagnination item.
         * @returns {HTMLElement} The pagnination item.
         */
        _renderPageItem(options) {
            const container = dom.create('div', {
                class: this.constructor.classes.pageItem
            });

            const link = dom.create('button', {
                html: options.icon || options.text || options.page,
                class: this.constructor.classes.pageLink,
                attributes: {
                    type: 'button',
                    title: options.text ?
                        `${options.text} ${this._settings.lang.page}` :
                        `${this._settings.lang.page} ${options.page}`
                }
            });
            dom.append(container, link);

            if (options.disabled) {
                dom.addClass(container, this.constructor.classes.pageDisabled);
                dom.setAttribute(link, 'aria-disabled', 'true');
                dom.setAttribute(link, 'tabindex', '-1');
            }

            if (options.active) {
                dom.addClass(container, this.constructor.classes.pageActive);
            }

            if (options.page) {
                dom.setDataset(link, 'uiPage', options.page);
            }

            return container;
        },

        /**
         * Render the pagination.
         */
        _renderPagination() {
            const totalPages = Math.ceil(this._filtered / this._limit);
            const page = 1 + (this._offset / this._limit);

            dom.empty(this._pagination);

            const first = this._renderPageItem({
                text: this._settings.lang.paginate.first,
                icon: this._settings.icons.first,
                disabled: page == 1,
                page: 1
            });
            dom.append(this._pagination, first);

            const prev = this._renderPageItem({
                text: this._settings.lang.paginate.previous,
                icon: this._settings.icons.previous,
                disabled: page == 1,
                page: page > 1 ?
                    page - 1 :
                    null
            });
            dom.append(this._pagination, prev);

            let startPage = Math.max(page - 5, 1);
            let endPage = Math.min(page + 5, totalPages);

            while (endPage - startPage > 4) {
                if (page - startPage > endPage - page) {
                    startPage++;
                } else {
                    endPage--;
                }
            }

            for (let current = startPage; current <= endPage; current++) {
                const pageItem = this._renderPageItem({
                    page: current,
                    active: current == page
                });
                dom.append(this._pagination, pageItem);
            }

            const next = this._renderPageItem({
                text: this._settings.lang.paginate.next,
                icon: this._settings.icons.next,
                disabled: page == totalPages,
                page: page < totalPages ?
                    page + 1 :
                    null
            });
            dom.append(this._pagination, next);

            const last = this._renderPageItem({
                text: this._settings.lang.paginate.last,
                icon: this._settings.icons.last,
                disabled: page == totalPages,
                page: totalPages
            });
            dom.append(this._pagination, last);
        },

        /**
         * Render the pagination container in a container.
         * @param {HTMLElement} container The container to render in.
         */
        _renderPaginationContainer(container) {
            const paginationContainer = dom.create('div', {
                class: this.constructor.classes.paginationContainer
            });
            dom.append(container, paginationContainer);

            this._pagination = dom.create('div', {
                class: this.constructor.classes.pagination
            });
            dom.append(paginationContainer, this._pagination);
        },

        /**
         * Render the table results.
         */
        _renderResults() {
            dom.triggerEvent(this._node, 'preDraw.ui.table');

            dom.empty(this._tbody);

            this._renderHeadings();

            if (this._settings.headerCallback) {
                this._settings.headerCallback(this._head, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
            }

            if (this._settings.paging) {
                this._renderPagination();
            }

            if (this._settings.info) {
                this._renderInfo();
            }

            if (!this._results.length) {
                const row = dom.create('tr');

                const cell = dom.create('td', {
                    class: this.constructor.classes.emptyCell,
                    html: this._term ?
                        this._settings.lang.noResults :
                        this._settings.lang.noData,
                    attributes: {
                        colspan: this._columnCount
                    }
                });
                dom.append(row, cell);

                dom.append(this._tbody, row);
            } else {
                for (const [index, result] of this._results.entries()) {
                    const row = this._renderRow(result);

                    if (this._settings.rowCallback) {
                        this._settings.rowCallback(row, result, index, this._offset + index, this._rowIndexes[index]);
                    }

                    dom.append(this._tbody, row);

                    if (this._settings.createdRow) {
                        this._settings.createdRow(row, result, index);
                    }
                }
            }

            if (this._settings.drawCallback) {
                this._settings.drawCallback();
            }

            if (this._tfoot && this._settings.footerCallback) {
                this._settings.footerCallback(this._tfoot, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
            }

            dom.triggerEvent(this._node, 'draw.ui.table');
        },

        /**
         * Render a result row.
         * @param {Array|object} data The row data.
         * @returns {HTMLElement} The table row.
         */
        _renderRow(data) {
            const row = dom.create('tr');

            for (const column of this._columns) {
                if (!column.visible) {
                    continue;
                }

                const value = Core.getDot(data, `${column.data}`);

                const cell = dom.create('td', {
                    html: column.format ?
                        column.format(value) :
                        value
                });

                if (column.class) {
                    dom.addClass(column.class);
                }

                dom.append(row, cell);
            }

            return row;
        },

        /**
         * Render the search in a container.
         * @param {HTMLElement} container The container to render in.
         */
        _renderSearch(container) {
            if (!this._settings.searching) {
                return;
            }

            const searchContainer = dom.create('div', {
                class: this.constructor.classes.searchContainer
            });

            const inputContainer = dom.create('div', {
                class: this.constructor.classes.searchInputContainer,
                style: {
                    width: '200px'
                }
            });
            dom.append(searchContainer, inputContainer);

            this._searchInput = dom.create('input', {
                class: this._settings.inputStyle === 'filled' ?
                    this.constructor.classes.searchInputFilled :
                    this.constructor.classes.searchInputOutline,
                attributes: {
                    type: 'text',
                    placeholder: this._settings.lang.search
                }
            });
            dom.append(inputContainer, this._searchInput);

            if (this._settings.inputStyle === 'filled') {
                const ripple = dom.create('div', {
                    class: this.constructor.classes.searchInputRipple
                });
                dom.append(inputContainer, ripple);
            }

            dom.append(container, searchContainer);
        }

    });


    /**
     * Table (Static) Helpers
     */

    Object.assign(Table, {

        /**
         * Build a data array from a DOM element.
         * @param {HTMLElement} element The element to parse.
         * @returns {array} The parsed data.
         */
        _getDataFromDOM(element) {
            const tbody = dom.findOne('tbody', element);
            return dom.children(tbody, 'tr').map(
                row => dom.children(row, 'td').map(cell => dom.getHTML(cell))
            );
        },

        /**
         * Build a heading array from a DOM element.
         * @param {HTMLElement} element The element to parse.
         * @returns {array} The parsed data.
         */
        _getHeadingsFromDOM(element) {
            const tbody = dom.findOne('thead', element);
            const row = dom.children(tbody, 'tr').shift();

            return dom.children(row, 'th').map(cell => ({
                text: dom.getHTML(cell),
                class: dom.getAttribute(cell, 'class')
            }));
        }

    });


    // Table default options
    Table.defaults = {
        buttons: [],
        layout: {
            top: 'search,buttons|length',
            bottom: 'info,pagination'
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
                previous: 'Previous'
            },
            buttons: {
                csv: 'CSV',
                excel: 'Excel',
                print: 'Print'
            },
            aria: {
                sortAscending: ': activate to sort column ascending',
                sortDescending: ': activate to sort column descending'
            }
        },
        icons: {
            first: '&laquo;',
            last: '&raquo',
            next: '&gt;',
            previous: '&lt;'
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
        debounceInput: 250,
        info: true,
        lengthChange: true,
        ordering: true,
        paging: true,
        searching: true
    };

    // Default classes
    Table.classes = {
        bottomRow: 'd-md-flex justify-content-between mx-n2',
        button: 'btn btn-outline-secondary',
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
        loader: 'position-absolute top-50 start-50 translate-middle',
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
        tableHeading: 'fw-bold',
        tableSort: 'table-sort',
        tableSortAsc: 'table-sort-asc',
        tableSortDesc: 'table-sort-desc',
        topRow: 'd-md-flex justify-content-between mb-2 mx-n2'
    };

    // Default layout
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
        }
    };

    UI.initComponent('table', Table);

    UI.Table = Table;


    /**
     * Workbook Class
     * Based on https://github.com/shuchkin/simplexlsxgen/blob/master/src/SimpleXLSXGen.php
     * @class
     */
    class Workbook {

        /**
         * New Workbook constructor.
         * @returns {Workbook} A new Workbook object.
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
         * @returns {Workbook} The Workbook.
         */
        addSheet(data, name = null) {
            this._current++;

            if (!name) {
                name = `Sheet${this._current}`;
            }

            this._sheets.push({
                name,
                data
            });

            return this;
        }

        /**
         * Create an xlsx file.
         * @returns {Blob} The xlsx file.
         */
        create() {
            const zip = new Zip('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            for (let [filename, template] of Object.entries(this.constructor.templates)) {
                switch (filename) {
                    case '[Content_Types].xml':
                        const override = this._sheets.map((_, index) =>
                            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
                        ).join('');

                        template = template.replace('{sheets}', override);

                        zip.addFile(filename, template);
                        break;
                    case 'xl/_rels/workbook.xml.rels':
                        let relationships = this._sheets.map((_, index) =>
                            `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml\"/>\n`
                        ).join('');

                        relationships += `<Relationship Id="rId${this._sheets.length + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

                        template = template.replace('{sheets}', relationships);

                        zip.addFile(filename, template);
                        break;
                    case 'xl/workbook.xml':
                        const sheets = this._sheets.map((sheet, index) =>
                            `<sheet name="${sheet.name}" sheetId="${index + 1}" state="visible" r:id="rId${index + 2}"/>`
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

                        const strings = this._sValues.map(string =>
                            `<si><t>${string}</t></si>`
                        ).join("\r\n");

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
         * @returns {string} The XML string.
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

                    const cName = this.constructor._colName(currentCol) + currentRow;

                    value = `${value}`;

                    const length = value.length;

                    let cType, cStyle, cValue;

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
                        cValue = this.constructor._date(match[1], match[2], match[3]);
                        cStyle = 4; // mm-dd-yy
                    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                        cValue = this.constructor._date(match[3], match[2], match[1]);
                        cStyle = 4; // mm-dd-yy
                    } else if (/\d{2}:\d{2}:\d{2}$/.test(value)) {
                        const match = value.match(/(\d{2}):(\d{2}):(\d{2})$/);
                        cValue = this.constructor._date(0, 0, 0, match[1], match[2], match[3]);
                        cStyle = 5; // h:mm
                    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
                        const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
                        cValue = this.constructor._date(match[1], match[2], match[3], match[4], match[5], match[6]);
                        cStyle = 6; // m/d/yy h:mm
                    } else if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(value)) {
                        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
                        cValue = this.constructor._date(match[3], match[2], match[1], match[4], match[5], match[6]);
                        cStyle = 6; // m/d/yy h:mm
                    } else if (length > 160) {
                        cType = 'inlineStr';
                        cValue = this.constructor._escape(value);
                    } else {
                        if (/^[0-9+-.]+$/.test(value)) {
                            cStyle = 7; // align right
                        }

                        cType = 's'; // shared string

                        value = value.trimStart("\0");
                        value = this.constructor._escape(value);

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
                        r: cName
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

                    row += `<c ${Object.keys(attributes).map(attr => `${attr}="${attributes[attr]}"`).join(' ')}>` +
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

            const ref = `A1:${this.constructor._colName(cols.length)}${rows.length}`;

            template = template.replace('{ref}', ref);
            template = template.replace('{cols}', cols.join("\r\n"));
            template = template.replace('{rows}', rows.join("\r\n"));

            return template;
        }

    }


    /**
     * Workbook (Static)
     */
    Object.assign(Workbook, {

        /**
         * Convert a column number to name.
         * @param {number} num The number.
         * @returns {string} The column name.
         */
        _colName(num) {
            const code = 65 + ((num - 1) % 26);
            const letter = String.fromCharCode(code);

            const nextNum = Math.round((num - 1) / 26);

            if (nextNum > 0) {
                return this._colName(nextNum) + letter;
            }

            return letter;
        },

        /**
         * Convert a date to Excel format.
         * @param {number} year The year.
         * @param {number} month The month.
         * @param {number} day The day.
         * @param {number} [hours] The hours.
         * @param {number} [minutes] The minutes.
         * @param {number} [seconds] The seconds.
         * @returns {number} The Excel timestamp.
         */
        _date(year, month, day, hours = 0, minutes = 0, seconds = 0) {
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
        },

        /**
         * Escape a string for Excel.
         * @param {string} string The input string.
         * @returns {string} The escaped string.
         */
        _escape(string) {
            string = string.replace('&', '&amp;');
            string = string.replace('<', '&lt;');
            string = string.replace('>', '&gt;');
            string = string.replace("\x03", '');

            return string;
        }

    });


    // Workbook templates
    Workbook.templates = {
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
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>	' +
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
            '</cellXfs>' +
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '</styleSheet>',
        'xl/workbook.xml':
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<fileVersion appName="FrostUI-Tables"/><sheets>' +
            '{sheets}' +
            '</sheets></workbook>'
    };


    UI.Workbook = Workbook;


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
         * @returns {BitStream} A new BitStream object.
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
         * @returns {Uint8Array} The buffer.
         */
        finish() {
            let index = this._index;

            if (this._bitIndex > 0) {
                this._buffer[index] <<= 8 - this._bitIndex;
                this._buffer[index] = this.constructor._reverseTable[this._buffer[index]];
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
                    this.constructor.rev32(number) >> (32 - n) :
                    this.constructor._reverseTable[number] >> (8 - n);
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
                        this._buffer[this._index++] = this.constructor._reverseTable[current];
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

        /**
         * Reverse the bit order.
         * @param {number} number The number to reverse.
         * @returns {number} The reversed number.
         */
        static rev32(n) {
            return (this._reverseTable[n & 0xff] << 24) |
                (this._reverseTable[n >>> 8 & 0xff] << 16) |
                (this._reverseTable[n >>> 16 & 0xff] << 8) |
                this._reverseTable[n >>> 24 & 0xff];
        }

        /**
         * Generate the reverse table.
         * @returns {array} The reverse table.
         */
        static get _reverseTable() {
            if (!this.__reverseTable) {
                this.__reverseTable = new Uint8Array(256);

                for (let i = 0; i < 256; ++i) {
                    let n = i;
                    let r = n;
                    let s = 7;
                    for (n >>>= 1; n; n >>>= 1) {
                        r <<= 1;
                        r |= n & 1;
                        --s;
                    }

                    this.__reverseTable[i] = (r << s & 0xff) >>> 0;
                }
            }

            return this.__reverseTable;
        }

    }


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
         * @returns {number} The CRC32 hash.
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
         * @returns {number} The CRC32 hash.
         */
        static update(data, crc, pos = 0, length = null) {
            if (length === null) {
                length = data.length;
            }

            crc ^= 0xffffffff;

            for (let i = length & 7; i--; ++pos) {
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos]) & 0xff];
            }

            for (let i = length >> 3; i--; pos += 8) {
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 1]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 2]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 3]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 4]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 5]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 6]) & 0xff];
                crc = (crc >>> 8) ^ this._table[(crc ^ data[pos + 7]) & 0xff];
            }

            return (crc ^ 0xffffffff) >>> 0;
        }

        /**
         * Generate the CRC32 table.
         * @returns {array} The CRC32 table.
         */
        static get _table() {
            if (!this.__table) {
                this.__table = new Uint32Array(256);

                for (let i = 0; i < 256; i++) {
                    let c = i;
                    for (let j = 0; j < 8; j++) {
                        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
                    }
                    this.__table[i] = c >>> 0;
                }
            }

            return this.__table;
        }

    }


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
         * @returns {Lz77Match} A new Lz77Match object.
         */
        constructor(length, backwardDistance) {
            this.length = length;
            this._backwardDistance = backwardDistance;
        }

        /**
         * Get the LZ77 coded array.
         * @returns {array} The LZ77 Array.
         */
        toLz77Array() {
            const codeArray = [];
            let pos = 0;

            const lengthCode = this.constructor._lengthCodeTable[this.length];
            codeArray[pos++] = lengthCode & 0xffff;
            codeArray[pos++] = (lengthCode >> 16) & 0xff;
            codeArray[pos++] = lengthCode >> 24;

            const distCode = this.constructor._getDistanceCode(this._backwardDistance);
            codeArray[pos++] = distCode[0];
            codeArray[pos++] = distCode[1];
            codeArray[pos++] = distCode[2];

            return codeArray;
        }

        /**
         * Get the distance code.
         * @param {number} dist The distance.
         * @returns {array} The distance code.
         */
        static _getDistanceCode(dist) {
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
        }

        /**
         * Get the length code.
         * @param {number} length The length.
         * @returns {array} The LZ77 length codes.
         */
        static _getLengthCode(length) {
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
        }

        /**
         * Generate the length code table.
         * @returns {array} The length code table.
         */
        static get _lengthCodeTable() {
            if (!this.__lengthCodeTable) {
                this.__lengthCodeTable = [];
                for (let i = 3; i <= 258; i++) {
                    const c = this._getLengthCode(i);
                    this.__lengthCodeTable[i] = (c[2] << 24) | (c[1] << 16) | c[0];
                }
            }

            return this.__lengthCodeTable;
        }

    }


    /**
     * RawDeflate Class
     * Based on https://github.com/imaya/zlib.js/blob/develop/src/rawdeflate.js
     * @class
     */
    class RawDeflate {

        /**
         * New RawDeflate constructor.
         * @param {Uint8Array} input The input data.
         * @param {object} settings The options to create the RawDeflate with.
         * @returns {RawDeflate} A new RawDeflate object.
         */
        constructor(input, settings) {
            settings = {
                lazy: 0,
                lz77MinLength: 3,
                lz77MaxLength: 258,
                ...settings
            };

            this._input = input;
            this._lazy = settings.lazy;
            this._lz77MinLength = settings.lz77MinLength;
            this._lz77MaxLength = settings.lz77MaxLength;
            this._outputIndex = 0;
            this._output = new Uint8Array(0x8000);
        }

        /**
         * Compress the data.
         * @returns {Uint8Array} The compressed data.
         */
        compress() {
            const stream = new BitStream(new Uint8Array(this._output.buffer), this._outputIndex)

            const bFinal = 1;
            const bType = 2;

            stream.writeBits(bFinal, 1, true);
            stream.writeBits(bType, 2, true);

            const data = this._lz77();

            const litLenLengths = this.constructor._getLengths(this.freqsLitLen, 15);
            const litLenCodes = this.constructor._getCodesFromLengths(litLenLengths);
            const distLengths = this.constructor._getLengths(this.freqsDist, 7);
            const distCodes = this.constructor._getCodesFromLengths(distLengths);

            // hlit, hdist
            let hLit, hDist;
            for (hLit = 286; hLit > 257 && litLenLengths[hLit - 1] === 0; hLit--) { }
            for (hDist = 30; hDist > 1 && distLengths[hDist - 1] === 0; hDist--) { }

            // hclen
            const treeSymbols = this.constructor._getTreeSymbols(hLit, litLenLengths, hDist, distLengths);
            const treeLengths = this.constructor._getLengths(treeSymbols.freqs, 7);

            const transLengths = new Array(19);
            const hcLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
            for (let i = 0; i < 19; i++) {
                transLengths[i] = treeLengths[hcLengthOrder[i]];
            }

            let hcLen;
            for (hcLen = 19; hcLen > 4 && transLengths[hcLen - 1] === 0; hcLen--) { }

            const treeCodes = this.constructor._getCodesFromLengths(treeLengths);

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
         * @param {Uint8Array} input The input data.
         * @param {object} settings The options to create the RawDeflate with.
         * @returns {Uint8Array} The compressed data.
         */
        static compress(data, options) {
            return (new this(data, options)).compress();
        }

        /**
         * Calculate the LZ77 array.
         * @returns {Uint16Array} The LZ77 array.
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
         * @returns {Lz77Match} The Lz77Match.
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

        /**
         * Get the Huffman codes from the code lengths.
         * @param {Uint8Array} lengths The code lengths.
         * @returns {Uint16Array} The Huffman codes.
         */
        static _getCodesFromLengths(lengths) {
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
        }

        /**
         * Get the lengths of a Huffman code.
         * @param {Uint32Array} freqs The frequency counts.
         * @param {number} limit The code length limit.
         * @returns {Uint8Array} The code lengths.
         */
        static _getLengths(freqs, limit) {
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

            const codeLengths = this._reversePackageMerge(values, values.length, limit);

            for (let i = 0; i < nodes.length; i++) {
                length[nodes[i].index] = codeLengths[i];
            }

            return length;
        }

        /**
         * Calculate the tree symbols.
         * @param {number} hLit The HLIT.
         * @param {Uint8Array} litLenLengths The literal lengths and length codes.
         * @param {number} hDist The HDIST.
         * @param {Uint8Array} distLengths The distance code lengths.
         * @returns {object} The tree symbols.
         */
        static _getTreeSymbols(hLit, litLenLengths, hDist, distLengths) {
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
                freqs
            }
        }

        /**
         * Find the optimal Huffman code. 
         * @param {Uint32Array} freqs The value frequencies.
         * @param {number} symbols The number of symbols.
         * @param {number} limit The code length limit.
         * @returns {Uint8Array} The code lengths.
         */
        static _reversePackageMerge(freqs, symbols, limit) {
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

            const takePackage = i => {
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
        }

    }


    /**
     * Zip Class
     * Based on https://github.com/shuchkin/simplexlsxgen/blob/master/src/SimpleXLSXGen.php
     * @class
     */
    class Zip {

        /**
         * New Zip constructor.
         * @param {string} [type=octet/stream] The file type.
         * @returns {Zip} A new Zip object.
         */
        constructor(type = 'octet/stream') {
            this._type = type;
            this._dir = [];
            this._files = [];
            this._offset = 0;
            this._entries = 0;
            this._encoder = new TextEncoder;
        }

        /**
         * Add a file to the Zip.
         * @param {string} filename The filename.
         * @param {string} data The data.
         * @returns {Zip} The Zip object.
         */
        addFile(filename, data) {
            const vNeeded = 10;

            const filenameLength = this._length(filename);

            data = this._encode(data);
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

            let offsetYear = now.getYear() - 1980;

            const seconds = `${offsetSeconds.toString(2)}`.padStart(5, '0');
            const minutes = `${now.getMinutes().toString(2)}`.padStart(6, '0');
            const hours = `${now.getHours().toString(2)}`.padStart(5, '0');
            const date = `${now.getDate().toString(2)}`.padStart(5, '0');
            const month = `${now.getMonth().toString(2)}`.padStart(4, '0');
            const year = `${offsetYear.toString(2)}`.padStart(7, '0');

            const modTime = parseInt(`${hours}${minutes}${seconds}`, 2);
            const modDate = parseInt(`${year}${month}${date}`, 2);

            const dir = [
                this._encode("\x50\x4b\x01\x02"), // dir signature
                this._signed16(0), // version made by
                this._signed16(vNeeded),
                this._signed16(0), // bit flag
                this._signed16(cMethod),
                this._signed16(modTime),
                this._signed16(modDate),
                this._signed32(crc32),
                this._signed32(compressedSize),
                this._signed32(uncompressedSize),
                this._signed16(filenameLength),
                this._signed16(0), // extra field length
                this._signed16(0), // file comment length
                this._signed16(0), // disk number start
                this._signed16(0), // internal file attributes
                this._signed32(32), // internal file attributes
                this._signed32(this._offset), // offset of local header
                this._encode(filename)
            ];

            this._dir.push(...dir);

            const file = [
                this._encode("\x50\x4b\x03\x04"), // zip signature
                this._signed16(vNeeded),
                this._signed16(0), // bit flag
                this._signed16(cMethod),
                this._signed16(modTime),
                this._signed16(modDate),
                this._signed32(crc32),
                this._signed32(compressedSize),
                this._signed32(uncompressedSize),
                this._signed16(filenameLength),
                this._signed16(0), // extra field length
                this._encode(filename),
                data
            ];

            this._files.push(...file);

            this._offset += file.reduce((acc, file) => acc + file.byteLength, 0);
            this._entries++;

            return this;
        }

        /**
         * Create the zip file.
         * @returns {Blob} The zip file.
         */
        zip() {
            const dirLength = this._dir.reduce((acc, file) => acc + file.byteLength, 0);

            return new Blob(
                [
                    ...this._files,
                    ...this._dir,
                    this._encode("\x50\x4b\x05\x06"), // end of central directory
                    this._signed16(0), // number of this disk
                    this._signed16(0), // number of the disk with the start of the central directory
                    this._signed16(this._entries), // total entries on this disk
                    this._signed16(this._entries), // total entries
                    this._signed32(dirLength), // size of central dir
                    this._signed32(this._offset), // offset to start of central dir
                    this._signed16(0) // file comment length
                ],
                { type: this._type }
            );
        }

        /**
         * Encode a string in binary.
         * @param {string} string The string.
         * @returns {Uint8Array} The encoded string.
         */
        _encode(string) {
            return this._encoder.encode(string);
        }

        /**
         * Get the byte length of a string.
         * @param {string} string The string.
         * @returns {number} The byte length.
         */
        _length(string) {
            return this._encode(string).length;
        }

        /**
         * Convert a number to an Int16Array.
         * @param {number} number The number.
         * @returns {Int16Array} The Int16Array.
         */
        _signed16(number) {
            return new Int16Array([number]);
        }

        /**
         * Convert a number to an Int32Array.
         * @param {number} number The number.
         * @returns {Int32Array} The Int32Array.
         */
        _signed32(number) {
            return new Int32Array([number]);
        }

    }


    UI.Zip = {
        BitStream,
        CRC32,
        Heap,
        Lz77Match,
        RawDeflate,
        Zip
    };

});