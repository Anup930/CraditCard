window.Utils = {
    // Format number as Indian currency: ₹12,34,567.00
    formatCurrency(amount) {
        const num = this.parseNum(amount);
        return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    },
    
    // Format date as DD MMM YYYY
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    },
    
    // Format month year for statements, e.g., "Aug 2026" (Handles both YYYY-MM and ISO strings)
    formatMonthYear(date) {
        if (!date) return '';
        let d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    },
    
    // Format date as YYYY-MM for month inputs
    formatMonthInput(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date).substring(0, 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    
    // Format date as YYYY-MM-DD for inputs
    formatDateInput(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    },
    
    // Mask card number: show only last 4: •••• •••• •••• 1234
    maskCardNumber(num) {
        if (!num) return '';
        const str = String(num).replace(/\s+/g, '');
        if (str.length <= 4 || str.includes('x') || str.includes('X') || str.includes('*')) {
            return str;
        }
        return '•••• •••• •••• ' + str.slice(-4);
    },
    
    // Get last 4 digits of card number
    getLast4(num) {
        if (!num) return '';
        const str = String(num).replace(/[^a-zA-Z0-9]/g, '');
        if (str.length <= 4) return str;
        return str.slice(-4);
    },
    
    // Extract bank name from card type string
    extractBankName(cardType) {
        if (!cardType) return 'Other';
        const str = String(cardType).toLowerCase();
        if (str.includes('icici')) return 'ICICI';
        if (str.includes('hdfc')) return 'HDFC';
        if (str.includes('sbi')) return 'SBI';
        if (str.includes('axis')) return 'Axis';
        if (str.includes('amex') || str.includes('american express') || str.includes('american')) return 'Amex';
        if (str.includes('hsbc')) return 'HSBC';
        if (str.includes('idfc')) return 'IDFC';
        return 'Other';
    },
    
    // Validate email
    isValidEmail(email) {
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
    },
    
    // Validate phone (10 digits)
    isValidPhone(phone) {
        if (!phone) return false;
        return /^\d{10}$/.test(String(phone).replace(/\D/g, ''));
    },
    
    // Generate unique ID
    generateId() {
        return Date.now().toString() + Math.random().toString().substr(2, 5);
    },
    
    // Get current date-time as ISO string
    now() {
        return new Date().toISOString();
    },
    
    // Debounce function
    debounce(fn, delay=300) {
        let timeoutId;
        return function(...args) {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        };
    },
    
    // Calculate percentage
    percentage(part, total) {
        const p = this.parseNum(part);
        const t = this.parseNum(total);
        if (t === 0) return 0;
        return Math.round((p / t) * 100);
    },
    
    // Truncate string
    truncate(str, len=50) {
        if (!str) return '';
        const s = String(str);
        if (s.length <= len) return s;
        return s.slice(0, len) + '...';
    },
    
    // Escape HTML
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    
    // Parse number safely (handles formatted strings like "₹50,000.00")
    parseNum(val) {
        if (val === null || val === undefined || val === '') return 0;
        // Strip out commas, spaces, currency symbols, leaving only digits, minus sign, and decimal point
        const cleanedStr = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    },
    
    // Get month name
    getMonthName(monthNum) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[Math.max(0, Math.min(11, monthNum - 1))] || '';
    },
    
    // Generate pagination HTML
    paginate(totalItems, currentPage, pageSize=10) {
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const current = Math.max(1, Math.min(currentPage, totalPages));
        const start = (current - 1) * pageSize;
        const end = Math.min(start + pageSize, totalItems);
        
        let html = '';
        if (totalPages > 1) {
            html += `<button class="btn-page" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>Prev</button>`;
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
                    html += `<button class="btn-page ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
                } else if (i === current - 2 || i === current + 2) {
                    html += `<span class="ellipsis">...</span>`;
                }
            }
            html += `<button class="btn-page" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>Next</button>`;
        }
        
        return { start, end, totalPages, html };
    },

    // MD5 Hashing (used for passwords before sending to Sheets)
    md5(string) {
        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17,  606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12,  1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7,  1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7,  1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22,  1236535329);
            a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14,  643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9,  38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5,  568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20,  1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14,  1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
            a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16,  1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11,  1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4,  681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23,  76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16,  530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
            a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10,  1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6,  1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6,  1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21,  1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15,  718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
            x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
        }
        function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
        function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
        function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
        function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
        function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
        function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
        let n = string.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
        for (i = 64; i <= string.length; i += 64) { md5cycle(state, md5blk(string.substring(i - 64, i))); }
        string = string.substring(i - 64);
        let tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        for (i = 0; i < string.length; i++) tail[i >> 2] |= string.charCodeAt(i) << ((i % 4) << 3);
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
        tail[14] = n * 8; md5cycle(state, tail);
        return state.map(x => { let s = ""; for (let i = 0; i < 4; i++) { s += ('0' + ((x >> (i * 8)) & 0xFF).toString(16)).slice(-2); } return s; }).join('');
        function md5blk(s) { let m = []; for (let i = 0; i < 64; i += 4) { m[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24); } return m; }
    }
};
