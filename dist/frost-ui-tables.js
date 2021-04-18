/**
 * FrostUI-Tables v1.0
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
    const QuerySet = window.QuerySet;
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
                dir: 'asc',
                format: null,
                key: index,
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
            this._limit = this._settings.length;
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
            this._request = null;

            super.dispose();
        }

        /**
         * Get the Table information.
         * @returns {object} The Table information.
         */
        info() {
            return {
                end: this._offset + this._limit,
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
            if (this._settings.paging) {
                this._limit = length;
                this._offset -= (this._offset % this._limit);

                dom.triggerEvent(this._node, 'length.ui.table');

                this._getData();
            }

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
            if (this._settings.ordering) {
                this._order = order;

                dom.triggerEvent(this._node, 'order.ui.table');

                this._getData();
            }

            return this;
        }

        /**
         * Set the Table page.
         * @param {array} page The page.
         * @returns {Table} The Table.
         */
        page(page) {
            if (this._settings.paging) {
                this._offset = (page - 1) * this._limit;

                dom.triggerEvent(this._node, 'page.ui.table');

                this._getData();
            }

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
            if (this._settings.searching) {
                dom.setValue(this._searchInput, term);
                this._term = term;

                dom.triggerEvent(this._node, 'search.ui.table');

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

                            if (regExp.test(result[column.key])) {
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

            return this;
        }

    }


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
         * Clear all rows from the data array.
         * @returns {Table} The Table.
         */
        clear() {
            this._data = [];
            this._index = [];
            this._filterIndexes = [];
            this._rowIndexes = [];

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

        _buildTable(columns) {
            const headings = this._getHeadings(columns);
            const rows = this._getResultRows(columns);

            const table = dom.create('table');

            const thead = dom.create('thead');
            const tr = dom.create('tr');

            for (const heading of headings) {
                const th = dom.create('th', {
                    text: heading
                });
                dom.append(tr, th);
            }

            dom.append(thead, tr);
            dom.append(table, thead);

            const tbody = dom.create('tbody');
            for (const row of rows) {
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

        _getResultRows(columns) {
            const rows = [];

            for (const result of this._results) {
                const row = [];
                for (const [index, column] of this._columns.entries()) {
                    if (!columns.includes(index)) {
                        continue;
                    }

                    const value = result[column.key];
                    row.push(value);
                }
                rows.push(row);
            }

            return rows;
        },

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

                this._index[column.key] = [];

                const valueLookup = {};

                for (const [index, result] of this._data.entries()) {
                    const value = result[column.key];

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
                    this._index[column.key].push(valueLookup[value])
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
            const key = this._columns[index].key;
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

                this._results = [];

                if (!this._rowIndexes) {
                    this._rowIndexes = Core.range(this._offset, this._offset + this._limit);
                }

                for (const rowIndex of this._rowIndexes) {
                    this._results.push(this._data[rowIndex]);
                }

                this._renderResults();
                this.loading(false);
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
                    options.order = this._order;
                }

                if (this._settings.paging) {
                    options.offset = this._offset;
                    options.limit = this._limit;
                }

                this.loading();
                const request = this._getResults(options);

                request.then(response => {
                    if (this._request !== request) {
                        return;
                    }

                    this._total = response.total;
                    this._filtered = response.filtered;
                    this._data = this._results = response.results;
                    this._rowIndexes = Core.range(0, this._results.length - 1);

                    this._renderResults();
                }).catch(_ => {
                    // error
                }).finally(_ => {
                    this.loading(false);

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

            for (const elements of columns) {
                const column = dom.create('div', {
                    class: this.constructor.classes.column
                });

                for (const element of elements) {
                    const container = dom.create('div', {
                        class: this.constructor.classes.columnContainer
                    });

                    switch (element) {
                        case 'buttons':
                            this._renderButtons(container);
                            break;
                        case 'search':
                            this._renderSearch(container);
                            break;
                        case 'length':
                            this._renderLengthSelect(container);
                            break;
                        case 'info':
                            this._renderInfoContainer(container);
                            break;
                        case 'pagination':
                            this._renderPaginationContainer(container);
                            break;
                    }

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
            if (!this._settings.lengthChange) {
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

                const value = data[column.key];

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
        buttons: [
            {
                type: 'csv'
            },
            // {
            //     type: 'excel'
            // },
            // {
            //     type: 'print'
            // }
        ],
        layout: {
            top: [
                [
                    'search'
                ],
                [
                    'buttons',
                    'length'
                ]
            ],
            bottom: [
                [
                    'info'
                ],
                [
                    'pagination'
                ]
            ]
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

    // Default buttons
    Table.buttons = {
        csv(button) {
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

            this._saveBlob(blob, 'table.csv');
        },
        excel(button) {
            if (!button.columns) {
                button.columns = this._getVisibleColumns();
            }

            // not yet implemented
        },
        print: button => {
            if (!button.columns) {
                button.columns = this._getVisibleColumns();
            }

            const table = this._buildTable(button.columns);

            // not yet implemented
        }
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

    UI.initComponent('table', Table);

    UI.Table = Table;

});