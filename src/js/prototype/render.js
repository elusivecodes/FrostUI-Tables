import $ from '@fr0st/query';
import { generateId } from '@fr0st/ui';

/**
 * Render the Table.
 */
export function _render() {
    this._original = $.clone(this._node);
    $.empty(this._node);

    this._container = $.create('div', {
        class: this.constructor.classes.container,
    });

    this._loader = $.create('div', {
        class: this.constructor.classes.loader,
    });

    const loaderIcon = $.create('span', {
        class: this.constructor.classes.loaderIcon,
    });
    $.append(this._loader, loaderIcon);

    $.addClass(this._node, this.constructor.classes.table);

    const thead = $.create('thead');
    $.append(this._node, thead);

    this._theadRow = $.create('tr');
    $.append(thead, this._theadRow);

    this._tbody = $.create('tbody');
    $.append(this._node, this._tbody);

    const tfoot = $.findOne('tfoot', this._original);
    if (tfoot) {
        this._tfoot = $.clone(tfoot);
        $.append(this._node, this._tfoot);
    }

    $.hide(this._loader);
    $.after(this._node, this._container);
    $.append(this._container, this._loader);

    if (this._options.layout.top) {
        this._renderLayoutRow(this._options.layout.top, this.constructor.classes.topRow);
    }

    const tableContainer = $.create('div', {
        class: this.constructor.classes.tableContainer,
    });

    $.append(tableContainer, this._node);
    $.append(this._container, tableContainer);

    if (this._options.layout.bottom) {
        this._renderLayoutRow(this._options.layout.bottom, this.constructor.classes.bottomRow);
    }
    if (this._infoContainer) {
        $.setAttribute(this._node, {
            'aria-describedby': $.getAttribute(this._infoContainer, 'id'),
        });
    }
};

/**
 * Render the table buttons.
 * @param {HTMLElement} container The container to render in.
 */
export function _renderButtons(container) {
    const btnGroup = $.create('div', {
        class: this.constructor.classes.buttonGroup,
    });

    for (const button of this._options.buttons) {
        const btn = $.create('button', {
            class: this.constructor.classes.button,
            text: !button.text && button.type in this._options.lang.buttons ?
                this._options.lang.buttons[button.type] :
                button.text,
            attributes: {
                'type': 'button',
                'aria-controls': $.getAttribute(this._node, 'id'),
            },
        });

        $.addEvent(btn, 'click.ui.table', (e) => {
            e.preventDefault();

            if (button.callback) {
                button.callback.bind(this)();
            } else if (button.type in this.constructor.buttons) {
                this.constructor.buttons[button.type].bind(this)(button);
            }
        });

        $.append(btnGroup, btn);
    }

    $.append(container, btnGroup);
};

/**
 * Render the table headings.
 */
