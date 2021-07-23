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
