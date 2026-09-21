// ============================================================
//  DB.js — Enterprise 0ms In-Memory Engine & Encrypted Store
//  Standard Reference: Enterprise Specification BRD/FRD v2.0
//  Architecture:
//    - AES-GCM 256-bit Encrypted Local Cache (CryptoStore)
//    - 0ms In-Memory Query Engine (<2ms execution)
//    - Optimistic In-Place Mutation with Automatic Rollback
//    - Background Stale-While-Revalidate Cloud Synchronization
// ============================================================

var DB = {

    API_URL: 'https://script.google.com/macros/s/AKfycbydfpvZvdk2Mu3mfAtx3TzaYLk0SKupV4qZ5bHgBcO7zAF2fi0L6V5H6prDFfQ9hJcFdQ/exec',

    data: {
        credit_cards:   [],
        transactions:   [],
        statements:     [],
        payments:       [],
        categories:     [],
        import_batches: [],
        users:          [],
        audit_logs:     []
    },

    _isLoaded: false,
    _isSyncing: false,
    _lastSynced: null,
    _listeners: new Set(),

    // ── EVENT BUS (SUBSCRIBE & NOTIFY) ─────────────────────────

    subscribe(fn) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    },

    notify(event, payload) {
        this._listeners.forEach(fn => {
            try { fn(event, payload); } catch (e) { console.error('DB listener error:', e); }
        });
    },

    // ── HTTP HELPERS (GOOGLE APPS SCRIPT WEB APP) ──────────────

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

    async logActivity(module, action, details) {
        try {
            const user = JSON.parse(sessionStorage.getItem('ccms_user') || '{"user_id":"System", "username":"System"}');
            const logData = {
                log_id: this.nextId('audit_logs'),
                timestamp: new Date().toISOString(),
                user_id: user.user_id || 'System',
                username: user.username || 'System',
                module: module,
                action: action,
                details: details,
                created_at: new Date().toISOString()
            };
            this.data.audit_logs.unshift(logData);
            await this.saveToEncryptedStorage();
            // Dispatch asynchronously to backend
            this.apiPost({ action: 'add', sheet: 'audit_logs', data: logData }).catch(err => {
                console.warn('[DB] Failed to persist audit log to cloud:', err);
            });
        } catch(e) {
            console.error("Failed to log activity:", e);
        }
    },

    // ── ENCRYPTED STORAGE INTEGRATION (CRYPTO STORE) ───────────

    async loadFromEncryptedStorage() {
        if (typeof CryptoStore === 'undefined' || !CryptoStore.isReady()) {
            return false;
        }
        try {
            const stored = await CryptoStore.load('ccms_cache');
            if (stored && stored.data && Array.isArray(stored.data.credit_cards)) {
                this.data = stored.data;
                this._lastSynced = stored.lastSynced || null;
                this._isLoaded = true;
                console.log('[DB] Loaded instant dataset from AES-GCM Encrypted Storage (<10ms):', {
                    cards: this.data.credit_cards.length,
                    transactions: this.data.transactions.length,
                    lastSynced: this._lastSynced ? new Date(this._lastSynced).toLocaleTimeString() : 'N/A'
                });
                this.notify('loaded', { source: 'encrypted_cache', count: this.data.credit_cards.length });
                return true;
            }
        } catch (e) {
            console.warn('[DB] Could not load from encrypted storage:', e);
        }
        return false;
    },

    async saveToEncryptedStorage() {
        if (typeof CryptoStore === 'undefined' || !CryptoStore.isReady()) {
            return false;
        }
        try {
            await CryptoStore.save('ccms_cache', {
                data: this.data,
                lastSynced: this._lastSynced || Date.now()
            });
            return true;
        } catch (e) {
            console.warn('[DB] Encrypted save failed:', e);
            return false;
        }
    },

    // ── DATA NORMALIZATION ─────────────────────────────────────

    _normalizeDataset() {
        this.data.credit_cards.forEach(c => {
            c.card_id           = parseInt(c.card_id) || 0;
            c.credit_limit      = Utils.parseNum(c.credit_limit);
            c.fee_waiver_target = Utils.parseNum(c.fee_waiver_target);
            c.reward_points     = Utils.parseNum(c.reward_points);
            c.statement_date    = c.statement_date ? parseInt(c.statement_date) : null;
            c.due_date          = c.due_date ? parseInt(c.due_date) : null;
        });
        this.data.transactions.forEach(t => {
            t.txn_id  = parseInt(t.txn_id) || 0;
            t.amount  = Utils.parseNum(t.amount);
            t.card_id = parseInt(t.card_id) || null;
        });
        this.data.statements.forEach(s => {
            s.statement_id        = parseInt(s.statement_id) || 0;
            s.card_id             = parseInt(s.card_id) || 0;
            s.opening_balance     = Utils.parseNum(s.opening_balance);
            s.billed_amount       = Utils.parseNum(s.billed_amount);
            s.unbilled_amount     = Utils.parseNum(s.unbilled_amount);
            s.credits_payments    = Utils.parseNum(s.credits_payments);
            s.closing_outstanding = Utils.parseNum(s.closing_outstanding);
            s.minimum_due         = Utils.parseNum(s.minimum_due);
        });
        this.data.payments.forEach(p => {
            p.payment_id   = parseInt(p.payment_id) || 0;
            p.card_id      = parseInt(p.card_id) || 0;
            p.statement_id = parseInt(p.statement_id) || null;
            p.amount       = Utils.parseNum(p.amount);
        });
    },

    // ── CLOUD SYNCHRONIZATION ──────────────────────────────────

    async syncFromCloud(force = false) {
        if (this._isSyncing) return this.data;
        this._isSyncing = true;
        this.notify('sync_start');

        try {
            const [cards, txns, stmts, pmts, cats, batches, users, logs] = await Promise.all([
                this.apiGet({ action: 'getAll', sheet: 'credit_cards' }),
                this.apiGet({ action: 'getAll', sheet: 'transactions' }),
                this.apiGet({ action: 'getAll', sheet: 'statements' }),
                this.apiGet({ action: 'getAll', sheet: 'payments' }),
                this.apiGet({ action: 'getAll', sheet: 'categories' }),
                this.apiGet({ action: 'getAll', sheet: 'import_batches' }),
                this.apiGet({ action: 'getAll', sheet: 'users' }),
                this.apiGet({ action: 'getAll', sheet: 'audit_logs' })
            ]);

            this.data.credit_cards   = cards.data   || [];
            this.data.transactions   = txns.data    || [];
            this.data.statements     = stmts.data   || [];
            this.data.payments       = pmts.data    || [];
            this.data.categories     = cats.data    || [];
            this.data.import_batches = batches.data || [];
            this.data.users          = users.data   || [];
            this.data.audit_logs     = logs.data    || [];

            this._normalizeDataset();

            this._lastSynced = Date.now();
            this._isLoaded = true;
            this._isSyncing = false;

            // Encrypt and persist to local storage for 0ms next boot
            await this.saveToEncryptedStorage();

            console.log('[DB] Cloud Sync Completed & Encrypted:', {
                cards: this.data.credit_cards.length,
                transactions: this.data.transactions.length,
                timestamp: new Date(this._lastSynced).toISOString()
            });

            this.notify('sync_success', { 
                count: this.data.credit_cards.length, 
                lastSynced: this._lastSynced 
            });

            return this.data;
        } catch (err) {
            this._isSyncing = false;
            this.notify('sync_error', { error: err.message });
            console.error('[DB] Cloud Sync failed:', err);
            throw err;
        }
    },

    // ── INITIALIZATION (INSTANT 0ms BOOT) ──────────────────────

    async init() {
        try {
            // 1. First, attempt to load from AES-GCM Encrypted Storage (0ms perceived latency)
            const fromCache = await this.loadFromEncryptedStorage();
            if (fromCache && this.data.credit_cards.length > 0) {
                // If cache is older than 10 minutes, trigger background silent re-sync
                if (!this._lastSynced || (Date.now() - this._lastSynced) > 10 * 60 * 1000) {
                    this.syncFromCloud().catch(e => console.warn('[DB] Silent sync skipped:', e.message));
                }
                return true;
            }

            // 2. If no cache exists (first login or after wipe), fetch directly from Cloud
            await this.syncFromCloud();
            return true;
        } catch (err) {
            console.error('DB.init failed:', err);
            throw err;
        }
    },

    // ── NEXT ID (LOCAL CALCULATION) ────────────────────────────

    nextId(collection) {
        const items = this.data[collection] || [];
        const idField = { 
            credit_cards: 'card_id', 
            transactions: 'txn_id', 
            statements: 'statement_id', 
            payments: 'payment_id', 
            categories: 'category_id', 
            import_batches: 'batch_id', 
            users: 'user_id',
            audit_logs: 'log_id'
        }[collection] || 'id';

        if (!items.length) return 1;
        return Math.max(...items.map(i => parseInt(i[idField]) || 0)) + 1;
    },

    // ── CREDIT CARDS MODULE (OPTIMISTIC IN-PLACE MUTATIONS) ─────

    cards: {
        getAll(filters = {}) {
            let cards = [...DB.data.credit_cards];
            if (filters.search) {
                const s = filters.search.toLowerCase().trim();
                cards = cards.filter(c =>
                    (c.primary_cardholder || '').toLowerCase().includes(s) ||
                    (c.cardholder_name    || '').toLowerCase().includes(s) ||
                    (c.card_type         || '').toLowerCase().includes(s) ||
                    (c.zoho_ledger_name  || '').toLowerCase().includes(s) ||
                    String(c.card_last4  || '').includes(s) ||
                    String(c.card_number || '').includes(s)
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
            const tempId           = DB.nextId('credit_cards');
            card.card_id           = tempId;
            card.card_last4        = Utils.getLast4(card.card_number);
            card.bank_name         = card.bank_name || Utils.extractBankName(card.card_type);
            card.credit_limit      = Utils.parseNum(card.credit_limit);
            card.fee_waiver_target = Utils.parseNum(card.fee_waiver_target);
            card.reward_points     = Utils.parseNum(card.reward_points);
            card.status            = card.status || 'Active';
            card.created_at        = Utils.now();
            card.updated_at        = Utils.now();

            // 1. Optimistic In-Place Update
            DB.data.credit_cards.unshift(card);
            await DB.saveToEncryptedStorage();
            DB.notify('card_added', { card });

            // 2. Asynchronous Cloud Write with Rollback
            try {
                const res = await DB.apiPost({ action: 'add', sheet: 'credit_cards', data: card });
                if (res.id && res.id !== tempId) {
                    card.card_id = res.id;
                    await DB.saveToEncryptedStorage();
                }
                DB.logActivity('Credit Cards', 'Add', `Added card: ${card.bank_name} - ${card.card_last4} for ${card.cardholder_name}`);
                return card.card_id;
            } catch (err) {
                // Rollback on failure
                DB.data.credit_cards = DB.data.credit_cards.filter(c => c.card_id !== tempId);
                await DB.saveToEncryptedStorage();
                DB.notify('card_rollback', { tempId });
                throw new Error('Failed to save card to cloud: ' + err.message);
            }
        },

        async update(id, data) {
            const idx = DB.data.credit_cards.findIndex(c => String(c.card_id) === String(id));
            if (idx === -1) return false;

            // Save snapshot for rollback
            const backup = { ...DB.data.credit_cards[idx] };

            data.updated_at = Utils.now();
            if (data.card_number) data.card_last4 = Utils.getLast4(data.card_number);
            if (data.card_type)   data.bank_name  = data.bank_name || Utils.extractBankName(data.card_type);
            
            // 1. In-Place Mutation
            Object.assign(DB.data.credit_cards[idx], data);
            await DB.saveToEncryptedStorage();
            DB.notify('card_updated', { id, card: DB.data.credit_cards[idx] });

            // 2. Async Cloud Update
            try {
                await DB.apiPost({ action: 'update', sheet: 'credit_cards', id: id, data: data });
                DB.logActivity('Credit Cards', 'Update', `Updated card ID ${id}`);
                return true;
            } catch (err) {
                // Rollback
                DB.data.credit_cards[idx] = backup;
                await DB.saveToEncryptedStorage();
                DB.notify('card_updated', { id, card: backup });
                throw new Error('Cloud update failed: ' + err.message);
            }
        },

        async delete(id) {
            const idx = DB.data.credit_cards.findIndex(c => String(c.card_id) === String(id));
            if (idx === -1) return false;

            const backup = DB.data.credit_cards[idx];

            // 1. In-Place Mutation
            DB.data.credit_cards.splice(idx, 1);
            await DB.saveToEncryptedStorage();
            DB.notify('card_deleted', { id });

            // 2. Async Cloud Delete
            try {
                await DB.apiPost({ action: 'delete', sheet: 'credit_cards', id: id });
                DB.logActivity('Credit Cards', 'Delete', `Deleted card ID ${id}`);
                return true;
            } catch (err) {
                // Rollback
                DB.data.credit_cards.splice(idx, 0, backup);
                await DB.saveToEncryptedStorage();
                DB.notify('card_added', { card: backup });
                throw new Error('Cloud delete failed: ' + err.message);
            }
        },

        getByOwner(name)  { return DB.data.credit_cards.filter(c => c.primary_cardholder === name); },
        getPrimary()      { return DB.data.credit_cards.filter(c => c.card_category === 'Primary'); },
        getOwners()       { return [...new Set(DB.data.credit_cards.map(c => c.primary_cardholder))].filter(Boolean).sort(); },
        getBanks()        { return [...new Set(DB.data.credit_cards.map(c => c.bank_name).filter(Boolean))].sort(); }
    },

    // ── TRANSACTIONS MODULE ────────────────────────────────────

    transactions: {
        getAll(filters = {}) {
            let txns = [...DB.data.transactions];
            if (filters.card_id)  txns = txns.filter(t => String(t.card_id) === String(filters.card_id));
            if (filters.category) txns = txns.filter(t => t.category === filters.category);
            if (filters.txn_type) txns = txns.filter(t => t.txn_type === filters.txn_type);
            if (filters.dateFrom) txns = txns.filter(t => t.txn_date >= filters.dateFrom);
            if (filters.dateTo)   txns = txns.filter(t => t.txn_date <= filters.dateTo);
            if (filters.search) {
                const s = filters.search.toLowerCase().trim();
                txns = txns.filter(t =>
                    (t.description || '').toLowerCase().includes(s) ||
                    (t.zoho_ledger || '').toLowerCase().includes(s)
                );
            }
            return txns.sort((a, b) => (b.txn_date || '').localeCompare(a.txn_date || ''));
        },

        async add(txn) {
            const tempId   = DB.nextId('transactions');
            txn.txn_id     = tempId;
            txn.amount     = Utils.parseNum(txn.amount);
            txn.created_at = Utils.now();

            // Optimistic update
            DB.data.transactions.unshift(txn);
            await DB.saveToEncryptedStorage();
            DB.notify('txn_added', { txn });

            try {
                const res = await DB.apiPost({ action: 'add', sheet: 'transactions', data: txn });
                if (res.id) txn.txn_id = res.id;
                await DB.saveToEncryptedStorage();
                DB.logActivity('Transactions', 'Add', `Added ${txn.txn_type} of ${txn.amount} on ${txn.txn_date}`);
                return txn.txn_id;
            } catch (err) {
                DB.data.transactions = DB.data.transactions.filter(t => t.txn_id !== tempId);
                await DB.saveToEncryptedStorage();
                throw err;
            }
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
                if (isDup) { 
                    results.duplicates.push({ ...r, error: 'Duplicate' }); 
                    return; 
                }

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
                toInsert.push(txn);
                results.valid.push(txn);
            });

            if (toInsert.length > 0) {
                // In-place mutation
                DB.data.transactions.unshift(...toInsert);
                await DB.saveToEncryptedStorage();
                DB.notify('txns_batch_added', { count: toInsert.length });

                // Asynchronous Cloud push
                try {
                    await DB.apiPost({ action: 'addBatch', sheet: 'transactions', records: toInsert });
                    DB.logActivity('Transactions', 'Import', `Imported ${toInsert.length} transactions`);
                } catch(err) {
                    console.error('[DB] Cloud batch import failed:', err);
                    // Retain in local memory with warning
                }
            }
            return results;
        },

        getByCard(cardId) { return DB.data.transactions.filter(t => String(t.card_id) === String(cardId)); },
        getCategories()   { return [...new Set(DB.data.transactions.map(t => t.category).filter(Boolean))].sort(); }
    },

    // ── STATEMENTS MODULE ──────────────────────────────────────

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

            DB.data.statements.unshift(stmt);
            await DB.saveToEncryptedStorage();
            DB.notify('statement_added', { stmt });

            try {
                await DB.apiPost({ action: 'add', sheet: 'statements', data: stmt });
                DB.logActivity('Statements', 'Add', `Added statement for month ${stmt.statement_month}`);
                return stmt.statement_id;
            } catch(err) {
                console.error('[DB] Statement save failed on cloud:', err);
                return stmt.statement_id;
            }
        },

        async update(id, data) {
            const idx = DB.data.statements.findIndex(s => String(s.statement_id) === String(id));
            if (idx === -1) return false;

            Object.assign(DB.data.statements[idx], data);
            await DB.saveToEncryptedStorage();
            DB.notify('statement_updated', { id, statement: DB.data.statements[idx] });

            try {
                await DB.apiPost({ action: 'update', sheet: 'statements', id: id, data: data });
                DB.logActivity('Statements', 'Update', `Updated statement ID ${id}`);
                return true;
            } catch(err) {
                console.error('[DB] Statement update failed on cloud:', err);
                return true;
            }
        },

        getByCard(cardId) {
            return DB.data.statements
                .filter(s => String(s.card_id) === String(cardId))
                .sort((a, b) => (b.statement_month || '').localeCompare(a.statement_month || ''));
        }
    },

    // ── PAYMENTS MODULE ────────────────────────────────────────

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

            // In-place update
            DB.data.payments.unshift(pmt);

            // Also automatically mark statement as Paid / update credits if linked
            if (pmt.statement_id) {
                const stmt = DB.data.statements.find(s => String(s.statement_id) === String(pmt.statement_id));
                if (stmt) {
                    stmt.credits_payments = (Utils.parseNum(stmt.credits_payments) || 0) + pmt.amount;
                    if (stmt.credits_payments >= stmt.closing_outstanding) {
                        stmt.payment_status = 'Paid';
                    } else if (stmt.credits_payments > 0) {
                        stmt.payment_status = 'Partial';
                    }
                }
            }

            await DB.saveToEncryptedStorage();
            DB.notify('payment_added', { pmt });

            try {
                await DB.apiPost({ action: 'add', sheet: 'payments', data: pmt });
                DB.logActivity('Payments', 'Add', `Added payment of ${pmt.amount} via ${pmt.payment_mode}`);
                return pmt.payment_id;
            } catch(err) {
                console.error('[DB] Cloud payment push failed:', err);
                return pmt.payment_id;
            }
        },

        getByCard(cardId) { return DB.data.payments.filter(p => String(p.card_id) === String(cardId)); }
    },

    // ── CATEGORIES MODULE ──────────────────────────────────────

    categories: {
        getAll() { return [...DB.data.categories]; },
        async add(cat) {
            cat.category_id = DB.nextId('categories');
            DB.data.categories.push(cat);
            await DB.saveToEncryptedStorage();
            await DB.apiPost({ action: 'add', sheet: 'categories', data: cat });
            DB.logActivity('Categories', 'Add', `Added category: ${cat.category_name}`);
            return cat.category_id;
        }
    },

    // ── USERS MODULE ───────────────────────────────────────────

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
            await DB.saveToEncryptedStorage();
            await DB.apiPost({ action: 'add', sheet: 'users', data: usr });
            DB.logActivity('Users', 'Add', `Added user: ${usr.username}`);
            return usr.user_id;
        },

        async update(id, data) {
            const idx = DB.data.users.findIndex(u => String(u.user_id) === String(id));
            if (idx === -1) return false;
            data.updated_at = Utils.now();
            Object.assign(DB.data.users[idx], data);
            await DB.saveToEncryptedStorage();
            await DB.apiPost({ action: 'update', sheet: 'users', id: id, data: data });
            DB.logActivity('Users', 'Update', `Updated user ID ${id}`);
            return true;
        },

        async delete(id) {
            DB.data.users = DB.data.users.filter(u => String(u.user_id) !== String(id));
            await DB.saveToEncryptedStorage();
            await DB.apiPost({ action: 'delete', sheet: 'users', id: id });
            DB.logActivity('Users', 'Delete', `Deleted user ID ${id}`);
        }
    },

    // ── IMPORT BATCHES MODULE ──────────────────────────────────

    importBatches: {
        getAll() {
            return [...DB.data.import_batches].sort((a, b) => (b.import_date || '').localeCompare(a.import_date || ''));
        },
        async add(batch) {
            batch.batch_id    = DB.nextId('import_batches');
            batch.import_date = batch.import_date || Utils.now();
            DB.data.import_batches.unshift(batch);
            await DB.saveToEncryptedStorage();
            await DB.apiPost({ action: 'add', sheet: 'import_batches', data: batch });
            DB.logActivity('Import', 'Add Batch', `Imported batch ${batch.file_name} with ${batch.valid_records} records`);
            return batch.batch_id;
        }
    },

    // ── EXCEL BACKUP & IMPORT ──────────────────────────────────

    exportToExcel() {
        if (typeof XLSX === 'undefined') { alert('SheetJS not loaded.'); return; }
        const wb = XLSX.utils.book_new();
        Object.keys(this.data).forEach(key => {
            if (key === 'users') return; // Skip users for safety
            const ws = XLSX.utils.json_to_sheet(this.data[key]);
            XLSX.utils.book_append_sheet(wb, ws, key);
        });
        XLSX.writeFile(wb, 'ccms_backup_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    },

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
                    await DB.syncFromCloud(true);
                    resolve(DB.data);
                } catch(err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    // ── LOGIN AUTHENTICATION ───────────────────────────────────

    async login(username, password) {
        const res = await this.apiPost({ action: 'login', data: { username, password } });
        return res;
    },

    // ── KPIS (CALCULATED IN-MEMORY <1ms) ───────────────────────

    getKPIs() {
        const cards     = this.data.credit_cards.filter(c => c.status === 'Active');
        const primary   = cards.filter(c => c.card_category === 'Primary');
        const stmts     = this.data.statements;

        const totalLimit   = cards.reduce((s, c) => s + Utils.parseNum(c.credit_limit), 0);
        const totalRewards = cards.reduce((s, c) => s + Utils.parseNum(c.reward_points), 0);

        let totalPayable = 0, totalUnbilled = 0, over50 = 0;

        cards.forEach(c => {
            const cs = stmts.filter(s => String(s.card_id) === String(c.card_id))
                            .sort((a, b) => (b.statement_month || '').localeCompare(a.statement_month || ''));
            if (cs.length) {
                const latestStmt = cs[0];
                const out = latestStmt.payment_status === 'Paid' ? 0 : Utils.parseNum(latestStmt.closing_outstanding);
                const unb = Utils.parseNum(latestStmt.unbilled_amount);
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
            totalCards: cards.length, 
            primaryCards: primary.length,
            totalLimit, 
            totalPayable, 
            totalUnbilled, 
            totalRewards,
            usedLimit, 
            availableLimit: Math.max(0, totalLimit - usedLimit),
            over50Count: over50, 
            feeWaiverBalance: feeWaiver
        };
    },

    // ── DATA HYGIENE (AUDIT IN-MEMORY <1ms) ─────────────────────

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
                card_id: c.card_id, 
                cardholder_name: c.cardholder_name,
                primary_cardholder: c.primary_cardholder, 
                bank_name: c.bank_name, 
                card_last4: c.card_last4,
                missing_name: mn, 
                missing_address: ma, 
                missing_email: me,
                missing_phone: mp, 
                missing_limit: ml,
                missing_statement_date: ms, 
                missing_due_date: md,
                total_missing: (mn?1:0)+(ma?1:0)+(me?1:0)+(mp?1:0)+(ml?1:0)+(ms?1:0)+(md?1:0)
            };
        });
    },

    // ── 100% PURGE STANDBY ─────────────────────────────────────

    clear() {
        this.data = {
            credit_cards:   [],
            transactions:   [],
            statements:     [],
            payments:       [],
            categories:     [],
            import_batches: [],
            users:          [],
            audit_logs:     []
        };
        this._isLoaded = false;
        this._lastSynced = null;
        console.log('[DB] In-memory datastore cleared.');
    }
};

if (typeof window !== 'undefined') {
    window.DB = DB;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DB;
}