export function _renderHeadings() {
    const children = $.children(this._theadRow);

    const headings = {};

    for (const child of children) {
        const index = $.getDataset(child, 'uiIndex');

        if (!this._columns[index].visible) {
            $.detach(child);
        } else {
            headings[index] = child;
        }
    }

    let lastCell;
    for (const [index, heading] of this._headings.entries()) {
        if (!this._columns[index].visible) {
            continue;
        }

        let cell;
        if (index in headings) {
            cell = headings[index];
        } else {
            cell = $.create('th', {
                class: this.constructor.classes.tableHeading,
                html: heading.text,
                dataset: {
                    uiIndex: index,
                },
            });

            if (heading.class) {
                $.addClass(cell, heading.class);
            }

            if (this._options.ordering && this._columns[index].orderable) {
                $.addClass(cell, this.constructor.classes.tableSort);
                $.setAttribute(cell, {
                    'tabindex': 0,
                    'aria-controls': $.getAttribute(this._node, 'id'),
                });
            }

            if (!lastCell) {
                $.append(this._theadRow, cell);
            } else {
                $.insertAfter(cell, lastCell);
            }
        }

        lastCell = cell;

        if (!this._options.ordering || !this._columns[index].orderable) {
            continue;
        }

        let dir;
        for (const order of this._order) {
            if (order[0] != index) {
                continue;
            }

            dir = order[1];
            break;
        }

        switch (dir) {
            case 'asc':
                $.addClass(cell, this.constructor.classes.tableSortAsc);
                $.removeClass(cell, this.constructor.classes.tableSortDesc);
                $.setAttribute(cell, { 'aria-sort': 'ascending' });
                break;
            case 'desc':
                $.addClass(cell, this.constructor.classes.tableSortDesc);
                $.removeClass(cell, this.constructor.classes.tableSortAsc);
                $.setAttribute(cell, { 'aria-sort': 'descending' });
                break;
            default:
                $.removeClass(cell, [
                    this.constructor.classes.tableSortAsc,
                    this.constructor.classes.tableSortDesc,
                ]);
                $.removeAttribute(cell, 'aria-sort');
                break;
        }

        const text = $.getText(cell);

        if (dir === 'asc' || (!dir && this._columns[index].dir === 'desc')) {
            $.setAttribute(cell, { 'aria-label': `${text}${this._options.lang.aria.sortDescending}` });
        } else {
            $.setAttribute(cell, { 'aria-label': `${text}${this._options.lang.aria.sortAscending}` });
        }
    }
};

/**
 * Render the table info.
 */
export function _renderInfo() {
    $.empty(this._infoContainer);

    const start = this._offset + 1;
    const end = this._offset + this._results.length;
    let infoText = this._filtered < this._total ?
        this._options.lang.infoFiltered :
        this._options.lang.info;

    const replacements = {
        start,
        end,
        filtered: this._filtered,
        total: this._total,
    };

    for (const [key, value] of Object.entries(replacements)) {
        infoText = infoText.replace(`{${key}}`, value);
    }

    if (this._options.infoCallback) {
        infoText = this._options.infoCallback(start, end, this._total, this._filtered, text);
    }

    const text = $.create('small', {
        text: infoText,
    });
    $.append(this._infoContainer, text);
};

/**
 * Render the table info container in a container.
 * @param {HTMLElement} container The container to render in.
 */
export function _renderInfoContainer(container) {
    const id = generateId('table-info');

    this._infoContainer = $.create('div', {
        class: this.constructor.classes.infoContainer,
        attributes: {
            id,
            'role': 'status',
            'aria-live': 'polite',
        },
    });

    $.append(container, this._infoContainer);
};

/**
 * Render a layout row in a container.
 * @param {Array} columns The columns to render.
 * @param {string} rowClass The row class.
 */
export function _renderLayoutRow(columns, rowClass) {
    const row = $.create('div', {
        class: rowClass,
    });

    for (const elements of columns.split(',')) {
        const column = $.create('div', {
            class: this.constructor.classes.column,
        });

        for (const element of elements.split('|')) {
            if (!(element in this.constructor.layout)) {
                continue;
            }

            const container = $.create('div', {
                class: this.constructor.classes.columnContainer,
            });

            this.constructor.layout[element].bind(this)(container);

            $.append(column, container);
        }

        $.append(row, column);
    }

    $.append(this._container, row);
};

/**
 * Render the length select in a container.
 * @param {HTMLElement} container The container to render in.
 */
export function _renderLengthSelect(container) {
    if (!this._options.lengthChange || !this._options.paging) {
        return;
    }

    const lengthContainer = $.create('div', {
        class: this.constructor.classes.lengthContainer,
    });

    const label = $.create('label', {
        class: this.constructor.classes.lengthLabel,
    });
    $.append(lengthContainer, label);

    const labelText = $.create('small', {
        class: this.constructor.classes.lengthLabelText,
        text: this._options.lang.perPage,
    });
    $.append(label, labelText);

    const inputContainer = $.create('div', {
        class: this.constructor.classes.lengthInputContainer,
        style: {
            width: 'initial',
        },
    });
    $.append(label, inputContainer);

    this._lengthSelect = $.create('select', {
        class: this._options.inputStyle === 'filled' ?
            this.constructor.classes.lengthInputFilled :
            this.constructor.classes.lengthInputOutline,
        attributes: {
            'aria-controls': $.getAttribute(this._node, 'id'),
        },
    });
    $.append(inputContainer, this._lengthSelect);

    for (const length of this._options.lengths) {
        const option = $.create('option', {
            value: length,
            text: length,
        });

        if (length == this._limit) {
            $.setAttribute(option, { checked: true });
        }

        $.append(this._lengthSelect, option);
    }

    if (this._options.inputStyle === 'filled') {
        const ripple = $.create('div', {
            class: this.constructor.classes.lengthInputRipple,
        });
        $.append(inputContainer, ripple);
    }

    $.append(container, lengthContainer);
};

