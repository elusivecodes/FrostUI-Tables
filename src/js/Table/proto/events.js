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
