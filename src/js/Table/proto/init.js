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

            this._renderResults({ filtered, results, total });
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

            // render loading
            const request = this._getResults(options);

            request.then(response => {
                this._renderResults(response);
            }).catch(_ => {
                // error
            }).finally(_ => {
                // remove loading

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
