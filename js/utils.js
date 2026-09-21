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
    
    // Format month year for statements, e.g., "Aug 2026" (Handles YYYY-MM, ISO strings and dates)
    formatMonthYear(date) {
        if (!date) return '';
        if (typeof date === 'string') {
            const ym = date.trim().match(/^(\d{4})[\-\/](\d{1,2})$/);
            if (ym) {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const idx = parseInt(ym[2], 10) - 1;
                if (idx >= 0 && idx < 12) {
                    return `${months[idx]} ${ym[1]}`;
                }
            }
        }
        let d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    },

    // Normalize any statement month input to standard YYYY-MM format (e.g., "2026-07")
    normalizeStatementMonth(val) {
        if (!val) return '';
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return '';
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            return `${y}-${m}`;
        }
        let str = String(val).trim();
        if (!str) return '';

        // 1. Check YYYY-MM format: "2026-07" or "2026/07"
        let m = str.match(/^(\d{4})[\-\/](\d{1,2})$/);
        if (m) {
            return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
        }

        // 2. Check MM-YYYY or MM/YYYY format: "07/2026" or "7-2026"
        m = str.match(/^(\d{1,2})[\-\/](\d{4})$/);
        if (m) {
            return `${m[2]}-${String(m[1]).padStart(2, '0')}`;
        }

        // 3. Check DD/MM/YYYY or DD-MM-YYYY
        const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) {
            const p1 = parseInt(dmy[1], 10);
            const p2 = parseInt(dmy[2], 10);
            const yr = parseInt(dmy[3], 10);
            const mo = (p2 <= 12) ? p2 : p1;
            return `${yr}-${String(mo).padStart(2, '0')}`;
        }

        // 4. Check text formats: "Jul 2026", "July 2026", "Jul-26", "Jul-2026"
        const monthNames = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
            january: '01', february: '02', march: '03', april: '04', june: '06',
            july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
        };
        m = str.match(/^([a-zA-Z]+)[\s\-\/]*(\d{2,4})$/);
        if (m) {
            const monKey = m[1].toLowerCase();
            if (monthNames[monKey]) {
                let yr = m[2];
                if (yr.length === 2) yr = '20' + yr;
                return `${yr}-${monthNames[monKey]}`;
            }
        }
        // Reverse order: "2026 Jul"
        m = str.match(/^(\d{4})[\s\-\/]*([a-zA-Z]+)$/);
        if (m) {
            const monKey = m[2].toLowerCase();
            if (monthNames[monKey]) {
                return `${m[1]}-${monthNames[monKey]}`;
            }
        }

        // 5. Try general Date parsing
        let d = new Date(str);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            return `${y}-${mo}`;
        }

        return str;
    },

    // Auto-calculate Statement Month from transaction date and card statement cycle.
    // If the transaction happens after the card's statement cut-off day (e.g. 15th),
    // it belongs to the NEXT billing cycle statement month (e.g. 16 Aug -> 2026-09).
    // If blank or not set, infers statement cut-off or defaults to transaction month.
    calculateStatementMonth(txnDateStr, card, statements) {
        if (!txnDateStr) return '';
        const d = new Date(txnDateStr);
        if (isNaN(d.getTime())) return '';

        let stmtDay = null;
        if (card && card.statement_date) {
            stmtDay = parseInt(card.statement_date);
        }

        // If card does not have explicit statement_date, infer from statements of this card
        if ((!stmtDay || isNaN(stmtDay)) && card && statements && Array.isArray(statements)) {
            const cardStmts = statements.filter(s => String(s.card_id) === String(card.card_id));
            for (const s of cardStmts) {
                if (s.due_date) {
                    const dueD = new Date(s.due_date);
                    if (!isNaN(dueD.getTime())) {
                        const dueDay = dueD.getDate();
                        // Common Indian credit card due date offsets:
                        // Due on 4-8th -> bill date ~15-16th of previous month
                        // Due on 1-3rd -> bill date ~12-13th of previous month
                        // Due on 20-26th -> bill date ~1-5th of current month
                        if (dueDay >= 4 && dueDay <= 8) { stmtDay = 15; break; }
                        if (dueDay >= 1 && dueDay <= 3) { stmtDay = 12; break; }
                        if (dueDay >= 20 && dueDay <= 26) { stmtDay = 5; break; }
                    }
                }
            }
        }

        const year = d.getFullYear();
        const month = d.getMonth(); // 0-11
        const day = d.getDate();

        // If transaction date is after statement cut-off date, it belongs to NEXT month's statement
        if (stmtDay && day > stmtDay) {
            const nextDate = new Date(year, month + 1, 1);
            const ny = nextDate.getFullYear();
            const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
            return `${ny}-${nm}`;
        }

        // Otherwise it belongs to current calendar month
        const cm = String(month + 1).padStart(2, '0');
        return `${year}-${cm}`;
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
    
    // Make a native <select> element searchable by wrapping it in a custom dropdown
    // Usage: window.Utils.makeSearchable('your-select-id')
    makeSearchable(selectId) {
        const select = document.getElementById(selectId);
        if (!select || select.dataset.searchable === '1') return;
        select.dataset.searchable = '1';
        
        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'sselect-wrapper';
        wrapper.style.position = 'relative';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        
        // Hide native select visually but keep it functional
        select.style.display = 'none';
        
        // Create the display trigger
        const trigger = document.createElement('div');
        trigger.className = 'sselect-trigger form-control';
        trigger.style.cursor = 'pointer';
        trigger.style.display = 'flex';
        trigger.style.justifyContent = 'space-between';
        trigger.style.alignItems = 'center';
        trigger.style.userSelect = 'none';
        const triggerText = document.createElement('span');
        triggerText.className = 'sselect-trigger-text';
        triggerText.textContent = select.options[select.selectedIndex]?.text || '-- Select --';
        const triggerArrow = document.createElement('span');
        triggerArrow.innerHTML = '<i class="fas fa-chevron-down" style="font-size:11px;opacity:0.6;"></i>';
        trigger.appendChild(triggerText);
        trigger.appendChild(triggerArrow);
        wrapper.appendChild(trigger);
        
        // Create dropdown panel
        const panel = document.createElement('div');
        panel.className = 'sselect-panel';
        panel.style.display = 'none';
        panel.style.position = 'absolute';
        panel.style.top = '100%';
        panel.style.left = '0';
        panel.style.right = '0';
        panel.style.zIndex = '9999';
        panel.style.background = '#fff';
        panel.style.border = '1px solid #d0d5e8';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        panel.style.overflow = 'hidden';
        
        // Search input
        const searchWrap = document.createElement('div');
        searchWrap.style.padding = '8px';
        searchWrap.style.borderBottom = '1px solid #e9ecef';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Type to search...';
        searchInput.className = 'form-control';
        searchInput.style.fontSize = '13px';
        searchInput.style.padding = '6px 10px';
        searchWrap.appendChild(searchInput);
        panel.appendChild(searchWrap);
        
        // Options list
        const optList = document.createElement('div');
        optList.className = 'sselect-options';
        optList.style.maxHeight = '220px';
        optList.style.overflowY = 'auto';
        panel.appendChild(optList);
        wrapper.appendChild(panel);
        
        // Render options
        const renderOptions = (filter = '') => {
            optList.innerHTML = '';
            const q = filter.toLowerCase();
            Array.from(select.options).forEach(opt => {
                if (q && !opt.text.toLowerCase().includes(q)) return;
                const item = document.createElement('div');
                item.className = 'sselect-option';
                item.dataset.value = opt.value;
                item.textContent = opt.text;
                item.style.padding = '8px 14px';
                item.style.cursor = 'pointer';
                item.style.fontSize = '13px';
                if (opt.value === select.value) {
                    item.style.background = '#f0f3ff';
                    item.style.fontWeight = '600';
                    item.style.color = '#4361ee';
                }
                item.addEventListener('mouseenter', () => item.style.background = '#f5f7ff');
                item.addEventListener('mouseleave', () => item.style.background = opt.value === select.value ? '#f0f3ff' : '');
                item.addEventListener('click', () => {
                    select.value = opt.value;
                    triggerText.textContent = opt.text;
                    panel.style.display = 'none';
                    // Fire change event on the native select
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    renderOptions();
                });
                optList.appendChild(item);
            });
            if (!optList.children.length) {
                const empty = document.createElement('div');
                empty.style.padding = '12px';
                empty.style.color = '#999';
                empty.style.textAlign = 'center';
                empty.style.fontSize = '13px';
                empty.textContent = 'No results found';
                optList.appendChild(empty);
            }
        };
        
        renderOptions();
        
        // Toggle panel
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panel.style.display === 'block';
            // Close all other panels first
            document.querySelectorAll('.sselect-panel').forEach(p => p.style.display = 'none');
            if (!isOpen) {
                panel.style.display = 'block';
                searchInput.value = '';
                renderOptions();
                setTimeout(() => searchInput.focus(), 50);
            }
        });
        
        // Live search
        searchInput.addEventListener('input', () => renderOptions(searchInput.value));
        searchInput.addEventListener('click', e => e.stopPropagation());
        
        // Close on outside click
        document.addEventListener('click', () => { panel.style.display = 'none'; });
        
        // Watch for programmatic changes to select value (e.g. when modal resets)
        const observer = new MutationObserver(() => {
            const selected = select.options[select.selectedIndex];
            if (selected) triggerText.textContent = selected.text;
            renderOptions();
        });
        observer.observe(select, { attributes: true, childList: true, subtree: true, attributeFilter: ['value'] });
        
        // Also sync when options are added
        select.addEventListener('change', () => {
            const selected = select.options[select.selectedIndex];
            if (selected) triggerText.textContent = selected.text;
        });
    },
    
    // Apply makeSearchable to all selects that have [data-searchable] attribute or matching ids
    initSearchableSelects() {
        document.querySelectorAll('select[data-searchable-auto]').forEach(el => {
            if (el.id) this.makeSearchable(el.id);
        });
    },


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
