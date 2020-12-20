/**
 * Table Render
 */

Object.assign(Table.prototype, {

    _events() {
        dom.addEvent(this._lengthSelect, 'change', e => {
            const value = dom.getValue(e.currentTarget);
            this._limit = value;
            this._getData();
        });

        dom.addEvent(this._searchInput, 'input', e => {
            this._filter = dom.getValue(e.currentTarget);
            this._getData();
        });

        dom.addEventDelegate(this._thead, 'click', 'th', e => {
            const index = dom.index(e.currentTarget);

            if (!this._columns[index].orderable) {
                return;
            }

            // get default order
            // check if column has order, if so reverse
            // check if shift key is pressed, if so append
            // else set order

            this._order = [[index, 'asc']];

            this._getData();
        });

        dom.addEventDelegate(this._pagination, 'click', '[data-page]', e => {
            const page = dom.getDataset(e.currentTarget, 'page');
        });
    }

});
