import { initComponent } from '@fr0st/ui';
import { csv, excel, print } from './buttons.js';
import Table from './table.js';
import { _getDataInit, _getResultsInit } from './prototype/data.js';
import { _events } from './prototype/events.js';
import { _buildTable, _getHeadings, _getIndex, _getResultRows, _getVisibleColumns, _refreshResults } from './prototype/helpers.js';
import { _buildIndex, _getOrder, _getOrderedIndexes } from './prototype/indexes.js';
import { _render, _renderButtons, _renderHeadings, _renderInfo, _renderInfoContainer, _renderLayoutRow, _renderLengthSelect, _renderPageItem, _renderPagination, _renderPaginationContainer, _renderResults, _renderRow, _renderSearch } from './prototype/render.js';

// Table default options
Table.defaults = {
    buttons: [],
    layout: {
        top: 'search,buttons|length',
        bottom: 'info,pagination',
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
            previous: 'Previous',
        },
        buttons: {
            csv: 'CSV',
            excel: 'Excel',
            print: 'Print',
        },
        aria: {
            sortAscending: ': activate to sort column ascending',
            sortDescending: ': activate to sort column descending',
        },
    },
    icons: {
        first: '&laquo;',
        last: '&raquo',
        next: '&gt;',
        previous: '&lt;',
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
    debounce: 250,
    info: true,
    lengthChange: true,
    ordering: true,
    paging: true,
    searching: true,
};

// Table classes
Table.classes = {
    bottomRow: 'd-md-flex justify-content-between mx-n2',
    button: 'btn btn-table',
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
    loader: 'position-absolute top-50 start-50 translate-middle z-1',
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
    tableContainer: 'table-responsive',
    tableHeading: 'fw-bold',
    tableSort: 'table-sort',
    tableSortAsc: 'table-sort-asc',
    tableSortDesc: 'table-sort-desc',
    topRow: 'd-md-flex justify-content-between mb-2 mx-n2',
};

// Table buttons
Table.buttons = { csv, excel, print };

// Table layout
Table.layout = {
    buttons(container) {
        this._renderButtons(container);
    },
    search(container) {
        this._renderSearch(container);
    },
    length(container) {
        this._renderLengthSelect(container);
    },
    info(container) {
        this._renderInfoContainer(container);
    },
    pagination(container) {
        this._renderPaginationContainer(container);
    },
};

// Table init
initComponent('table', Table);

// Table prototype
const proto = Table.prototype;

proto._buildIndex = _buildIndex;
proto._buildTable = _buildTable;
proto._events = _events;
proto._getDataInit = _getDataInit;
proto._getHeadings = _getHeadings;
proto._getIndex = _getIndex;
proto._getOrder = _getOrder;
proto._getOrderedIndexes = _getOrderedIndexes;
proto._getResultRows = _getResultRows;
proto._getResultsInit = _getResultsInit;
proto._getVisibleColumns = _getVisibleColumns;
proto._refreshResults = _refreshResults;
proto._render = _render;
proto._renderButtons = _renderButtons;
proto._renderHeadings = _renderHeadings;
proto._renderInfo = _renderInfo;
proto._renderInfoContainer = _renderInfoContainer;
proto._renderLayoutRow = _renderLayoutRow;
proto._renderLengthSelect = _renderLengthSelect;
proto._renderPageItem = _renderPageItem;
proto._renderPagination = _renderPagination;
proto._renderPaginationContainer = _renderPaginationContainer;
proto._renderResults = _renderResults;
proto._renderRow = _renderRow;
proto._renderSearch = _renderSearch;

export default Table;
