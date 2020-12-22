/**
 * Table Render
 */

Object.assign(Table.prototype, {

    _render() {
        this._tfoot = dom.findOne('tfoot', this._node);
        dom.detach(this._tfoot);

        dom.empty(this._node);

        this._container = dom.create('div', {
            class: 'position-relative mb-2'
        });
        dom.before(this._node, this._container);

        this._loader = dom.create('div', {
            class: 'position-absolute top-50 start-50 translate-middle'
        });

        const loaderIcon = dom.create('span', {
            class: 'spinner-border text-primary'
        });
        dom.append(this._loader, loaderIcon);

        const preRow = dom.create('div', {
            class: 'd-sm-flex justify-content-between mb-2'
        });

        this._preCol1 = dom.create('div');
        dom.append(preRow, this._preCol1);

        this._preCol2 = dom.create('div');
        dom.append(preRow, this._preCol2);

        this._thead = dom.create('thead');
        dom.append(this._node, this._thead);

        this._tbody = dom.create('tbody');
        dom.append(this._node, this._tbody);

        dom.append(this._node, this._tfoot);

        const postRow = dom.create('div', {
            class: 'd-sm-flex justify-content-between'
        });

        this._postCol1 = dom.create('div');
        dom.append(postRow, this._postCol1);

        this._postCol2 = dom.create('div');
        dom.append(postRow, this._postCol2);

        const pageContainer = dom.create('div', {
            class: 'd-flex'
        });
        dom.append(this._postCol2, pageContainer);

        this._pagination = dom.create('div', {
            class: 'pagination pagination-sm mx-auto me-sm-0'
        });
        dom.append(pageContainer, this._pagination);

        if (this._settings.searching) {
            this._renderSearch();
        }

        if (this._settings.lengthChange) {
            this._renderLengthSelect();
        }

        dom.hide(this._loader);
        dom.append(this._container, this._loader);
        dom.append(this._container, preRow);
        dom.append(this._container, this._node);
        dom.append(this._container, postRow);
    },

    _renderHeadings() {
        dom.empty(this._thead);

        const row = dom.create('tr');

        for (const [index, heading] of this._headings.entries()) {
            if (!this._columns[index].visible) {
                continue;
            }

            const cell = dom.create('th', {
                class: 'table-heading',
                html: heading
            });
            dom.append(row, cell);

            if (!this._settings.ordering || !this._columns[index].orderable) {
                continue;
            }

            let sortClass = 'table-sort';
            for (const order of this._order) {
                if (order[0] != index) {
                    continue;
                }

                if (order[1] == 'asc') {
                    sortClass += ' table-sort-asc';
                } else {
                    sortClass += ' table-sort-desc';
                }
            }

            dom.addClass(cell, sortClass);
        }

        dom.append(this._thead, row);
    },

    _renderInfo(data) {
        dom.empty(this._postCol1);

        const container = dom.create('div', {
            class: 'text-center text-sm-start mb-1 mb-sm-0'
        });

        const start = this._offset + 1;
        const end = this._offset + data.results.length;
        let infoText = `Showing results ${start} to ${end} of ${data.filtered}.`;

        if (this._settings.infoCallback) {
            infoText = this._settings.infoCallback(start, end, data.total, data.filtered, text);
        }

        const text = dom.create('small', {
            text: infoText
        });
        dom.append(container, text);

        dom.append(this._postCol1, container);
    },

    _renderLengthSelect() {
        const container = dom.create('div', {
            class: 'd-flex justify-content-center justify-content-sm-start'
        });

        const label = dom.create('label', {
            class: 'mb-1 mb-sm-0'
        });
        dom.append(container, label);

        const labelPre = dom.create('small', {
            class: 'me-1',
            text: 'Show'
        });
        dom.append(label, labelPre);

        const inputContainer = dom.create('div', {
            class: 'form-input d-inline-block',
            style: {
                width: 'initial'
            }
        });
        dom.append(label, inputContainer);

        this._lengthSelect = dom.create('select', {
            class: 'input-filled input-sm'
        });
        dom.append(inputContainer, this._lengthSelect);

        // render options
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

        const ripple = dom.create('div', {
            class: 'ripple-line'
        });
        dom.append(inputContainer, ripple);

        const labelPost = dom.create('small', {
            class: 'ms-1',
            text: 'results'
        });
        dom.append(label, labelPost);

        dom.append(this._preCol1, container);
    },

    _renderPageItem(options) {
        const container = dom.create('div', {
            class: 'page-item'
        });

        const link = dom.create('button', {
            class: 'page-link ripple',
            attributes: {
                type: 'button'
            }
        });
        dom.append(container, link);

        if (options.disabled) {
            dom.addClass(container, 'disabled');
            dom.setAttribute(link, 'aria-disabled', 'true');
            dom.setAttribute(link, 'tabindex', '-1');
        }

        if (options.active) {
            dom.addClass(container, 'active');
        }

        if (options.icon) {
            const icon = dom.create('span', {
                class: options.icon
            });
            dom.append(link, icon);
        } else {
            dom.setText(link, options.page);
        }

        if (options.page) {
            dom.setDataset(link, 'page', options.page);
        }

        return container;
    },

    _renderPagination(data) {
        const totalPages = Math.ceil(data.filtered / this._limit);
        const page = 1 + (this._offset / this._limit);

        dom.empty(this._pagination);

        const prev = this._renderPageItem({
            icon: 'icon-arrow-left',
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
            icon: 'icon-arrow-right',
            disabled: page == totalPages,
            page: page < totalPages ?
                page + 1 :
                null
        });
        dom.append(this._pagination, next);
    },

    _renderResults(data) {
        dom.empty(this._tbody);

        this._renderHeadings();

        if (this._settings.headerCallback) {
            this._settings.headerCallback(this._head, this._data || data.results, this._offset, this._offset + this._limit, data.rowIndexes);
        }

        if (this._settings.paging) {
            this._renderPagination(data);
        }

        if (this._settings.info) {
            this._renderInfo(data);
        }

        if (!data.results.length) {
            const row = dom.create('tr');

            const cell = dom.create('td', {
                class: 'text-center',
                html: this._term ?
                    'No results to show.' :
                    'No data to display.',
                attributes: {
                    colspan: this._columnCount
                }
            });
            dom.append(row, cell);

            dom.append(this._tbody, row);
        } else {
            for (const [index, result] of data.results.entries()) {
                const row = this._renderRow(result);

                if (this._settings.rowCallback) {
                    this._settings.rowCallback(row, result, index, this._offset + index);
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
            this._settings.footerCallback(this._tfoot, this._data || data.results, this._offset, this._offset + this._limit, data.rowIndexes);
        }
    },

    _renderRow(data) {
        const row = dom.create('tr');

        for (const [index, column] of this._columns.entries()) {
            if (!column.visible) {
                continue;
            }

            const key = column.key || index;
            const value = data[key];

            const cell = dom.create('td', {
                html: value
            });
            dom.append(row, cell);
        }

        return row;
    },

    _renderSearch() {
        const container = dom.create('div', {
            class: 'form-input mx-auto me-sm-0',
            style: {
                width: '200px'
            }
        });

        this._searchInput = dom.create('input', {
            class: 'input-filled input-sm',
            attributes: {
                type: 'text',
                placeholder: 'Search'
            }
        });
        dom.append(container, this._searchInput);

        const ripple = dom.create('div', {
            class: 'ripple-line'
        });
        dom.append(container, ripple);

        dom.append(this._preCol2, container);
    }

});
