// Default buttons
Table.buttons = {
    csv(button) {
        if (!button.title) {
            button.title = dom.getText('title');
        }

        if (!button.columns) {
            button.columns = this._getVisibleColumns();
        }

        const rows = [
            this._getHeadings(button.columns),
            ...this._getResultRows(button.columns)
        ];

        // build csv data
        const lines = [];

        for (const row of rows) {
            const line = row.map(
                value => {
                    value = `${value}`.replace(/"/g, '""');

                    if (value.indexOf(',') >= 0) {
                        return `"${value}"`;
                    }

                    return value;
                }
            ).join(',');

            lines.push(line);
        }

        const blob = new Blob(
            [
                lines.join("\r\n")
            ],
            { type: 'text/csv;charset=utf-8;' }
        );

        this._saveBlob(blob, `${button.title}.csv`);
    },
    excel(button) {
        if (!button.title) {
            button.title = dom.getText('title');
        }

        if (!button.columns) {
            button.columns = this._getVisibleColumns();
        }

        const workbook = new Workbook();
        workbook.addSheet({
            header: this._getHeadings(button.columns),
            rows: this._getResultRows(button.columns)
        });

        const blob = workbook.create();

        this._saveBlob(blob, `${button.title}.xlsx`);
    },
    print(button) {
        if (!button.title) {
            button.title = dom.getText('title');
        }

        if (!button.columns) {
            button.columns = this._getVisibleColumns();
        }

        const win = window.open('', '');

        win.document.head.innerHTML = `<title>${button.title}</title>`;

        const styles = dom.find('link, style');
        const newStyles = dom.clone(styles);

        for (const element of newStyles) {
            if (dom.tagName(element) === 'link') {
                const oldRel = dom.getAttribute(element, 'href');
                const newRel = (new URL(oldRel, document.location)).href;
                dom.setAttribute(element, 'href', newRel);
            }
            win.document.head.appendChild(element);
        }

        const container = dom.create('div');
        const table = this._buildTable(button.columns);
        const classes = dom.getAttribute(this._node, 'class');
        dom.addClass(table, classes);
        dom.append(container, table);
        const tableHtml = dom.getHTML(container);
        win.document.body.innerHTML = `<h1>${button.title}</h1>${tableHtml}`;

        setTimeout(_ => {
            win.print();
            win.close();
        }, 1000);
    }
};
