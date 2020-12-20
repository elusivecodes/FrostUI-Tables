/**
 * Table Render
 */

Object.assign(Table.prototype, {

    _render() {
        dom.empty(this._node);

        this._container = dom.create('div', {
            class: 'mb-1'
        });
        dom.before(this._node, this._container);

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

        const postRow = dom.create('div', {
            class: 'd-sm-flex justify-content-between'
        });

        this._postCol1 = dom.create('div');
        dom.append(postRow, this._postCol1);

        this._postCol2 = dom.create('div');
        dom.append(postRow, this._postCol2);

        this._renderSearch();
        this._renderLengthSelect();

        dom.append(this._container, preRow);
        dom.append(this._container, this._node);
        dom.append(this._container, postRow);
    },

    _renderHeadings() {
        dom.empty(this._thead);

        const row = dom.create('tr');

        for (const [index, heading] of this._headings.entries()) {
            const cell = dom.create('th');
            dom.append(row, cell);

            const container = dom.create('div', {
                class: 'd-flex justify-content-between'
            });
            dom.append(cell, container);

            const title = dom.create('div', {
                class: 'fw-bold',
                html: heading
            });
            dom.append(container, title);

            if (!this._columns[index].orderable) {
                continue;
            }

            dom.setStyle(cell, 'cursor', 'pointer');

            let icon = 'icon-sort';
            for (const order of this._order) {
                if (order[0] != index) {
                    continue;
                }

                if (order[1] == 'asc') {
                    icon = 'icon-sort-asc';
                } else {
                    icon = 'icon-sort-desc';
                }
            }

            const sort = dom.create('span', {
                class: `${icon} align-self-center`
            });
            dom.append(container, sort);
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
        const text = dom.create('small', {
            text: `Showing results ${start} to ${end} of ${data.filtered}.`
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

            if (length == this._length) {
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

        const link = dom.create('a', {
            class: 'page-link ripple'
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

        return container;
    },

    _renderPagination(data) {
        const totalPages = Math.ceil(data.filtered / this._limit);
        const page = 1 + (this._offset / this._limit);

        dom.empty(this._postCol2);

        const container = dom.create('div', {
            class: 'd-flex'
        });

        this._pagination = dom.create('div', {
            class: 'pagination pagination-sm mx-auto me-sm-0'
        });
        dom.append(container, this._pagination);

        const prev = this._renderPageItem({
            icon: 'icon-arrow-left',
            disabled: page == 1
        });
        dom.append(this._pagination, prev);

        let startPage = Math.max(page - 5, 1);
        let endPage = Math.min(page + 5, totalPages);

        while (endPage - startPage > 5) {
            startPage++;
            endPage--;
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
            disabled: page == totalPages
        });
        dom.append(this._pagination, next);

        dom.append(this._postCol2, container);
    },

    _renderResults(data) {
        dom.empty(this._tbody);

        this._renderHeadings();
        this._renderPagination(data);
        this._renderInfo(data);

        for (const result of data.results) {
            const row = this._renderRow(result);
            dom.append(this._tbody, row);
        }
    },

    _renderRow(data, n, i) {
        const row = dom.create('tr');

        for (const [index, column] of this._columns.entries()) {
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
