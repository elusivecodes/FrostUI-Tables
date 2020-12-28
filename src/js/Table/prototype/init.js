/**
 * Table Init
 */

Object.assign(Table.prototype, {

    /**
     * Initialize preloaded get data.
     */
    _getDataInit() {
        this._total = this._data.length;

        this._getData = _ => {
            this.loading();

            this._rowIndexes = null;

            if (this._term) {
                this._rowIndexes = [];

                const escapedFilter = Core.escapeRegExp(this._term);
                const regExp = new RegExp(escapedFilter, 'i');

                const normalized = this._term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const escapedNormal = Core.escapeRegExp(normalized);
                const regExpNormal = new RegExp(escapedNormal, 'i');

                // filter results
                for (const [index, result] of this._data.entries()) {
                    for (const column of this._columns) {
                        if (!column.searchable) {
                            continue;
                        }

                        if (regExp.test(result[column.key]) || regExpNormal.test(result[column.key])) {
                            this._rowIndexes.push(index);
                        }
                    }
                }

                this._filtered = this._rowIndexes.length;
            } else {
                this._filtered = this._total;
            }

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
