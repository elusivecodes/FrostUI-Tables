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
        const handleSort = (e) => {
            const index = $.index(e.currentTarget);

            if (!this._columns[index].orderable) {
                return;
            }

            e.preventDefault();

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
        };

        $.addEventDelegate(this._theadRow, 'click.ui.table', 'th', handleSort);

        $.addEventDelegate(this._theadRow, 'keydown.ui.table', 'th', (e) => {
            switch (e.code) {
                case 'Enter':
                case 'NumpadEnter':
                case 'Space':
                    handleSort(e);
                    break;
            }
        });
    }

    if (this._options.paging) {
        $.addEventDelegate(this._pagination, 'click.ui.table', '[data-ui-page]', (e) => {
            e.preventDefault();

            let page = $.getDataset(e.currentTarget, 'uiPage');

            switch (page) {
                case 'first':
                    page = 1;
                    break;
                case 'prev':
                    page = this._page - 1;
                    break;
                case 'next':
                    page = this._page + 1;
                    break;
                case 'last':
                    page = this._totalPages;
                    break;
            }

            this.page(page);
        });
    }
};
