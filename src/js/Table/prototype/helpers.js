/**
 * Table Helpers
 */

Object.assign(Table.prototype, {

    _buildTable(columns) {
        const headings = this._getHeadings(columns);
        const rows = this._getResultRows(columns);

        const table = dom.create('table');

        const thead = dom.create('thead');
        const tr = dom.create('tr');

        for (const heading of headings) {
            const th = dom.create('th', {
                text: heading
            });
            dom.append(tr, th);
        }

        dom.append(thead, tr);
        dom.append(table, thead);

        const tbody = dom.create('tbody');
        for (const row of rows) {
            const tr = dom.create('tr');

            for (const value of row) {
                const td = dom.create('td', {
                    text: value
                });
                dom.append(tr, td);
            }

            dom.append(tbody, tr);
        }

        dom.append(table, tbody);

        return table;
    },

    _getHeadings(columns) {
        const headings = [];

        for (const [index, heading] of this._headings.entries()) {
            if (!columns.includes(index)) {
                continue;
            }

            headings.push(heading.text);
        }

        return headings;
    },

    _getResultRows(columns) {
        const rows = [];

        for (const result of this._results) {
            const row = [];
            for (const [index, column] of this._columns.entries()) {
                if (!columns.includes(index)) {
                    continue;
                }

                const value = result[column.key];
                row.push(value);
            }
            rows.push(row);
        }

        return rows;
    },

    _getVisibleColumns() {
        const columns = [];

        for (const [index, column] of this._columns.entries()) {
            if (!column.visible) {
                return;
            }

            columns.push(index);
        }

        return columns;
    },

    _saveBlob(blob, filename) {
        const link = dom.create('a', {
            attributes: {
                href: URL.createObjectURL(blob),
                download: filename
            }
        });
        dom.append(document.body, link);
        dom.click(link);
        dom.detach(link);
    }

});
