import $ from '@fr0st/query';

/**
 * Initialize preloaded get data.
 */
export function _getDataInit() {
    this._total = this._data.length;
    this._filtered = this._total;

    this._getData = (_) => {
        this.loading();

        this._rowIndexes = this._filterIndexes;

        // order
        if (this._options.ordering) {
            const order = this._getOrder();
            this._rowIndexes = this._getOrderedIndexes(order, this._rowIndexes);
        }

        if (!this._rowIndexes) {
            this._rowIndexes = $._range(this._offset, this._offset + this._limit);
        }

        this.loading({ show: false });
        this._refreshResults();
        this._renderResults();
    };
};

/**
 * Initialize get data from callback.
 */
export function _getResultsInit() {
    const load = $._debounce(() => {
        const options = {};

        if (this._term) {
            options.term = this._term;
        }

        if (this._options.ordering) {
            options.order = {
                ...this._order.map(([column, dir]) => ({ column, dir })),
            };
        }

        if (this._options.paging) {
            options.offset = this._offset;
            options.limit = this._limit;
        }

        options.columns = {
            ...this._columns.map((column) => {
                const data = {};

                if (column.name) {
                    data.name = column.name;
                }

                return {
                    ...data,
                    data: column.data,
                    orderable: column.orderable,
                    searchable: column.searchable,
                };
            }),
        };

        const request = Promise.resolve(this._options.getResults(options));

        request.then((response) => {
            if (this._request !== request) {
                return;
            }

            this._total = response.total;
            this._filtered = response.filtered;
            this._data = response.results;

            this._refreshResults();
            this._rowIndexes = $._range(0, this._results.length - 1);

            this.loading({ show: false });
            this._renderResults();

            this._request = null;
        }).catch((_) => {
            if (this._request !== request) {
                return;
            }

            this.loading({ show: false });

            this._request = null;
        });

        this._request = request;
    }, this._options.debounce);

    this._getData = (_) => {
        // cancel last request
        if (this._request && this._request.cancel) {
            this._request.cancel();
        }

        this._request = null;

        this.loading();

        load();
    };
};
