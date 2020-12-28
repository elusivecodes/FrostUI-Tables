/**
 * Table (Static) Helpers
 */

Object.assign(Table, {

    /**
     * Build a data array from a DOM element.
     * @param {HTMLElement} element The element to parse.
     * @returns {array} The parsed data.
     */
    _getDataFromDOM(element) {
        const tbody = dom.findOne('tbody', element);
        return dom.children(tbody, 'tr').map(
            row => dom.children(row, 'td').map(cell => dom.getHTML(cell))
        );
    },

    /**
     * Build a heading array from a DOM element.
     * @param {HTMLElement} element The element to parse.
     * @returns {array} The parsed data.
     */
    _getHeadingsFromDOM(element) {
        const tbody = dom.findOne('thead', element);
        const row = dom.children(tbody, 'tr').shift();

        return dom.children(row, 'th').map(cell => ({
            text: dom.getHTML(cell),
            class: dom.getAttribute(cell, 'class')
        }));
    }

});
