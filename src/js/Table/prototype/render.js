/**
 * Table Render
 */

Object.assign(Table.prototype, {

    /**
     * Render the Table.
     */
    _render() {
        this._original = dom.clone(this._node);
        dom.empty(this._node);

        this._container = dom.create('div', {
            class: this.constructor.classes.container
        });

        this._loader = dom.create('div', {
            class: this.constructor.classes.loader
        });

        const loaderIcon = dom.create('span', {
            class: this.constructor.classes.loaderIcon
        });
        dom.append(this._loader, loaderIcon);

        dom.addClass(this._node, this.constructor.classes.table);

        this._thead = dom.create('thead');
        dom.append(this._node, this._thead);

        this._tbody = dom.create('tbody');
        dom.append(this._node, this._tbody);

        if (dom.findOne('tfoot', this._original)) {
            this._tfoot = dom.create('tfoot');
            dom.append(this._node, this._tfoot);
        }

        dom.hide(this._loader);
        dom.after(this._node, this._container);
        dom.append(this._container, this._loader);

        if (this._settings.layout.top) {
            this._renderLayoutRow(this._settings.layout.top, this.constructor.classes.topRow);
        }

        dom.append(this._container, this._node);

        if (this._settings.layout.bottom) {
            this._renderLayoutRow(this._settings.layout.bottom, this.constructor.classes.bottomRow);
        }
    },

    /**
     * Render the table buttons.
     * @param {HTMLElement} container The container to render in.
     */
    _renderButtons(container) {
        const btnGroup = dom.create('div', {
            class: this.constructor.classes.buttonGroup
        });

        for (const button of this._settings.buttons) {
            const btn = dom.create('button', {
                class: this.constructor.classes.button,
                text: !button.text && button.type in this._settings.lang.buttons ?
                    this._settings.lang.buttons[button.type] :
                    button.text
            });

            dom.addEvent(btn, 'click.ui.table', e => {
                e.preventDefault();

                if (button.callback) {
                    button.callback.bind(this)();
                } else if (button.type in this.constructor.buttons) {
                    this.constructor.buttons[button.type].bind(this)(button);
                }
            });

            dom.append(btnGroup, btn);
        }

        dom.append(container, btnGroup);
    },

    /**
     * Render the table headings.
     */
    _renderHeadings() {
        dom.empty(this._thead);

        const row = dom.create('tr');

        for (const [index, heading] of this._headings.entries()) {
            if (!this._columns[index].visible) {
                continue;
            }

            const cell = dom.create('th', {
                class: this.constructor.classes.tableHeading,
                html: heading.text
            });

            if (heading.class) {
                dom.addClass(cell, heading.class);
            }

            dom.append(row, cell);

            if (!this._settings.ordering || !this._columns[index].orderable) {
                continue;
            }

            const sortClasses = [this.constructor.classes.tableSort];
            let ariaLabel;

            for (const order of this._order) {
                if (order[0] != index) {
                    continue;
                }

                const text = dom.getText(cell);

                if (order[1] == 'asc') {
                    sortClasses.push(this.constructor.classes.tableSortAsc);
                    ariaLabel = `${text}${this._settings.lang.aria.sortDescending}`;
                } else {
                    sortClasses.push(this.constructor.classes.tableSortDesc);
                    ariaLabel = `${text}${this._settings.lang.aria.sortAscending}`;
                }
            }

            dom.addClass(cell, sortClasses);

            if (ariaLabel) {
                dom.setAttribute(cell, 'aria-label', ariaLabel);
            }
        }

        dom.append(this._thead, row);
    },

    /**
     * Render the table info.
     */
    _renderInfo() {
        dom.empty(this._infoContainer);

        const start = this._offset + 1;
        const end = this._offset + this._results.length;
        let infoText = this._filtered < this._total ?
            this._settings.lang.infoFiltered :
            this._settings.lang.info;

        const replacements = {
            start,
            end,
            filtered: this._filtered,
            total: this._total
        };

        for (const [key, value] of Object.entries(replacements)) {
            infoText = infoText.replace(`{${key}}`, value);
        }

        if (this._settings.infoCallback) {
            infoText = this._settings.infoCallback(start, end, this._total, this._filtered, text);
        }

        const text = dom.create('small', {
            text: infoText
        });
        dom.append(this._infoContainer, text);
    },

    /**
     * Render the table info container in a container.
     * @param {HTMLElement} container The container to render in.
     */
    _renderInfoContainer(container) {
        this._infoContainer = dom.create('div', {
            class: this.constructor.classes.infoContainer
        });

        dom.append(container, this._infoContainer);
    },

    /**
     * Render a layout row in a container.
     * @param {Array} columns The columns to render.
     * @param {string} rowClass The row class.
     */
    _renderLayoutRow(columns, rowClass) {
        const row = dom.create('div', {
            class: rowClass
        });

        for (const elements of columns.split(',')) {
            const column = dom.create('div', {
                class: this.constructor.classes.column
            });

            for (const element of elements.split('|')) {
                if (!(element in this.constructor.layout)) {
                    continue;
                }

                const container = dom.create('div', {
                    class: this.constructor.classes.columnContainer
                });

                this.constructor.layout[element].bind(this)(container);

                dom.append(column, container);
            }

            dom.append(row, column);
        }

        dom.append(this._container, row);
    },

    /**
     * Render the length select in a container.
     * @param {HTMLElement} container The container to render in.
     */
    _renderLengthSelect(container) {
        if (!this._settings.lengthChange || !this._settings.paging) {
            return;
        }

        const lengthContainer = dom.create('div', {
            class: this.constructor.classes.lengthContainer
        });

        const label = dom.create('label', {
            class: this.constructor.classes.lengthLabel
        });
        dom.append(lengthContainer, label);

        const labelText = dom.create('small', {
            class: this.constructor.classes.lengthLabelText,
            text: this._settings.lang.perPage
        });
        dom.append(label, labelText);

        const inputContainer = dom.create('div', {
            class: this.constructor.classes.lengthInputContainer,
            style: {
                width: 'initial'
            }
        });
        dom.append(label, inputContainer);

        this._lengthSelect = dom.create('select', {
            class: this._settings.inputStyle === 'filled' ?
                this.constructor.classes.lengthInputFilled :
                this.constructor.classes.lengthInputOutline
        });
        dom.append(inputContainer, this._lengthSelect);

        for (const length of this._settings.lengths) {
            const option = dom.create('option', {
                value: length,
                text: length
            });

            if (length == this._limit) {
                dom.setAttribute(option, 'checked', true);
            }

            dom.append(this._lengthSelect, option);
        }

        if (this._settings.inputStyle === 'filled') {
            const ripple = dom.create('div', {
                class: this.constructor.classes.lengthInputRipple
            });
            dom.append(inputContainer, ripple);
        }

        dom.append(container, lengthContainer);
    },

    /**
     * Render a pagination item.
     * @param {object} options Options for rendering the pagnination item.
     * @returns {HTMLElement} The pagnination item.
     */
    _renderPageItem(options) {
        const container = dom.create('div', {
            class: this.constructor.classes.pageItem
        });

        const link = dom.create('button', {
            html: options.icon || options.text || options.page,
            class: this.constructor.classes.pageLink,
            attributes: {
                type: 'button',
                title: options.text ?
                    `${options.text} ${this._settings.lang.page}` :
                    `${this._settings.lang.page} ${options.page}`
            }
        });
        dom.append(container, link);

        if (options.disabled) {
            dom.addClass(container, this.constructor.classes.pageDisabled);
            dom.setAttribute(link, 'aria-disabled', 'true');
            dom.setAttribute(link, 'tabindex', '-1');
        }

        if (options.active) {
            dom.addClass(container, this.constructor.classes.pageActive);
        }

        if (options.page) {
            dom.setDataset(link, 'uiPage', options.page);
        }

        return container;
    },

    /**
     * Render the pagination.
     */
    _renderPagination() {
        const totalPages = Math.ceil(this._filtered / this._limit) || 1;
        const page = 1 + (this._offset / this._limit);

        dom.empty(this._pagination);

        const first = this._renderPageItem({
            text: this._settings.lang.paginate.first,
            icon: this._settings.icons.first,
            disabled: page == 1,
            page: 1
        });
        dom.append(this._pagination, first);

        const prev = this._renderPageItem({
            text: this._settings.lang.paginate.previous,
            icon: this._settings.icons.previous,
            disabled: page == 1,
            page: page > 1 ?
                page - 1 :
                null
        });
        dom.append(this._pagination, prev);

        let startPage = Math.max(page - 5, 1);
        let endPage = Math.min(page + 5, totalPages);

        while (endPage - startPage > 4) {
            if (page - startPage > endPage - page) {
                startPage++;
            } else {
                endPage--;
            }
        }

        for (let current = startPage; current <= endPage; current++) {
            const pageItem = this._renderPageItem({
                page: current,
                active: current == page
            });
            dom.append(this._pagination, pageItem);
        }

        const next = this._renderPageItem({
            text: this._settings.lang.paginate.next,
            icon: this._settings.icons.next,
            disabled: page == totalPages,
            page: page < totalPages ?
                page + 1 :
                null
        });
        dom.append(this._pagination, next);

        const last = this._renderPageItem({
            text: this._settings.lang.paginate.last,
            icon: this._settings.icons.last,
            disabled: page == totalPages,
            page: totalPages
        });
        dom.append(this._pagination, last);
    },

    /**
     * Render the pagination container in a container.
     * @param {HTMLElement} container The container to render in.
     */
    _renderPaginationContainer(container) {
        const paginationContainer = dom.create('div', {
            class: this.constructor.classes.paginationContainer
        });
        dom.append(container, paginationContainer);

        this._pagination = dom.create('div', {
            class: this.constructor.classes.pagination
        });
        dom.append(paginationContainer, this._pagination);
    },

    /**
     * Render the table results.
     */
    _renderResults() {
        dom.triggerEvent(this._node, 'preDraw.ui.table');

        dom.empty(this._tbody);

        this._renderHeadings();

        if (this._settings.headerCallback) {
            this._settings.headerCallback(this._head, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
        }

        if (this._settings.paging) {
            this._renderPagination();
        }

        if (this._settings.info) {
            this._renderInfo();
        }

        if (!this._results.length) {
            const row = dom.create('tr');

            const cell = dom.create('td', {
                class: this.constructor.classes.emptyCell,
                html: this._term ?
                    this._settings.lang.noResults :
                    this._settings.lang.noData,
                attributes: {
                    colspan: this._columnCount
                }
            });
            dom.append(row, cell);

            dom.append(this._tbody, row);
        } else {
            for (const [index, result] of this._results.entries()) {
                const row = this._renderRow(result, index);

                if (this._settings.rowCallback) {
                    this._settings.rowCallback(row, result, index, this._offset + index, this._rowIndexes[index]);
                }

                dom.append(this._tbody, row);

                if (this._settings.createdRow) {
                    this._settings.createdRow(row, result, index);
                }
            }
        }

        if (this._settings.drawCallback) {
            this._settings.drawCallback();
        }

        if (this._tfoot && this._settings.footerCallback) {
            this._settings.footerCallback(this._tfoot, this._data, this._offset, this._offset + this._limit, this._rowIndexes);
        }

        dom.triggerEvent(this._node, 'draw.ui.table');
    },

    /**
     * Render a result row.
     * @param {Array|object} data The row data.
     * @param {number} rowIndex The row index.
     * @returns {HTMLElement} The table row.
     */
    _renderRow(data, rowIndex) {
        const row = dom.create('tr');

        for (const [index, column] of this._columns.entries()) {
            if (!column.visible) {
                continue;
            }

            const value = Core.getDot(data, `${column.data}`);

            const cell = dom.create('td', {
                html: column.format ?
                    column.format(value) :
                    value
            });

            if (column.class) {
                dom.addClass(column.class);
            }

            if (column.createdCell) {
                column.createdCell(cell, value, data, rowIndex, index);
            }

            dom.append(row, cell);
        }

        return row;
    },

    /**
     * Render the search in a container.
     * @param {HTMLElement} container The container to render in.
     */
    _renderSearch(container) {
        if (!this._settings.searching) {
            return;
        }

        const searchContainer = dom.create('div', {
            class: this.constructor.classes.searchContainer
        });

        const inputContainer = dom.create('div', {
            class: this.constructor.classes.searchInputContainer,
            style: {
                width: '200px'
            }
        });
        dom.append(searchContainer, inputContainer);

        this._searchInput = dom.create('input', {
            class: this._settings.inputStyle === 'filled' ?
                this.constructor.classes.searchInputFilled :
                this.constructor.classes.searchInputOutline,
            attributes: {
                type: 'text',
                placeholder: this._settings.lang.search
            }
        });
        dom.append(inputContainer, this._searchInput);

        if (this._settings.inputStyle === 'filled') {
            const ripple = dom.create('div', {
                class: this.constructor.classes.searchInputRipple
            });
            dom.append(inputContainer, ripple);
        }

        dom.append(container, searchContainer);
    }

});
