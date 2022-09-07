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
        this._results = [];
        this._filtered = 0;
        this._total = 0;

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
            createdCell: null,
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
