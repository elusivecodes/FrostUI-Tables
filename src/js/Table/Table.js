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
            ...column
        }));

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
