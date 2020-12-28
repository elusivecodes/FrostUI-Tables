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
