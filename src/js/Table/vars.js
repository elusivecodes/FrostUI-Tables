Table.defaults = {
    info: true,
    lengthChange: true,
    ordering: true,
    paging: true,
    searching: true,
    length: 10,
    lengths: [10, 25, 50, 100],
    order: [[0, 'asc']],
    columns: null
};

UI.initComponent('table', Table);

UI.Table = Table;