/**
 * Render a pagination item.
 * @param {object} options Options for rendering the pagnination item.
 * @return {HTMLElement} The pagnination item.
 */
export function _renderPageItem(options) {
    const container = $.create('div', {
        class: this.constructor.classes.pageItem,
    });

    const link = $.create('button', {
        html: options.icon || options.text || options.page,
        class: this.constructor.classes.pageLink,
        attributes: {
            'type': 'button',
            'title': options.text ?
                `${options.text} ${this._options.lang.page}` :
                `${this._options.lang.page} ${options.page}`,
            'role': 'link',
            'aria-controls': $.getAttribute(this._node, 'id'),
        },
        dataset: {
            uiPage: options.page,
        },
    });
    $.append(container, link);

    return container;
};

/**
 * Render the pagination.
 */
export function _renderPagination() {
    const setDisabled = (container, disabled) => {
        const link = $.findOne(':scope > [data-ui-page]', container);

        if (disabled) {
            $.addClass(container, this.constructor.classes.pageDisabled);
            $.setAttribute(link, {
                'aria-disabled': true,
                'tabindex': -1,
            });
        } else {
            $.removeClass(container, this.constructor.classes.pageDisabled);
            $.removeAttribute(link, 'aria-disabled');
            $.removeAttribute(link, 'tabindex');
        }
    };

    const children = $.children(this._pagination);

    let firstPage;
    let prevPage;
    let nextPage;
    let lastPage;

    if (children.length) {
        firstPage = children.shift();
        prevPage = children.shift();
        lastPage = children.pop();
        nextPage = children.pop();
    } else {
        firstPage = this._renderPageItem({
            text: this._options.lang.paginate.first,
            icon: this._options.icons.first,
            page: 'first',
        });
        $.append(this._pagination, firstPage);

        prevPage = this._renderPageItem({
            text: this._options.lang.paginate.previous,
            icon: this._options.icons.previous,
            page: 'prev',
        });
        $.append(this._pagination, prevPage);

        nextPage = this._renderPageItem({
            text: this._options.lang.paginate.next,
            icon: this._options.icons.next,
            page: 'next',
        });
        $.append(this._pagination, nextPage);

        lastPage = this._renderPageItem({
            text: this._options.lang.paginate.last,
            icon: this._options.icons.last,
            page: 'last',
        });
        $.append(this._pagination, lastPage);
    }

    setDisabled(firstPage, this._page == 1);
    setDisabled(prevPage, this._page == 1);
    setDisabled(nextPage, this._page == this._totalPages);
    setDisabled(lastPage, this._page == this._totalPages);

    let startPage = Math.max(this._page - 5, 1);
    let endPage = Math.min(this._page + 5, this._totalPages);

    while (endPage - startPage > 4) {
        if (this._page - startPage > endPage - this._page) {
            startPage++;
        } else {
            endPage--;
        }
    }

    const pageLinks = {};

    for (const child of children) {
        const link = $.findOne(':scope > [data-ui-page]', child);
        const page = $.getDataset(link, 'uiPage');

        if (page < startPage || page > endPage) {
            $.detach(child);
        } else {
            pageLinks[page] = child;
        }
    }

    let lastLink = prevPage;
    for (let current = startPage; current <= endPage; current++) {
        let pageItem;
        if (current in pageLinks) {
            pageItem = pageLinks[current];
        } else {
            pageItem = this._renderPageItem({
                page: current,
            });
            $.insertAfter(pageItem, lastLink);
        }

        if (current == this._page) {
            $.addClass(pageItem, this.constructor.classes.pageActive);
        } else {
            $.removeClass(pageItem, this.constructor.classes.pageActive);
        }

        lastLink = pageItem;
    }
};

