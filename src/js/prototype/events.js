import $ from '@fr0st/query';

/**
 * Attach events for the Table.
 */
export function _events() {
    if (this._options.lengthChange) {
        $.addEvent(this._lengthSelect, 'change.ui.table', (_) => {
            const length = $.getValue(this._lengthSelect);
            this.length(length);
        });
    }

    if (this._options.searching) {
        $.addEvent(this._searchInput, 'input.ui.table', $._debounce((_) => {
            const term = $.getValue(this._searchInput);
            this.search(term);
        }));
    }

    if (this._options.ordering) {
        $.addEventDelegate(this._thead, 'click.ui.table', 'th', (e) => {
            e.preventDefault();

            const index = $.index(e.currentTarget);

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

    if (this._options.paging) {
        $.addEventDelegate(this._pagination, 'click.ui.table', '[data-ui-page]', (e) => {
            e.preventDefault();

            const page = $.getDataset(e.currentTarget, 'uiPage');
            this.page(page);
        });
    }
};
