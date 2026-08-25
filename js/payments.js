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
                    <button class="btn btn-primary" onclick="window.Payments.showStatementModal()"><i class="fas fa-plus"></i> Add Statement</button>
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
        const getCardStr = (id) => { const c = allCards.find(x => x.card_id === id); return c ? `${c.cardholder_name} (*${c.card_last4})` : 'Unknown'; };

        if(statements.length === 0) {
            html += `<tr><td colspan="10" class="text-center py-4">No statements recorded.</td></tr>`;
        } else {
            statements.forEach(s => {
                let statusBadge = 'bg-secondary';
                if(s.payment_status === 'Paid') statusBadge = 'bg-success';
                else if(s.payment_status === 'Overdue') statusBadge = 'bg-danger';
                else if(s.payment_status === 'Partial') statusBadge = 'bg-warning text-dark';
                else if(s.payment_status === 'Pending') statusBadge = 'bg-info text-dark';

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
                                <button class="btn btn-sm btn-outline-success ms-1" onclick="window.Payments.showPaymentModal('${s.card_id}', '${s.statement_id}')">Pay</button>
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
                    <button class="btn btn-success" onclick="window.Payments.showPaymentModal()"><i class="fas fa-plus"></i> Record Payment</button>
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
                const c = allCards.find(x => x.card_id === p.card_id);
                const s = allStmts.find(x => x.statement_id === p.statement_id);
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
                const c = allCards.find(x => x.card_id === s.card_id);
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
                                <button class="btn btn-sm btn-success ms-2" onclick="window.Payments.showPaymentModal('${s.card_id}', '${s.statement_id}')">Pay Now</button>
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
        const c = allCards.find(x => String(x.card_id) === String(s.card_id));
        const cardStr = c ? `${c.cardholder_name} - ${c.bank_name} (*${c.card_last4})` : 'Unknown Card';

        const statusClass = s.payment_status === 'Paid' ? 'bg-success' : (s.payment_status === 'Overdue' ? 'bg-danger' : 'bg-warning text-dark');

        const html = `
            <div class="row">
                <div class="col-md-6 mb-3"><strong>Statement Month:</strong> <br>${window.Utils.formatMonthYear(s.statement_month)}</div>
                <div class="col-md-6 mb-3"><strong>Due Date:</strong> <br>${window.Utils.formatDate(s.due_date)}</div>
                <div class="col-md-12 mb-3"><strong>Card:</strong> <br>${cardStr}</div>
                <div class="col-md-6 mb-3"><strong>Opening Balance:</strong> <br>${window.Utils.formatCurrency(s.opening_balance)}</div>
                <div class="col-md-6 mb-3"><strong>Billed Amount:</strong> <br>${window.Utils.formatCurrency(s.billed_amount)}</div>
                <div class="col-md-6 mb-3"><strong>Credits/Payments:</strong> <br><span class="text-success">${window.Utils.formatCurrency(s.credits_payments)}</span></div>
                <div class="col-md-6 mb-3"><strong>Unbilled Amount:</strong> <br>${window.Utils.formatCurrency(s.unbilled_amount)}</div>
                <div class="col-md-6 mb-3"><strong>Closing Outstanding:</strong> <br><span class="text-danger fw-bold">${window.Utils.formatCurrency(s.closing_outstanding)}</span></div>
                <div class="col-md-6 mb-3"><strong>Minimum Due:</strong> <br>${window.Utils.formatCurrency(s.minimum_due)}</div>
                <div class="col-md-12 mb-3"><strong>Status:</strong> <br><span class="badge ${statusClass}">${s.payment_status}</span></div>
            </div>
            <div class="text-end mt-3 border-top pt-3">
                <button class="btn btn-secondary me-2" onclick="window.App.closeModal()">Close</button>
                <button class="btn btn-success" onclick="window.App.closeModal(); setTimeout(() => window.Payments.showPaymentModal('${s.card_id}', '${s.statement_id}'), 300)">Pay Now</button>
            </div>
        `;
        if(window.App && window.App.showModal) window.App.showModal("Statement Details", html);
    },

    showStatementModal: function(stmtId = null) {
        const stmts = window.DB.statements.getAll() || [];
        const s = stmts.find(x => x.statement_id === stmtId) || {};
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
            const cardStmts = allStmts.filter(s => s.card_id === preCardId && s.payment_status !== 'Paid');
            cardStmts.forEach(s => {
                stmtOptions += `<option value="${s.statement_id}" ${s.statement_id === preStmtId ? 'selected' : ''}>${window.Utils.formatMonthYear(s.statement_month)} (Due: ${window.Utils.formatCurrency(s.closing_outstanding)})</option>`;
            });
        }

        const html = `
            <form onsubmit="event.preventDefault(); window.Payments.savePayment()">
                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Select Card</label>
                        <select class="form-select" id="fp_card" required onchange="window.Payments.updateStmtDropdown(this.value)">
                            <option value="">-- Select --</option>
                            ${allCards.map(c => `<option value="${c.card_id}" ${c.card_id === preCardId ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
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
    },

    updateStmtDropdown: function(cardId) {
        const stmtSelect = document.getElementById('fp_stmt');
        if(!stmtSelect) return;
        const allStmts = window.DB.statements.getAll() || [];
        const cardStmts = allStmts.filter(s => s.card_id === cardId && s.payment_status !== 'Paid');
        
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