/**
 * Render the pagination container in a container.
 * @param {HTMLElement} container The container to render in.
 */
export function _renderPaginationContainer(container) {
    const paginationContainer = $.create('div', {
        class: this.constructor.classes.paginationContainer,
    });
    $.append(container, paginationContainer);

    this._pagination = $.create('div', {
        class: this.constructor.classes.pagination,
    });
    $.append(paginationContainer, this._pagination);
};

/**
 * Render the table results.
 */
export function _renderResults() {
    $.triggerEvent(this._node, 'preDraw.ui.table');

    $.empty(this._tbody);

    this._renderHeadings();

    if (this._options.headerCallback) {
        this._options.headerCallback(this._head, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
    }

    if (this._options.paging) {
        this._renderPagination();
    }

    if (this._options.info) {
        this._renderInfo();
    }

    if (!this._results.length) {
        const row = $.create('tr');

        const cell = $.create('td', {
            class: this.constructor.classes.emptyCell,
            html: this._term ?
                this._options.lang.noResults :
                this._options.lang.noData,
            attributes: {
                colspan: this._columnCount,
            },
        });
        $.append(row, cell);

        $.append(this._tbody, row);
    } else {
        for (const [index, result] of this._results.entries()) {
            const row = this._renderRow(result, index);

            if (this._options.rowCallback) {
                this._options.rowCallback(row, result, index, this._offset + index, this._rowIndexes[index]);
            }

            $.append(this._tbody, row);

            if (this._options.createdRow) {
                this._options.createdRow(row, result, index);
            }
        }
    }

    if (this._options.drawCallback) {
        this._options.drawCallback();
    }

    if (this._tfoot && this._options.footerCallback) {
        this._options.footerCallback(this._tfoot, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
    }

    $.triggerEvent(this._node, 'draw.ui.table');
};

/**
 * Render a result row.
 * @param {Array|object} data The row data.
 * @param {number} rowIndex The row index.
 * @return {HTMLElement} The table row.
 */
export function _renderRow(data, rowIndex) {
    const row = $.create('tr');

    for (const [index, column] of this._columns.entries()) {
        if (!column.visible) {
            continue;
        }

        const value = $._getDot(data, `${column.data}`);

        const cell = $.create('td', {
            html: column.format ?
                column.format(value) :
                value,
        });

        if (column.class) {
            $.addClass(column.class);
        }

        if (column.createdCell) {
            column.createdCell(cell, value, data, rowIndex, index);
        }

        $.append(row, cell);
    }

    return row;
};

/**
 * Render the search in a container.
 * @param {HTMLElement} container The container to render in.
 */
export function _renderSearch(container) {
    if (!this._options.searching) {
        return;
    }

    const searchContainer = $.create('div', {
        class: this.constructor.classes.searchContainer,
    });

    const inputContainer = $.create('div', {
        class: this.constructor.classes.searchInputContainer,
        style: {
            width: '200px',
        },
    });
    $.append(searchContainer, inputContainer);

    this._searchInput = $.create('input', {
        class: this._options.inputStyle === 'filled' ?
            this.constructor.classes.searchInputFilled :
            this.constructor.classes.searchInputOutline,
        attributes: {
            'type': 'search',
            'placeholder': this._options.lang.search,
            'aria-controls': $.getAttribute(this._node, 'id'),
        },
    });
    $.append(inputContainer, this._searchInput);

    if (this._options.inputStyle === 'filled') {
        const ripple = $.create('div', {
            class: this.constructor.classes.searchInputRipple,
        });
        $.append(inputContainer, ripple);
    }

    $.append(container, searchContainer);
};
