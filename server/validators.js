const CONSTANTS = require('./constants');

function sanitizeText(str, maxLength) {
    if (typeof str !== 'string') return '';
    let cleaned = str.replace(/[<>"'/&]/g, function (m) {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '&': '&amp;'
        }[m];
    });
    return cleaned.trim().substring(0, maxLength);
}

module.exports = {
    sanitizeText
};
