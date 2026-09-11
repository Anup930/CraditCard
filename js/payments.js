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
                        <select class="form-select" id="fs_card" required ${isEdit ? 'disabled' : ''}>
                            <option value="">-- Select --</option>
                            ${allCards.map(c => `<option value="${c.card_id}" ${String(s.card_id) === String(c.card_id) ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Statement Month (YYYY-MM)</label>
                        <input type="month" class="form-control" id="fs_month" value="${window.Utils.formatMonthInput(s.statement_month)}" required>
                    </div>
                </div>
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
        setTimeout(() => { window.Utils.makeSearchable('fs_card'); }, 50);
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
        const data = {
            card_id:              document.getElementById('fs_card').value,
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

        if(window.App) window.App.closeModal();
        if(window.App) window.App.showToast('Saving to Google Sheets...', 'info');

        if(id) await window.DB.statements.update(id, data);
        else   await window.DB.statements.add(data);

        if(window.App) window.App.showToast('Statement saved', 'success');
        this.renderTabContent();
    },

    showPaymentModal: function(preCardId = null, preStmtId = null) {
        const allCards = window.DB.cards.getAll() || [];
        const allStmts = window.DB.statements.getAll() || [];
        
        let stmtOptions = '<option value="">-- Independent Payment --</option>';
        if(preCardId) {
            const cardStmts = allStmts.filter(s => String(s.card_id) === String(preCardId) && s.payment_status !== 'Paid');
            cardStmts.forEach(s => {
                stmtOptions += `<option value="${s.statement_id}" ${String(s.statement_id) === String(preStmtId) ? 'selected' : ''}>${window.Utils.formatMonthYear(s.statement_month)} (Due: ${window.Utils.formatCurrency(s.closing_outstanding)})</option>`;
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
                        <select class="form-select" id="fp_stmt">
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
                        <input type="number" step="0.01" class="form-control" id="fp_amount" required>
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

    updateStmtDropdown: function(cardId) {
        const stmtSelect = document.getElementById('fp_stmt');
        if(!stmtSelect) return;
        const allStmts = window.DB.statements.getAll() || [];
        const cardStmts = allStmts.filter(s => String(s.card_id) === String(cardId) && s.payment_status !== 'Paid');
        
        let html = '<option value="">-- Independent Payment --</option>';
        cardStmts.forEach(s => {
            html += `<option value="${s.statement_id}">${window.Utils.formatMonthYear(s.statement_month)} (Due: ${s.closing_outstanding})</option>`;
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

        // Auto-update statement outstanding
        if(data.statement_id) {
            const s = window.DB.data.statements.find(x => String(x.statement_id) === String(data.statement_id));
            if(s) {
                const updatedCredits = (parseFloat(s.credits_payments)||0) + data.amount;
                const updatedOutstanding = Math.max(0, (parseFloat(s.opening_balance)||0) + (parseFloat(s.billed_amount)||0) - updatedCredits);
                const updatedStatus = updatedOutstanding === 0 ? 'Paid' : updatedCredits > 0 ? 'Partial' : s.payment_status;
                await window.DB.statements.update(s.statement_id, {
                    credits_payments:    updatedCredits,
                    closing_outstanding: updatedOutstanding,
                    payment_status:      updatedStatus
                });
            }
        }

        if(window.App) window.App.showToast('Payment recorded successfully', 'success');
        this.renderTabContent();
    }
};
