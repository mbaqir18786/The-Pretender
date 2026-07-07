const utils = {
    sanitizeText: function(str, maxLength) {
        if (typeof str !== 'string') return '';
        let cleaned = str.replace(/[<>"'/&]/g, function(m) {
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
    },

    showToast: function(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${this.sanitizeText(message, 100)}</span><button style="padding:2px 6px; font-size:0.7rem; box-shadow:none; border-width:2px;" onclick="this.parentElement.remove()">X</button>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

window.utils = utils;
window.showToast = utils.showToast.bind(utils); // Provide globally for easy access
