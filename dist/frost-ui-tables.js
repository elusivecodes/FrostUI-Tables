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

            this._columns = this._columns.map(column => ({
                dir: 'asc',
                key: null,
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

            if (this._data) {
                this._buildIndex();
            }
            this._render();
            this._events();

            this._getData();
        }

        /**
         * Destroy the Table.
         */
        destroy() {
            super.destroy();
        }

    }


    /**
     * Table Render
     */

    Object.assign(Table.prototype, {

        _events() {
            if (this._settings.lengthChange) {
                dom.addEvent(this._lengthSelect, 'change', e => {
                    const value = dom.getValue(e.currentTarget);
                    this._limit = value;
                    this._getData();
                });
            }

            if (this._settings.searching) {
                dom.addEvent(this._searchInput, 'input', e => {
                    this._term = dom.getValue(e.currentTarget);
                    this._getData();
                });
            }

            if (this._settings.ordering) {
                dom.addEventDelegate(this._thead, 'click', 'th', e => {
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

                    if (e.shiftKey) {
                        if (!currentDir) {
                            this._order.push([index, nextDir]);
                        } else if (currentDir === defaultDir) {
                            this._order = this._order.map(([col, dir]) => {
                                if (col == index) {
                                    dir = nextDir;
                                }

                                return [col, dir];
                            });
                        } else {
                            this._order = this._order.filter(([col]) => {
                                return col != index;
                            });
                        }
                    } else {
                        this._order = [[index, nextDir]];
                    }

                    this._getData();
                });
            }

            if (this._settings.paging) {
                dom.addEventDelegate(this._pagination, 'click', '[data-page]', e => {
                    const page = dom.getDataset(e.currentTarget, 'page');
                    this._offset = (page - 1) * this._limit;

                    this._getData();
                });
            }
        }

    });


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
                    const aTest = a.match(/^(.*?)(\d+)$/);
                    const bTest = b.match(/^(.*?)(\d+)$/);

                    if (aTest && bTest && aTest[1] === bTest[1]) {
                        return aTest[2] - bTest[2];
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


    /**
     * Table Init
     */

    Object.assign(Table.prototype, {

        /**
         * Initialize preloaded get data.
         */
        _getDataInit() {
            this._getData = _ => {

                const total = this._data.length;
                let filtered = total;

                let rowIndexes = null;

                if (this._term) {
                    rowIndexes = [];

                    const escapedFilter = Core.escapeRegExp(this._term);
                    const regExp = new RegExp(escapedFilter, 'i');

                    const normalized = this._term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const escapedNormal = Core.escapeRegExp(normalized);
                    const regExpNormal = new RegExp(escapedNormal, 'i');

                    // filter results
                    for (const [rowIndex, result] of this._data.entries()) {
                        for (const [index, column] of this._columns.entries()) {
                            if (!column.searchable) {
                                continue;
                            }

                            const key = column.key || index;

                            if (regExp.test(result[key]) || regExpNormal.test(result[key])) {
                                rowIndexes.push(rowIndex);
                            }
                        }
                    }

                    filtered = rowIndexes.length;
                }

                // order
                if (this._settings.ordering) {
                    rowIndexes = this._getOrderedIndexes(rowIndexes);
                }

                let results = [];

                if (rowIndexes) {
                    for (const rowIndex of rowIndexes) {
                        results.push(this._data[rowIndex]);
                    }
                } else {
                    results = this._data.slice(this._offset, this._offset + this._limit);
                }

                this._renderResults({ filtered, results, total, rowIndexes });
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

                dom.show(this._loader);
                const request = this._getResults(options);

                request.then(response => {
                    this._renderResults(response);
                }).catch(_ => {
                    // error
                }).finally(_ => {
                    dom.hide(this._loader);

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

        _render() {
            this._tfoot = dom.findOne('tfoot', this._node);
            dom.detach(this._tfoot);

            dom.empty(this._node);

            this._container = dom.create('div', {
                class: 'position-relative mb-2'
            });
            dom.before(this._node, this._container);

            this._loader = dom.create('div', {
                class: 'position-absolute top-50 start-50 translate-middle'
            });

            const loaderIcon = dom.create('span', {
                class: 'spinner-border text-primary'
            });
            dom.append(this._loader, loaderIcon);

            const preRow = dom.create('div', {
                class: 'd-sm-flex justify-content-between mb-2'
            });

            this._preCol1 = dom.create('div');
            dom.append(preRow, this._preCol1);

            this._preCol2 = dom.create('div');
            dom.append(preRow, this._preCol2);

            this._thead = dom.create('thead');
            dom.append(this._node, this._thead);

            this._tbody = dom.create('tbody');
            dom.append(this._node, this._tbody);

            dom.append(this._node, this._tfoot);

            const postRow = dom.create('div', {
                class: 'd-sm-flex justify-content-between'
            });

            this._postCol1 = dom.create('div');
            dom.append(postRow, this._postCol1);

            this._postCol2 = dom.create('div');
            dom.append(postRow, this._postCol2);

            const pageContainer = dom.create('div', {
                class: 'd-flex'
            });
            dom.append(this._postCol2, pageContainer);

            this._pagination = dom.create('div', {
                class: 'pagination pagination-sm mx-auto me-sm-0'
            });
            dom.append(pageContainer, this._pagination);

            if (this._settings.searching) {
                this._renderSearch();
            }

            if (this._settings.lengthChange) {
                this._renderLengthSelect();
            }

            dom.hide(this._loader);
            dom.append(this._container, this._loader);
            dom.append(this._container, preRow);
            dom.append(this._container, this._node);
            dom.append(this._container, postRow);
        },

        _renderHeadings() {
            dom.empty(this._thead);

            const row = dom.create('tr');

            for (const [index, heading] of this._headings.entries()) {
                if (!this._columns[index].visible) {
                    continue;
                }

                const cell = dom.create('th', {
                    class: 'table-heading',
                    html: heading
                });
                dom.append(row, cell);

                if (!this._settings.ordering || !this._columns[index].orderable) {
                    continue;
                }

                let sortClass = 'table-sort';
                for (const order of this._order) {
                    if (order[0] != index) {
                        continue;
                    }

                    if (order[1] == 'asc') {
                        sortClass += ' table-sort-asc';
                    } else {
                        sortClass += ' table-sort-desc';
                    }
                }

                dom.addClass(cell, sortClass);
            }

            dom.append(this._thead, row);
        },

        _renderInfo(data) {
            dom.empty(this._postCol1);

            const container = dom.create('div', {
                class: 'text-center text-sm-start mb-1 mb-sm-0'
            });

            const start = this._offset + 1;
            const end = this._offset + data.results.length;
            let infoText = `Showing results ${start} to ${end} of ${data.filtered}.`;

            if (this._settings.infoCallback) {
                infoText = this._settings.infoCallback(start, end, data.total, data.filtered, text);
            }

            const text = dom.create('small', {
                text: infoText
            });
            dom.append(container, text);

            dom.append(this._postCol1, container);
        },

        _renderLengthSelect() {
            const container = dom.create('div', {
                class: 'd-flex justify-content-center justify-content-sm-start'
            });

            const label = dom.create('label', {
                class: 'mb-1 mb-sm-0'
            });
            dom.append(container, label);

            const labelPre = dom.create('small', {
                class: 'me-1',
                text: 'Show'
            });
            dom.append(label, labelPre);

            const inputContainer = dom.create('div', {
                class: 'form-input d-inline-block',
                style: {
                    width: 'initial'
                }
            });
            dom.append(label, inputContainer);

            this._lengthSelect = dom.create('select', {
                class: 'input-filled input-sm'
            });
            dom.append(inputContainer, this._lengthSelect);

            // render options
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

            const ripple = dom.create('div', {
                class: 'ripple-line'
            });
            dom.append(inputContainer, ripple);

            const labelPost = dom.create('small', {
                class: 'ms-1',
                text: 'results'
            });
            dom.append(label, labelPost);

            dom.append(this._preCol1, container);
        },

        _renderPageItem(options) {
            const container = dom.create('div', {
                class: 'page-item'
            });

            const link = dom.create('button', {
                class: 'page-link ripple',
                attributes: {
                    type: 'button'
                }
            });
            dom.append(container, link);

            if (options.disabled) {
                dom.addClass(container, 'disabled');
                dom.setAttribute(link, 'aria-disabled', 'true');
                dom.setAttribute(link, 'tabindex', '-1');
            }

            if (options.active) {
                dom.addClass(container, 'active');
            }

            if (options.icon) {
                const icon = dom.create('span', {
                    class: options.icon
                });
                dom.append(link, icon);
            } else {
                dom.setText(link, options.page);
            }

            if (options.page) {
                dom.setDataset(link, 'page', options.page);
            }

            return container;
        },

        _renderPagination(data) {
            const totalPages = Math.ceil(data.filtered / this._limit);
            const page = 1 + (this._offset / this._limit);

            dom.empty(this._pagination);

            const prev = this._renderPageItem({
                icon: 'icon-arrow-left',
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
                icon: 'icon-arrow-right',
                disabled: page == totalPages,
                page: page < totalPages ?
                    page + 1 :
                    null
            });
            dom.append(this._pagination, next);
        },

        _renderResults(data) {
            dom.empty(this._tbody);

            this._renderHeadings();

            if (this._settings.headerCallback) {
                this._settings.headerCallback(this._head, this._data || data.results, this._offset, this._offset + this._limit, data.rowIndexes);
            }

            if (this._settings.paging) {
                this._renderPagination(data);
            }

            if (this._settings.info) {
                this._renderInfo(data);
            }

            if (!data.results.length) {
                const row = dom.create('tr');

                const cell = dom.create('td', {
                    class: 'text-center',
                    html: this._term ?
                        'No results to show.' :
                        'No data to display.',
                    attributes: {
                        colspan: this._columnCount
                    }
                });
                dom.append(row, cell);

                dom.append(this._tbody, row);
            } else {
                for (const [index, result] of data.results.entries()) {
                    const row = this._renderRow(result);

                    if (this._settings.rowCallback) {
                        this._settings.rowCallback(row, result, index, this._offset + index);
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
                this._settings.footerCallback(this._tfoot, this._data || data.results, this._offset, this._offset + this._limit, data.rowIndexes);
            }
        },

        _renderRow(data) {
            const row = dom.create('tr');

            for (const [index, column] of this._columns.entries()) {
                if (!column.visible) {
                    continue;
                }

                const key = column.key || index;
                const value = data[key];

                const cell = dom.create('td', {
                    html: value
                });
                dom.append(row, cell);
            }

            return row;
        },

        _renderSearch() {
            const container = dom.create('div', {
                class: 'form-input mx-auto me-sm-0',
                style: {
                    width: '200px'
                }
            });

            this._searchInput = dom.create('input', {
                class: 'input-filled input-sm',
                attributes: {
                    type: 'text',
                    placeholder: 'Search'
                }
            });
            dom.append(container, this._searchInput);

            const ripple = dom.create('div', {
                class: 'ripple-line'
            });
            dom.append(container, ripple);

            dom.append(this._preCol2, container);
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

            return dom.children(row, 'th').map(cell => dom.getHTML(cell));
        }

    });


    Table.defaults = {
        info: true,
        lengthChange: true,
        ordering: true,
        paging: true,
        searching: true,
        length: 10,
        lengths: [10, 25, 50, 100],
        order: [[0, 'asc']],
        columns: null,
        createdRow: null,
        drawCallback: null,
        footerCallback: null,
        headerCallback: null,
        infoCallback: null,
        preDrawCallback: null,
        rowCallback: null
    };

    UI.initComponent('table', Table);

    UI.Table = Table;

});