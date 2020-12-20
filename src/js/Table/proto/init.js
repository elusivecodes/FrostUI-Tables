/**
 * Table Init
 */

Object.assign(Table.prototype, {

    /**
     * Initialize preloaded get data.
     */
    _getDataInit() {
        this._getData = _ => {

            let results = this._data;

            if (this._filter) {
                const escapedFilter = Core.escapeRegExp(this._filter);
                const regExp = new RegExp(escapedFilter, 'i');

                const normalized = this._filter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const escapedNormal = Core.escapeRegExp(normalized);
                const regExpNormal = new RegExp(escapedNormal, 'i');

                // filter results
                results = results.filter(item => {
                    for (const [index, column] of this._columns.entries()) {
                        if (!column.searchable) {
                            continue;
                        }

                        if (regExp.test(item[index]) || regExpNormal.test(item[index])) {
                            return true;
                        }
                    }

                    return false;
                });
            }

            // order
            results = results.sort((a, b) => {
                for (const [index, direction] of this._order) {
                    const aLower = a[index].toLowerCase();
                    const bLower = b[index].toLowerCase();
                    const diff = aLower.localeCompare(bLower);

                    if (!diff) {
                        continue;
                    }

                    if (direction.toLowerCase() === 'desc') {
                        diff *= -1;
                    }

                    return diff;
                }

                return 0;
            });

            this._renderResults({
                filtered: results.length,
                results: results.slice(this._offset, this._offset + this._limit),
                total: this._data.length
            });
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

            // render loading
            const request = this._getResults({
                filter: this._filter,
                offset: this._offset,
                limit: this._limit,
                order: this._order
            });

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
