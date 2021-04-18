// Table default options
Table.defaults = {
    buttons: [
        {
            type: 'csv'
        },
        // {
        //     type: 'excel'
        // },
        // {
        //     type: 'print'
        // }
    ],
    layout: {
        top: [
            [
                'search'
            ],
            [
                'buttons',
                'length'
            ]
        ],
        bottom: [
            [
                'info'
            ],
            [
                'pagination'
            ]
        ]
    },
    lang: {
        info: 'Showing results {start} to {end} of {total}',
        infoFiltered: 'Showing results {start} to {end} of {filtered} (filtered from {total} total)',
        noData: 'No data available',
        noResults: 'No results to show',
        page: 'Page',
        perPage: 'Per Page',
        search: 'Search',
        paginate: {
            first: 'First',
            last: 'Last',
            next: 'Next',
            previous: 'Previous'
        },
        buttons: {
            csv: 'CSV',
            excel: 'Excel',
            print: 'Print'
        },
        aria: {
            sortAscending: ': activate to sort column ascending',
            sortDescending: ': activate to sort column descending'
        }
    },
    icons: {
        first: '&laquo;',
        last: '&raquo',
        next: '&gt;',
        previous: '&lt;'
    },
    inputStyle: 'filled',
    createdRow: null,
    drawCallback: null,
    footerCallback: null,
    headerCallback: null,
    infoCallback: null,
    preDrawCallback: null,
    rowCallback: null,
    columns: null,
    order: [[0, 'asc']],
    lengths: [10, 25, 50, 100],
    length: 10,
    debounceInput: 250,
    info: true,
    lengthChange: true,
    ordering: true,
    paging: true,
    searching: true
};

// Default buttons
Table.buttons = {
    csv(button) {
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

        this._saveBlob(blob, 'table.csv');
    },
    excel(button) {
        if (!button.columns) {
            button.columns = this._getVisibleColumns();
        }

        // not yet implemented
    },
    print: button => {
        if (!button.columns) {
            button.columns = this._getVisibleColumns();
        }

        const table = this._buildTable(button.columns);

        // not yet implemented

        // add classes to table
        // create document
        // append styles to document
        // append table to document
        // open document in new tab
        // trigger print
    }
};

// Default classes
Table.classes = {
    bottomRow: 'd-md-flex justify-content-between mx-n2',
    button: 'btn btn-outline-secondary',
    buttonGroup: 'btn-group btn-group-sm mt-1',
    column: 'd-md-flex',
    columnContainer: 'text-center px-2 mb-1',
    container: 'position-relative mb-2',
    emptyCell: 'text-center py-3',
    infoContainer: 'text-center text-md-start mb-2 mb-md-0 w-100',
    lengthContainer: 'd-flex justify-content-center justify-content-md-start w-100 mb-1',
    lengthInputContainer: 'form-input d-inline-block',
    lengthInputFilled: 'input-filled input-sm',
    lengthInputOutline: 'input-outline input-sm',
    lengthInputRipple: 'ripple-line',
    lengthLabel: 'mb-1 mb-md-0',
    lengthLabelText: 'me-2',
    loader: 'position-absolute top-50 start-50 translate-middle',
    loaderIcon: 'spinner-border text-primary',
    pageActive: 'active',
    pageDisabled: 'disabled',
    pageItem: 'page-item',
    pageLink: 'page-link ripple',
    pagination: 'pagination pagination-sm mx-auto me-md-0',
    paginationContainer: 'd-flex w-100',
    searchContainer: 'w-100 mb-1',
    searchInputContainer: 'form-input mx-auto me-md-0',
    searchInputFilled: 'input-filled input-sm',
    searchInputOutline: 'input-outline input-sm',
    searchInputRipple: 'ripple-line',
    table: 'table table-bordered',
    tableHeading: 'fw-bold',
    tableSort: 'table-sort',
    tableSortAsc: 'table-sort-asc',
    tableSortDesc: 'table-sort-desc',
    topRow: 'd-md-flex justify-content-between mb-2 mx-n2'
};

UI.initComponent('table', Table);

UI.Table = Table;
