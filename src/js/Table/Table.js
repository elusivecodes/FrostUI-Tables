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

        // this._render();
        // this._events();
    }

    /**
     * Destroy the Table.
     */
    destroy() {
        super.destroy();
    }

}
