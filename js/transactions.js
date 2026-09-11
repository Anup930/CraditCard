window.Transactions = {
    currentPage: 1,
    pageSize: 15,
    filters: {
        dateFrom: '',
        dateTo: '',
        cardId: '',
        type: '',
        search: ''
    },

    render: function(container) {
        this.container = container;
        this.container.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'page-header d-flex justify-content-between align-items-center mb-4';
        header.innerHTML = `
            <div>
                <h2 class="page-title">Transactions</h2>
                <div class="page-subtitle text-muted" id="txn-count">Loading transactions...</div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-outline-primary" onclick="window.DataImport.openModal('transactions')">
                    <i class="fas fa-file-import"></i> Import
                </button>
                <button class="btn btn-outline-primary" onclick="window.Transactions.exportExcel()">
                    <i class="fas fa-file-export"></i> Export to Excel
                </button>
            </div>
        `;

        const filterBar = document.createElement('div');
        filterBar.className = 'filter-bar card mb-4 p-3';
        
        const allCards = window.DB.cards.getAll() || [];
        
        filterBar.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">From Date</label>
                <input type="date" class="form-control" id="txnDateFrom" value="${this.filters.dateFrom}" onchange="window.Transactions.applyFilters()">
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">To Date</label>
                <input type="date" class="form-control" id="txnDateTo" value="${this.filters.dateTo}" onchange="window.Transactions.applyFilters()">
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">Card</label>
                <select class="form-select" id="txnCard" onchange="window.Transactions.applyFilters()" style="min-width: 200px;">
                    <option value="">All Cards</option>
                    ${allCards.map(c => `<option value="${c.card_id}" ${this.filters.cardId === c.card_id ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">Type</label>
                <select class="form-select" id="txnType" onchange="window.Transactions.applyFilters()">
                    <option value="">All Types</option>
                    <option value="Debit" ${this.filters.type === 'Debit' ? 'selected' : ''}>Debit</option>
                    <option value="Credit" ${this.filters.type === 'Credit' ? 'selected' : ''}>Credit</option>
                </select>
            </div>
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 200px;">
                <label class="form-label small text-muted mb-1">Search</label>
                <input type="text" class="form-control" id="txnSearch" placeholder="Search description..." value="${this.filters.search}" oninput="window.Transactions.applyFilters()" style="width: 100%;">
            </div>
        `;

        this.summaryWrapper = document.createElement('div');
        this.summaryWrapper.className = 'stats-row mb-4';

        this.tableWrapper = document.createElement('div');
        this.tableWrapper.className = 'data-table-wrapper card';

        this.container.appendChild(header);
        this.container.appendChild(filterBar);
        this.container.appendChild(this.summaryWrapper);
        this.container.appendChild(this.tableWrapper);

        this.renderData();
        // Make the Card filter searchable
        setTimeout(() => { window.Utils.makeSearchable('txnCard'); }, 50);
    },

    applyFilters: function() {
        this.filters.dateFrom = document.getElementById('txnDateFrom').value;
        this.filters.dateTo = document.getElementById('txnDateTo').value;
        this.filters.cardId = document.getElementById('txnCard').value;
        this.filters.type = document.getElementById('txnType').value;
        this.filters.search = document.getElementById('txnSearch').value.toLowerCase();
        this.currentPage = 1;
        this.renderData();
    },

    getFilteredData: function() {
        let txns = window.DB.transactions.getAll() || [];
        
        if (this.filters.dateFrom) {
            const fDate = new Date(this.filters.dateFrom);
            txns = txns.filter(t => new Date(t.txn_date) >= fDate);
        }
        if (this.filters.dateTo) {
            const tDate = new Date(this.filters.dateTo);
            tDate.setHours(23,59,59);
            txns = txns.filter(t => new Date(t.txn_date) <= tDate);
        }
        if (this.filters.cardId) txns = txns.filter(t => String(t.card_id) === String(this.filters.cardId));
        if (this.filters.type) txns = txns.filter(t => t.txn_type === this.filters.type);
        if (this.filters.search) txns = txns.filter(t => 
            String(t.description || '').toLowerCase().includes(this.filters.search) || 
            String(t.zoho_ledger || '').toLowerCase().includes(this.filters.search)
        );

        // Sort descending by date
        txns.sort((a,b) => new Date(b.txn_date) - new Date(a.txn_date));
        return txns;
    },

    renderData: function() {
        const txns = this.getFilteredData();
        const countEl = document.getElementById('txn-count');
        if(countEl) countEl.innerText = `${txns.length} transactions found`;

        // Calculate Summary
        let totalDebits = 0;
        let totalCredits = 0;
        txns.forEach(t => {
            if(t.txn_type === 'Debit') totalDebits += t.amount;
            else if(t.txn_type === 'Credit') totalCredits += t.amount;
        });
        const net = totalCredits - totalDebits;
        
        this.summaryWrapper.innerHTML = `
            <div class="col-md-4">
                <div class="card bg-danger text-white p-3 shadow-sm">
                    <h6 class="mb-1">Total Debits</h6>
                    <h3 class="mb-0">${window.Utils.formatCurrency(totalDebits)}</h3>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card bg-success text-white p-3 shadow-sm">
                    <h6 class="mb-1">Total Credits</h6>
                    <h3 class="mb-0">${window.Utils.formatCurrency(totalCredits)}</h3>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card ${net >= 0 ? 'bg-primary' : 'bg-warning text-dark'} text-white p-3 shadow-sm">
                    <h6 class="mb-1">Net Amount</h6>
                    <h3 class="mb-0">${window.Utils.formatCurrency(Math.abs(net))} ${net < 0 ? '(Dr)' : '(Cr)'}</h3>
                </div>
            </div>
        `;

        const pageSize = this.pageSize || 15;
        const pageData = window.Utils.paginate(txns.length, this.currentPage, pageSize);
        const currentData = txns.slice(pageData.start, pageData.end);
        
        const allCards = window.DB.cards.getAll() || [];
        const getCardInfo = (id) => {
            const c = allCards.find(card => card.card_id === id);
            return c ? `${c.cardholder_name} (*${c.card_last4})` : 'Unmapped';
        };

        let html = `
            <div class="table-responsive">
            <table class="data-table table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Date</th>
                        <th>Ledger</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th class="text-end">Amount</th>
                        <th>Category</th>
                        <th>Card</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if(currentData.length === 0) {
            html += `<tr><td colspan="9" class="text-center py-4 empty-state">No transactions match filters.</td></tr>`;
        } else {
            currentData.forEach(t => {
                const typeClass = t.txn_type === 'Credit' ? 'bg-success' : 'bg-danger';
                const amtColor = t.txn_type === 'Credit' ? 'text-success' : 'text-danger';
                
                html += `
                    <tr>
                        <td>${window.Utils.formatDate(t.txn_date)}</td>
                        <td>${window.Utils.escapeHtml(t.zoho_ledger || '')}</td>
                        <td title="${window.Utils.escapeHtml(t.description || '')}">${window.Utils.truncate(t.description || '', 40)}</td>
                        <td><span class="badge ${typeClass}">${t.txn_type}</span></td>
                        <td class="text-end fw-bold ${amtColor}">${window.Utils.formatCurrency(t.amount)}</td>
                        <td>${window.Utils.escapeHtml(t.category || '')}</td>
                        <td>${getCardInfo(t.card_id)}</td>
                        <td><span class="badge bg-secondary">${t.status || 'Imported'}</span></td>
                        <td>
                            <button class="btn btn-sm btn-icon text-primary" onclick="window.Transactions.viewTxn('${t.txn_id}')"><i class="fas fa-eye"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;

        html += `
        <div class="card-footer d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div class="pagination-info d-flex align-items-center gap-3">
                <span class="text-muted" style="font-size: 0.9rem;">Showing ${txns.length === 0 ? 0 : pageData.start + 1} to ${pageData.end} of ${txns.length} entries</span>
                <div class="d-flex align-items-center gap-2">
                    <span class="text-muted small" style="font-size: 0.85rem;">Rows:</span>
                    <select class="form-select form-select-sm" style="width: auto; cursor: pointer;" onchange="window.Transactions.changePageSize(this.value)">
                        <option value="15" ${pageSize == 15 ? 'selected' : ''}>15</option>
                        <option value="30" ${pageSize == 30 ? 'selected' : ''}>30</option>
                        <option value="50" ${pageSize == 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${pageSize == 100 ? 'selected' : ''}>100</option>
                        <option value="200" ${pageSize == 200 ? 'selected' : ''}>200</option>
                    </select>
                </div>
            </div>`;

        if (pageData.totalPages > 1) {
            html += `
            <ul class="pagination mb-0">
                <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.Transactions.goToPage(${this.currentPage - 1})">Prev</a>
                </li>
                <li class="page-item disabled"><a class="page-link" href="#">Page ${this.currentPage} of ${pageData.totalPages}</a></li>
                <li class="page-item ${this.currentPage === pageData.totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.Transactions.goToPage(${this.currentPage + 1})">Next</a>
                </li>
            </ul>`;
        }

        html += `</div>`;

        this.tableWrapper.innerHTML = html;
    },

    goToPage: function(page) {
        this.currentPage = page;
        this.renderData();
    },

    changePageSize: function(size) {
        this.pageSize = parseInt(size) || 15;
        this.currentPage = 1;
        this.renderData();
    },

    viewTxn: function(id) {
        const txns = window.DB.transactions.getAll() || [];
        const txn = txns.find(t => String(t.txn_id) === String(id));
        if(!txn) return;

        const allCards = window.DB.cards.getAll() || [];
        const card = allCards.find(c => c.card_id === txn.card_id);
        const cardStr = card ? `${card.cardholder_name} - ${card.bank_name} (*${card.card_last4})` : 'Unmapped';

        const html = `
            <div class="row">
                <div class="col-md-6 mb-2"><strong>Transaction ID:</strong> ${txn.txn_id}</div>
                <div class="col-md-6 mb-2"><strong>Date:</strong> ${window.Utils.formatDate(txn.txn_date)}</div>
                <div class="col-md-6 mb-2"><strong>Type:</strong> <span class="badge ${txn.txn_type==='Credit'?'bg-success':'bg-danger'}">${txn.txn_type}</span></div>
                <div class="col-md-6 mb-2"><strong>Amount:</strong> <span class="fw-bold ${txn.txn_type==='Credit'?'text-success':'text-danger'}">${window.Utils.formatCurrency(txn.amount)}</span></div>
                <div class="col-md-12 mb-2"><strong>Card:</strong> ${cardStr}</div>
                <div class="col-md-6 mb-2"><strong>Ledger Name:</strong> ${txn.zoho_ledger}</div>
                <div class="col-md-6 mb-2"><strong>Category:</strong> ${txn.category || ''}</div>
                <div class="col-md-6 mb-2"><strong>Import Batch ID:</strong> ${txn.import_batch_id || ''}</div>
                <div class="col-md-6 mb-2"><strong>Status:</strong> ${txn.status}</div>
                <div class="col-md-12 mb-2 mt-3"><strong>Description/Narration:</strong><br><p class="bg-light p-2 border rounded">${window.Utils.escapeHtml(txn.description || 'No description')}</p></div>
            </div>
        `;
        if(window.App && window.App.showModal) window.App.showModal("Transaction Details", html);
    },

    exportExcel: function() {
        if(!window.XLSX) return alert("XLSX library not loaded");
        
        const txns = this.getFilteredData();
        const allCards = window.DB.cards.getAll() || [];
        const exportData = txns.map(t => {
            const card = allCards.find(c => c.card_id === t.card_id);
            return {
                Date: window.Utils.formatDate(t.txn_date),
                Cardholder: card ? card.cardholder_name : 'Unmapped',
                Bank: card ? card.bank_name : '',
                'Card Last4': card ? card.card_last4 : '',
                Ledger: t.zoho_ledger,
                Description: t.description,
                Type: t.txn_type,
                Amount: t.amount,
                Category: t.category,
                Status: t.status
            };
        });

        const ws = window.XLSX.utils.json_to_sheet(exportData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        window.XLSX.writeFile(wb, "Transactions_Export.xlsx");
    }
};
