import $ from '@fr0st/query';
import Workbook from './workbook/workbook.js';
import { saveBlob } from './helpers.js';

/**
 * Generate a CSV file from the table.
 * @param {object} options The button options.
 */
export function csv(options) {
    if (!options.title) {
        options.title = $.getText('title');
    }

    if (!options.columns) {
        options.columns = this._getVisibleColumns();
    }

    const rows = [
        this._getHeadings(options.columns),
        ...this._getResultRows(options.columns),
    ];

    // build csv data
    const lines = [];

    for (const row of rows) {
        const line = row.map(
            (value) => {
                value = `${value}`.replace(/"/g, '""');

                if (value.indexOf(',') >= 0) {
                    return `"${value}"`;
                }

                return value;
            },
        ).join(',');

        lines.push(line);
    }

    const blob = new Blob(
        [
            lines.join('\r\n'),
        ],
        { type: 'text/csv;charset=utf-8;' },
    );

    saveBlob(blob, `${options.title}.csv`);
};
/**
 * Generate an excel file from the table.
 * @param {object} options The button options.
 */
export function excel(options) {
    if (!options.title) {
        options.title = $.getText('title');
    }

    if (!options.columns) {
        options.columns = this._getVisibleColumns();
    }

    const workbook = new Workbook();
    workbook.addSheet({
        header: this._getHeadings(options.columns),
        rows: this._getResultRows(options.columns),
    });

    const blob = workbook.create();

    saveBlob(blob, `${options.title}.xlsx`);
};

/**
 * Print the table.
 * @param {object} options The button options.
 */
export function print(options) {
    if (!options.title) {
        options.title = $.getText('title');
    }

    if (!options.columns) {
        options.columns = this._getVisibleColumns();
    }

    const win = window.open('', '');

    win.document.head.innerHTML = `<title>${options.title}</title>`;

    const styles = $.find('link, style');
    const newStyles = $.clone(styles);

    for (const element of newStyles) {
        if ($.tagName(element) === 'link') {
            const oldRel = $.getAttribute(element, 'href');
            const href = (new URL(oldRel, document.location)).href;
            $.setAttribute(element, { href });
        }
        win.document.head.appendChild(element);
    }

    const container = $.create('div');
    const table = this._buildTable(options.columns);
    const classes = $.getAttribute(this._node, 'class');
    $.addClass(table, classes);
    $.append(container, table);
    const tableHtml = $.getHTML(container);
    win.document.body.innerHTML = `<h1>${options.title}</h1>${tableHtml}`;

    setTimeout((_) => {
        win.print();
        win.close();
    }, 1000);
};
