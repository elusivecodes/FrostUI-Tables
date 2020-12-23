Table.defaults = {
    info: true,
    lengthChange: true,
    ordering: true,
    paging: true,
    searching: true,
    length: 10,
    lengths: [10, 25, 50, 100],
    order: [[0, 'asc']],
    columns: null,
    lang: {
        info: 'Showing results {start} to {end} of {total}',
        infoFiltered: 'Showing results {start} to {end} of {filtered} (filtered from {total} total)',
        noData: 'No data available',
        noResults: 'No results to show',
        perPage: 'Per Page',
        search: 'Search',
        paginate: {
            first: 'First',
            last: 'Last',
            next: 'Next',
            previous: 'Previous'
        }
    },
    createdRow: null,
    drawCallback: null,
    footerCallback: null,
    headerCallback: null,
    infoCallback: null,
    preDrawCallback: null,
    rowCallback: null
};

UI.initComponent('table', Table);

UI.Table = Table;
