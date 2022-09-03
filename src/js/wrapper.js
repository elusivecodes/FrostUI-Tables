/**
 * FrostUI-Tables v1.1.6
 * https://github.com/elusivecodes/FrostUI-Tables
 */
(function(global, factory) {
    'use strict';

    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory;
    } else {
        factory(global);
    }

})(window, function(window) {
    'use strict';

    if (!window) {
        throw new Error('FrostUI-Tables requires a Window.');
    }

    if (!('UI' in window)) {
        throw new Error('FrostUI-Tables requires FrostUI.');
    }

    const Core = window.Core;
    const dom = window.dom;
    const UI = window.UI;
    const document = window.document;

    // {{code}}
});