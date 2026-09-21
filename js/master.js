window.Master = {
    currentPage: 1,
    pageSize: 10,
    currentFilter: '',
    currentBankFilter: '',
    currentCategoryFilter: '',
    currentOwnerFilter: '',
    currentStatusFilter: '',

    render: function(container) {
        this.container = container;
        this.container.innerHTML = '';
        
        // Page Header
        const header = document.createElement('div');
        header.className = 'page-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4';
        header.innerHTML = `
            <div>
                <h2 class="page-title">Master Card List</h2>
                <div class="page-subtitle text-muted">Manage all credit cards in the system</div>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <input type="file" id="card-master-file-input" accept=".xlsx,.xls,.csv" style="display:none;" onchange="window.Master.handleImportFile(event)">
                <button class="btn btn-outline" onclick="window.Master.downloadSampleTemplate()" title="Download sample Excel template for importing cards" style="background:#ffffff;border-radius:8px;font-weight:600;">
                    <i class="fas fa-file-download text-success"></i> Template
                </button>
                <button class="btn btn-outline" onclick="window.Master.triggerImportCards()" title="Import cards from Excel or CSV" style="background:#eef2ff;color:#4361ee;border-color:#c7d2fe;border-radius:8px;font-weight:600;">
                    <i class="fas fa-file-import"></i> Import Cards
                </button>
                <button class="btn btn-primary" onclick="window.Master.showAddModal()" style="border-radius:8px;font-weight:600;">
                    <i class="fas fa-plus"></i> Add New Card
                </button>
            </div>
        `;

        // Filter Bar
        const filterBar = document.createElement('div');
        filterBar.className = 'filter-bar card mb-4 p-3';
        
        const banks = window.DB.cards.getBanks();
        const owners = window.DB.cards.getOwners();
        
        filterBar.innerHTML = `
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 200px;">
                <label class="form-label small text-muted mb-1">Search Cards</label>
                <input type="text" class="form-control" id="masterSearch" placeholder="Search by name, number, ledger..." value="${this.currentFilter}" oninput="window.Master.search(this.value)" style="width: 100%;">
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">Bank</label>
                <select class="form-select" id="masterBankFilter" onchange="window.Master.filterTable()">
                    <option value="">All Banks</option>
                    ${banks.map(b => `<option value="${b}" ${this.currentBankFilter === b ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">Category</label>
                <select class="form-select" id="masterCatFilter" onchange="window.Master.filterTable()">
                    <option value="">All Categories</option>
                    <option value="Primary" ${this.currentCategoryFilter === 'Primary' ? 'selected' : ''}>Primary</option>
                    <option value="Add-on" ${this.currentCategoryFilter === 'Add-on' ? 'selected' : ''}>Add-on</option>
                </select>
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">Primary Owner</label>
                <select class="form-select" id="masterOwnerFilter" onchange="window.Master.filterTable()" style="min-width: 180px;">
                    <option value="">All Owners</option>
                    ${owners.map(o => `<option value="${o}" ${this.currentOwnerFilter === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; flex-direction: column;">
                <label class="form-label small text-muted mb-1">Status</label>
                <select class="form-select" id="masterStatusFilter" onchange="window.Master.filterTable()">
                    <option value="">All Statuses</option>
                    <option value="Active" ${this.currentStatusFilter === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Inactive" ${this.currentStatusFilter === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    <option value="Blocked" ${this.currentStatusFilter === 'Blocked' ? 'selected' : ''}>Blocked</option>
                </select>
            </div>
        `;

        // Table Wrapper
        this.tableWrapper = document.createElement('div');
        this.tableWrapper.className = 'data-table-wrapper card';
        
        this.container.appendChild(header);
        this.container.appendChild(filterBar);
        this.container.appendChild(this.tableWrapper);

        this.renderTable();
        // Make owner filter searchable
        setTimeout(() => { window.Utils.makeSearchable('masterOwnerFilter'); }, 50);
    },

    search: function(query) {
        this.currentFilter = query.toLowerCase();
        this.currentPage = 1;
        this.renderTable();
    },

    filterTable: function() {
        this.currentBankFilter = document.getElementById('masterBankFilter').value;
        this.currentCategoryFilter = document.getElementById('masterCatFilter').value;
        this.currentOwnerFilter = document.getElementById('masterOwnerFilter').value;
        this.currentStatusFilter = document.getElementById('masterStatusFilter').value;
        this.currentPage = 1;
        this.renderTable();
    },

    renderTable: function() {
        let cards = window.DB.cards.getAll() || [];
        
        // Apply Filters
        if(this.currentFilter) {
            cards = cards.filter(c => 
                String(c.cardholder_name || '').toLowerCase().includes(this.currentFilter) ||
                String(c.card_number || '').toLowerCase().includes(this.currentFilter) ||
                String(c.zoho_ledger_name || '').toLowerCase().includes(this.currentFilter)
            );
        }
        if(this.currentBankFilter) cards = cards.filter(c => c.bank_name === this.currentBankFilter);
        if(this.currentCategoryFilter) cards = cards.filter(c => c.card_category === this.currentCategoryFilter);
        if(this.currentOwnerFilter) cards = cards.filter(c => c.primary_cardholder === this.currentOwnerFilter);
        if(this.currentStatusFilter) cards = cards.filter(c => c.status === this.currentStatusFilter);

        const pageSize = this.pageSize;
        const pageData = window.Utils.paginate(cards.length, this.currentPage, pageSize);
        const currentCards = cards.slice(pageData.start, pageData.end);

        let html = `
            <table class="data-table table w-100 table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Sr.No</th>
                        <th>Cardholder Name</th>
                        <th>Category</th>
                        <th>Primary Owner</th>
                        <th>Bank</th>
                        <th>Card Type</th>
                        <th>Card Number</th>
                        <th>Zoho Ledger</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if(currentCards.length === 0) {
            html += `<tr><td colspan="10" class="text-center py-4 empty-state">No cards found.</td></tr>`;
        } else {
            currentCards.forEach((c, i) => {
                const srNo = pageData.start + i + 1;
                const rowClass = c.card_category === 'Primary' ? 'row-primary' : 'row-addon';
                const catBadge = c.card_category === 'Primary' ? 'status status-active badge bg-primary' : 'status status-info badge bg-info';
                
                let statusBadge = 'bg-secondary';
                if(c.status === 'Active') statusBadge = 'bg-success';
                else if(c.status === 'Blocked') statusBadge = 'bg-danger';

                html += `
                    <tr class="${rowClass}">
                        <td>${srNo}</td>
                        <td><a href="#" class="text-decoration-none fw-bold text-primary" onclick="window.Master.viewCardLedger('${c.card_id}'); return false;">${window.Utils.escapeHtml(c.cardholder_name || '')}</a></td>
                        <td><span class="${catBadge}">${c.card_category || 'N/A'}</span></td>
                        <td>${window.Utils.escapeHtml(c.primary_cardholder || '')}</td>
                        <td>${window.Utils.escapeHtml(c.bank_name || '')}</td>
                        <td>${window.Utils.escapeHtml(c.card_type || '')}</td>
                        <td>${window.Utils.maskCardNumber(c.card_number || '')}</td>
                        <td>${window.Utils.escapeHtml(c.zoho_ledger_name || '')}</td>
                        <td><span class="status badge ${statusBadge}">${c.status || 'N/A'}</span></td>
                        <td>
                            <button class="btn btn-sm btn-icon text-primary" onclick="window.Master.viewCard('${c.card_id}')"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-icon text-warning" onclick="window.Master.editCard('${c.card_id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-icon text-danger" onclick="window.Master.deleteCard('${c.card_id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        
        html += `</tbody></table>`;
        
        // Pagination & Rows Per Page Footer
        html += `
        <div class="card-footer d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
                <select class="form-select form-select-sm" style="width:auto;" onchange="window.Master.changePageSize(this.value)">
                    <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10 rows</option>
                    <option value="20" ${this.pageSize === 20 ? 'selected' : ''}>20 rows</option>
                    <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50 rows</option>
                    <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100 rows</option>
                    <option value="200" ${this.pageSize === 200 ? 'selected' : ''}>200 rows</option>
                </select>
                <span class="pagination-info">Showing ${pageData.start + 1} to ${pageData.end} of ${cards.length} entries</span>
            </div>
            <ul class="pagination mb-0">
                <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.Master.goToPage(${this.currentPage - 1})">Previous</a>
                </li>
                <li class="page-item disabled"><a class="page-link" href="#">Page ${this.currentPage} of ${pageData.totalPages || 1}</a></li>
                <li class="page-item ${this.currentPage === (pageData.totalPages || 1) ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); window.Master.goToPage(${this.currentPage + 1})">Next</a>
                </li>
            </ul>
        </div>`;

        this.tableWrapper.innerHTML = html;
    },

    goToPage: function(page) {
        this.currentPage = page;
        this.renderTable();
    },

    changePageSize: function(size) {
        this.pageSize = parseInt(size);
        this.currentPage = 1;
        this.renderTable();
    },

    showAddModal: function() {
        this.renderFormModal(null);
    },

    editCard: function(id) {
        const card = window.DB.cards.getById(id);
        if(card) this.renderFormModal(card);
    },

    deleteCard: function(id) {
        if(window.App && window.App.showConfirm) {
            window.App.showConfirm('Delete Card', 'Are you sure you want to delete this card? This cannot be undone.', async () => {
                await window.DB.cards.delete(id);
                this.renderTable();
                if(window.App.showToast) window.App.showToast('Card deleted successfully', 'success');
            });
        } else {
            if(confirm('Are you sure you want to delete this card?')) {
                window.DB.cards.delete(id).then(() => this.renderTable());
            }
        }
    },

    viewCardLedger: function(id) {
        const card = window.DB.cards.getById(id);
        if(!card) return;

        const stmts = [...(window.DB.statements.getByCard(id) || [])].reverse();
        const allPmts = window.DB.payments.getAll() || [];

        let tbody = '';
        stmts.forEach(s => {
            const spmts = allPmts.filter(p => String(p.statement_id) === String(s.statement_id));
            const payDates = spmts.map(p => window.Utils.formatDate(p.payment_date)).join(', ') || '-';
            
            const prePaymentClosing = (s.opening_balance || 0) + (s.billed_amount || 0) + (s.unbilled_amount || 0);
            const totalPay = s.credits_payments || 0;
            const finalOut = s.closing_outstanding || 0;

            tbody += `
                <tr>
                    <td class="text-nowrap">${window.Utils.formatMonthYear(s.statement_month)}</td>
                    <td class="text-right">${window.Utils.formatCurrency(s.opening_balance)}</td>
                    <td class="text-right">${window.Utils.formatCurrency(s.billed_amount)}</td>
                    <td class="text-right">${window.Utils.formatCurrency(s.unbilled_amount)}</td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(prePaymentClosing)}</td>
                    <td class="text-right text-success fw-bold">${window.Utils.formatCurrency(totalPay)}</td>
                    <td class="text-nowrap">${window.Utils.formatDate(s.due_date)}</td>
                    <td class="text-nowrap">${payDates}</td>
                    <td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(finalOut)}</td>
                </tr>
            `;
        });

        if (stmts.length === 0) {
            tbody = `<tr><td colspan="9" class="text-center py-4 text-muted">No statements found for this card.</td></tr>`;
        }

        const html = `
            <style>
                #modal { max-width: 96vw !important; width: 96vw !important; margin-top: 2vh; }
                #modal-overlay { backdrop-filter: blur(3px); background-color: rgba(0,0,0,0.4); }
                .ledger-table th { font-weight: 600; background: #f8f9fa; font-size: 0.85rem; padding: 12px 8px; border-bottom: 2px solid #dee2e6; }
                .ledger-table td { font-size: 0.9rem; padding: 10px 8px; vertical-align: middle; border-bottom: 1px solid #e9ecef; }
                .ledger-table { border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
                .ledger-info-item { font-size: 0.95rem; display: inline-block; }
            </style>
            
            <div class="card-ledger-header mb-4 p-3 bg-light rounded border d-flex flex-wrap align-items-center justify-content-center gap-4">
                <span class="ledger-info-item"><span class="text-muted text-uppercase" style="font-size: 0.75rem;">Card:</span> <strong class="text-primary">${card.zoho_ledger_name || card.cardholder_name}</strong></span>
                <span class="ledger-info-item border-start ps-4"><span class="text-muted text-uppercase" style="font-size: 0.75rem;">Card Holder Name:</span> <strong>${card.cardholder_name}</strong></span>
                <span class="ledger-info-item border-start ps-4"><span class="text-muted text-uppercase" style="font-size: 0.75rem;">Total Limit:</span> <strong class="fs-6">${window.Utils.formatCurrency(card.credit_limit)}</strong></span>
                <span class="ledger-info-item border-start ps-4"><span class="text-muted text-uppercase" style="font-size: 0.75rem;">Renewal Date:</span> <strong>${card.renewal_date ? window.Utils.formatDate(card.renewal_date) : '-'}</strong></span>
            </div>
            
            <div class="table-responsive">
                <table class="w-100 ledger-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="text-right">Opening Balance</th>
                            <th class="text-right">Billed Amount</th>
                            <th class="text-right">Unbilled Amount</th>
                            <th class="text-right">Closing Outstanding</th>
                            <th class="text-right">Total Pay</th>
                            <th>Due Date</th>
                            <th>Pay at</th>
                            <th class="text-right">Final outstanding</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tbody}
                    </tbody>
                </table>
            </div>
            <div class="text-end mt-4 pt-3 border-top">
                <button class="btn btn-secondary" onclick="window.App.closeModal()">Close</button>
            </div>
        `;

        if(window.App && window.App.showModal) window.App.showModal("Card Statement Ledger", html);
    },

    viewCard: function(id) {
        const card = window.DB.cards.getById(id);
        if(!card) return;

        const html = `
            <div class="row">
                <div class="col-md-6 mb-2"><strong>Cardholder:</strong> ${card.cardholder_name}</div>
                <div class="col-md-6 mb-2"><strong>Primary Owner:</strong> ${card.primary_cardholder}</div>
                <div class="col-md-6 mb-2"><strong>Category:</strong> ${card.card_category}</div>
                <div class="col-md-6 mb-2"><strong>Bank:</strong> ${card.bank_name}</div>
                <div class="col-md-6 mb-2"><strong>Card Type:</strong> ${card.card_type}</div>
                <div class="col-md-6 mb-2"><strong>Card Number:</strong> ${card.card_number}</div>
                <div class="col-md-6 mb-2"><strong>Ledger Name:</strong> ${card.zoho_ledger_name}</div>
                <div class="col-md-6 mb-2"><strong>Credit Limit:</strong> ${window.Utils.formatCurrency(card.credit_limit)}</div>
                <div class="col-md-12 mb-2"><strong>Address:</strong> ${card.address}</div>
                <div class="col-md-6 mb-2"><strong>Email:</strong> ${card.email}</div>
                <div class="col-md-6 mb-2"><strong>Phone:</strong> ${card.phone}</div>
                <div class="col-md-6 mb-2"><strong>Statement Date:</strong> ${card.statement_date}</div>
                <div class="col-md-6 mb-2"><strong>Due Date:</strong> ${card.due_date}</div>
                <div class="col-md-6 mb-2"><strong>Renewal Date:</strong> ${card.renewal_date ? window.Utils.formatDate(card.renewal_date) : ''}</div>
                <div class="col-md-6 mb-2"><strong>Fee Waiver Target:</strong> ${window.Utils.formatCurrency(card.fee_waiver_target)}</div>
                <div class="col-md-6 mb-2"><strong>Reward Points:</strong> ${card.reward_points}</div>
                <div class="col-md-6 mb-2"><strong>Status:</strong> ${card.status}</div>
                <div class="col-md-12 mb-2"><strong>Remarks:</strong> ${card.remarks || ''}</div>
            </div>
        `;

        if(window.App && window.App.showModal) {
            window.App.showModal("View Card Details", html);
        } else {
            alert(JSON.stringify(card, null, 2));
        }
    },

    renderFormModal: function(card) {
        const isEdit = !!card;
        const c = card || {};
        
        const html = `
            <form id="cardForm" onsubmit="event.preventDefault(); window.Master.saveCard('${c.card_id || ''}')">
                <div class="row form-row mb-3">
                    <div class="col-md-4 form-group">
                        <label class="form-label">Primary Owner</label>
                        <input type="text" class="form-control" id="f_owner" value="${c.primary_cardholder || ''}" required>
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select" id="f_cat" required>
                            <option value="Primary" ${c.card_category === 'Primary' ? 'selected' : ''}>Primary</option>
                            <option value="Add-on" ${c.card_category === 'Add-on' ? 'selected' : ''}>Add-on</option>
                        </select>
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Cardholder Name</label>
                        <input type="text" class="form-control" id="f_name" value="${c.cardholder_name || ''}" required>
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-4 form-group">
                        <label class="form-label">Bank Name</label>
                        <input type="text" class="form-control" id="f_bank" value="${c.bank_name || ''}" required>
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Card Type</label>
                        <input type="text" class="form-control" id="f_type" value="${c.card_type || ''}" required>
                    </div>
                    <div class="col-md-4 form-group">
                        <label class="form-label">Card Number</label>
                        <input type="text" class="form-control" id="f_number" value="${c.card_number || ''}" required>
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Zoho Ledger Name</label>
                        <input type="text" class="form-control" id="f_ledger" value="${c.zoho_ledger_name || ''}">
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Credit Limit</label>
                        <input type="number" step="0.01" class="form-control" id="f_limit" value="${c.credit_limit || ''}" required>
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" id="f_email" value="${c.email || ''}">
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Phone</label>
                        <input type="text" class="form-control" id="f_phone" value="${c.phone || ''}">
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-12 form-group">
                        <label class="form-label">Address</label>
                        <textarea class="form-control" id="f_address" rows="2">${c.address || ''}</textarea>
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-3 form-group">
                        <label class="form-label">Statement Date (1-31)</label>
                        <input type="number" min="1" max="31" class="form-control" id="f_stmt_date" value="${c.statement_date || ''}">
                    </div>
                    <div class="col-md-3 form-group">
                        <label class="form-label">Due Date (1-31)</label>
                        <input type="number" min="1" max="31" class="form-control" id="f_due_date" value="${c.due_date || ''}">
                    </div>
                    <div class="col-md-3 form-group">
                        <label class="form-label">Renewal Date</label>
                        <input type="date" class="form-control" id="f_renewal" value="${c.renewal_date ? window.Utils.formatDateInput(new Date(c.renewal_date)) : ''}">
                    </div>
                    <div class="col-md-3 form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" id="f_status" required>
                            <option value="Active" ${c.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${c.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="Blocked" ${c.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
                        </select>
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Fee Waiver Target</label>
                        <input type="number" step="0.01" class="form-control" id="f_waiver" value="${c.fee_waiver_target || ''}">
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Reward Points</label>
                        <input type="number" class="form-control" id="f_rewards" value="${c.reward_points || ''}">
                    </div>
                </div>

                <div class="row form-row mb-3">
                    <div class="col-md-12 form-group">
                        <label class="form-label">Remarks</label>
                        <textarea class="form-control" id="f_remarks" rows="2">${c.remarks || ''}</textarea>
                    </div>
                </div>

                <div class="text-end">
                    <button type="button" class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update Card' : 'Save Card'}</button>
                </div>
            </form>
        `;

        if(window.App && window.App.showModal) {
            window.App.showModal(isEdit ? "Edit Card" : "Add New Card", html);
        }
    },

    saveCard: async function(cardId) {
        const data = {
            primary_cardholder: document.getElementById('f_owner').value,
            card_category:      document.getElementById('f_cat').value,
            cardholder_name:    document.getElementById('f_name').value,
            zoho_ledger_name:   document.getElementById('f_ledger').value,
            bank_name:          document.getElementById('f_bank').value,
            card_type:          document.getElementById('f_type').value,
            card_number:        document.getElementById('f_number').value,
            card_last4:         window.Utils.getLast4(document.getElementById('f_number').value),
            credit_limit:       parseFloat(document.getElementById('f_limit').value) || 0,
            address:            document.getElementById('f_address').value,
            email:              document.getElementById('f_email').value,
            phone:              document.getElementById('f_phone').value,
            statement_date:     parseInt(document.getElementById('f_stmt_date').value) || null,
            due_date:           parseInt(document.getElementById('f_due_date').value) || null,
            renewal_date:       document.getElementById('f_renewal').value ? new Date(document.getElementById('f_renewal').value).toISOString() : null,
            fee_waiver_target:  parseFloat(document.getElementById('f_waiver').value) || 0,
            reward_points:      parseInt(document.getElementById('f_rewards').value) || 0,
            status:             document.getElementById('f_status').value,
            remarks:            document.getElementById('f_remarks').value
        };

        if(window.App && window.App.closeModal) window.App.closeModal();

        if(cardId) {
            if(window.App) window.App.showToast('Saving to Google Sheets...', 'info');
            await window.DB.cards.update(cardId, data);
            if(window.App) window.App.showToast('Card updated successfully', 'success');
        } else {
            if(window.App) window.App.showToast('Adding to Google Sheets...', 'info');
            await window.DB.cards.add(data);
            if(window.App) window.App.showToast('Card added successfully', 'success');
        }

        this.renderTable();
    },

    // ── IMPORT CARDS FROM EXCEL / CSV ─────────────────────────
    triggerImportCards: function() {
        const fileInput = document.getElementById('card-master-file-input');
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
    },

    downloadSampleTemplate: function() {
        if (!window.XLSX) {
            alert('Excel library not loaded yet. Please wait or refresh.');
            return;
        }

        const sampleRows = [
            {
                'Primary Owner': 'Alok Harlalka',
                'Category': 'Primary',
                'Cardholder Name': 'Alok Harlalka',
                'Bank Name': 'ICICI',
                'Card Type': 'ICICI Emerald Visa',
                'Card Number': '4315XXXXXXXX0004',
                'Zoho Ledger Name': 'Alok ICICI Credit Card',
                'Credit Limit': 1000000,
                'Address': 'Kolkata, WB',
                'Email': 'alok@gretexgroup.com',
                'Phone': '9830000000',
                'Statement Date': 15,
                'Due Date': 5,
                'Renewal Date': '2027-03-31',
                'Fee Waiver Target': 500000,
                'Reward Points': 15000,
                'Status': 'Active',
                'Remarks': 'Corporate primary card'
            },
            {
                'Primary Owner': 'Alok Harlalka',
                'Category': 'Add-on',
                'Cardholder Name': 'YASH HARLALKA',
                'Bank Name': 'ICICI',
                'Card Type': 'ICICI Emerald Visa',
                'Card Number': '4315XXXXXXXX0111',
                'Zoho Ledger Name': 'Alok ICICI Credit Card',
                'Credit Limit': 1000000,
                'Address': 'Kolkata, WB',
                'Email': 'yash@gretexgroup.com',
                'Phone': '9830000001',
                'Statement Date': 15,
                'Due Date': 5,
                'Renewal Date': '2027-03-31',
                'Fee Waiver Target': 0,
                'Reward Points': 0,
                'Status': 'Active',
                'Remarks': 'Add-on card attached to Alok ICICI'
            },
            {
                'Primary Owner': 'Gourav Harlalka',
                'Category': 'Primary',
                'Cardholder Name': 'Gourav Harlalka',
                'Bank Name': 'HDFC',
                'Card Type': 'HDFC Regalia Gold',
                'Card Number': '5421XXXXXXXX8821',
                'Zoho Ledger Name': 'Gourav HDFC Card',
                'Credit Limit': 500000,
                'Address': 'Mumbai, MH',
                'Email': 'gourav@gretexgroup.com',
                'Phone': '9820000000',
                'Statement Date': 20,
                'Due Date': 10,
                'Renewal Date': '2027-06-30',
                'Fee Waiver Target': 400000,
                'Reward Points': 25000,
                'Status': 'Active',
                'Remarks': 'Primary executive card'
            }
        ];

        const ws = window.XLSX.utils.json_to_sheet(sampleRows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "credit_cards");
        window.XLSX.writeFile(wb, "Credit_Card_Master_Template.xlsx");
        if (window.App && window.App.showToast) {
            window.App.showToast('Sample template downloaded: Credit_Card_Master_Template.xlsx', 'success');
        }
    },

    handleImportFile: function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!window.XLSX) {
            alert('Excel library not loaded yet. Please wait or refresh.');
            return;
        }

        if (window.App && window.App.showToast) {
            window.App.showToast(`Reading ${file.name}...`, 'info');
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                
                let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('credit') || n.toLowerCase().includes('card')) || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (!rawRows || rawRows.length === 0) {
                    alert('No rows found in the selected Excel file.');
                    return;
                }

                const parsedCards = [];
                rawRows.forEach((r) => {
                    const getVal = (...keys) => {
                        for (let k of keys) {
                            for (let rk of Object.keys(r)) {
                                if (rk.trim().toLowerCase().replace(/[\s_\-]+/g, '') === k.toLowerCase().replace(/[\s_\-]+/g, '')) {
                                    return r[rk];
                                }
                            }
                        }
                        return '';
                    };

                    const name = String(getVal('cardholder_name', 'cardholder', 'name', 'card_holder_name') || '').trim();
                    const owner = String(getVal('primary_cardholder', 'primary_owner', 'owner') || name).trim();
                    const cardNum = String(getVal('card_number', 'card_no', 'cardnumber', 'number') || '').trim();
                    const bank = String(getVal('bank_name', 'bank') || '').trim();
                    const cardType = String(getVal('card_type', 'type') || '').trim();
                    const ledger = String(getVal('zoho_ledger_name', 'zoho_ledger', 'ledger_name', 'ledger') || '').trim();
                    
                    let cat = String(getVal('card_category', 'category') || '').trim();
                    if (!cat) {
                        cat = (name && owner && name.toLowerCase() !== owner.toLowerCase()) ? 'Add-on' : 'Primary';
                    } else if (cat.toLowerCase().includes('add')) {
                        cat = 'Add-on';
                    } else {
                        cat = 'Primary';
                    }

                    const limit = window.Utils.parseNum(getVal('credit_limit', 'limit'));
                    const last4 = cardNum ? window.Utils.getLast4(cardNum) : String(getVal('card_last4', 'last4') || '').padStart(4, '0').slice(-4);

                    if (name || cardNum || ledger) {
                        parsedCards.push({
                            cardholder_name: name || owner || 'Cardholder',
                            primary_cardholder: owner || name || 'Primary Owner',
                            card_category: cat,
                            bank_name: bank || (window.Utils.extractBankName(cardType) || 'Bank'),
                            card_type: cardType || (bank ? `${bank} Card` : 'Credit Card'),
                            card_number: cardNum || `XXXX-XXXX-XXXX-${last4}`,
                            card_last4: last4,
                            credit_limit: limit,
                            zoho_ledger_name: ledger || `${name} ${bank} Card`,
                            address: String(getVal('address') || '').trim(),
                            email: String(getVal('email') || '').trim(),
                            phone: String(getVal('phone', 'mobile') || '').trim(),
                            statement_date: parseInt(getVal('statement_date', 'bill_date')) || null,
                            due_date: parseInt(getVal('due_date')) || null,
                            renewal_date: getVal('renewal_date') ? new Date(getVal('renewal_date')).toISOString() : null,
                            fee_waiver_target: window.Utils.parseNum(getVal('fee_waiver_target', 'waiver_target')),
                            reward_points: parseInt(getVal('reward_points', 'rewards')) || 0,
                            status: String(getVal('status') || 'Active').trim(),
                            remarks: String(getVal('remarks') || '').trim()
                        });
                    }
                });

                if (parsedCards.length === 0) {
                    alert('Could not find valid card records in this file. Please verify column headers or use the sample template.');
                    return;
                }

                window.Master.showImportPreviewModal(parsedCards, file.name);

            } catch (err) {
                console.error('Import parse error:', err);
                alert('Error parsing Excel file: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    },

    showImportPreviewModal: function(cards, fileName) {
        window.Master._pendingImportCards = cards;

        const primaryCount = cards.filter(c => c.card_category === 'Primary').length;
        const addonCount = cards.filter(c => c.card_category === 'Add-on').length;

        let previewRows = cards.slice(0, 8).map((c, i) => `
            <tr>
                <td><strong>${i + 1}</strong></td>
                <td>
                    <strong>${c.cardholder_name}</strong>
                    <div class="small text-muted">${c.primary_cardholder !== c.cardholder_name ? `Owner: ${c.primary_cardholder}` : ''}</div>
                </td>
                <td>
                    <span class="badge" style="${c.card_category === 'Primary' ? 'background:#eef0ff;color:#4361ee;border:1px solid #4361ee;' : 'background:#f3e8ff;color:#7209b7;border:1px solid #7209b7;'}font-weight:700;">
                        ${c.card_category}
                    </span>
                </td>
                <td><strong>${c.bank_name}</strong> <small class="text-muted">(${c.card_type})</small></td>
                <td><code style="font-family:'JetBrains Mono',monospace;">${c.card_last4 ? `**** ${c.card_last4}` : c.card_number}</code></td>
                <td class="text-right fw-bold text-success">${window.Utils.formatCurrency(c.credit_limit)}</td>
                <td><small class="text-muted">${c.zoho_ledger_name}</small></td>
            </tr>
        `).join('');

        const modalHtml = `
            <div style="margin-bottom: 20px;">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 bg-light rounded border mb-3">
                    <div>
                        <div class="small text-muted text-uppercase fw-bold"><i class="fas fa-file-excel text-success me-1"></i> File Loaded</div>
                        <div class="fw-bold fs-6" style="color:#1e293b;">${fileName}</div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <span class="badge" style="background:#e8f0fe;color:#1a73e8;border:1px solid #c2e7ff;padding:6px 12px;font-size:0.8rem;border-radius:100px;">
                            <i class="fas fa-credit-card me-1"></i> ${cards.length} Cards Total
                        </span>
                        <span class="badge" style="background:#e6faf4;color:#06d6a0;border:1px solid #06d6a0;padding:6px 12px;font-size:0.8rem;border-radius:100px;">
                            ${primaryCount} Primary
                        </span>
                        <span class="badge" style="background:#f3e8ff;color:#7209b7;border:1px solid #7209b7;padding:6px 12px;font-size:0.8rem;border-radius:100px;">
                            ${addonCount} Add-on
                        </span>
                    </div>
                </div>

                <div class="small text-muted mb-2">
                    <i class="fas fa-eye me-1"></i> Showing first ${Math.min(cards.length, 8)} of ${cards.length} cards detected:
                </div>

                <div class="table-responsive border rounded" style="max-height: 340px; overflow-y: auto;">
                    <table class="table data-table table-hover mb-0">
                        <thead class="table-light" style="position: sticky; top: 0; z-index: 2;">
                            <tr>
                                <th>#</th>
                                <th>Cardholder</th>
                                <th>Category</th>
                                <th>Bank &amp; Type</th>
                                <th>Card Last 4</th>
                                <th class="text-right">Credit Limit</th>
                                <th>Zoho Ledger</th>
                            </tr>
                        </thead>
                        <tbody>${previewRows}</tbody>
                    </table>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button class="btn btn-secondary" onclick="window.App.closeModal()">
                        <i class="fas fa-times me-1"></i> Cancel
                    </button>
                    <button class="btn btn-primary" onclick="window.Master.executeImport()" style="background:#4361ee;font-weight:700;padding:8px 22px;border-radius:8px;">
                        <i class="fas fa-check-circle me-1"></i> Confirm &amp; Import ${cards.length} Cards
                    </button>
                </div>
            </div>
        `;

        if (window.App && window.App.showModal) {
            window.App.showModal("Import Credit Cards Preview", modalHtml);
        }
    },

    executeImport: async function() {
        const cards = window.Master._pendingImportCards;
        if (!cards || cards.length === 0) return;

        if (window.App) {
            window.App.showToast(`Importing ${cards.length} cards into system...`, 'info');
            window.App.closeModal();
        }

        try {
            await window.DB.cards.addBatch(cards);
            if (window.App) {
                window.App.showToast(`🎉 Successfully imported ${cards.length} cards!`, 'success');
                window.App.updateCardCount();
            }
            window.Master._pendingImportCards = null;
            window.Master.render(window.Master.container);
        } catch (err) {
            console.error('Import failed:', err);
            if (window.App) {
                window.App.showToast('Import failed: ' + err.message, 'error');
            } else {
                alert('Import failed: ' + err.message);
            }
        }
    }
};
