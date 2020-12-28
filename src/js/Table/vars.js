// Table default options
Table.defaults = {
    layout: {
        top: [
            'search',
            'length'
        ],
        bottom: [
            'info',
            'pagination'
        ]
    },
    lang: {
        info: 'Showing results {start} to {end} of {total}',
        infoFiltered: 'Showing results {start} to {end} of {filtered} (filtered from {total} total)',
        noData: 'No data available',
        noResults: 'No results to show',
        perPage: 'Per Page',
        search: 'Search',
        paginate: {
            first: '&laquo;',
            last: '&raquo;',
            next: '&gt;',
            previous: '&lt;'
        }
    },
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

// Default classes
Table.classes = {
    bottomRow: 'd-md-flex justify-content-between',
    column: 'd-flex',
    container: 'position-relative mb-2',
    emptyCell: 'text-center py-3',
    infoContainer: 'text-center text-md-start mb-2 mb-md-0 w-100',
    lengthContainer: 'd-flex justify-content-center justify-content-md-start w-100 mb-1',
    lengthInput: 'input-filled input-sm',
    lengthInputContainer: 'form-input d-inline-block',
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
    searchInput: 'input-filled input-sm',
    searchInputContainer: 'form-input mx-auto me-md-0',
    searchInputRipple: 'ripple-line',
    table: 'table table-bordered',
    tableHeading: 'fw-bold',
    tableSort: 'table-sort',
    tableSortAsc: 'table-sort-asc',
    tableSortDesc: 'table-sort-desc',
    topRow: 'd-md-flex justify-content-between mb-2'
};

UI.initComponent('table', Table);

UI.Table = Table;
