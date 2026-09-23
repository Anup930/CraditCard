window.Payments = {
    currentTab: 'statements',

    render: function(container) {
        this.container = container;
        
        const html = `
            <div class="page-header mb-4">
                <h2 class="page-title">Statements & Payments</h2>
            </div>
            
            <div class="tabs mb-4">
                <div class="tab ${this.currentTab === 'statements' ? 'active' : ''}" onclick="window.Payments.switchTab('statements')">
                    Statements
                </div>
                <div class="tab ${this.currentTab === 'unbilled' ? 'active' : ''}" onclick="window.Payments.switchTab('unbilled')">
                    Unbilled Spends
                </div>
                <div class="tab ${this.currentTab === 'payments' ? 'active' : ''}" onclick="window.Payments.switchTab('payments')">
                    Payments History
                </div>
                <div class="tab ${this.currentTab === 'outstanding' ? 'active' : ''}" onclick="window.Payments.switchTab('outstanding')" style="${this.currentTab === 'outstanding' ? 'color: var(--danger); border-bottom-color: var(--danger);' : ''}">
                    Outstanding Dues
                </div>
            </div>

            <div id="payments-content"></div>
        `;
        
        this.container.innerHTML = html;
        this.renderTabContent();
    },

    switchTab: function(tab) {
        this.currentTab = tab;
        this.render(this.container);
    },

    renderTabContent: function() {
        const content = document.getElementById('payments-content');
        if(this.currentTab === 'statements') this.renderStatements(content);
        else if(this.currentTab === 'unbilled') this.renderUnbilled(content);
        else if(this.currentTab === 'payments') this.renderPayments(content);
        else if(this.currentTab === 'outstanding') this.renderOutstanding(content);
    },

    renderStatements: function(content) {
        const statements = window.DB.statements.getAll() || [];
        statements.sort((a,b) => new Date(b.due_date || 0) - new Date(a.due_date || 0));
        
        let html = `
            <div class="card data-table-wrapper table-responsive mb-4">
                <div class="table-toolbar">
                    <h4 class="card-title mb-0">All Statements</h4>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary" onclick="window.DataImport.openModal('statements')"><i class="fas fa-file-import"></i> Import</button>
                        <button class="btn btn-primary" onclick="window.Payments.showStatementModal()"><i class="fas fa-plus"></i> Add Statement</button>
                    </div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Card</th>
                            <th>Month</th>
                            <th class="text-right">Opening</th>
                            <th class="text-right">Billed</th>
                            <th class="text-right">Credits/Pmts</th>
                            <th class="text-right text-danger">Outstanding</th>
                            <th class="text-right text-muted">Min Due</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const allCards = window.DB.cards.getAll() || [];
        const getCardStr = (id) => { const c = allCards.find(x => String(x.card_id) === String(id)); return c ? `${c.cardholder_name} (*${c.card_last4})` : 'Unknown'; };

        if(statements.length === 0) {
            html += `<tr><td colspan="10" class="text-center py-4">No statements recorded.</td></tr>`;
        } else {
            statements.forEach(s => {
                let statusBadge = 'bg-secondary';
                if(s.payment_status === 'Paid') statusBadge = 'bg-success';
                else if(s.payment_status === 'Overdue') statusBadge = 'bg-danger';
                else if(s.payment_status === 'Partial') statusBadge = 'bg-warning text-dark';
                else if(s.payment_status === 'Pending') statusBadge = 'bg-info text-dark';

                const hasPayment = (window.DB.payments.getAll() || []).some(p => String(p.statement_id) === String(s.statement_id));

                html += `
                    <tr>
                        <td>${getCardStr(s.card_id)}</td>
                        <td>${window.Utils.formatMonthYear(s.statement_month)}</td>
                        <td class="text-right">${window.Utils.formatCurrency(s.opening_balance)}</td>
                        <td class="text-right">${window.Utils.formatCurrency(s.billed_amount)}</td>
                        <td class="text-right text-success">${window.Utils.formatCurrency(s.credits_payments)}</td>
                        <td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(s.closing_outstanding)}</td>
                        <td class="text-right text-muted">${window.Utils.formatCurrency(s.minimum_due)}</td>
                        <td>${window.Utils.formatDate(s.due_date)}</td>
                        <td><span class="badge ${statusBadge}">${s.payment_status}</span></td>
                        <td>
                            <div class="actions" style="align-items: center;">
                                <button class="btn btn-sm btn-icon text-primary" title="View Details" onclick="window.Payments.viewStatement('${s.statement_id}')"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-sm btn-icon text-warning" title="Edit Statement" onclick="window.Payments.showStatementModal('${s.statement_id}')"><i class="fas fa-edit"></i></button>
                                ${hasPayment 
                                    ? `<button class="btn btn-sm btn-outline-info ms-1" onclick="window.Payments.viewStatement('${s.statement_id}')">Payment Details</button>` 
                                    : `<button class="btn btn-sm btn-outline-success ms-1" onclick="window.Payments.showPaymentModal('${s.card_id}', '${s.statement_id}')">Pay</button>`
                                }
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    },

    renderPayments: function(content) {
        const payments = window.DB.payments.getAll() || [];
        payments.sort((a,b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0));
        
        let html = `
            <div class="card data-table-wrapper table-responsive mb-4">
                <div class="table-toolbar">
                    <h4 class="card-title mb-0">Payment History</h4>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary" onclick="window.DataImport.openModal('payments')"><i class="fas fa-file-import"></i> Import</button>
                        <button class="btn btn-success" onclick="window.Payments.showPaymentModal()"><i class="fas fa-plus"></i> Record Payment</button>
                    </div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Card</th>
                            <th class="text-right">Amount</th>
                            <th>Mode</th>
                            <th>Reference No</th>
                            <th>Statement</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const allCards = window.DB.cards.getAll() || [];
        const allStmts = window.DB.statements.getAll() || [];
        
        if(payments.length === 0) {
            html += `<tr><td colspan="7" class="text-center py-4">No payments recorded.</td></tr>`;
        } else {
            payments.forEach(p => {
                const c = allCards.find(x => String(x.card_id) === String(p.card_id));
                const s = allStmts.find(x => String(x.statement_id) === String(p.statement_id));
                const cardStr = c ? `${c.cardholder_name} (*${c.card_last4})` : 'Unknown';
                const stmtStr = s ? window.Utils.formatMonthYear(s.statement_month) : 'N/A';
                
                html += `
                    <tr>
                        <td>${window.Utils.formatDate(p.payment_date)}</td>
                        <td>${cardStr}</td>
                        <td class="text-right fw-bold text-success">${window.Utils.formatCurrency(p.amount)}</td>
                        <td>${p.payment_mode}</td>
                        <td>${p.reference_no || '-'}</td>
                        <td>${stmtStr}</td>
                        <td><span class="badge bg-success">${p.status}</span></td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    },

    renderOutstanding: function(content) {
        const statements = window.DB.statements.getAll() || [];
        const allCards = window.DB.cards.getAll() || [];
        
        const outstanding = statements.filter(s => s.payment_status !== 'Paid' && s.closing_outstanding > 0);
        outstanding.sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
        
        let totalOut = 0;
        let totalOver = 0;
        const today = new Date();
        
        outstanding.forEach(s => {
            totalOut += s.closing_outstanding;
            if(new Date(s.due_date) < today) totalOver += s.closing_outstanding;
        });

        let html = `
            <div class="stats-row mb-4">
                <div class="col-md-4">
                    <div class="card bg-danger text-white p-3 shadow-sm">
                        <h6 class="mb-1">Total Outstanding</h6>
                        <h3 class="mb-0">${window.Utils.formatCurrency(totalOut)}</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-dark text-white p-3 shadow-sm">
                        <h6 class="mb-1">Total Overdue</h6>
                        <h3 class="mb-0">${window.Utils.formatCurrency(totalOver)}</h3>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-warning text-dark p-3 shadow-sm">
                        <h6 class="mb-1">Pending Statements</h6>
                        <h3 class="mb-0">${outstanding.length}</h3>
                    </div>
                </div>
            </div>

            <div class="card data-table-wrapper table-responsive mb-4">
                <div class="table-toolbar">
                    <h4 class="card-title mb-0">Outstanding Statements</h4>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Due Date</th>
                            <th>Card</th>
                            <th>Bank</th>
                            <th>Month</th>
                            <th class="text-right">Amount Due</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if(outstanding.length === 0) {
            html += `<tr><td colspan="7" class="text-center py-4 text-success"><i class="fas fa-check-circle me-2"></i>All dues are cleared!</td></tr>`;
        } else {
            outstanding.forEach(s => {
                const c = allCards.find(x => String(x.card_id) === String(s.card_id));
                const isOverdue = new Date(s.due_date) < today;
                const statusBadge = isOverdue ? 'bg-danger' : 'bg-warning text-dark';
                const statusText = isOverdue ? 'Overdue' : 'Pending';
                
                let daysStr = '';
                if(isOverdue) {
                    const diffTime = Math.abs(today - new Date(s.due_date));
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    daysStr = `<small class="text-danger d-block">${diffDays} days overdue</small>`;
                }

                html += `
                    <tr class="${isOverdue ? 'table-danger' : ''}">
                        <td><strong class="${isOverdue ? 'text-danger' : ''}">${window.Utils.formatDate(s.due_date)}</strong>${daysStr}</td>
                        <td>${c ? c.cardholder_name : 'Unknown'} (*${c ? c.card_last4 : ''})</td>
                        <td>${c ? c.bank_name : ''}</td>
                        <td>${window.Utils.formatMonthYear(s.statement_month)}</td>
                        <td class="text-right fw-bold">${window.Utils.formatCurrency(s.closing_outstanding)}</td>
                        <td><span class="badge ${statusBadge}">${statusText}</span></td>
                        <td>
                            <div class="actions" style="align-items: center;">
                                <button class="btn btn-sm btn-icon text-primary" title="View Details" onclick="window.Payments.viewStatement('${s.statement_id}')"><i class="fas fa-eye"></i></button>
                                ${s.payment_status === 'Paid' || parseFloat(s.closing_outstanding) <= 0 
                                    ? `<button class="btn btn-sm btn-outline-info ms-2" onclick="window.Payments.viewStatement('${s.statement_id}')">Payment Details</button>`
                                    : `<button class="btn btn-sm btn-success ms-2" onclick="window.Payments.showPaymentModal('${s.card_id}', '${s.statement_id}')">Pay Now</button>`
                                }
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table></div>`;
        content.innerHTML = html;
    },

    viewStatement: function(stmtId) {
        const stmts = window.DB.statements.getAll() || [];
        const s = stmts.find(x => String(x.statement_id) === String(stmtId));
        if(!s) return;

        const allCards = window.DB.cards.getAll() || [];
        const c = allCards.find(x => String(x.card_id) === String(s.card_id)) || {};

        const stmtPayments = (window.DB.payments.getAll() || []).filter(p => String(p.statement_id) === String(s.statement_id));
        
        let paymentsRows = '';
        if (stmtPayments.length === 0) {
            paymentsRows = `<tr><td colspan="4" class="text-center py-3 text-muted">No payments recorded for this statement.</td></tr>`;
        } else {
            stmtPayments.forEach(p => {
                paymentsRows += `
                    <tr>
                        <td>${window.Utils.formatDate(p.payment_date)}</td>
                        <td class="text-right">${window.Utils.formatCurrency(p.amount)}</td>
                        <td>${p.payment_mode}</td>
                        <td>${p.reference_no || '-'}</td>
                    </tr>
                `;
            });
        }

        const html = `
            <style>
                #modal { max-width: 650px !important; }
                .stmt-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
                .stmt-section-title { background: #f8fafc; padding: 12px 16px; font-weight: 600; font-size: 0.95rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                .stmt-row { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
                .stmt-row:last-child { border-bottom: none; }
                .stmt-row .label { color: #64748b; }
                .stmt-row .value { font-weight: 500; color: #1e293b; text-align: right; }
                .stmt-row.highlight { background: #e0f2fe; font-weight: 600; }
                .stmt-row.highlight .label { color: #0369a1; }
                .stmt-row.highlight .value { color: #0369a1; background: #bae6fd; padding: 2px 6px; border-radius: 4px; }
                .pmt-table { width: 100%; font-size: 0.85rem; }
                .pmt-table th { color: #64748b; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 0.7rem; }
                .pmt-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
                .pmt-table tr:last-child td { border-bottom: none; }
            </style>

            <div class="stmt-section mt-2">
                <div class="stmt-row">
                    <span class="label">Statement Month</span>
                    <span class="value">${window.Utils.formatMonthYear(s.statement_month)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Payment due date</span>
                    <span class="value">${window.Utils.formatDate(s.due_date)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Opening balance</span>
                    <span class="value">${window.Utils.formatCurrency(s.opening_balance)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Billed this cycle</span>
                    <span class="value">${window.Utils.formatCurrency(s.billed_amount)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Credits / payments</span>
                    <span class="value">${window.Utils.formatCurrency(s.credits_payments)}</span>
                </div>
                <div class="stmt-row highlight">
                    <span class="label">Total amount due</span>
                    <span class="value">${window.Utils.formatCurrency(s.closing_outstanding)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Minimum due</span>
                    <span class="value">${window.Utils.formatCurrency(s.minimum_due)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Unbilled amount</span>
                    <span class="value">${window.Utils.formatCurrency(s.unbilled_amount)}</span>
                </div>
            </div>

            <div class="stmt-section">
                <div class="stmt-section-title">
                    <span>Card & limits</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Cardholder</span>
                    <span class="value">${c.cardholder_name || '-'}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Primary owner</span>
                    <span class="value">${c.primary_cardholder || '-'}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Zoho ledger</span>
                    <span class="value">${c.zoho_ledger_name || '-'}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Credit limit</span>
                    <span class="value">${window.Utils.formatCurrency(c.credit_limit)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Available limit</span>
                    <span class="value">${window.Utils.formatCurrency(Math.max(0, (c.credit_limit || 0) - (s.closing_outstanding || 0) - (s.unbilled_amount || 0)))}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Reward points</span>
                    <span class="value">${c.reward_points || 0}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Paid to date</span>
                    <span class="value">${window.Utils.formatCurrency(s.credits_payments)}</span>
                </div>
                <div class="stmt-row">
                    <span class="label">Still due</span>
                    <span class="value fw-bold">${window.Utils.formatCurrency(s.closing_outstanding)}</span>
                </div>
            </div>

            <div class="stmt-section">
                <div class="stmt-section-title">
                    <span>Payments against this statement</span>
                    <span class="text-muted fw-normal" style="font-size: 0.8rem;">${stmtPayments.length} recorded</span>
                </div>
                <table class="pmt-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th class="text-right">Amount</th>
                            <th>Mode</th>
                            <th>Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsRows}
                    </tbody>
                </table>
            </div>

            <div class="text-end pt-2 d-flex justify-content-center gap-2">
                <button class="btn btn-outline-secondary px-4 bg-white" onclick="window.App.closeModal()">Close</button>
                <button class="btn btn-outline-primary px-4 bg-white border-dark text-dark" onclick="window.App.closeModal(); setTimeout(() => window.Payments.showStatementModal('${s.statement_id}'), 300)">Edit statement</button>
                <button class="btn btn-primary px-4" style="background:#205e7e;border-color:#205e7e;" onclick="window.App.closeModal(); setTimeout(() => window.Payments.showPaymentModal('${s.card_id}', '${s.statement_id}'), 300)">Add another payment</button>
            </div>
        `;
        if(window.App && window.App.showModal) window.App.showModal("Statement Details", html);
    },

    renderUnbilled: function(content) {
        const allCards = window.DB.cards.getAll() || [];
        const unbilledRecords = window.DB.unbilled.getAll() || [];
        
        this.unbilledCardFilter = this.unbilledCardFilter || 'all';
        this.unbilledStatusFilter = this.unbilledStatusFilter || 'Unbilled';
        this.unbilledMonthFilter = this.unbilledMonthFilter || 'all';

        let filtered = unbilledRecords;
        if (this.unbilledCardFilter !== 'all') {
            filtered = filtered.filter(u => String(u.card_id) === String(this.unbilledCardFilter));
        }
        if (this.unbilledStatusFilter !== 'all') {
            filtered = filtered.filter(u => (u.status || 'Unbilled') === this.unbilledStatusFilter);
        }
        if (this.unbilledMonthFilter !== 'all') {
            filtered = filtered.filter(u => u.expected_statement_month === this.unbilledMonthFilter);
        }

        const totalPending = unbilledRecords.filter(u => (u.status || 'Unbilled') === 'Unbilled')
            .reduce((s, u) => s + (window.Utils.parseNum(u.amount) || 0), 0);
        const totalBilled = unbilledRecords.filter(u => u.status === 'Billed')
            .reduce((s, u) => s + (window.Utils.parseNum(u.amount) || 0), 0);

        const months = [...new Set(unbilledRecords.map(u => u.expected_statement_month).filter(Boolean))].sort();

        let html = `
            <div class="stats-row mb-4">
                <div class="col-md-6">
                    <div class="card p-3 shadow-sm" style="background:#fff7ed;border-left:4px solid #f97316;">
                        <h6 class="text-muted mb-1">Total Pending Unbilled</h6>
                        <h3 class="mb-0 text-dark fw-bold" style="color:#c2410c !important;">${window.Utils.formatCurrency(totalPending)}</h3>
                        <small class="text-muted">Awaiting statement billing</small>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card p-3 shadow-sm" style="background:#f0fdf4;border-left:4px solid #22c55e;">
                        <h6 class="text-muted mb-1">Total Closed / Billed</h6>
                        <h3 class="mb-0 text-dark fw-bold" style="color:#15803d !important;">${window.Utils.formatCurrency(totalBilled)}</h3>
                        <small class="text-muted">Reconciled into statements</small>
                    </div>
                </div>
            </div>

            <div class="card data-table-wrapper table-responsive mb-4">
                <div class="table-toolbar flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <h4 class="card-title mb-0 me-2">Unbilled Spends</h4>
                        <select class="form-select form-select-sm" style="width:auto;" onchange="window.Payments.unbilledCardFilter=this.value; window.Payments.renderTabContent();">
                            <option value="all">All Cards</option>
                            ${allCards.map(c => `<option value="${c.card_id}" ${String(this.unbilledCardFilter) === String(c.card_id) ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                        </select>
                        <select class="form-select form-select-sm" style="width:auto;" onchange="window.Payments.unbilledStatusFilter=this.value; window.Payments.renderTabContent();">
                            <option value="all" ${this.unbilledStatusFilter === 'all' ? 'selected' : ''}>All Status</option>
                            <option value="Unbilled" ${this.unbilledStatusFilter === 'Unbilled' ? 'selected' : ''}>Pending (Unbilled)</option>
                            <option value="Billed" ${this.unbilledStatusFilter === 'Billed' ? 'selected' : ''}>Closed (Billed)</option>
                        </select>
                        <select class="form-select form-select-sm" style="width:auto;" onchange="window.Payments.unbilledMonthFilter=this.value; window.Payments.renderTabContent();">
                            <option value="all">All Expected Months</option>
                            ${months.map(m => `<option value="${m}" ${this.unbilledMonthFilter === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary" onclick="window.DataImport.openModal('unbilled')"><i class="fas fa-file-import"></i> Import</button>
                        <button class="btn btn-primary" onclick="window.Payments.showUnbilledModal()"><i class="fas fa-plus"></i> Add Unbilled Txn</button>
                    </div>
                </div>

                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Card</th>
                            <th>Description</th>
                            <th>Expected Month</th>
                            <th class="text-right">Amount</th>
                            <th>Status</th>
                            <th>Linked Statement</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (filtered.length === 0) {
            html += `<tr><td colspan="8" class="text-center py-4 text-muted">No unbilled records found matching filter.</td></tr>`;
        } else {
            filtered.forEach(u => {
                const c = allCards.find(x => String(x.card_id) === String(u.card_id));
                const cardStr = c ? `${c.cardholder_name} (*${c.card_last4})` : 'Unknown';
                const isBilled = u.status === 'Billed';
                const statusBadge = isBilled ? '<span class="badge bg-success">Billed</span>' : '<span class="badge bg-warning text-dark">Unbilled</span>';
                const stmtLink = u.statement_id ? `<a href="javascript:void(0)" onclick="window.Payments.viewStatement('${u.statement_id}')" class="text-primary fw-bold">Stmt #${u.statement_id}</a>` : '<span class="text-muted">-</span>';

                html += `
                    <tr>
                        <td>${window.Utils.formatDate(u.txn_date)}</td>
                        <td><strong>${cardStr}</strong></td>
                        <td>${u.description || '-'}</td>
                        <td><code>${u.expected_statement_month || '-'}</code></td>
                        <td class="text-right fw-bold">${window.Utils.formatCurrency(u.amount)}</td>
                        <td>${statusBadge}</td>
                        <td>${stmtLink}</td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-sm btn-icon text-warning" title="Edit" onclick="window.Payments.showUnbilledModal('${u.unbilled_id}')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-icon text-danger" title="Delete" onclick="window.Payments.deleteUnbilled('${u.unbilled_id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
        content.innerHTML = html;
    },

    showUnbilledModal: function(id = null, preCardId = null) {
        const allCards = window.DB.cards.getAll() || [];
        const unbilledRecords = window.DB.unbilled.getAll() || [];
        const item = unbilledRecords.find(x => String(x.unbilled_id) === String(id)) || {};
        const isEdit = !!id;
        const selCardId = item.card_id || preCardId || '';

        const html = `
            <form onsubmit="event.preventDefault(); window.Payments.saveUnbilled('${id || ''}')">
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Select Card</label>
                        <select class="form-select" id="fu_card" required>
                            <option value="">-- Select --</option>
                            ${allCards.map(c => `<option value="${c.card_id}" ${String(selCardId) === String(c.card_id) ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Transaction Date</label>
                        <input type="date" class="form-control" id="fu_date" value="${item.txn_date ? window.Utils.formatDateInput(new Date(item.txn_date)) : window.Utils.formatDateInput(new Date())}" required>
                    </div>
                </div>
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Description / Merchant</label>
                        <input type="text" class="form-control" id="fu_desc" value="${item.description || ''}" placeholder="e.g. Amazon, Fuel, Cloud Server" required>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Amount (₹)</label>
                        <input type="number" step="0.01" class="form-control" id="fu_amount" value="${item.amount || ''}" placeholder="0.00" required>
                    </div>
                </div>
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Expected Statement Month (YYYY-MM)</label>
                        <input type="month" class="form-control" id="fu_month" value="${item.expected_statement_month || ''}">
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" id="fu_status" required>
                            <option value="Unbilled" ${item.status !== 'Billed' ? 'selected' : ''}>Unbilled (Pending)</option>
                            <option value="Billed" ${item.status === 'Billed' ? 'selected' : ''}>Billed (Closed)</option>
                        </select>
                    </div>
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update Unbilled' : 'Save Unbilled'}</button>
                </div>
            </form>
        `;

        if (window.App && window.App.showModal) {
            window.App.showModal(isEdit ? "Edit Unbilled Transaction" : "Add Unbilled Transaction", html);
        }
    },

    saveUnbilled: async function(id) {
        const data = {
            card_id:                  parseInt(document.getElementById('fu_card').value) || 0,
            txn_date:                 document.getElementById('fu_date').value,
            description:              document.getElementById('fu_desc').value,
            amount:                   parseFloat(document.getElementById('fu_amount').value) || 0,
            expected_statement_month: document.getElementById('fu_month').value || null,
            status:                   document.getElementById('fu_status').value
        };

        if (window.App) window.App.closeModal();
        if (window.App) window.App.showToast('Saving unbilled transaction...', 'info');

        if (id) {
            await window.DB.unbilled.update(id, data);
        } else {
            await window.DB.unbilled.add(data);
        }

        if (window.App) window.App.showToast('Unbilled transaction saved', 'success');
        this.renderTabContent();
    },

    deleteUnbilled: async function(id) {
        if (!confirm('Are you sure you want to delete this unbilled record?')) return;
        if (window.App) window.App.showToast('Deleting...', 'info');
        await window.DB.unbilled.delete(id);
        if (window.App) window.App.showToast('Unbilled transaction deleted', 'success');
        this.renderTabContent();
    },

    showStatementModal: function(stmtId = null) {
        const stmts = window.DB.statements.getAll() || [];
        const s = stmts.find(x => String(x.statement_id) === String(stmtId)) || {};
        const isEdit = !!stmtId;
        const allCards = window.DB.cards.getAll() || [];

        // Compute initial closing outstanding for display
        const initClose = ((s.opening_balance||0) + (s.billed_amount||0) - (s.credits_payments||0)).toFixed(2);

        const html = `
            <form onsubmit="event.preventDefault(); window.Payments.saveStatement('${stmtId || ''}')">
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Select Card</label>
                        <select class="form-select" id="fs_card" required ${isEdit ? 'disabled' : ''} onchange="window.Payments.loadUnbilledForStatement(this.value)">
                            <option value="">-- Select --</option>
                            ${allCards.map(c => `<option value="${c.card_id}" ${String(s.card_id) === String(c.card_id) ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Statement Month (YYYY-MM)</label>
                        <input type="month" class="form-control" id="fs_month" value="${window.Utils.formatMonthInput(s.statement_month)}" required>
                    </div>
                </div>

                <div id="stmt_unbilled_container" class="mb-3"></div>

                <div class="row form-row mb-3">
                    <div class="col-md-4 form-group">
                        <label class="form-label">Opening Balance</label>
                        <input type="number" step="0.01" class="form-control" id="fs_open"
                               value="${s.opening_balance || 0}"
                               oninput="window.Payments.calcOutstanding()" required>
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Billed Amount</label>
                        <input type="number" step="0.01" class="form-control" id="fs_billed"
                               value="${s.billed_amount || 0}"
                               oninput="window.Payments.calcOutstanding()" required>
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Credits / Payments</label>
                        <input type="number" step="0.01" class="form-control" id="fs_credits"
                               value="${s.credits_payments || 0}"
                               oninput="window.Payments.calcOutstanding()" required>
                    </div>
                </div>
                <div class="row form-row mb-3">
                    <div class="col-md-4 form-group">
                        <label class="form-label">Unbilled Amount</label>
                        <input type="number" step="0.01" class="form-control" id="fs_unbilled" value="${s.unbilled_amount || 0}">
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Minimum Due</label>
                        <input type="number" step="0.01" class="form-control" id="fs_min" value="${s.minimum_due || 0}">
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label" style="color:#ef476f;font-weight:700;">
                            <i class="fas fa-exclamation-circle"></i> Closing Outstanding
                        </label>
                        <input type="number" step="0.01" class="form-control" id="fs_close"
                               value="${initClose}"
                               style="border-color:#ef476f;color:#ef476f;font-weight:700;background:#fff5f5;" readonly>
                    </div>
                </div>
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" class="form-control" id="fs_due"
                               value="${s.due_date ? window.Utils.formatDateInput(new Date(s.due_date)) : ''}" required>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Payment Status</label>
                        <select class="form-select" id="fs_status" required>
                            <option value="Pending"  ${s.payment_status === 'Pending'  ? 'selected' : ''}>Pending</option>
                            <option value="Paid"     ${s.payment_status === 'Paid'     ? 'selected' : ''}>Paid</option>
                            <option value="Partial"  ${s.payment_status === 'Partial'  ? 'selected' : ''}>Partial</option>
                            <option value="Overdue"  ${s.payment_status === 'Overdue'  ? 'selected' : ''}>Overdue</option>
                        </select>
                    </div>
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update Statement' : 'Save Statement'}</button>
                </div>
            </form>
        `;
        if(window.App && window.App.showModal) window.App.showModal(isEdit ? "Edit Statement" : "Add Statement", html);
        setTimeout(() => { 
            window.Utils.makeSearchable('fs_card');
            if (s.card_id) window.Payments.loadUnbilledForStatement(s.card_id);
        }, 50);
    },

    loadUnbilledForStatement: function(cardId) {
        const container = document.getElementById('stmt_unbilled_container');
        if(!container) return;
        if(!cardId) {
            container.innerHTML = '';
            return;
        }

        const pending = window.DB.unbilled.getPendingByCard(cardId);
        if(pending.length === 0) {
            container.innerHTML = `
                <div class="alert alert-light border py-2 px-3 small text-muted d-flex justify-content-between align-items-center" style="background:#f8fafc;border-radius:8px;">
                    <span><i class="fas fa-info-circle text-info me-1"></i> No unbilled transactions found for this card.</span>
                    <button type="button" class="btn btn-sm btn-link text-decoration-none py-0" onclick="window.Payments.showUnbilledModal(null, '${cardId}')">+ Record Unbilled</button>
                </div>
            `;
            return;
        }

        const totalUnbilledAmt = pending.reduce((sum, u) => sum + (window.Utils.parseNum(u.amount) || 0), 0);

        let tableRows = '';
        pending.forEach(u => {
            tableRows += `
                <tr>
                    <td class="text-center" style="width: 36px;">
                        <input type="checkbox" class="cb-unbilled-item form-check-input" data-id="${u.unbilled_id}" data-amount="${u.amount}" onchange="window.Payments.onUnbilledCheckboxChange()">
                    </td>
                    <td>${window.Utils.formatDate(u.txn_date)}</td>
                    <td>${u.description || '-'}</td>
                    <td><span class="badge bg-light text-dark">${u.expected_statement_month || '-'}</span></td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(u.amount)}</td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="card p-3 border mb-2" style="background:#f8fafc; border-radius:8px; border-color:#e2e8f0;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong class="small text-dark"><i class="fas fa-receipt text-primary me-1"></i> Unbilled Transactions (${pending.length} available &bull; Total: ${window.Utils.formatCurrency(totalUnbilledAmt)})</strong>
                    <span class="badge bg-info text-dark" id="unbilled_calc_badge">Selected: ₹ 0.00 (0 items)</span>
                </div>
                <div class="table-responsive" style="max-height: 160px; overflow-y: auto; background:#fff; border:1px solid #e2e8f0; border-radius:6px;">
                    <table class="table table-sm table-hover mb-0" style="font-size: 0.82rem;">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th class="text-center" style="width: 36px;">
                                    <input type="checkbox" id="cb_unbilled_all" class="form-check-input" onchange="window.Payments.toggleAllUnbilledCheckboxes(this)">
                                </th>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Expected Month</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2 small text-muted">
                    <span><i class="fas fa-check-double text-success me-1"></i> Check items included in this statement to auto-fill Billed Amount.</span>
                    <button type="button" class="btn btn-sm btn-outline-primary py-0" onclick="window.Payments.selectAllUnbilled(true)">Select All</button>
                </div>
            </div>
        `;
    },

    toggleAllUnbilledCheckboxes: function(masterCb) {
        const cbs = document.querySelectorAll('.cb-unbilled-item');
        cbs.forEach(cb => { cb.checked = masterCb.checked; });
        this.onUnbilledCheckboxChange();
    },

    selectAllUnbilled: function(checkAll = true) {
        const master = document.getElementById('cb_unbilled_all');
        if(master) master.checked = checkAll;
        const cbs = document.querySelectorAll('.cb-unbilled-item');
        cbs.forEach(cb => { cb.checked = checkAll; });
        this.onUnbilledCheckboxChange();
    },

    onUnbilledCheckboxChange: function() {
        const cbs = Array.from(document.querySelectorAll('.cb-unbilled-item'));
        let checkedSum = 0;
        let checkedCount = 0;
        let totalSum = 0;

        cbs.forEach(cb => {
            const amt = parseFloat(cb.getAttribute('data-amount')) || 0;
            totalSum += amt;
            if(cb.checked) {
                checkedSum += amt;
                checkedCount++;
            }
        });

        const remSum = Math.max(0, totalSum - checkedSum);

        const badge = document.getElementById('unbilled_calc_badge');
        if(badge) badge.innerText = `Selected: ${window.Utils.formatCurrency(checkedSum)} (${checkedCount} items)`;

        const billedInput = document.getElementById('fs_billed');
        if(billedInput && checkedCount > 0) {
            billedInput.value = checkedSum.toFixed(2);
        }

        const unbilledInput = document.getElementById('fs_unbilled');
        if(unbilledInput) {
            unbilledInput.value = remSum.toFixed(2);
        }

        this.calcOutstanding();
    },

    // Called by oninput on the 3 calc fields — live recalculates Closing Outstanding
    calcOutstanding: function() {
        const open   = parseFloat(document.getElementById('fs_open')?.value)    || 0;
        const billed = parseFloat(document.getElementById('fs_billed')?.value)  || 0;
        const creds  = parseFloat(document.getElementById('fs_credits')?.value) || 0;
        const result = open + billed - creds;
        const el = document.getElementById('fs_close');
        if(el) el.value = result.toFixed(2);
    },

    saveStatement: async function(id) {
        const cardId = document.getElementById('fs_card').value;
        const data = {
            card_id:              cardId,
            statement_month:      document.getElementById('fs_month').value,
            opening_balance:      parseFloat(document.getElementById('fs_open').value) || 0,
            billed_amount:        parseFloat(document.getElementById('fs_billed').value) || 0,
            unbilled_amount:      parseFloat(document.getElementById('fs_unbilled').value) || 0,
            credits_payments:     parseFloat(document.getElementById('fs_credits').value) || 0,
            closing_outstanding:  parseFloat(document.getElementById('fs_close').value) || 0,
            minimum_due:          parseFloat(document.getElementById('fs_min').value) || 0,
            due_date:             new Date(document.getElementById('fs_due').value).toISOString(),
            payment_status:       document.getElementById('fs_status').value
        };

        // Capture checked unbilled IDs before closing modal
        const checkedCbs = Array.from(document.querySelectorAll('.cb-unbilled-item:checked'));
        const checkedIds = checkedCbs.map(cb => cb.getAttribute('data-id'));

        if(window.App) window.App.closeModal();
        if(window.App) window.App.showToast('Saving to Google Sheets...', 'info');

        let stmtId = id;
        if(id) {
            await window.DB.statements.update(id, data);
        } else {
            stmtId = await window.DB.statements.add(data);
        }

        // Close/bill checked unbilled transactions
        if(checkedIds.length > 0 && stmtId) {
            const updates = checkedIds.map(uid => ({
                unbilled_id: parseInt(uid),
                status: 'Billed',
                statement_id: parseInt(stmtId)
            }));
            await window.DB.unbilled.updateBatch(updates);
            if(window.App) window.App.showToast(`Statement saved & ${checkedIds.length} unbilled transactions marked as Billed!`, 'success');
        } else {
            if(window.App) window.App.showToast('Statement saved', 'success');
        }

        this.renderTabContent();
    },

    showPaymentModal: function(preCardId = null, preStmtId = null) {
        const allCards = window.DB.cards.getAll() || [];
        const allStmts = window.DB.statements.getAll() || [];
        
        let stmtOptions = '<option value="">-- Independent Payment --</option>';
        let defaultDue = '';
        if(preCardId) {
            const cardStmts = allStmts.filter(s => String(s.card_id) === String(preCardId) && s.payment_status !== 'Paid');
            cardStmts.forEach(s => {
                const isSelected = String(s.statement_id) === String(preStmtId);
                if (isSelected) defaultDue = s.closing_outstanding;
                stmtOptions += `<option value="${s.statement_id}" data-due="${s.closing_outstanding}" ${isSelected ? 'selected' : ''}>${window.Utils.formatMonthYear(s.statement_month)} (Due: ${window.Utils.formatCurrency(s.closing_outstanding)})</option>`;
            });
        }

        const html = `
            <form onsubmit="event.preventDefault(); window.Payments.savePayment()">
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Select Card</label>
                        <select class="form-select" id="fp_card" required onchange="window.Payments.updateStmtDropdown(this.value)">
                            <option value="">-- Select --</option>
                            ${allCards.map(c => `<option value="${c.card_id}" ${String(c.card_id) === String(preCardId) ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Select Statement (Optional)</label>
                        <select class="form-select" id="fp_stmt" onchange="window.Payments.onStmtSelect(this)">
                            ${stmtOptions}
                        </select>
                    </div>
                </div>
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Payment Date</label>
                        <input type="date" class="form-control" id="fp_date" value="${window.Utils.formatDateInput(new Date())}" required>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Amount Paid</label>
                        <input type="number" step="0.01" class="form-control" id="fp_amount" value="${defaultDue !== '' ? defaultDue : ''}" required>
                    </div>
                </div>
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Payment Mode</label>
                        <select class="form-select" id="fp_mode" required>
                            <option value="NEFT">NEFT</option>
                            <option value="RTGS">RTGS</option>
                            <option value="UPI">UPI</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Auto-Debit">Auto-Debit</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Reference No. (UTR/Chq)</label>
                        <input type="text" class="form-control" id="fp_ref">
                    </div>
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-success">Record Payment</button>
                </div>
            </form>
        `;
        if(window.App && window.App.showModal) window.App.showModal("Record Payment", html);
        setTimeout(() => { window.Utils.makeSearchable('fp_card'); }, 50);
    },

    onStmtSelect: function(selectEl) {
        const selected = selectEl.options[selectEl.selectedIndex];
        const due = selected ? selected.getAttribute('data-due') : null;
        const amtInput = document.getElementById('fp_amount');
        if (due && amtInput) {
            amtInput.value = parseFloat(due) || '';
        }
    },

    updateStmtDropdown: function(cardId) {
        const stmtSelect = document.getElementById('fp_stmt');
        if(!stmtSelect) return;
        const allStmts = window.DB.statements.getAll() || [];
        const cardStmts = allStmts.filter(s => String(s.card_id) === String(cardId) && s.payment_status !== 'Paid');
        
        let html = '<option value="">-- Independent Payment --</option>';
        cardStmts.forEach(s => {
            html += `<option value="${s.statement_id}" data-due="${s.closing_outstanding}">${window.Utils.formatMonthYear(s.statement_month)} (Due: ${window.Utils.formatCurrency(s.closing_outstanding)})</option>`;
        });
        stmtSelect.innerHTML = html;
    },

    savePayment: async function() {
        const data = {
            card_id:       document.getElementById('fp_card').value,
            statement_id:  document.getElementById('fp_stmt').value || null,
            payment_date:  new Date(document.getElementById('fp_date').value).toISOString(),
            amount:        parseFloat(document.getElementById('fp_amount').value),
            payment_mode:  document.getElementById('fp_mode').value,
            reference_no:  document.getElementById('fp_ref').value,
            status:        'Completed'
        };

        if(window.App) window.App.closeModal();
        if(window.App) window.App.showToast('Recording payment...', 'info');

        await window.DB.payments.add(data);

        if(window.App) window.App.showToast('Payment recorded successfully', 'success');
        this.renderTabContent();
    }
};
