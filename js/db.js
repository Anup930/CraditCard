// ============================================================
//  DB.js — Google Sheets Backend
//  API: Google Apps Script Web App
//  Reads: In-memory cache (fast, synchronous)
//  Writes: Google Sheets (async) + cache update
// ============================================================

window.DB = {

    API_URL: 'https://script.google.com/macros/s/AKfycbydfpvZvdk2Mu3mfAtx3TzaYLk0SKupV4qZ5bHgBcO7zAF2fi0L6V5H6prDFfQ9hJcFdQ/exec',

    data: {
        credit_cards:   [],
        transactions:   [],
        statements:     [],
        payments:       [],
        categories:     [],
        import_batches: [],
        users:          []
    },

    // ── HTTP HELPERS ───────────────────────────────────────────

    async apiGet(params) {
        const url = new URL(this.API_URL);
        Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
        const res = await fetch(url.toString());
        return res.json();
    },

    async apiPost(body) {
        const res = await fetch(this.API_URL, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        return res.json();
    },

    // ── INIT (async — called once on app start) ────────────────

    async init() {
        try {
            // Fetch all sheets in parallel
            const [cards, txns, stmts, pmts, cats, batches, users] = await Promise.all([
                this.apiGet({ action: 'getAll', sheet: 'credit_cards' }),
                this.apiGet({ action: 'getAll', sheet: 'transactions' }),
                this.apiGet({ action: 'getAll', sheet: 'statements' }),
                this.apiGet({ action: 'getAll', sheet: 'payments' }),
                this.apiGet({ action: 'getAll', sheet: 'categories' }),
                this.apiGet({ action: 'getAll', sheet: 'import_batches' }),
                this.apiGet({ action: 'getAll', sheet: 'users' })
            ]);

            this.data.credit_cards   = cards.data   || [];
            this.data.transactions   = txns.data    || [];
            this.data.statements     = stmts.data   || [];
            this.data.payments       = pmts.data    || [];
            this.data.categories     = cats.data    || [];
            this.data.import_batches = batches.data || [];
            this.data.users          = users.data   || [];

            // Normalize numeric fields from Sheets (they come as strings)
            this.data.credit_cards.forEach(c => {
                c.card_id           = parseInt(c.card_id) || 0;
                c.credit_limit      = parseFloat(c.credit_limit) || 0;
                c.fee_waiver_target = parseFloat(c.fee_waiver_target) || 0;
                c.reward_points     = parseFloat(c.reward_points) || 0;
                c.statement_date    = c.statement_date ? parseInt(c.statement_date) : null;
                c.due_date          = c.due_date ? parseInt(c.due_date) : null;
            });
            this.data.transactions.forEach(t => {
                t.txn_id = parseInt(t.txn_id) || 0;
                t.amount = parseFloat(t.amount) || 0;
                t.card_id = parseInt(t.card_id) || null;
            });
            this.data.statements.forEach(s => {
                s.statement_id       = parseInt(s.statement_id) || 0;
                s.card_id            = parseInt(s.card_id) || 0;
                s.opening_balance    = parseFloat(s.opening_balance) || 0;
                s.billed_amount      = parseFloat(s.billed_amount) || 0;
                s.unbilled_amount    = parseFloat(s.unbilled_amount) || 0;
                s.credits_payments   = parseFloat(s.credits_payments) || 0;
                s.closing_outstanding= parseFloat(s.closing_outstanding) || 0;
                s.minimum_due        = parseFloat(s.minimum_due) || 0;
            });
            this.data.payments.forEach(p => {
                p.payment_id   = parseInt(p.payment_id) || 0;
                p.card_id      = parseInt(p.card_id) || 0;
                p.statement_id = parseInt(p.statement_id) || null;
                p.amount       = parseFloat(p.amount) || 0;
            });

            console.log('DB loaded from Google Sheets:', {
                cards: this.data.credit_cards.length,
                transactions: this.data.transactions.length,
                statements: this.data.statements.length,
                payments: this.data.payments.length
            });

            return true;
        } catch (err) {
            console.error('DB.init failed:', err);
            throw err;
        }
    },

    // No-op — data lives in Sheets now
    save() {},

    // ── NEXT ID (local cache) ──────────────────────────────────

    nextId(collection) {
        const items   = this.data[collection] || [];
        const idField = { credit_cards:'card_id', transactions:'txn_id', statements:'statement_id', payments:'payment_id', categories:'category_id', import_batches:'batch_id', users:'user_id' }[collection] || 'id';
        if (!items.length) return 1;
        return Math.max(...items.map(i => parseInt(i[idField]) || 0)) + 1;
    },

    // ── CARDS ──────────────────────────────────────────────────

    cards: {
        getAll(filters = {}) {
            let cards = [...DB.data.credit_cards];
            if (filters.search) {
                const s = filters.search.toLowerCase();
                cards = cards.filter(c =>
                    (c.primary_cardholder || '').toLowerCase().includes(s) ||
                    (c.cardholder_name    || '').toLowerCase().includes(s) ||
                    (c.card_type         || '').toLowerCase().includes(s) ||
                    (c.zoho_ledger_name  || '').toLowerCase().includes(s) ||
                    (c.card_last4        || '').includes(s)
                );
            }
            if (filters.bank)     cards = cards.filter(c => c.bank_name         === filters.bank);
            if (filters.category) cards = cards.filter(c => c.card_category     === filters.category);
            if (filters.owner)    cards = cards.filter(c => c.primary_cardholder === filters.owner);
            if (filters.status)   cards = cards.filter(c => c.status            === filters.status);
            return cards;
        },

        getById(id) {
            return DB.data.credit_cards.find(c => String(c.card_id) === String(id));
        },

        async add(card) {
            card.card_id           = DB.nextId('credit_cards');
            card.card_last4        = Utils.getLast4(card.card_number);
            card.bank_name         = card.bank_name || Utils.extractBankName(card.card_type);
            card.credit_limit      = Utils.parseNum(card.credit_limit);
            card.fee_waiver_target = Utils.parseNum(card.fee_waiver_target);
            card.reward_points     = Utils.parseNum(card.reward_points);
            card.status            = card.status || 'Active';
            card.created_at        = Utils.now();
            card.updated_at        = Utils.now();
            // Add to cache immediately
            DB.data.credit_cards.push(card);
            // Persist to Sheets
            const res = await DB.apiPost({ action: 'add', sheet: 'credit_cards', data: card });
            if (res.id) card.card_id = res.id;
            return card.card_id;
        },

        async update(id, data) {
            const idx = DB.data.credit_cards.findIndex(c => String(c.card_id) === String(id));
            if (idx === -1) return false;
            data.updated_at = Utils.now();
            if (data.card_number) data.card_last4 = Utils.getLast4(data.card_number);
            if (data.card_type)   data.bank_name  = data.bank_name || Utils.extractBankName(data.card_type);
            Object.assign(DB.data.credit_cards[idx], data);
            await DB.apiPost({ action: 'update', sheet: 'credit_cards', id: id, data: data });
            return true;
        },

        async delete(id) {
            DB.data.credit_cards = DB.data.credit_cards.filter(c => String(c.card_id) !== String(id));
            await DB.apiPost({ action: 'delete', sheet: 'credit_cards', id: id });
        },

        getByOwner(name)  { return DB.data.credit_cards.filter(c => c.primary_cardholder === name); },
        getPrimary()      { return DB.data.credit_cards.filter(c => c.card_category === 'Primary'); },
        getOwners()       { return [...new Set(DB.data.credit_cards.map(c => c.primary_cardholder))].filter(Boolean).sort(); },
        getBanks()        { return [...new Set(DB.data.credit_cards.map(c => c.bank_name).filter(Boolean))].sort(); }
    },

    // ── TRANSACTIONS ───────────────────────────────────────────

    transactions: {
        getAll(filters = {}) {
            let txns = [...DB.data.transactions];
            if (filters.card_id)  txns = txns.filter(t => String(t.card_id) === String(filters.card_id));
            if (filters.category) txns = txns.filter(t => t.category  === filters.category);
            if (filters.txn_type) txns = txns.filter(t => t.txn_type  === filters.txn_type);
            if (filters.dateFrom) txns = txns.filter(t => t.txn_date  >= filters.dateFrom);
            if (filters.dateTo)   txns = txns.filter(t => t.txn_date  <= filters.dateTo);
            if (filters.search) {
                const s = filters.search.toLowerCase();
                txns = txns.filter(t =>
                    (t.description || '').toLowerCase().includes(s) ||
                    (t.zoho_ledger || '').toLowerCase().includes(s)
                );
            }
            return txns.sort((a, b) => (b.txn_date || '').localeCompare(a.txn_date || ''));
        },

        async add(txn) {
            txn.txn_id     = DB.nextId('transactions');
            txn.amount     = Utils.parseNum(txn.amount);
            txn.created_at = Utils.now();
            DB.data.transactions.push(txn);
            await DB.apiPost({ action: 'add', sheet: 'transactions', data: txn });
            return txn.txn_id;
        },

        async addBatch(records, batchId) {
            const results = { valid: [], duplicates: [], errors: [] };
            const toInsert = [];

            records.forEach(r => {
                if (!r.txn_date || !r.amount) {
                    results.errors.push({ ...r, error: 'Missing date/amount' });
                    return;
                }
                const isDup = DB.data.transactions.some(t =>
                    t.txn_date === r.txn_date &&
                    t.zoho_ledger === r.zoho_ledger &&
                    t.amount === Utils.parseNum(r.amount) &&
                    t.description === r.description
                );
                if (isDup) { results.duplicates.push({ ...r, error: 'Duplicate' }); return; }

                const card = DB.data.credit_cards.find(c => c.zoho_ledger_name === r.zoho_ledger);
                const txn  = {
                    txn_id:          DB.nextId('transactions') + toInsert.length,
                    card_id:         card ? card.card_id : null,
                    txn_date:        r.txn_date,
                    zoho_ledger:     r.zoho_ledger || '',
                    description:     r.description || '',
                    txn_type:        r.txn_type || 'Debit',
                    amount:          Utils.parseNum(r.amount),
                    category:        r.category || 'Uncategorized',
                    import_batch_id: batchId || null,
                    status:          'Active',
                    created_at:      Utils.now()
                };
                DB.data.transactions.push(txn);
                toInsert.push(txn);
                results.valid.push(txn);
            });

            if (toInsert.length > 0) {
                await DB.apiPost({ action: 'addBatch', sheet: 'transactions', records: toInsert });
            }
            return results;
        },

        getByCard(cardId) { return DB.data.transactions.filter(t => String(t.card_id) === String(cardId)); },
        getCategories()   { return [...new Set(DB.data.transactions.map(t => t.category).filter(Boolean))].sort(); }
    },

    // ── STATEMENTS ─────────────────────────────────────────────

    statements: {
        getAll(filters = {}) {
            let stmts = [...DB.data.statements];
            if (filters.card_id) stmts = stmts.filter(s => String(s.card_id) === String(filters.card_id));
            if (filters.month)   stmts = stmts.filter(s => s.statement_month === filters.month);
            if (filters.status)  stmts = stmts.filter(s => s.payment_status  === filters.status);
            return stmts.sort((a, b) => (b.statement_month || '').localeCompare(a.statement_month || ''));
        },

        async add(stmt) {
            stmt.statement_id        = DB.nextId('statements');
            stmt.opening_balance     = Utils.parseNum(stmt.opening_balance);
            stmt.billed_amount       = Utils.parseNum(stmt.billed_amount);
            stmt.unbilled_amount     = Utils.parseNum(stmt.unbilled_amount);
            stmt.credits_payments    = Utils.parseNum(stmt.credits_payments);
            stmt.closing_outstanding = Utils.parseNum(stmt.closing_outstanding);
            stmt.minimum_due         = Utils.parseNum(stmt.minimum_due);
            stmt.payment_status      = stmt.payment_status || 'Pending';
            stmt.created_at          = Utils.now();
            DB.data.statements.push(stmt);
            await DB.apiPost({ action: 'add', sheet: 'statements', data: stmt });
            return stmt.statement_id;
        },

        async update(id, data) {
            const idx = DB.data.statements.findIndex(s => String(s.statement_id) === String(id));
            if (idx === -1) return false;
            Object.assign(DB.data.statements[idx], data);
            await DB.apiPost({ action: 'update', sheet: 'statements', id: id, data: data });
            return true;
        },

        getByCard(cardId) {
            return DB.data.statements
                .filter(s => String(s.card_id) === String(cardId))
                .sort((a, b) => (b.statement_month || '').localeCompare(a.statement_month || ''));
        }
    },

    // ── PAYMENTS ───────────────────────────────────────────────

    payments: {
        getAll(filters = {}) {
            let pmts = [...DB.data.payments];
            if (filters.card_id)      pmts = pmts.filter(p => String(p.card_id) === String(filters.card_id));
            if (filters.statement_id) pmts = pmts.filter(p => String(p.statement_id) === String(filters.statement_id));
            return pmts.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
        },

        async add(pmt) {
            pmt.payment_id  = DB.nextId('payments');
            pmt.amount      = Utils.parseNum(pmt.amount);
            pmt.status      = pmt.status || 'Completed';
            pmt.created_at  = Utils.now();
            DB.data.payments.push(pmt);
            await DB.apiPost({ action: 'add', sheet: 'payments', data: pmt });
            return pmt.payment_id;
        },

        getByCard(cardId) { return DB.data.payments.filter(p => String(p.card_id) === String(cardId)); }
    },

    // ── CATEGORIES ─────────────────────────────────────────────

    categories: {
        getAll() { return [...DB.data.categories]; },
        async add(cat) {
            cat.category_id = DB.nextId('categories');
            DB.data.categories.push(cat);
            await DB.apiPost({ action: 'add', sheet: 'categories', data: cat });
            return cat.category_id;
        }
    },

    // ── USERS ──────────────────────────────────────────────────

    users: {
        getAll(filters = {}) {
            let usrs = [...DB.data.users];
            if (filters.status) usrs = usrs.filter(u => u.status === filters.status);
            return usrs;
        },

        async add(usr) {
            usr.user_id = DB.nextId('users');
            usr.created_at = Utils.now();
            usr.updated_at = Utils.now();
            DB.data.users.push(usr);
            await DB.apiPost({ action: 'add', sheet: 'users', data: usr });
            return usr.user_id;
        },

        async update(id, data) {
            const idx = DB.data.users.findIndex(u => String(u.user_id) === String(id));
            if (idx === -1) return false;
            data.updated_at = Utils.now();
            Object.assign(DB.data.users[idx], data);
            await DB.apiPost({ action: 'update', sheet: 'users', id: id, data: data });
            return true;
        },

        async delete(id) {
            DB.data.users = DB.data.users.filter(u => String(u.user_id) !== String(id));
            await DB.apiPost({ action: 'delete', sheet: 'users', id: id });
        }
    },

    // ── IMPORT BATCHES ─────────────────────────────────────────

    importBatches: {
        getAll() {
            return [...DB.data.import_batches].sort((a, b) => (b.import_date || '').localeCompare(a.import_date || ''));
        },
        async add(batch) {
            batch.batch_id    = DB.nextId('import_batches');
            batch.import_date = batch.import_date || Utils.now();
            DB.data.import_batches.push(batch);
            await DB.apiPost({ action: 'add', sheet: 'import_batches', data: batch });
            return batch.batch_id;
        }
    },

    // ── EXPORT TO EXCEL (unchanged — uses in-memory cache) ─────

    exportToExcel() {
        if (typeof XLSX === 'undefined') { alert('SheetJS not loaded.'); return; }
        const wb = XLSX.utils.book_new();
        Object.keys(this.data).forEach(key => {
            if (key === 'users') return; // skip users sheet in export
            const ws = XLSX.utils.json_to_sheet(this.data[key]);
            XLSX.utils.book_append_sheet(wb, ws, key);
        });
        XLSX.writeFile(wb, 'ccms_backup_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    },

    // ── IMPORT FROM EXCEL → push to Sheets ────────────────────

    async importFromExcel(file) {
        if (typeof XLSX === 'undefined') throw new Error('SheetJS not loaded.');
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const wb  = XLSX.read(e.target.result, { type: 'array' });
                    const sheets = ['credit_cards', 'transactions', 'statements', 'payments', 'categories', 'import_batches'];
                    for (const name of sheets) {
                        const ws = wb.Sheets[name];
                        if (!ws) continue;
                        const rows = XLSX.utils.sheet_to_json(ws);
                        if (rows.length > 0) {
                            await DB.apiPost({ action: 'addBatch', sheet: name, records: rows });
                        }
                    }
                    await DB.init(); // Reload all data from Sheets
                    resolve(DB.data);
                } catch(err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    // ── LOGIN ──────────────────────────────────────────────────

    async login(username, password) {
        const res = await this.apiPost({ action: 'login', data: { username, password } });
        return res;
    },

    // ── KPIs (computed from cache) ─────────────────────────────

    getKPIs() {
        const cards     = this.data.credit_cards.filter(c => c.status === 'Active');
        const primary   = cards.filter(c => c.card_category === 'Primary');
        const stmts     = this.data.statements;

        // Sum limits for all cards (usually add-ons share limits, but if a limit is specified, sum it up)
        const totalLimit   = cards.reduce((s, c) => s + Utils.parseNum(c.credit_limit), 0);
        const totalRewards = cards.reduce((s, c) => s + Utils.parseNum(c.reward_points), 0);

        let totalPayable = 0, totalUnbilled = 0, over50 = 0;

        cards.forEach(c => {
            const cs = stmts.filter(s => String(s.card_id) === String(c.card_id))
                            .sort((a, b) => (b.statement_month || '').localeCompare(a.statement_month || ''));
            if (cs.length) {
                const out = Utils.parseNum(cs[0].closing_outstanding);
                const unb = Utils.parseNum(cs[0].unbilled_amount);
                totalPayable  += out;
                totalUnbilled += unb;
                const lim = Utils.parseNum(c.credit_limit);
                if (lim > 0 && (out + unb) / lim * 100 > 50) over50++;
            }
        });

        const usedLimit = totalPayable + totalUnbilled;
        const feeWaiver = cards.reduce((sum, c) => {
            const target = Utils.parseNum(c.fee_waiver_target);
            if (!target) return sum;
            const spent = this.data.transactions
                .filter(t => String(t.card_id) === String(c.card_id) && t.txn_type === 'Debit')
                .reduce((s, t) => s + Utils.parseNum(t.amount), 0);
            return sum + Math.max(0, target - spent);
        }, 0);

        return {
            totalCards: cards.length, primaryCards: primary.length,
            totalLimit, totalPayable, totalUnbilled, totalRewards,
            usedLimit, availableLimit: totalLimit - usedLimit,
            over50Count: over50, feeWaiverBalance: feeWaiver
        };
    },

    // ── DATA HYGIENE (computed from cache) ────────────────────

    getDataHygiene() {
        return this.data.credit_cards.map(c => {
            const mn = !c.cardholder_name;
            const ma = !c.address || String(c.address).trim() === '';
            const me = !c.email   || String(c.email).trim() === '';
            const mp = !c.phone;
            const ml = !c.credit_limit || Utils.parseNum(c.credit_limit) === 0;
            const ms = !c.statement_date;
            const md = !c.due_date;
            return {
                card_id: c.card_id, cardholder_name: c.cardholder_name,
                primary_cardholder: c.primary_cardholder, bank_name: c.bank_name, card_last4: c.card_last4,
                missing_name: mn, missing_address: ma, missing_email: me,
                missing_phone: mp, missing_limit: ml,
                missing_statement_date: ms, missing_due_date: md,
                total_missing: (mn?1:0)+(ma?1:0)+(me?1:0)+(mp?1:0)+(ml?1:0)+(ms?1:0)+(md?1:0)
            };
        });
    },

    // ── RESET (reload from Sheets) ────────────────────────────

    async reset() {
        await this.init();
    }
};
