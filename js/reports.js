window.Reports = {
    render: function(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div>
                    <h2 class="page-title">Reports &amp; Analytics Hub</h2>
                    <div class="page-subtitle text-muted">Generate executive multi-sheet dashboards and board-level presentation decks</div>
                </div>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <button class="btn btn-outline" onclick="window.Reports.showExcelExportModal()" style="border-radius:9px;font-weight:700;padding:8px 16px;background:#e6faf4;color:#059669;border:1.5px solid #a7f3d0;" title="Export all or selected reports into a multi-tab Excel Workbook with Executive Dashboard">
                        <i class="fas fa-file-excel text-success"></i> Multi-Sheet Excel Dashboard
                    </button>
                    <button class="btn btn-primary" onclick="window.Reports.showPptExportModal()" style="border-radius:9px;font-weight:700;padding:8px 18px;background:linear-gradient(135deg,#4361ee,#7209b7);border:none;box-shadow:0 4px 14px rgba(67,97,238,0.35);" title="Generate High-Impact 16:9 Executive PowerPoint Presentation (.pptx)">
                        <i class="fas fa-file-powerpoint"></i> Executive PPT Deck (.pptx)
                    </button>
                </div>
            </div>
            
            <div id="report-menu-wrapper">
                <div class="report-grid d-flex flex-wrap gap-3" id="report-menu">
                    ${this.getReportCardsHtml()}
                </div>
            </div>
            
            <div id="report-view" class="d-none">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                    <button class="btn btn-secondary" onclick="window.Reports.backToMenu()"><i class="fas fa-arrow-left"></i> Back to Reports Hub</button>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <button class="btn btn-outline" onclick="window.Reports.showPptExportModal()" style="background:#f3e8ff;color:#7209b7;border:1px solid #d8b4fe;border-radius:8px;font-weight:600;"><i class="fas fa-file-powerpoint"></i> Export PPT</button>
                        <button class="btn btn-outline" onclick="window.Reports.showExcelExportModal()" style="background:#e6faf4;color:#059669;border:1px solid #a7f3d0;border-radius:8px;font-weight:600;"><i class="fas fa-table"></i> Multi-Sheet Excel</button>
                        <button class="btn btn-success" onclick="window.Reports.exportCurrentReport()" style="border-radius:8px;font-weight:600;"><i class="fas fa-file-excel"></i> Export Current Report</button>
                    </div>
                </div>
                <div id="report-content" class="card p-4"></div>
            </div>
        `;
    },

    getReportCardsHtml: function() {
        const reports = [
            { id: 'reconciliation', title: 'Zoho vs Statement Reconciliation', icon: 'fa-exchange-alt', desc: 'Match Zoho entries against statement imports (Matched / Unmatched)' },
            { id: 'sole_owner', title: 'Credit Card Report – Sole Owner', icon: 'fa-user', desc: 'Complete card position grouped by owner' },
            { id: 'kpi_report', title: 'Dashboard KPI Report', icon: 'fa-tachometer-alt', desc: 'Export dashboard metrics' },
            { id: 'limit_used', title: 'Total Limit vs Used Limit', icon: 'fa-balance-scale', desc: 'Limit utilization per card' },
            { id: 'fee_waiver', title: 'Fee Waiver Report', icon: 'fa-gift', desc: 'Fee waiver target vs spent' },
            { id: 'data_hygiene', title: 'Data Hygiene Report', icon: 'fa-broom', desc: 'Missing field analysis' },
            { id: 'card_txn', title: 'Card-wise Transaction', icon: 'fa-credit-card', desc: 'Transactions grouped by card' },
            { id: 'cardholder_txn', title: 'Cardholder-wise Spend', icon: 'fa-users', desc: 'Total spending by cardholder' },
            { id: 'bank_wise', title: 'Bank-wise Report', icon: 'fa-university', desc: 'Cards and spending by bank' },
            { id: 'monthly_stmt', title: 'Monthly Statement Report', icon: 'fa-calendar-alt', desc: 'Statement summary by month' },
            { id: 'payment_out', title: 'Payment / Outstanding', icon: 'fa-money-check-alt', desc: 'Payment history and pending dues' },
            { id: 'import_history', title: 'Zoho Import History', icon: 'fa-file-import', desc: 'History of data imports' },
            { id: 'unmapped_ledger', title: 'Unmapped Ledger Report', icon: 'fa-exclamation-circle', desc: 'Transactions without card mapping' }
        ];

        return reports.map(r => `
            <div class="report-card card p-3 flex-fill" style="min-width: 250px; cursor: pointer; transition: 0.3s;" onclick="window.Reports.loadReport('${r.id}', '${r.title}')" onmouseover="this.classList.add('shadow')" onmouseout="this.classList.remove('shadow')">
                <div class="d-flex align-items-center">
                    <div class="report-icon bg-light text-primary rounded p-3 me-3"><i class="fas ${r.icon} fa-2x"></i></div>
                    <div>
                        <h5 class="mb-1">${r.title}</h5>
                        <p class="text-muted small mb-0">${r.desc}</p>
                    </div>
                </div>
            </div>
        `).join('');
    },

    backToMenu: function() {
        const wrapper = document.getElementById('report-menu-wrapper');
        const view = document.getElementById('report-view');
        wrapper.style.display = 'block';
        
        // Use inline style to avoid conflicting with bootstrap classes
        view.style.setProperty('display', 'none', 'important');
    },

    loadReport: function(id, title) {
        this.currentReportId = id;
        this.currentReportTitle = title;
        
        const wrapper = document.getElementById('report-menu-wrapper');
        const view = document.getElementById('report-view');
        
        wrapper.style.display = 'none';
        view.style.setProperty('display', 'block', 'important');
        
        const content = document.getElementById('report-content');
        content.innerHTML = `<h3 class="mb-4">${title}</h3><div id="rc-data">Loading...</div>`;
        
        setTimeout(() => {
            const dataDiv = document.getElementById('rc-data');
            this.generateReportData(id, dataDiv);
        }, 100);
    },

    generateReportData: function(id, container) {
        this.exportData = [];
        let html = '';
        const cards = window.DB.cards.getAll() || [];
        const txns = window.DB.transactions.getAll() || [];
        const stmts = window.DB.statements.getAll() || [];
        
        // Helper to setup chart layout
        const setChartLayout = (canvasId) => {
            return `<div class="mb-4" style="height: 300px;"><canvas id="${canvasId}"></canvas></div>`;
        };

        if(id === 'reconciliation') {
            this.renderReconciliation(container);
            return;
        }
        else if(id === 'sole_owner') {
            this.soleOwnerFilter = this.soleOwnerFilter || 'All';
            const owners = window.DB.cards.getOwners();
            
            // Prepare Chart Data
            const chartLabels = [];
            const chartData = [];
            
            html += setChartLayout('chart_owner');

            // Category Filter per Item 03
            html += `
                <div class="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded border">
                    <div class="d-flex align-items-center gap-2">
                        <label class="fw-bold small mb-0"><i class="fas fa-filter text-primary me-1"></i> Filter Card Category:</label>
                        <select class="form-select form-select-sm" style="width: 180px; font-weight: 600;" onchange="window.Reports.setSoleOwnerFilter(this.value)">
                            <option value="All" ${this.soleOwnerFilter === 'All' ? 'selected' : ''}>All Cards</option>
                            <option value="Primary" ${this.soleOwnerFilter === 'Primary' ? 'selected' : ''}>Primary Cards Only</option>
                            <option value="Add-on" ${this.soleOwnerFilter === 'Add-on' ? 'selected' : ''}>Add-on Cards Only</option>
                        </select>
                    </div>
                    <span class="badge bg-secondary">Showing: ${this.soleOwnerFilter} Cards</span>
                </div>
            `;
            
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0">`;
            owners.forEach(owner => {
                let oCards = cards.filter(c => c.primary_cardholder === owner);
                if (this.soleOwnerFilter !== 'All') {
                    oCards = oCards.filter(c => (c.card_category || 'Primary') === this.soleOwnerFilter);
                }
                if (oCards.length === 0) return;

                const limit = oCards.reduce((sum, c) => sum + (c.credit_limit||0), 0);
                
                chartLabels.push(owner);
                chartData.push(limit);

                html += `<tr class="table-light"><th colspan="7">Owner: ${owner} (${oCards.length} Card${oCards.length > 1 ? 's' : ''} | Total Limit: ${window.Utils.formatCurrency(limit)})</th></tr>`;
                html += `<tr><th>Cardholder</th><th>Category</th><th>Bank</th><th>Card Type</th><th>Last4</th><th class="text-right">Limit</th><th>Status</th></tr>`;
                oCards.forEach(c => {
                    const catBadge = c.card_category === 'Primary' 
                        ? '<span class="badge bg-primary">Primary</span>' 
                        : '<span class="badge" style="background:#e0e7ff;color:#4338ca;">Add-on</span>';
                    html += `<tr>
                        <td><strong>${c.cardholder_name}</strong></td>
                        <td>${catBadge}</td>
                        <td>${c.bank_name}</td>
                        <td>${c.card_type}</td>
                        <td><code>*${c.card_last4}</code></td>
                        <td class="text-right">${window.Utils.formatCurrency(c.credit_limit)}</td>
                        <td><span class="badge bg-success">${c.status}</span></td>
                    </tr>`;
                    this.exportData.push({ Owner: owner, Cardholder: c.cardholder_name, Category: c.card_category || 'Primary', Bank: c.bank_name, Type: c.card_type, Last4: c.card_last4, Limit: c.credit_limit, Status: c.status });
                });
            });
            html += `</table></div>`;
            
            container.innerHTML = html;
            this.renderChart('chart_owner', 'bar', chartLabels, chartData, 'Total Limit by Owner');
        }
        else if (id === 'kpi_report') {
            const kpis = window.DB.getKPIs();
            html += setChartLayout('chart_kpi');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-striped mb-0"><tbody>`;
            const m = [
                ['Total Payable (Statements)', window.Utils.formatCurrency(kpis.totalPayable)],
                ['Unbilled Amount (Records)', window.Utils.formatCurrency(kpis.totalUnbilled)],
                ['Total Rewards', kpis.totalRewards],
                ['Total Cards', kpis.totalCards],
                ['Primary Cards', kpis.primaryCards],
                ['Total Limit', window.Utils.formatCurrency(kpis.totalLimit)],
                ['Used Limit', window.Utils.formatCurrency(kpis.usedLimit)],
                ['Available Limit', window.Utils.formatCurrency(kpis.availableLimit)],
                ['Fee Waiver Balance', window.Utils.formatCurrency(kpis.feeWaiverBalance)]
            ];
            m.forEach(r => {
                html += `<tr><th>${r[0]}</th><td class="text-right fw-bold">${r[1]}</td></tr>`;
                this.exportData.push({ Metric: r[0], Value: r[1] });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_kpi', 'doughnut', ['Used Limit', 'Available Limit'], [kpis.usedLimit, kpis.availableLimit], 'Credit Limit Utilization', ['#ef476f', '#06d6a0']);
        }
        else if (id === 'limit_used') {
            html += setChartLayout('chart_limit');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Card</th><th>Category</th><th>Bank</th><th class="text-right">Total Limit</th><th class="text-right">Used Limit</th><th class="text-right">Available Limit</th><th class="text-right">Util %</th></tr></thead><tbody>`;
            
            let chartLabels = [];
            let chartUsed = [];
            let chartAvail = [];
            
            // Recompute dynamically on every import tying to transaction & statement spend (Item 04)
            cards.forEach(c => {
                const m = window.DB.cards.getCardLimitMetrics(c.card_id);
                const clz = m.util > 80 ? 'text-danger fw-bold' : (m.util > 50 ? 'text-warning fw-bold' : '');
                
                if (c.card_category === 'Primary' || m.limit > 0) {
                    chartLabels.push(c.cardholder_name + ' (*' + c.card_last4 + ')');
                    chartUsed.push(m.used);
                    chartAvail.push(m.available);
                }

                const catBadge = c.card_category === 'Primary' 
                    ? '<span class="badge bg-primary">Primary</span>' 
                    : '<span class="badge" style="background:#e0e7ff;color:#4338ca;">Add-on</span>';

                html += `<tr>
                    <td><strong>${c.cardholder_name}</strong> <small class="text-muted">(*${c.card_last4})</small></td>
                    <td>${catBadge}</td>
                    <td>${c.bank_name}</td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(m.limit)}</td>
                    <td class="text-right ${clz}">${window.Utils.formatCurrency(m.used)}</td>
                    <td class="text-right text-success fw-bold">${window.Utils.formatCurrency(m.available)}</td>
                    <td class="text-right ${clz}">${m.util}%</td>
                </tr>`;
                this.exportData.push({ Card: c.cardholder_name, Category: c.card_category, Bank: c.bank_name, Last4: c.card_last4, 'Total Limit': m.limit, 'Used Limit': m.used, 'Available Limit': m.available, 'Utilization %': m.util });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChartMulti('chart_limit', 'bar', chartLabels.slice(0, 10), 
                [{label: 'Used Limit', data: chartUsed.slice(0, 10), backgroundColor: '#ef476f'}, 
                 {label: 'Available Limit', data: chartAvail.slice(0, 10), backgroundColor: '#06d6a0'}]);
        }
        else if (id === 'fee_waiver') {
            html += setChartLayout('chart_fee');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table mb-0"><thead><tr class="table-light"><th>Card</th><th>Bank</th><th>Renewal Date</th><th class="text-right">Target</th><th class="text-right">Spent</th><th class="text-right">Remaining</th></tr></thead><tbody>`;
            
            let chartLabels = [];
            let chartSpent = [];
            let chartRem = [];
            
            cards.filter(c=>c.card_category==='Primary' && c.fee_waiver_target > 0).forEach(c => {
                const spent = txns.filter(t => t.card_id === c.card_id && t.txn_type === 'Debit').reduce((s,t)=>s+t.amount,0);
                const rem = Math.max(0, c.fee_waiver_target - spent);
                const clz = rem > 0 ? 'text-danger' : 'text-success';
                
                chartLabels.push(c.cardholder_name);
                chartSpent.push(spent);
                chartRem.push(rem);
                
                html += `<tr><td>${c.cardholder_name}</td><td>${c.bank_name}</td><td>${window.Utils.formatDate(c.renewal_date)}</td><td class="text-right">${window.Utils.formatCurrency(c.fee_waiver_target)}</td><td class="text-right">${window.Utils.formatCurrency(spent)}</td><td class="text-right ${clz} fw-bold">${window.Utils.formatCurrency(rem)}</td></tr>`;
                this.exportData.push({ Card: c.cardholder_name, Bank: c.bank_name, Renewal: window.Utils.formatDate(c.renewal_date), Target: c.fee_waiver_target, Spent: spent, Remaining: rem });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChartMulti('chart_fee', 'bar', chartLabels, 
                [{label: 'Spent', data: chartSpent, backgroundColor: '#118ab2'}, 
                 {label: 'Remaining Target', data: chartRem, backgroundColor: '#ffd166'}]);
        }
        else if (id === 'data_hygiene') {
            const hData = window.DB.getDataHygiene();
            html += setChartLayout('chart_hygiene');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-bordered mb-0"><thead><tr class="table-light"><th>Card</th><th>Bank</th><th class="text-center">Name</th><th class="text-center">Phone</th><th class="text-center">Email</th><th class="text-center">Limit</th><th class="text-center">Missing Count</th></tr></thead><tbody>`;
            
            let mName=0, mPhone=0, mEmail=0, mLimit=0;
            hData.forEach(h => {
                if(h.missing_name) mName++;
                if(h.missing_phone) mPhone++;
                if(h.missing_email) mEmail++;
                if(h.missing_limit) mLimit++;
                
                const getIcon = (miss) => miss ? '<span class="text-danger"><i class="fas fa-times"></i></span>' : '<span class="text-success"><i class="fas fa-check"></i></span>';
                html += `<tr><td>${h.cardholder_name} (*${h.card_last4})</td><td>${h.bank_name}</td><td class="text-center">${getIcon(h.missing_name)}</td><td class="text-center">${getIcon(h.missing_phone)}</td><td class="text-center">${getIcon(h.missing_email)}</td><td class="text-center">${getIcon(h.missing_limit)}</td><td class="text-center fw-bold text-danger">${h.total_missing}</td></tr>`;
                this.exportData.push({ Card: h.cardholder_name, Bank: h.bank_name, MissingName: h.missing_name, MissingPhone: h.missing_phone, MissingEmail: h.missing_email, MissingLimit: h.missing_limit, TotalMissing: h.total_missing });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_hygiene', 'pie', ['Missing Name', 'Missing Phone', 'Missing Email', 'Missing Limit'], [mName, mPhone, mEmail, mLimit], 'Data Hygiene Issues');
        }
        else if (id === 'bank_wise') {
            const banks = window.DB.cards.getBanks();
            html += setChartLayout('chart_bank');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Bank</th><th class="text-center">Card Count</th><th class="text-right">Total Limit</th><th class="text-right">Total Spent</th><th class="text-center">Action</th></tr></thead><tbody>`;
            
            let chartLabels = [];
            let chartSpent = [];
            
            banks.forEach(b => {
                const bCards = cards.filter(c => c.bank_name === b);
                const limit = bCards.reduce((s,c)=>s+(c.credit_limit||0),0);
                const cIds = bCards.map(c=>c.card_id);
                const spent = txns.filter(t => cIds.includes(t.card_id) && t.txn_type==='Debit').reduce((s,t)=>s+Utils.parseNum(t.amount),0);
                
                chartLabels.push(b);
                chartSpent.push(spent);
                
                html += `<tr style="cursor:pointer;" onclick="window.Reports.showBankCardsModal('${encodeURIComponent(b)}')" title="Click to view cards under ${b}">
                    <td><strong>${b}</strong></td>
                    <td class="text-center"><span class="badge bg-secondary">${bCards.length} Cards</span></td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(limit)}</td>
                    <td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(spent)}</td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-primary py-0" onclick="event.stopPropagation(); window.Reports.showBankCardsModal('${encodeURIComponent(b)}')"><i class="fas fa-credit-card me-1"></i> View Cards</button></td>
                </tr>`;
                this.exportData.push({ Bank: b, 'Card Count': bCards.length, 'Total Limit': limit, 'Total Spent': spent });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_bank', 'doughnut', chartLabels, chartSpent, 'Spend by Bank');
        }
        else if (id === 'card_txn') {
            html += setChartLayout('chart_card_txn');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Card</th><th>Category</th><th>Bank</th><th class="text-center">Txn Count</th><th class="text-right">Total Spend</th><th class="text-center">Action</th></tr></thead><tbody>`;
            
            let cardStats = [];
            cards.forEach(c => {
                const cTxns = txns.filter(t => String(t.card_id) === String(c.card_id) && t.txn_type === 'Debit');
                const spent = cTxns.reduce((s,t)=>s+Utils.parseNum(t.amount),0);
                cardStats.push({ card_id: c.card_id, name: c.cardholder_name, last4: c.card_last4, category: c.card_category || 'Primary', bank: c.bank_name, count: cTxns.length, spent: spent });
            });
            cardStats.sort((a,b) => b.spent - a.spent); // Sort top spenders
            
            let chartLabels = [];
            let chartData = [];
            cardStats.filter(c => c.count > 0).slice(0, 7).forEach(c => {
                chartLabels.push(c.name + ' (*' + c.last4 + ')');
                chartData.push(c.spent);
            });
            
            cardStats.forEach(c => {
                const catBadge = c.category === 'Primary' 
                    ? '<span class="badge bg-primary">Primary</span>' 
                    : '<span class="badge" style="background:#e0e7ff;color:#4338ca;">Add-on</span>';

                html += `<tr style="cursor:pointer;" onclick="window.Reports.showCardTransactionsModal('${c.card_id}')" title="Click to view all transactions for ${c.name}">
                    <td><span class="text-primary fw-bold">${c.name}</span> <small class="text-muted">(*${c.last4})</small></td>
                    <td>${catBadge}</td>
                    <td>${c.bank}</td>
                    <td class="text-center">${c.count}</td>
                    <td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(c.spent)}</td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-primary py-0" onclick="event.stopPropagation(); window.Reports.showCardTransactionsModal('${c.card_id}')"><i class="fas fa-list-ul me-1"></i> Transactions</button></td>
                </tr>`;
                this.exportData.push({ Card: c.name, Last4: c.last4, Category: c.category, Bank: c.bank, 'Txn Count': c.count, 'Total Spend': c.spent });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_card_txn', 'bar', chartLabels, chartData, 'Top 7 Cards by Spend');
        }
        else if (id === 'cardholder_txn') {
            html += setChartLayout('chart_holder');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Cardholder</th><th class="text-center">Cards Owned</th><th class="text-right">Total Limit</th><th class="text-right">Available Limit</th><th class="text-right">Total Spent</th><th class="text-center">Action</th></tr></thead><tbody>`;
            
            let holderStats = {};
            cards.forEach(c => {
                const h = c.cardholder_name || 'Unknown';
                if(!holderStats[h]) {
                    holderStats[h] = { name: h, cardsCount: 0, totalLimit: 0, availableLimit: 0, usedLimit: 0, spent: 0, cardIds: [] };
                }
                holderStats[h].cardsCount++;
                holderStats[h].cardIds.push(c.card_id);

                const m = window.DB.cards.getCardLimitMetrics(c.card_id);
                holderStats[h].totalLimit += m.limit;
                holderStats[h].usedLimit += m.used;
                holderStats[h].availableLimit += m.available;

                const spent = txns.filter(t => String(t.card_id) === String(c.card_id) && t.txn_type === 'Debit')
                                  .reduce((s,t)=>s+Utils.parseNum(t.amount),0);
                holderStats[h].spent += spent;
            });
            
            let chartLabels = [];
            let chartData = [];
            Object.keys(holderStats).sort((a,b) => holderStats[b].spent - holderStats[a].spent).forEach(h => {
                const stat = holderStats[h];
                chartLabels.push(h);
                chartData.push(stat.spent);
                html += `<tr style="cursor:pointer;" onclick="window.Reports.showCardholderDetailModal('${encodeURIComponent(h)}')" title="Click to view cardholder details for ${h}">
                    <td><span class="text-primary fw-bold">${h}</span></td>
                    <td class="text-center">${stat.cardsCount}</td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(stat.totalLimit)}</td>
                    <td class="text-right text-success fw-bold">${window.Utils.formatCurrency(stat.availableLimit)}</td>
                    <td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(stat.spent)}</td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-primary py-0" onclick="event.stopPropagation(); window.Reports.showCardholderDetailModal('${encodeURIComponent(h)}')"><i class="fas fa-eye me-1"></i> Details</button></td>
                </tr>`;
                this.exportData.push({ Cardholder: h, 'Cards Owned': stat.cardsCount, 'Total Limit': stat.totalLimit, 'Available Limit': stat.availableLimit, 'Total Spent': stat.spent });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_holder', 'pie', chartLabels.slice(0, 8), chartData.slice(0, 8), 'Spend by Cardholder');
        }
        else if (id === 'monthly_stmt') {
            html += setChartLayout('chart_monthly');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Month</th><th class="text-center">Statements Count</th><th class="text-right">Total Billed</th><th class="text-right">Total Outstanding</th><th class="text-center">Action</th></tr></thead><tbody>`;
            
            let monthStats = {};
            stmts.forEach(s => {
                const m = window.Utils.formatMonthYear(s.statement_month);
                if(!monthStats[m]) monthStats[m] = { label: m, count: 0, billed: 0, out: 0, rawDate: new Date(s.statement_month).getTime() };
                monthStats[m].count++;
                monthStats[m].billed += Utils.parseNum(s.billed_amount);
                monthStats[m].out += Utils.parseNum(s.closing_outstanding);
            });
            
            let sortedMonths = Object.keys(monthStats).sort((a,b) => monthStats[a].rawDate - monthStats[b].rawDate);
            let chartLabels = [];
            let chartBilled = [];
            let chartOut = [];
            
            sortedMonths.forEach(m => {
                chartLabels.push(m);
                chartBilled.push(monthStats[m].billed);
                chartOut.push(monthStats[m].out);
                html += `<tr style="cursor:pointer;" onclick="window.Reports.showMonthlyStatementsModal('${encodeURIComponent(m)}')" title="Click to view all statements for ${m}">
                    <td><strong>${m}</strong></td>
                    <td class="text-center"><span class="badge bg-info text-dark">${monthStats[m].count} Statements</span></td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(monthStats[m].billed)}</td>
                    <td class="text-right text-danger fw-bold">${window.Utils.formatCurrency(monthStats[m].out)}</td>
                    <td class="text-center"><button class="btn btn-sm btn-outline-primary py-0" onclick="event.stopPropagation(); window.Reports.showMonthlyStatementsModal('${encodeURIComponent(m)}')"><i class="fas fa-file-invoice me-1"></i> Statements</button></td>
                </tr>`;
                this.exportData.push({ Month: m, Statements: monthStats[m].count, 'Total Billed': monthStats[m].billed, 'Outstanding': monthStats[m].out });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChartMulti('chart_monthly', 'line', chartLabels, 
                [{label: 'Billed Amount', data: chartBilled, backgroundColor: 'rgba(67, 97, 238, 0.2)', borderColor: '#4361ee', fill: true},
                 {label: 'Outstanding', data: chartOut, backgroundColor: 'rgba(239, 71, 111, 0.2)', borderColor: '#ef476f', fill: true}]);
        }
        else if (id === 'payment_out') {
            html += setChartLayout('chart_payment');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table mb-0"><thead><tr class="table-light"><th>Card</th><th>Month</th><th>Due Date</th><th class="text-right">Billed</th><th class="text-right">Paid</th><th class="text-right">Outstanding</th><th>Status</th></tr></thead><tbody>`;
            
            let chartLabels = ['Paid / Cleared', 'Outstanding Dues'];
            let paidTotal = 0;
            let outTotal = 0;
            
            stmts.forEach(s => {
                paidTotal += (s.credits_payments || 0);
                outTotal += (s.closing_outstanding || 0);
                const c = cards.find(x => x.card_id === s.card_id);
                const name = c ? c.cardholder_name + ' (*' + c.card_last4 + ')' : 'Unknown';
                const statClass = s.payment_status === 'Paid' ? 'bg-success' : 'bg-warning text-dark';
                
                html += `<tr><td>${name}</td><td>${window.Utils.formatMonthYear(s.statement_month)}</td><td>${window.Utils.formatDate(s.due_date)}</td><td class="text-right">${window.Utils.formatCurrency(s.billed_amount)}</td><td class="text-right text-success">${window.Utils.formatCurrency(s.credits_payments)}</td><td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(s.closing_outstanding)}</td><td><span class="badge ${statClass}">${s.payment_status}</span></td></tr>`;
                this.exportData.push({ Card: name, Month: window.Utils.formatMonthYear(s.statement_month), Due: window.Utils.formatDate(s.due_date), Billed: s.billed_amount, Paid: s.credits_payments, Outstanding: s.closing_outstanding, Status: s.payment_status });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_payment', 'pie', chartLabels, [paidTotal, outTotal], 'Payments vs Outstanding', ['#06d6a0', '#ef476f']);
        }
        else if (id === 'import_history') {
            const batches = window.DB.data.import_batches || [];
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table mb-0"><thead><tr class="table-light"><th>Import Date</th><th>File Name</th><th class="text-center">Records Added</th><th class="text-right">Total Amount</th></tr></thead><tbody>`;
            
            batches.sort((a,b) => new Date(b.import_date) - new Date(a.import_date)).forEach(b => {
                html += `<tr><td>${window.Utils.formatDate(b.import_date)} ${new Date(b.import_date).toLocaleTimeString()}</td><td>${b.file_name}</td><td class="text-center">${b.records_added}</td><td class="text-right fw-bold">${window.Utils.formatCurrency(b.total_amount)}</td></tr>`;
                this.exportData.push({ 'Import Date': b.import_date, 'File Name': b.file_name, 'Records Added': b.records_added, 'Total Amount': b.total_amount });
            });
            if(batches.length === 0) html += `<tr><td colspan="4" class="text-center py-4">No import history found.</td></tr>`;
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        }
        else if (id === 'unmapped_ledger') {
            const unmapped = txns.filter(t => !t.card_id);
            html += `<div class="alert alert-danger mb-3"><i class="fas fa-exclamation-triangle me-2"></i>Found ${unmapped.length} unmapped transactions that need to be assigned to a card.</div>`;
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table mb-0"><thead><tr class="table-light"><th>Date</th><th>Ledger Name</th><th>Description</th><th class="text-right">Amount</th></tr></thead><tbody>`;
            unmapped.forEach(t => {
                html += `<tr><td>${window.Utils.formatDate(t.txn_date)}</td><td><strong>${t.zoho_ledger}</strong></td><td>${t.description}</td><td class="text-right fw-bold">${window.Utils.formatCurrency(t.amount)}</td></tr>`;
                this.exportData.push({ Date: window.Utils.formatDate(t.txn_date), Ledger: t.zoho_ledger, Description: t.description, Amount: t.amount });
            });
            if(unmapped.length === 0) html += `<tr><td colspan="4" class="text-center py-4 text-success"><i class="fas fa-check-circle me-2"></i>All transactions are mapped successfully!</td></tr>`;
            html += `</tbody></table></div>`;
            container.innerHTML = html;
        }
        else {
            html += `<div class="alert alert-info">Report data rendering implemented via Excel export. Click 'Export to Excel' for full view.</div>`;
            this.exportData = [{ Info: "Detailed tabular data exported for " + id }];
            container.innerHTML = html;
        }
    },

    // Chart.js helper
    renderChart: function(canvasId, type, labels, data, label, colors) {
        if (window._chartInstances && window._chartInstances[canvasId]) {
            window._chartInstances[canvasId].destroy();
        }
        if(!window._chartInstances) window._chartInstances = {};
        
        const ctx = document.getElementById(canvasId);
        if(!ctx) return;
        
        window._chartInstances[canvasId] = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: colors || [
                        'rgba(67, 97, 238, 0.8)', 'rgba(247, 37, 133, 0.8)', 'rgba(76, 201, 240, 0.8)', 
                        'rgba(114, 9, 183, 0.8)', 'rgba(58, 12, 163, 0.8)', 'rgba(72, 149, 239, 0.8)',
                        'rgba(255, 159, 28, 0.8)', 'rgba(46, 196, 182, 0.8)', 'rgba(231, 29, 54, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: type === 'pie' || type === 'doughnut' ? 'right' : 'top' }
                }
            }
        });
    },

    // Multi-dataset chart helper
    renderChartMulti: function(canvasId, type, labels, datasets) {
        if (window._chartInstances && window._chartInstances[canvasId]) {
            window._chartInstances[canvasId].destroy();
        }
        if(!window._chartInstances) window._chartInstances = {};
        
        const ctx = document.getElementById(canvasId);
        if(!ctx) return;
        
        window._chartInstances[canvasId] = new Chart(ctx, {
            type: type,
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: type !== 'pie' && type !== 'doughnut' ? {
                    y: { beginAtZero: true }
                } : {}
            }
        });
    },
exportCurrentReport: function() {
        if(!window.XLSX) return alert("XLSX library not loaded");
        if(this.exportData.length === 0) return alert("No data to export");
        
        const ws = window.XLSX.utils.json_to_sheet(this.exportData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Report");
        window.XLSX.writeFile(wb, `${this.currentReportId}_report.xlsx`);
    },

    // Dedicated Data Hygiene Page Render
    renderHygiene: function(container) {
        this.container = container;
        this.hygienePageSize = this.hygienePageSize || 20;
        this.hygienePage = this.hygienePage || 1;
        this.hygieneSearch = this.hygieneSearch || '';
        const hData = window.DB.getDataHygiene();
        
        let mName=0, mAddr=0, mPhone=0, mEmail=0, mLimit=0, mStmt=0, mDue=0;
        hData.forEach(h => {
            if(h.missing_name) mName++;
            if(h.missing_address) mAddr++;
            if(h.missing_phone) mPhone++;
            if(h.missing_email) mEmail++;
            if(h.missing_limit) mLimit++;
            if(h.missing_statement_date) mStmt++;
            if(h.missing_due_date) mDue++;
        });

        const totalIssues = mName + mAddr + mPhone + mEmail + mLimit + mStmt + mDue;
        const cardsWithIssues = hData.filter(h => h.total_missing > 0).length;
        const healthPct = hData.length > 0 ? Math.round(((hData.length - cardsWithIssues) / hData.length) * 100) : 100;
        const healthColor = healthPct >= 80 ? '#10b981' : (healthPct >= 50 ? '#f59e0b' : '#ef4444');

        const statsCards = [
            { label: 'Missing Name',    count: mName,  icon: 'fa-user',           gradient: 'linear-gradient(135deg,#ff6b6b,#ee5a24)' },
            { label: 'Missing Address', count: mAddr,  icon: 'fa-map-marker-alt', gradient: 'linear-gradient(135deg,#ffa502,#ff6348)' },
            { label: 'Missing Phone',   count: mPhone, icon: 'fa-phone',          gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
            { label: 'Missing Email',   count: mEmail, icon: 'fa-envelope',       gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
            { label: 'Missing Limit',   count: mLimit, icon: 'fa-rupee-sign',     gradient: 'linear-gradient(135deg,#f093fb,#f5576c)' },
            { label: 'Missing Stmt Date', count: mStmt, icon: 'fa-calendar',      gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
            { label: 'Missing Due Date', count: mDue,   icon: 'fa-calendar-check',gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)' }
        ];

        let statsHtml = statsCards.map(s => `
            <div style="background:${s.gradient};border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:transform 0.2s;cursor:default;min-width:140px;flex:1;"
                 onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${s.icon}" style="font-size:16px;color:#fff;"></i>
                </div>
                <div>
                    <div style="font-size:24px;font-weight:800;color:#fff;line-height:1;">${s.count}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.85);font-weight:500;margin-top:2px;">${s.label}</div>
                </div>
            </div>
        `).join('');

        // Filter data for table (only cards with issues) + search
        let issueCards = hData.filter(h => h.total_missing > 0);
        if(this.hygieneSearch) {
            const q = this.hygieneSearch.toLowerCase();
            issueCards = issueCards.filter(h =>
                (h.cardholder_name || '').toLowerCase().includes(q) ||
                (h.primary_cardholder || '').toLowerCase().includes(q) ||
                (h.bank_name || '').toLowerCase().includes(q) ||
                (h.card_last4 || '').toLowerCase().includes(q)
            );
        }
        const total = issueCards.length;
        const totalPages = Math.ceil(total / this.hygienePageSize) || 1;
        if(this.hygienePage > totalPages) this.hygienePage = totalPages;
        if(this.hygienePage < 1) this.hygienePage = 1;
        const start = (this.hygienePage - 1) * this.hygienePageSize;
        const paged = issueCards.slice(start, start + this.hygienePageSize);

        const getIco = (miss) => miss
            ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#fee2e2;"><i class="fas fa-times" style="color:#ef4444;font-size:11px;"></i></span>'
            : '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#d1fae5;"><i class="fas fa-check" style="color:#10b981;font-size:11px;"></i></span>';

        let rowsHtml = '';
        paged.forEach((h, idx) => {
            const bgColor = idx % 2 === 0 ? '#fff' : '#f9fafb';
            const missingBar = h.total_missing > 0
                ? `<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:#fee2e2;color:#ef4444;font-size:12px;font-weight:700;">${h.total_missing}</span>`
                : '<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:#d1fae5;color:#10b981;font-size:12px;font-weight:700;">0</span>';
            
            rowsHtml += `
            <tr style="background:${bgColor};cursor:pointer;" onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background='${bgColor}'" onclick="Reports.hygieneEditCard('${h.card_id}')" title="Click to edit this card">
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a2e;"><i class="fas fa-edit" style="color:#667eea;margin-right:6px;font-size:11px;opacity:0.6;"></i>${h.cardholder_name}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#495057;">${h.primary_cardholder}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;"><span style="padding:3px 10px;border-radius:6px;background:#f0f0f5;font-size:12px;font-weight:600;color:#495057;">${h.bank_name}</span></td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-family:monospace;color:#6c757d;">*${h.card_last4}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_name)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_address)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_phone)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_email)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_limit)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_statement_date)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${getIco(h.missing_due_date)}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${missingBar}</td>
            </tr>`;
        });

        if(paged.length === 0) {
            rowsHtml = `<tr><td colspan="12" style="text-align:center;padding:50px;color:#10b981;font-weight:600;"><i class="fas fa-check-circle" style="font-size:30px;display:block;margin-bottom:10px;"></i>All cards are clean! No missing data found.</td></tr>`;
        }

        // Build pagination
        let pgHtml = '';
        if(totalPages > 1) {
            pgHtml += '<div style="display:flex;gap:4px;align-items:center;">';
            pgHtml += `<button onclick="Reports.hygieneGoPage(${this.hygienePage - 1})" ${this.hygienePage === 1 ? 'disabled' : ''} style="padding:5px 10px;border:1px solid #dee2e6;border-radius:6px;background:#fff;color:#495057;cursor:pointer;font-size:12px;">&laquo; Prev</button>`;
            for(let i=1;i<=totalPages;i++) {
                if(i===1||i===totalPages||(i>=this.hygienePage-1&&i<=this.hygienePage+1)) {
                    const isActive = this.hygienePage === i;
                    pgHtml += `<button onclick="Reports.hygieneGoPage(${i})" style="padding:5px 10px;border:${isActive?'none':'1px solid #dee2e6'};border-radius:6px;${isActive?'background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;':'background:#fff;color:#495057;'}cursor:pointer;font-size:12px;font-weight:${isActive?'700':'400'};">${i}</button>`;
                } else if(i===this.hygienePage-2||i===this.hygienePage+2) {
                    pgHtml += '<span style="padding:5px 6px;font-size:12px;color:#adb5bd;">...</span>';
                }
            }
            pgHtml += `<button onclick="Reports.hygieneGoPage(${this.hygienePage + 1})" ${this.hygienePage === totalPages ? 'disabled' : ''} style="padding:5px 10px;border:1px solid #dee2e6;border-radius:6px;background:#fff;color:#495057;cursor:pointer;font-size:12px;">Next &raquo;</button>`;
            pgHtml += '</div>';
        }

        let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <h2 style="margin:0;font-weight:700;color:#1a1a2e;font-size:22px;">Data Hygiene</h2>
                <span style="color:#6c757d;font-size:13px;">Identify and fix missing card information · <em style="color:#667eea;">Click any row to edit</em></span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="text-align:center;padding:10px 20px;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="font-size:11px;color:#6c757d;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Health Score</div>
                    <div style="font-size:28px;font-weight:800;color:${healthColor};line-height:1.2;">${healthPct}%</div>
                </div>
                <div style="text-align:center;padding:10px 20px;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="font-size:11px;color:#6c757d;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total Issues</div>
                    <div style="font-size:28px;font-weight:800;color:#ef4444;line-height:1.2;">${totalIssues}</div>
                </div>
            </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
            ${statsHtml}
        </div>

        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-broom" style="color:#fff;font-size:14px;"></i>
                    </div>
                    <span style="font-weight:700;font-size:15px;color:#1a1a2e;">Cards with Missing Data</span>
                    <span style="background:#fee2e2;color:#ef4444;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${cardsWithIssues} of ${hData.length}</span>
                </div>
                <div style="position:relative;">
                    <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#adb5bd;font-size:13px;"></i>
                    <input type="text" id="hygiene-search" placeholder="Search by name, owner, bank..." value="${this.hygieneSearch}"
                        oninput="Reports.hygieneSearch=this.value;Reports.hygienePage=1;Reports.renderHygiene(Reports.container);setTimeout(function(){document.getElementById('hygiene-search').focus();},50);"
                        style="padding:7px 12px 7px 32px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;width:280px;outline:none;background:#f8f9fa;color:#495057;">
                </div>
            </div>

            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">Cardholder</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">Owner</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">Bank</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;">Last4</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-user" style="opacity:0.5;margin-right:3px;"></i>Name</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-map-marker-alt" style="opacity:0.5;margin-right:3px;"></i>Addr</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-phone" style="opacity:0.5;margin-right:3px;"></i>Phone</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-envelope" style="opacity:0.5;margin-right:3px;"></i>Email</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-rupee-sign" style="opacity:0.5;margin-right:3px;"></i>Limit</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-calendar" style="opacity:0.5;margin-right:3px;"></i>Stmt</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;"><i class="fas fa-calendar-check" style="opacity:0.5;margin-right:3px;"></i>Due</th>
                            <th style="padding:12px 14px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:2px solid #e9ecef;">Issues</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>

            <div style="padding:14px 20px;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <select onchange="Reports.hygienePageSize=parseInt(this.value);Reports.hygienePage=1;Reports.renderHygiene(Reports.container);" style="padding:5px 8px;border:1px solid #dee2e6;border-radius:6px;font-size:12px;background:#fff;color:#495057;cursor:pointer;">
                        <option value="10" ${this.hygienePageSize===10?'selected':''}>10 rows</option>
                        <option value="20" ${this.hygienePageSize===20?'selected':''}>20 rows</option>
                        <option value="50" ${this.hygienePageSize===50?'selected':''}>50 rows</option>
                        <option value="100" ${this.hygienePageSize===100?'selected':''}>100 rows</option>
                        <option value="200" ${this.hygienePageSize===200?'selected':''}>200 rows</option>
                    </select>
                    <span style="font-size:12px;color:#6c757d;">Showing <strong>${total > 0 ? start+1 : 0}</strong> to <strong>${Math.min(start+this.hygienePageSize, total)}</strong> of <strong>${total}</strong> cards with issues</span>
                </div>
                ${pgHtml}
            </div>
        </div>
        `;

        this.container.innerHTML = html;
    },

    hygieneGoPage: function(p) {
        this.hygienePage = p;
        this.renderHygiene(this.container);
    },

    hygieneEditCard: function(cardId) {
        if(window.Master && window.Master.editCard) {
            window.Master.editCard(cardId);
        }
    },

    // ── ITEM 03: SOLE OWNER CATEGORY FILTER ────────────────────
    setSoleOwnerFilter: function(val) {
        this.soleOwnerFilter = val;
        this.loadReport('sole_owner', 'Credit Card Report – Sole Owner');
    },

    // ── ITEM 05: CARD-WISE DRILL-DOWN MODAL ────────────────────
    showCardTransactionsModal: function(cardId) {
        const card = window.DB.cards.getById(cardId);
        if(!card) return;

        const allTxns = window.DB.transactions.getAll() || [];
        const cardTxns = allTxns.filter(t => String(t.card_id) === String(cardId));
        cardTxns.sort((a,b) => (b.txn_date||'').localeCompare(a.txn_date||''));

        const totalDebit = cardTxns.filter(t => t.txn_type === 'Debit').reduce((s,t) => s + window.Utils.parseNum(t.amount), 0);
        const totalCredit = cardTxns.filter(t => t.txn_type === 'Credit').reduce((s,t) => s + window.Utils.parseNum(t.amount), 0);

        let rowsHtml = '';
        if(cardTxns.length === 0) {
            rowsHtml = '<tr><td colspan="6" class="text-center py-4 text-muted">No transactions recorded for this card.</td></tr>';
        } else {
            cardTxns.forEach(t => {
                const isDebit = t.txn_type === 'Debit';
                rowsHtml += `
                    <tr>
                        <td><code>${window.Utils.formatDate(t.txn_date)}</code></td>
                        <td><strong>${t.description || 'Transaction'}</strong></td>
                        <td>${t.zoho_ledger || '-'}</td>
                        <td><span class="badge ${isDebit ? 'bg-danger' : 'bg-success'}">${t.txn_type}</span></td>
                        <td><span class="badge bg-light text-dark">${t.category || 'General'}</span></td>
                        <td class="text-right fw-bold ${isDebit ? 'text-danger' : 'text-success'}">${window.Utils.formatCurrency(t.amount)}</td>
                    </tr>
                `;
            });
        }

        const modalHtml = `
            <div class="mb-3 p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <h4 class="mb-1 text-primary">${card.cardholder_name}</h4>
                    <span class="text-muted small">${card.bank_name} &bull; ${card.card_type} &bull; <code>*${card.card_last4}</code></span>
                </div>
                <div class="d-flex gap-2">
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Transactions</small>
                        <strong class="text-dark">${cardTxns.length}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Total Spent (Debits)</small>
                        <strong class="text-danger">${window.Utils.formatCurrency(totalDebit)}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Credits / Refunds</small>
                        <strong class="text-success">${window.Utils.formatCurrency(totalCredit)}</strong>
                    </div>
                </div>
            </div>
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table data-table table-sm table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Zoho Ledger</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            <div class="mt-3 text-end text-muted small">
                <i class="fas fa-check-circle text-success me-1"></i> Transaction sum matches report total exactly: <strong>${window.Utils.formatCurrency(totalDebit)}</strong>
            </div>
        `;

        if(window.App && window.App.showModal) {
            window.App.showModal(`Card Transaction Ledger`, modalHtml);
        }
    },

    // ── ITEM 06: CARDHOLDER DETAIL MODAL ───────────────────────
    showCardholderDetailModal: function(encodedName) {
        const holderName = decodeURIComponent(encodedName);
        const cards = window.DB.cards.getAll() || [];
        const txns = window.DB.transactions.getAll() || [];

        const holderCards = cards.filter(c => c.cardholder_name === holderName || c.primary_cardholder === holderName);
        const cardIds = holderCards.map(c => String(c.card_id));

        let totalLimit = 0;
        let totalUsed = 0;
        let totalAvailable = 0;
        let totalSpent = 0;

        holderCards.forEach(c => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            totalLimit += m.limit;
            totalUsed += m.used;
            totalAvailable += m.available;
            totalSpent += m.totalSpend;
        });

        // Cards Table
        let cardsHtml = '';
        holderCards.forEach(c => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            const catBadge = c.card_category === 'Primary' 
                ? '<span class="badge bg-primary">Primary</span>' 
                : '<span class="badge" style="background:#e0e7ff;color:#4338ca;">Add-on</span>';
            cardsHtml += `
                <tr>
                    <td><strong>${c.cardholder_name}</strong></td>
                    <td>${c.bank_name}</td>
                    <td>${c.card_type}</td>
                    <td>${catBadge}</td>
                    <td><code>*${c.card_last4}</code></td>
                    <td class="text-right">${window.Utils.formatCurrency(m.limit)}</td>
                    <td class="text-right text-danger">${window.Utils.formatCurrency(m.used)}</td>
                    <td class="text-right text-success">${window.Utils.formatCurrency(m.available)}</td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(m.totalSpend)}</td>
                </tr>
            `;
        });

        // Holder Txns
        const holderTxns = txns.filter(t => cardIds.includes(String(t.card_id)) && t.txn_type === 'Debit')
                               .sort((a,b) => (b.txn_date||'').localeCompare(a.txn_date||''));

        let txnsHtml = '';
        if(holderTxns.length === 0) {
            txnsHtml = '<tr><td colspan="5" class="text-center py-3 text-muted">No transactions found.</td></tr>';
        } else {
            holderTxns.slice(0, 50).forEach(t => {
                const c = holderCards.find(x => String(x.card_id) === String(t.card_id));
                txnsHtml += `
                    <tr>
                        <td><code>${window.Utils.formatDate(t.txn_date)}</code></td>
                        <td>${c ? `${c.bank_name} (*${c.card_last4})` : '-'}</td>
                        <td>${t.description}</td>
                        <td><span class="badge bg-light text-dark">${t.category}</span></td>
                        <td class="text-right fw-bold text-danger">${window.Utils.formatCurrency(t.amount)}</td>
                    </tr>
                `;
            });
        }

        const modalHtml = `
            <div class="mb-3 p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <h3 class="mb-1 text-primary">${holderName}</h3>
                    <span class="text-muted small">Cardholder Portfolio & Spent Summary</span>
                </div>
                <div class="d-flex gap-2">
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Cards</small>
                        <strong>${holderCards.length}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Total Limit</small>
                        <strong class="text-primary">${window.Utils.formatCurrency(totalLimit)}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Available Limit</small>
                        <strong class="text-success">${window.Utils.formatCurrency(totalAvailable)}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Total Spent</small>
                        <strong class="text-danger">${window.Utils.formatCurrency(totalSpent)}</strong>
                    </div>
                </div>
            </div>

            <h5 class="mb-2 mt-4"><i class="fas fa-id-card text-primary me-2"></i>Cards Held</h5>
            <div class="table-responsive mb-4" style="max-height: 220px; overflow-y:auto;">
                <table class="table data-table table-sm table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th>Cardholder</th>
                            <th>Bank</th>
                            <th>Card Type</th>
                            <th>Category</th>
                            <th>Last4</th>
                            <th class="text-right">Limit</th>
                            <th class="text-right">Used</th>
                            <th class="text-right">Available</th>
                            <th class="text-right">Spend</th>
                        </tr>
                    </thead>
                    <tbody>${cardsHtml}</tbody>
                </table>
            </div>

            <h5 class="mb-2"><i class="fas fa-receipt text-primary me-2"></i>Underlying Transactions (${holderTxns.length})</h5>
            <div class="table-responsive" style="max-height: 250px; overflow-y:auto;">
                <table class="table data-table table-sm table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th>Date</th>
                            <th>Card</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${txnsHtml}</tbody>
                </table>
            </div>
        `;

        if(window.App && window.App.showModal) {
            window.App.showModal(`Cardholder Details: ${holderName}`, modalHtml);
        }
    },

    // ── ITEM 07: BANK CARDS MODAL ──────────────────────────────
    showBankCardsModal: function(encodedBank) {
        const bankName = decodeURIComponent(encodedBank);
        const cards = window.DB.cards.getAll() || [];
        const bankCards = cards.filter(c => c.bank_name === bankName);

        let totalLimit = 0;
        let totalUsed = 0;
        let totalAvail = 0;
        let totalSpend = 0;

        let rowsHtml = '';
        bankCards.forEach(c => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            totalLimit += m.limit;
            totalUsed += m.used;
            totalAvail += m.available;
            totalSpend += m.totalSpend;

            const catBadge = c.card_category === 'Primary' 
                ? '<span class="badge bg-primary">Primary</span>' 
                : '<span class="badge" style="background:#e0e7ff;color:#4338ca;">Add-on</span>';

            rowsHtml += `
                <tr>
                    <td><strong>${c.cardholder_name}</strong></td>
                    <td>${c.card_type}</td>
                    <td>${catBadge}</td>
                    <td><code>*${c.card_last4}</code></td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(m.limit)}</td>
                    <td class="text-right text-danger">${window.Utils.formatCurrency(m.used)}</td>
                    <td class="text-right text-success">${window.Utils.formatCurrency(m.available)}</td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(m.totalSpend)}</td>
                </tr>
            `;
        });

        const modalHtml = `
            <div class="mb-3 p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <h3 class="mb-1 text-primary">${bankName}</h3>
                    <span class="text-muted small">Cards Portfolio for ${bankName}</span>
                </div>
                <div class="d-flex gap-2">
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Cards</small>
                        <strong>${bankCards.length}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Total Limit</small>
                        <strong class="text-primary">${window.Utils.formatCurrency(totalLimit)}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Available</small>
                        <strong class="text-success">${window.Utils.formatCurrency(totalAvail)}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Spend</small>
                        <strong class="text-danger">${window.Utils.formatCurrency(totalSpend)}</strong>
                    </div>
                </div>
            </div>
            <div class="table-responsive" style="max-height: 420px; overflow-y:auto;">
                <table class="table data-table table-sm table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th>Cardholder</th>
                            <th>Card Type</th>
                            <th>Category</th>
                            <th>Last4</th>
                            <th class="text-right">Total Limit</th>
                            <th class="text-right">Used Limit</th>
                            <th class="text-right">Available Limit</th>
                            <th class="text-right">Total Spend</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        if(window.App && window.App.showModal) {
            window.App.showModal(`Bank Cards: ${bankName}`, modalHtml);
        }
    },

    // ── ITEM 08: MONTHLY STATEMENTS MODAL ──────────────────────
    showMonthlyStatementsModal: function(encodedMonth) {
        const monthLabel = decodeURIComponent(encodedMonth);
        const stmts = window.DB.statements.getAll() || [];
        const cards = window.DB.cards.getAll() || [];

        const monthStmts = stmts.filter(s => window.Utils.formatMonthYear(s.statement_month) === monthLabel);

        let totalBilled = 0;
        let totalOut = 0;

        let rowsHtml = '';
        monthStmts.forEach(s => {
            const card = cards.find(c => String(c.card_id) === String(s.card_id));
            const cName = card ? `${card.cardholder_name} (${card.bank_name} *${card.card_last4})` : `Card #${s.card_id}`;
            totalBilled += window.Utils.parseNum(s.billed_amount);
            totalOut += window.Utils.parseNum(s.closing_outstanding);

            const statBadge = s.payment_status === 'Paid' 
                ? '<span class="badge bg-success">Paid</span>' 
                : (s.payment_status === 'Overdue' 
                    ? '<span class="badge bg-danger">Overdue</span>' 
                    : '<span class="badge bg-warning text-dark">Pending</span>');

            rowsHtml += `
                <tr>
                    <td><strong>${cName}</strong></td>
                    <td><code>${window.Utils.formatDate(s.statement_month)}</code></td>
                    <td>${window.Utils.formatDate(s.due_date)}</td>
                    <td class="text-right">${window.Utils.formatCurrency(s.opening_balance)}</td>
                    <td class="text-right fw-bold">${window.Utils.formatCurrency(s.billed_amount)}</td>
                    <td class="text-right text-success">${window.Utils.formatCurrency(s.credits_payments)}</td>
                    <td class="text-right text-danger fw-bold">${window.Utils.formatCurrency(s.closing_outstanding)}</td>
                    <td>${statBadge}</td>
                </tr>
            `;
        });

        const modalHtml = `
            <div class="mb-3 p-3 bg-light rounded border d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <h3 class="mb-1 text-primary">Statements &mdash; ${monthLabel}</h3>
                    <span class="text-muted small">Card-wise breakdown of all statements for ${monthLabel}</span>
                </div>
                <div class="d-flex gap-2">
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Statements</small>
                        <strong>${monthStmts.length}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Total Billed</small>
                        <strong class="text-primary">${window.Utils.formatCurrency(totalBilled)}</strong>
                    </div>
                    <div class="text-center px-3 py-1 bg-white rounded border">
                        <small class="text-muted d-block">Total Outstanding</small>
                        <strong class="text-danger">${window.Utils.formatCurrency(totalOut)}</strong>
                    </div>
                </div>
            </div>
            <div class="table-responsive" style="max-height: 420px; overflow-y:auto;">
                <table class="table data-table table-sm table-hover mb-0">
                    <thead class="table-light sticky-top">
                        <tr>
                            <th>Card</th>
                            <th>Statement Date</th>
                            <th>Due Date</th>
                            <th class="text-right">Opening</th>
                            <th class="text-right">Billed</th>
                            <th class="text-right">Credits/Pmts</th>
                            <th class="text-right">Outstanding</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        if(window.App && window.App.showModal) {
            window.App.showModal(`Statements in ${monthLabel}`, modalHtml);
        }
    },

    // ── ITEM 02: ZOHO VS STATEMENT RECONCILIATION ENGINE ───────
    reconCardId: 'all',
    reconMonth: 'all',
    reconMode: 'billed', // 'billed' | 'unbilled'
    reconStatusFilter: 'all',

    renderReconciliation: function(container) {
        const cards = window.DB.cards.getAll() || [];
        const txns = window.DB.transactions.getAll() || [];
        const stmts = window.DB.statements.getAll() || [];

        // All distinct months
        const months = [...new Set(stmts.map(s => window.Utils.formatMonthYear(s.statement_month)).filter(Boolean))].sort();

        // Filter cards/stmts/txns for current view
        let selectedCards = cards;
        if(this.reconCardId !== 'all') {
            selectedCards = cards.filter(c => String(c.card_id) === String(this.reconCardId));
        }

        // Run Matcher Algorithm
        const reconRows = [];
        let totalZohoAmount = 0;
        let totalStatementAmount = 0;
        let matchedCount = 0;
        let matchedAmount = 0;

        selectedCards.forEach(card => {
            // Zoho debits for this card
            const cTxns = txns.filter(t => String(t.card_id) === String(card.card_id) && t.txn_type === 'Debit');
            
            // Statements for this card
            let cStmts = stmts.filter(s => String(s.card_id) === String(card.card_id));
            if(this.reconMonth !== 'all') {
                cStmts = cStmts.filter(s => window.Utils.formatMonthYear(s.statement_month) === this.reconMonth);
            }

            if(this.reconMode === 'billed') {
                // BILLED RECONCILIATION: Compare Zoho transactions against Statements
                cStmts.forEach(s => {
                    const stmtBilled = window.Utils.parseNum(s.billed_amount);
                    totalStatementAmount += stmtBilled;

                    // Match Zoho transactions falling around statement month
                    const mStr = window.Utils.formatMonthYear(s.statement_month);
                    const matchedTxns = cTxns.filter(t => window.Utils.formatMonthYear(t.txn_date) === mStr);
                    const zohoSum = matchedTxns.reduce((sum, t) => sum + window.Utils.parseNum(t.amount), 0);
                    totalZohoAmount += zohoSum;

                    const diff = zohoSum - stmtBilled;
                    let status = 'Matched';
                    if(Math.abs(diff) < 1) {
                        status = 'Matched';
                        matchedCount++;
                        matchedAmount += stmtBilled;
                    } else if(zohoSum > 0 && stmtBilled === 0) {
                        status = 'In Zoho Only';
                    } else if(stmtBilled > 0 && zohoSum === 0) {
                        status = 'In Statement Only';
                    } else {
                        status = 'Discrepancy';
                    }

                    reconRows.push({
                        cardName: `${card.cardholder_name} (*${card.card_last4})`,
                        bank: card.bank_name,
                        period: mStr,
                        description: `Statement Billed Amount vs Zoho Sum (${matchedTxns.length} txns)`,
                        zohoAmount: zohoSum,
                        stmtAmount: stmtBilled,
                        diff: diff,
                        status: status,
                        mode: 'Billed'
                    });
                });

                // Also check unbilled Zoho entries not in statements
                if(cStmts.length === 0) {
                    cTxns.forEach(t => {
                        const amt = window.Utils.parseNum(t.amount);
                        totalZohoAmount += amt;
                        reconRows.push({
                            cardName: `${card.cardholder_name} (*${card.card_last4})`,
                            bank: card.bank_name,
                            period: window.Utils.formatMonthYear(t.txn_date),
                            description: t.description,
                            zohoAmount: amt,
                            stmtAmount: 0,
                            diff: amt,
                            status: 'In Zoho Only',
                            mode: 'Billed'
                        });
                    });
                }
            } else {
                // UNBILLED TRANSACTIONS MODE: Compare current unbilled entries against statement unbilled field
                cStmts.forEach(s => {
                    const stmtUnbilled = window.Utils.parseNum(s.unbilled_amount);
                    totalStatementAmount += stmtUnbilled;

                    // Current unbilled Zoho transactions
                    const unbilledTxns = cTxns.filter(t => new Date(t.txn_date) > new Date(s.statement_month));
                    const zohoUnbilledSum = unbilledTxns.reduce((sum, t) => sum + window.Utils.parseNum(t.amount), 0);
                    totalZohoAmount += zohoUnbilledSum;

                    const diff = zohoUnbilledSum - stmtUnbilled;
                    let status = 'Matched';
                    if(Math.abs(diff) < 1) {
                        status = 'Matched';
                        matchedCount++;
                        matchedAmount += stmtUnbilled;
                    } else if(zohoUnbilledSum > 0 && stmtUnbilled === 0) {
                        status = 'In Zoho Only';
                    } else if(stmtUnbilled > 0 && zohoUnbilledSum === 0) {
                        status = 'In Statement Only';
                    } else {
                        status = 'Discrepancy';
                    }

                    reconRows.push({
                        cardName: `${card.cardholder_name} (*${card.card_last4})`,
                        bank: card.bank_name,
                        period: window.Utils.formatMonthYear(s.statement_month),
                        description: `Statement Unbilled Amount vs New Zoho Swipes (${unbilledTxns.length} txns)`,
                        zohoAmount: zohoUnbilledSum,
                        stmtAmount: stmtUnbilled,
                        diff: diff,
                        status: status,
                        mode: 'Unbilled'
                    });
                });
            }
        });

        // Filter by Status Pill
        let filteredRows = reconRows;
        if(this.reconStatusFilter !== 'all') {
            filteredRows = reconRows.filter(r => r.status.toLowerCase().replace(/\s+/g, '') === this.reconStatusFilter.toLowerCase().replace(/\s+/g, ''));
        }

        this.exportData = filteredRows.map(r => ({
            Card: r.cardName,
            Bank: r.bank,
            Period: r.period,
            Description: r.description,
            'Zoho Amount': r.zohoAmount,
            'Statement Amount': r.stmtAmount,
            'Value Difference': r.diff,
            Status: r.status,
            Mode: r.mode
        }));

        const countAll = reconRows.length;
        const countMatched = reconRows.filter(r => r.status === 'Matched').length;
        const countZohoOnly = reconRows.filter(r => r.status === 'In Zoho Only').length;
        const countStmtOnly = reconRows.filter(r => r.status === 'In Statement Only').length;
        const countDiscrepancy = reconRows.filter(r => r.status === 'Discrepancy').length;

        let tableRowsHtml = '';
        if(filteredRows.length === 0) {
            tableRowsHtml = '<tr><td colspan="7" class="text-center py-5 text-muted" style="font-size:0.95rem;"><i class="fas fa-search me-2" style="font-size:1.3rem;color:#cbd5e1;display:block;margin-bottom:8px;"></i>No reconciliation records found matching current criteria.</td></tr>';
        } else {
            filteredRows.forEach(r => {
                let badgeStyle = 'background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;';
                let icon = 'fa-info-circle';
                if(r.status === 'Matched') {
                    badgeStyle = 'background:#e6faf4;color:#06d6a0;border:1px solid #06d6a0;';
                    icon = 'fa-check-circle';
                } else if(r.status === 'In Zoho Only') {
                    badgeStyle = 'background:#fef9e7;color:#d97706;border:1px solid #fcd34d;';
                    icon = 'fa-file-alt';
                } else if(r.status === 'In Statement Only') {
                    badgeStyle = 'background:#e8f8fd;color:#0284c7;border:1px solid #7dd3fc;';
                    icon = 'fa-file-invoice';
                } else if(r.status === 'Discrepancy') {
                    badgeStyle = 'background:#fde8ec;color:#ef476f;border:1px solid #fca5a5;';
                    icon = 'fa-exclamation-triangle';
                }

                const diffFormatted = window.Utils.formatCurrency(Math.abs(r.diff));
                const diffHtml = Math.abs(r.diff) < 1 
                    ? `<span style="color:#06d6a0;font-weight:700;"><i class="fas fa-check me-1"></i>₹0.00</span>` 
                    : `<span style="color:#ef476f;font-weight:800;background:#fde8ec;padding:3px 8px;border-radius:6px;display:inline-block;">${r.diff > 0 ? '+' : '-'}${diffFormatted}</span>`;

                tableRowsHtml += `
                    <tr>
                        <td>
                            <span class="badge" style="${badgeStyle}font-weight:700;padding:5px 10px;border-radius:100px;font-size:0.75rem;letter-spacing:0.3px;">
                                <i class="fas ${icon} me-1"></i>${r.status}
                            </span>
                        </td>
                        <td>
                            <div style="font-weight:700;color:#1e293b;">${r.cardName}</div>
                            <div style="font-size:0.75rem;color:#64748b;"><i class="fas fa-university me-1"></i>${r.bank}</div>
                        </td>
                        <td><span style="font-family:'JetBrains Mono',monospace;background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:0.8rem;color:#334155;border:1px solid #e2e8f0;">${r.period}</span></td>
                        <td style="color:#475569;font-size:0.85rem;">${r.description}</td>
                        <td class="text-right" style="font-weight:700;color:#1e293b;font-size:0.92rem;">${window.Utils.formatCurrency(r.zohoAmount)}</td>
                        <td class="text-right" style="font-weight:700;color:#1e293b;font-size:0.92rem;">${window.Utils.formatCurrency(r.stmtAmount)}</td>
                        <td class="text-right">${diffHtml}</td>
                    </tr>
                `;
            });
        }

        const netDiscrepancy = totalZohoAmount - totalStatementAmount;
        const isDiscrepancyZero = Math.abs(netDiscrepancy) < 1;

        const html = `
            <!-- Top Toolbar: Mode Switcher & Filters -->
            <div class="recon-toolbar">
                <!-- Mode Toggle -->
                <div class="recon-mode-toggle">
                    <button type="button" class="recon-mode-btn ${this.reconMode === 'billed' ? 'active' : ''}" onclick="Reports.setReconMode('billed')">
                        <i class="fas fa-file-invoice"></i> Billed Reconciliation
                    </button>
                    <button type="button" class="recon-mode-btn ${this.reconMode === 'unbilled' ? 'active' : ''}" onclick="Reports.setReconMode('unbilled')">
                        <i class="fas fa-clock"></i> Unbilled Swipes Mode
                    </button>
                </div>

                <!-- Filters -->
                <div class="recon-filters-group">
                    <div class="recon-filter-box">
                        <span class="recon-filter-label"><i class="fas fa-credit-card text-primary"></i> Card:</span>
                        <select class="recon-filter-select" style="min-width: 200px;" onchange="Reports.reconCardId=this.value; Reports.renderReconciliation(Reports.container);">
                            <option value="all" ${this.reconCardId === 'all' ? 'selected' : ''}>All Cards (${cards.length})</option>
                            ${cards.map(c => `<option value="${c.card_id}" ${String(this.reconCardId) === String(c.card_id) ? 'selected' : ''}>${c.cardholder_name} (*${c.card_last4})</option>`).join('')}
                        </select>
                    </div>

                    <div class="recon-filter-box">
                        <span class="recon-filter-label"><i class="fas fa-calendar-alt text-primary"></i> Month:</span>
                        <select class="recon-filter-select" style="min-width: 130px;" onchange="Reports.reconMonth=this.value; Reports.renderReconciliation(Reports.container);">
                            <option value="all" ${this.reconMonth === 'all' ? 'selected' : ''}>All Months</option>
                            ${months.map(m => `<option value="${m}" ${this.reconMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>

                    ${(this.reconCardId !== 'all' || this.reconMonth !== 'all' || this.reconStatusFilter !== 'all') ? `
                    <button class="btn btn-sm btn-outline" style="border-radius:10px;padding:6px 14px;" onclick="Reports.reconCardId='all'; Reports.reconMonth='all'; Reports.reconStatusFilter='all'; Reports.renderReconciliation(Reports.container);" title="Reset filters">
                        <i class="fas fa-undo"></i> Reset
                    </button>` : ''}
                </div>
            </div>

            <!-- 4-Column KPI Stat Cards Grid -->
            <div class="recon-kpi-grid">
                <!-- Card 1: Total Zoho Spend -->
                <div class="recon-kpi-card blue">
                    <div class="recon-kpi-header">
                        <span class="recon-kpi-title">Total Zoho Spend</span>
                        <div class="recon-kpi-icon-wrap"><i class="fas fa-receipt"></i></div>
                    </div>
                    <div>
                        <div class="recon-kpi-value">${window.Utils.formatCurrency(totalZohoAmount)}</div>
                        <div class="recon-kpi-sub"><i class="fas fa-database me-1"></i>From Zoho ledger debits</div>
                    </div>
                </div>

                <!-- Card 2: Total Statement Amount -->
                <div class="recon-kpi-card purple">
                    <div class="recon-kpi-header">
                        <span class="recon-kpi-title">Total Statement Amount</span>
                        <div class="recon-kpi-icon-wrap"><i class="fas fa-file-invoice-dollar"></i></div>
                    </div>
                    <div>
                        <div class="recon-kpi-value">${window.Utils.formatCurrency(totalStatementAmount)}</div>
                        <div class="recon-kpi-sub"><i class="fas fa-university me-1"></i>From bank imported statements</div>
                    </div>
                </div>

                <!-- Card 3: Matched Amount -->
                <div class="recon-kpi-card green">
                    <div class="recon-kpi-header">
                        <span class="recon-kpi-title">Matched Amount</span>
                        <div class="recon-kpi-icon-wrap"><i class="fas fa-check-circle"></i></div>
                    </div>
                    <div>
                        <div class="recon-kpi-value">${window.Utils.formatCurrency(matchedAmount)}</div>
                        <div class="recon-kpi-sub"><i class="fas fa-check-double me-1"></i>${countMatched} fully reconciled records</div>
                    </div>
                </div>

                <!-- Card 4: Net Discrepancy -->
                <div class="recon-kpi-card ${isDiscrepancyZero ? 'green' : 'red'}">
                    <div class="recon-kpi-header">
                        <span class="recon-kpi-title">Net Discrepancy</span>
                        <div class="recon-kpi-icon-wrap"><i class="fas ${isDiscrepancyZero ? 'fa-shield-alt' : 'fa-balance-scale'}"></i></div>
                    </div>
                    <div>
                        <div class="recon-kpi-value">${window.Utils.formatCurrency(netDiscrepancy)}</div>
                        <div class="recon-kpi-sub"><i class="fas fa-exclamation-circle me-1"></i>${countDiscrepancy} discrepancies detected</div>
                    </div>
                </div>
            </div>

            <!-- Status Filter Bar with Capsule Pills -->
            <div class="recon-status-bar">
                <div class="recon-status-left">
                    <span class="recon-status-label"><i class="fas fa-filter text-primary"></i> Filter Status:</span>
                    <div class="recon-status-pills">
                        <button class="recon-pill-btn ${this.reconStatusFilter === 'all' ? 'active-all' : ''}" onclick="Reports.setReconFilter('all')">
                            All <span class="recon-pill-count">${countAll}</span>
                        </button>
                        <button class="recon-pill-btn ${this.reconStatusFilter === 'matched' ? 'active-matched' : ''}" onclick="Reports.setReconFilter('matched')">
                            <i class="fas fa-check text-success"></i> Matched <span class="recon-pill-count">${countMatched}</span>
                        </button>
                        <button class="recon-pill-btn ${this.reconStatusFilter === 'inzohoonly' ? 'active-inzohoonly' : ''}" onclick="Reports.setReconFilter('inzohoonly')">
                            <i class="fas fa-file-alt text-warning"></i> In Zoho Only <span class="recon-pill-count">${countZohoOnly}</span>
                        </button>
                        <button class="recon-pill-btn ${this.reconStatusFilter === 'instatementonly' ? 'active-instatementonly' : ''}" onclick="Reports.setReconFilter('instatementonly')">
                            <i class="fas fa-file-invoice text-info"></i> In Statement Only <span class="recon-pill-count">${countStmtOnly}</span>
                        </button>
                        <button class="recon-pill-btn ${this.reconStatusFilter === 'discrepancy' ? 'active-discrepancy' : ''}" onclick="Reports.setReconFilter('discrepancy')">
                            <i class="fas fa-exclamation-triangle text-danger"></i> Discrepancy <span class="recon-pill-count">${countDiscrepancy}</span>
                        </button>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-secondary" style="border-radius:100px;padding:6px 16px;" onclick="Reports.exportCurrentReport()" title="Export reconciliation ledger to Excel">
                        <i class="fas fa-file-excel text-success me-1"></i> Export Excel
                    </button>
                </div>
            </div>

            <!-- Comparison Table -->
            <div class="card data-table-wrapper table-responsive" style="border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                <table class="table data-table table-hover mb-0">
                    <thead style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                        <tr>
                            <th>Status</th>
                            <th>Card Details</th>
                            <th>Period</th>
                            <th>Description</th>
                            <th class="text-right">Zoho Amount</th>
                            <th class="text-right">Statement Amount</th>
                            <th class="text-right">Difference</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    },

    setReconMode: function(mode) {
        this.reconMode = mode;
        this.renderReconciliation(this.container);
    },

    setReconFilter: function(status) {
        this.reconStatusFilter = status;
        this.renderReconciliation(this.container);
    },

    // ── EXECUTIVE MULTI-REPORT DATASET EXTRACTOR ───────────────
    getExecutiveDatasets: function() {
        const cards = window.DB.cards.getAll() || [];
        const txns  = window.DB.transactions.getAll() || [];
        const stmts = window.DB.statements.getAll() || [];
        const kpis  = window.DB.getKPIs();

        // 1. Executive KPI Summary Tab
        const kpiSheet = [
            { 'Portfolio Metric': 'Total Active Credit Cards', 'Value': kpis.totalCards, 'Benchmark / Context': 'Across 7 major banking partners' },
            { 'Portfolio Metric': 'Primary Master Cards', 'Value': kpis.primaryCards, 'Benchmark / Context': 'Corporate & sole-owner primary lines' },
            { 'Portfolio Metric': 'Add-on Supplementary Cards', 'Value': cards.filter(c => c.card_category === 'Add-on').length, 'Benchmark / Context': 'Supplementary authorized employee cards' },
            { 'Portfolio Metric': 'Total Sanctioned Credit Limit', 'Value': kpis.totalLimit, 'Benchmark / Context': 'Cumulative corporate credit line across banks' },
            { 'Portfolio Metric': 'Total Used Credit Limit', 'Value': kpis.usedLimit, 'Benchmark / Context': 'Current statement spend + unbilled records' },
            { 'Portfolio Metric': 'Available Credit Cushion', 'Value': kpis.availableLimit, 'Benchmark / Context': 'Unutilized credit cushion across cards' },
            { 'Portfolio Metric': 'Portfolio Utilization %', 'Value': kpis.totalLimit > 0 ? ((kpis.usedLimit / kpis.totalLimit) * 100).toFixed(1) + '%' : '0%', 'Benchmark / Context': 'Target benchmark <30%' },
            { 'Portfolio Metric': 'Total Billed Statement Payable', 'Value': kpis.totalPayable, 'Benchmark / Context': 'Strictly sourced from statement dues' },
            { 'Portfolio Metric': 'Current Unbilled Transactions', 'Value': kpis.totalUnbilled, 'Benchmark / Context': 'Active cycle swipes not yet billed' },
            { 'Portfolio Metric': 'Total Accumulated Rewards', 'Value': kpis.totalRewards, 'Benchmark / Context': 'Available reward points pool' },
            { 'Portfolio Metric': 'Cards with >50% Utilization', 'Value': kpis.over50Count, 'Benchmark / Context': 'Risk review threshold' },
            { 'Portfolio Metric': 'Fee Waiver Spending Balance', 'Value': kpis.feeWaiverBalance, 'Benchmark / Context': 'Remaining spend to avoid annual fees' }
        ];

        // 2. Reconciliation Tab
        const reconRows = [];
        cards.forEach(card => {
            const cTxns = txns.filter(t => String(t.card_id) === String(card.card_id) && t.txn_type === 'Debit');
            const cStmts = stmts.filter(s => String(s.card_id) === String(card.card_id));
            cStmts.forEach(s => {
                const stmtBilled = window.Utils.parseNum(s.billed_amount);
                const mStr = window.Utils.formatMonthYear(s.statement_month);
                const matchedTxns = cTxns.filter(t => window.Utils.formatMonthYear(t.txn_date) === mStr);
                const zohoSum = matchedTxns.reduce((sum, t) => sum + window.Utils.parseNum(t.amount), 0);
                const diff = zohoSum - stmtBilled;
                let status = 'Matched';
                if (Math.abs(diff) < 1) status = 'Matched';
                else if (zohoSum > 0 && stmtBilled === 0) status = 'In Zoho Only';
                else if (stmtBilled > 0 && zohoSum === 0) status = 'In Statement Only';
                else status = 'Discrepancy';

                reconRows.push({
                    'Cardholder Name': card.cardholder_name,
                    'Primary Owner': card.primary_cardholder,
                    'Bank': card.bank_name,
                    'Card Last 4': card.card_last4,
                    'Billing Period': mStr,
                    'Zoho Debits Amount': zohoSum,
                    'Statement Billed Amount': stmtBilled,
                    'Variance / Difference': diff,
                    'Reconciliation Status': status
                });
            });
        });

        // 3. Card Master & Limit Utilization Tab
        const limitRows = cards.map(c => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            return {
                'Cardholder Name': c.cardholder_name,
                'Primary Owner': c.primary_cardholder,
                'Category': c.card_category || 'Primary',
                'Bank Name': c.bank_name,
                'Card Type': c.card_type,
                'Card Last 4': c.card_last4,
                'Credit Limit': m.limit,
                'Used Limit': m.used,
                'Available Limit': m.available,
                'Utilization %': m.util + '%',
                'Billed Statement Spend': m.billed,
                'Unbilled Swipes': m.unbilled,
                'Total Payable': m.totalPayable,
                'Zoho Ledger Name': c.zoho_ledger_name,
                'Status': c.status || 'Active'
            };
        });

        // 4. Cardholder-wise Spend Tab
        const owners = window.DB.cards.getOwners();
        const cardholderRows = owners.map(owner => {
            const ownerCards = cards.filter(c => c.primary_cardholder === owner);
            const cardIds = ownerCards.map(c => c.card_id);
            const totalLimit = ownerCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
            const spent = txns.filter(t => cardIds.includes(t.card_id) && t.txn_type === 'Debit')
                              .reduce((sum, t) => sum + (t.amount || 0), 0);
            return {
                'Cardholder / Owner': owner,
                'Active Cards Count': ownerCards.length,
                'Total Sanctioned Limit': totalLimit,
                'Total Debit Spend': spent,
                'Available Cushion': Math.max(0, totalLimit - spent),
                'Utilization %': totalLimit > 0 ? ((spent / totalLimit) * 100).toFixed(1) + '%' : '0%'
            };
        });

        // 5. Bank-wise Spend Tab
        const banks = window.DB.cards.getBanks();
        const bankRows = banks.map(bank => {
            const bankCards = cards.filter(c => c.bank_name === bank);
            const bankCardIds = bankCards.map(c => c.card_id);
            const totalLimit = bankCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
            const totalSpent = txns.filter(t => bankCardIds.includes(t.card_id) && t.txn_type === 'Debit')
                                   .reduce((sum, t) => sum + (t.amount || 0), 0);
            return {
                'Bank Name': bank,
                'Cards Issued': bankCards.length,
                'Total Credit Limit': totalLimit,
                'Total Spend': totalSpent,
                'Available Credit': Math.max(0, totalLimit - totalSpent),
                'Bank Utilization %': totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(1) + '%' : '0%'
            };
        });

        // 6. Monthly Statements Tab
        const stmtMonths = [...new Set(stmts.map(s => window.Utils.formatMonthYear(s.statement_month)).filter(Boolean))].sort();
        const monthRows = stmtMonths.map(m => {
            const mStmts = stmts.filter(s => window.Utils.formatMonthYear(s.statement_month) === m);
            return {
                'Statement Month': m,
                'Statements Count': mStmts.length,
                'Opening Balance': mStmts.reduce((sum, s) => sum + (s.opening_balance || 0), 0),
                'Billed Amount': mStmts.reduce((sum, s) => sum + (s.billed_amount || 0), 0),
                'Unbilled Amount': mStmts.reduce((sum, s) => sum + (s.unbilled_amount || 0), 0),
                'Closing Outstanding Due': mStmts.reduce((sum, s) => sum + (s.closing_outstanding || 0), 0),
                'Payments & Credits': mStmts.reduce((sum, s) => sum + (s.credits_payments || 0), 0)
            };
        });

        // 7. Fee Waiver Targets Tab
        const waiverRows = cards.filter(c => (c.fee_waiver_target || 0) > 0).map(c => {
            const spent = txns.filter(t => String(t.card_id) === String(c.card_id) && t.txn_type === 'Debit')
                              .reduce((sum, t) => sum + (t.amount || 0), 0);
            const target = c.fee_waiver_target || 0;
            const balance = Math.max(0, target - spent);
            return {
                'Cardholder Name': c.cardholder_name,
                'Bank': c.bank_name,
                'Card Last 4': c.card_last4,
                'Fee Waiver Target': target,
                'Qualifying Spend': spent,
                'Balance Remaining': balance,
                'Target Met %': target > 0 ? Math.min(100, (spent / target) * 100).toFixed(1) + '%' : '100%',
                'Status': balance === 0 ? 'WAIVER ACHIEVED' : 'IN PROGRESS'
            };
        });

        // 8. Data Hygiene & Compliance Audit Tab
        const hData = window.DB.getDataHygiene();
        const hygieneRows = hData.map(h => ({
            'Cardholder Name': h.cardholder_name,
            'Bank Name': h.bank_name,
            'Card Last 4': h.card_last4,
            'Missing Name': h.missing_name ? 'FLAGGED' : 'OK',
            'Missing Address': h.missing_address ? 'FLAGGED' : 'OK',
            'Missing Phone': h.missing_phone ? 'FLAGGED' : 'OK',
            'Missing Email': h.missing_email ? 'FLAGGED' : 'OK',
            'Missing Credit Limit': h.missing_limit ? 'FLAGGED' : 'OK',
            'Missing Stmt Date': h.missing_statement_date ? 'FLAGGED' : 'OK',
            'Missing Due Date': h.missing_due_date ? 'FLAGGED' : 'OK',
            'Total Deficiencies': h.total_missing
        }));

        return {
            kpi: { title: 'Executive Summary', id: 'kpi', data: kpiSheet },
            recon: { title: 'Zoho vs Stmt Recon', id: 'recon', data: reconRows },
            limits: { title: 'Card Master & Limits', id: 'limits', data: limitRows },
            cardholders: { title: 'Cardholder Spend', id: 'cardholders', data: cardholderRows },
            banks: { title: 'Bank Exposure', id: 'banks', data: bankRows },
            monthly: { title: 'Monthly Statements', id: 'monthly', data: monthRows },
            waiver: { title: 'Fee Waiver Analysis', id: 'waiver', data: waiverRows },
            hygiene: { title: 'Compliance Audit', id: 'hygiene', data: hygieneRows }
        };
    },

    // ── MULTI-SHEET EXCEL DASHBOARD MODAL & EXPORT ─────────────
    showExcelExportModal: function() {
        const datasets = this.getExecutiveDatasets();
        const optionsHtml = Object.keys(datasets).map(key => {
            const item = datasets[key];
            return `
                <label class="d-flex align-items-center gap-2 p-2 border rounded mb-2" style="background:#f8fafc;cursor:pointer;">
                    <input type="checkbox" class="excel-export-check" value="${key}" checked style="width:18px;height:18px;cursor:pointer;">
                    <span style="font-weight:600;color:#1e293b;flex:1;">${item.title}</span>
                    <span class="badge" style="background:#e2e8f0;color:#475569;border:1px solid #cbd5e1;padding:4px 8px;border-radius:100px;font-size:0.75rem;">${item.data.length} records</span>
                </label>
            `;
        }).join('');

        const modalHtml = `
            <div>
                <p class="text-muted mb-3" style="font-size:0.9rem;">
                    Select the reports you want to bundle into your <strong>Multi-Sheet Excel Dashboard</strong>. 
                    Each report will be created as its own formatted tab, starting with the <strong>Executive KPI Summary Dashboard</strong>.
                </p>

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="small text-muted fw-bold text-uppercase">Included Worksheets:</span>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('.excel-export-check').forEach(c => c.checked = true)">Select All</button>
                        <button class="btn btn-sm btn-outline" onclick="document.querySelectorAll('.excel-export-check').forEach(c => c.checked = false)">Clear All</button>
                    </div>
                </div>

                <div style="max-height:300px;overflow-y:auto;padding-right:4px;">
                    ${optionsHtml}
                </div>

                <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button class="btn btn-secondary" onclick="window.App.closeModal()"><i class="fas fa-times me-1"></i> Cancel</button>
                    <button class="btn btn-success" onclick="window.Reports.executeExcelExport()" style="font-weight:700;padding:8px 22px;border-radius:8px;">
                        <i class="fas fa-file-excel me-1"></i> Download Multi-Sheet Excel Dashboard
                    </button>
                </div>
            </div>
        `;

        if (window.App && window.App.showModal) {
            window.App.showModal("Multi-Report Excel Dashboard Export", modalHtml);
        }
    },

    executeExcelExport: function() {
        const checked = [...document.querySelectorAll('.excel-export-check:checked')].map(c => c.value);
        if (checked.length === 0) {
            alert('Please select at least one report worksheet to export.');
            return;
        }

        if (!window.XLSX) {
            alert('Excel library not loaded.');
            return;
        }

        const datasets = this.getExecutiveDatasets();
        const wb = window.XLSX.utils.book_new();

        checked.forEach(key => {
            const item = datasets[key];
            if (item && item.data.length > 0) {
                const ws = window.XLSX.utils.json_to_sheet(item.data);
                
                // Format column widths nicely
                const colWidths = Object.keys(item.data[0] || {}).map(colKey => {
                    const maxLen = Math.max(
                        colKey.length,
                        ...item.data.map(row => String(row[colKey] !== undefined ? row[colKey] : '').length)
                    );
                    return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
                });
                ws['!cols'] = colWidths;

                // Excel sheet name max 31 characters
                const safeName = item.title.replace(/[\/\\?*:[\]]/g, '').slice(0, 28);
                window.XLSX.utils.book_append_sheet(wb, ws, safeName);
            }
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        window.XLSX.writeFile(wb, `CCMS_Executive_Dashboard_${dateStr}.xlsx`);
        
        if (window.App && window.App.closeModal) window.App.closeModal();
        if (window.App && window.App.showToast) {
            window.App.showToast(`🎉 Multi-Sheet Excel Dashboard (${checked.length} sheets) generated!`, 'success');
        }
    },

    // ── EXECUTIVE POWERPOINT (.PPTX) PRESENTATION EXPORT ────────
    showPptExportModal: function() {
        const slides = [
            { id: 'cover', title: 'Executive Title & Cover Slide', desc: 'Dark navy corporate title slide with audit metadata' },
            { id: 'kpis', title: 'Financial KPIs Dashboard Deck', desc: '4 large KPI stat boxes, utilization ratios & key takeaways' },
            { id: 'recon', title: 'Zoho vs Statement Reconciliation Audit', desc: 'Debits vs statement dues, match rate & variance audit' },
            { id: 'banks', title: 'Bank Exposure & Active Card Lines', desc: 'Issuance by bank, limits and aggregate spending' },
            { id: 'cardholders', title: 'Cardholder Spend & Available Limits', desc: 'Primary & add-on breakdown, cushions and utilization' },
            { id: 'monthly', title: 'Monthly Statements & Billing Trends', desc: 'Opening balances, billed dues and payment status' },
            { id: 'compliance', title: 'Data Hygiene & Governance Audit', desc: 'Compliance health score & missing regulatory fields' }
        ];

        const slidesHtml = slides.map(s => `
            <label class="d-flex align-items-center gap-2 p-2 border rounded mb-2" style="background:#f8fafc;cursor:pointer;">
                <input type="checkbox" class="ppt-slide-check" value="${s.id}" checked style="width:18px;height:18px;cursor:pointer;">
                <div style="flex:1;">
                    <div style="font-weight:700;color:#1e293b;font-size:0.9rem;">${s.title}</div>
                    <div class="small text-muted">${s.desc}</div>
                </div>
            </label>
        `).join('');

        const modalHtml = `
            <div>
                <p class="text-muted mb-3" style="font-size:0.9rem;">
                    Generate a high-impact, presentation-ready <strong>16:9 Widescreen PowerPoint Presentation (.pptx)</strong> 
                    designed for board-level review, C-suite executives, and financial auditors.
                </p>

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="small text-muted fw-bold text-uppercase">Included Executive Slides:</span>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('.ppt-slide-check').forEach(c => c.checked = true)">Select All</button>
                        <button class="btn btn-sm btn-outline" onclick="document.querySelectorAll('.ppt-slide-check').forEach(c => c.checked = false)">Clear All</button>
                    </div>
                </div>

                <div style="max-height:300px;overflow-y:auto;padding-right:4px;">
                    ${slidesHtml}
                </div>

                <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button class="btn btn-secondary" onclick="window.App.closeModal()"><i class="fas fa-times me-1"></i> Cancel</button>
                    <button class="btn btn-primary" onclick="window.Reports.executePptExport()" style="background:linear-gradient(135deg,#4361ee,#7209b7);font-weight:700;padding:8px 22px;border:none;border-radius:8px;box-shadow:0 4px 12px rgba(67,97,238,0.3);">
                        <i class="fas fa-file-powerpoint me-1"></i> Generate Executive PPT Deck (.pptx)
                    </button>
                </div>
            </div>
        `;

        if (window.App && window.App.showModal) {
            window.App.showModal("Executive PowerPoint Presentation Export", modalHtml);
        }
    },

    executePptExport: async function() {
        const checked = [...document.querySelectorAll('.ppt-slide-check:checked')].map(c => c.value);
        if (checked.length === 0) {
            alert('Please select at least one slide to generate.');
            return;
        }

        // Dynamically load PptxGenJS if not present
        if (typeof PptxGenJS === 'undefined') {
            if (window.App) window.App.showToast('Loading PowerPoint generator library...', 'info');
            try {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
                    s.onload = resolve;
                    s.onerror = () => reject(new Error('Failed to load PowerPoint generation library'));
                    document.head.appendChild(s);
                });
            } catch (err) {
                alert('Could not load PowerPoint generation library. Please check your internet connection.');
                return;
            }
        }

        if (window.App) {
            window.App.showToast('Building executive presentation slides...', 'info');
            window.App.closeModal();
        }

        try {
            const pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
            pptx.author = 'Gretex Group';
            pptx.company = 'Gretex Group CCMS';
            pptx.title = 'Credit Card Executive Portfolio & Audit Report';

            const datasets = this.getExecutiveDatasets();
            const kpis = window.DB.getKPIs();
            const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            // Helper for standard slide header
            const addSlideHeader = (slide, title, subtitle) => {
                slide.background = { color: 'F8FAFC' };
                slide.addText(title, { x: 0.6, y: 0.35, w: 8.8, h: 0.4, fontSize: 18, fontFace: 'Arial', bold: true, color: '0F172A' });
                slide.addText(subtitle, { x: 0.6, y: 0.72, w: 8.8, h: 0.3, fontSize: 10, fontFace: 'Arial', color: '64748B' });
                // Footer
                slide.addText(`Gretex Group &bull; CCMS Enterprise Audit &bull; ${dateStr}`, { x: 0.6, y: 5.25, w: 6.0, h: 0.25, fontSize: 8.5, fontFace: 'Arial', color: '94A3B8' });
                slide.addText('CONFIDENTIAL', { x: 7.5, y: 5.25, w: 1.9, h: 0.25, fontSize: 8.5, fontFace: 'Arial', bold: true, color: '94A3B8', align: 'right' });
            };

            // 1. SLIDE: COVER SLIDE
            if (checked.includes('cover')) {
                const cover = pptx.addSlide();
                cover.background = { color: '0F172A' };

                // Accent top band
                cover.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.15, fill: { color: '4361EE' } });

                // Badge
                cover.addText('GRETEX GROUP &bull; ENTERPRISE FINANCIAL INTELLIGENCE', {
                    x: 0.8, y: 1.0, w: 8.4, h: 0.3, fontSize: 10, fontFace: 'Arial', bold: true, color: '70A6FF', charSpacing: 1.5
                });

                // Main Title
                cover.addText('Credit Card Executive Portfolio & Audit Deck', {
                    x: 0.8, y: 1.4, w: 8.4, h: 1.1, fontSize: 28, fontFace: 'Arial', bold: true, color: 'FFFFFF'
                });

                // Subtitle
                cover.addText('Comprehensive review of credit lines, statement reconciliations, bank exposures & governance compliance', {
                    x: 0.8, y: 2.5, w: 8.4, h: 0.6, fontSize: 12, fontFace: 'Arial', color: '94A3B8'
                });

                // Divider line
                cover.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 3.2, w: 8.4, h: 0.02, fill: { color: '334155' } });

                // 4 Stat Cards on Cover
                const cardW = 1.95;
                const stats = [
                    { label: 'Active Cards', val: `${kpis.totalCards} Cards`, color: '70A6FF' },
                    { label: 'Total Limit', val: window.Utils.formatCurrency(kpis.totalLimit), color: '48EBD0' },
                    { label: 'Report Date', val: dateStr, color: 'FFFFFF' },
                    { label: 'Security Standard', val: 'AES-256 GCM', color: 'C77DFF' }
                ];
                stats.forEach((st, idx) => {
                    const cx = 0.8 + idx * (cardW + 0.2);
                    cover.addShape(pptx.shapes.RECTANGLE, { x: cx, y: 3.5, w: cardW, h: 1.1, fill: { color: '1E293B' }, line: { color: '334155', width: 1 } });
                    cover.addText(st.label.toUpperCase(), { x: cx + 0.1, y: 3.65, w: cardW - 0.2, h: 0.25, fontSize: 8, fontFace: 'Arial', color: '94A3B8', bold: true });
                    cover.addText(st.val, { x: cx + 0.1, y: 3.95, w: cardW - 0.2, h: 0.45, fontSize: 13, fontFace: 'Arial', bold: true, color: st.color });
                });
            }

            // 2. SLIDE: FINANCIAL KPIS DASHBOARD
            if (checked.includes('kpis')) {
                const sKpi = pptx.addSlide();
                addSlideHeader(sKpi, 'Executive Portfolio Overview & Financial KPIs', 'Real-time aggregate credit allocation, utilization metrics, and statement payable dues');

                const kpiCards = [
                    { title: 'SANCTIONED LIMIT', val: window.Utils.formatCurrency(kpis.totalLimit), sub: `${kpis.totalCards} total credit cards`, bar: '4361EE', txt: '4361EE' },
                    { title: 'STATEMENT PAYABLE', val: window.Utils.formatCurrency(kpis.totalPayable), sub: 'Due from imported statements', bar: '7209B7', txt: '7209B7' },
                    { title: 'CURRENT UNBILLED', val: window.Utils.formatCurrency(kpis.totalUnbilled), sub: 'Active cycle swipe records', bar: '06D6A0', txt: '06D6A0' },
                    { title: 'AVAILABLE CUSHION', val: window.Utils.formatCurrency(kpis.availableLimit), sub: `${kpis.totalLimit > 0 ? ((kpis.availableLimit / kpis.totalLimit) * 100).toFixed(0) : 0}% headroom available`, bar: '0284C7', txt: '0284C7' }
                ];

                const kw = 2.05;
                kpiCards.forEach((c, i) => {
                    const kx = 0.6 + i * (kw + 0.2);
                    sKpi.addShape(pptx.shapes.RECTANGLE, { x: kx, y: 1.2, w: kw, h: 1.6, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
                    sKpi.addShape(pptx.shapes.RECTANGLE, { x: kx, y: 1.2, w: kw, h: 0.08, fill: { color: c.bar } });
                    sKpi.addText(c.title, { x: kx + 0.15, y: 1.4, w: kw - 0.3, h: 0.25, fontSize: 8.5, fontFace: 'Arial', color: '64748B', bold: true });
                    sKpi.addText(c.val, { x: kx + 0.15, y: 1.7, w: kw - 0.3, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: c.txt });
                    sKpi.addText(c.sub, { x: kx + 0.15, y: 2.3, w: kw - 0.3, h: 0.3, fontSize: 8, fontFace: 'Arial', color: '94A3B8' });
                });

                // Key Executive Observations Box
                sKpi.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 3.1, w: 8.8, h: 1.8, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
                sKpi.addText('PORTFOLIO HEALTH & RISK OBSERVATIONS', { x: 0.8, y: 3.25, w: 8.4, h: 0.3, fontSize: 9.5, fontFace: 'Arial', bold: true, color: '0F172A' });

                const utilPct = kpis.totalLimit > 0 ? ((kpis.usedLimit / kpis.totalLimit) * 100).toFixed(1) : 0;
                const insights = [
                    `Overall Credit Utilization is at ${utilPct}%, maintaining a healthy corporate risk profile below the 30% ceiling.`,
                    `${kpis.over50Count} card(s) have utilized greater than 50% of sanctioned limit, recommended for credit enhancement review.`,
                    `Strict separation between Statement Payable (${window.Utils.formatCurrency(kpis.totalPayable)}) and Unbilled (${window.Utils.formatCurrency(kpis.totalUnbilled)}) verified.`
                ];
                insights.forEach((ins, idx) => {
                    sKpi.addText(`•  ${ins}`, { x: 0.8, y: 3.65 + idx * 0.35, w: 8.4, h: 0.3, fontSize: 9.5, fontFace: 'Arial', color: '334155' });
                });
            }

            // 3. SLIDE: RECONCILIATION AUDIT (ZOHO VS STATEMENT)
            if (checked.includes('recon')) {
                const sRecon = pptx.addSlide();
                addSlideHeader(sRecon, 'Zoho Books vs Bank Statement Reconciliation Audit', 'Detailed matching of Zoho debit vouchers against imported bank statements');

                const reconData = datasets.recon.data;
                const totalZoho = reconData.reduce((s, r) => s + (r['Zoho Debits Amount'] || 0), 0);
                const totalStmt = reconData.reduce((s, r) => s + (r['Statement Billed Amount'] || 0), 0);
                const matched = reconData.filter(r => r['Reconciliation Status'] === 'Matched').length;
                const discrepancies = reconData.filter(r => r['Reconciliation Status'] === 'Discrepancy').length;

                // Table of top 5 reconciliation records
                const tableRows = [
                    [
                        { text: 'Cardholder', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
                        { text: 'Bank', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
                        { text: 'Cycle', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
                        { text: 'Zoho Debits', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Statement Billed', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Variance', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Status', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
                    ]
                ];

                reconData.slice(0, 5).forEach(r => {
                    const isM = r['Reconciliation Status'] === 'Matched';
                    tableRows.push([
                        { text: r['Cardholder Name'] || '' },
                        { text: r['Bank'] || '' },
                        { text: r['Billing Period'] || '' },
                        { text: window.Utils.formatCurrency(r['Zoho Debits Amount']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(r['Statement Billed Amount']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(r['Variance / Difference']), options: { align: 'right', color: isM ? '06D6A0' : 'EF476F', bold: true } },
                        { text: r['Reconciliation Status'], options: { align: 'center', color: isM ? '06D6A0' : 'EF476F', bold: true } }
                    ]);
                });

                sRecon.addTable(tableRows, {
                    x: 0.6, y: 1.2, w: 8.8, h: 2.5,
                    colW: [1.8, 1.0, 1.0, 1.4, 1.4, 1.1, 1.1],
                    fontSize: 8.5,
                    fontFace: 'Arial',
                    border: { pt: 0.5, color: 'CBD5E1' }
                });

                // Summary footer card
                sRecon.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 4.0, w: 8.8, h: 0.9, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
                sRecon.addText(`Reconciliation Summary: Total Zoho Debits: ${window.Utils.formatCurrency(totalZoho)} | Statement Total: ${window.Utils.formatCurrency(totalStmt)} | Fully Reconciled: ${matched} records | Discrepancies: ${discrepancies} records`, {
                    x: 0.8, y: 4.25, w: 8.4, h: 0.4, fontSize: 9.5, fontFace: 'Arial', bold: true, color: '1E293B'
                });
            }

            // 4. SLIDE: BANK EXPOSURE
            if (checked.includes('banks')) {
                const sBank = pptx.addSlide();
                addSlideHeader(sBank, 'Bank Exposure & Sanctioned Credit Lines', 'Institutional concentration, card distribution and limit utilization across banks');

                const bankRows = datasets.banks.data;
                const bTable = [
                    [
                        { text: 'Banking Partner', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
                        { text: 'Active Cards', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                        { text: 'Sanctioned Limit', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Total Spent', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Available Cushion', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Utilization %', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
                    ]
                ];

                bankRows.forEach(b => {
                    bTable.push([
                        { text: b['Bank Name'] },
                        { text: String(b['Cards Issued']), options: { align: 'center' } },
                        { text: window.Utils.formatCurrency(b['Total Credit Limit']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(b['Total Spend']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(b['Available Credit']), options: { align: 'right' } },
                        { text: b['Bank Utilization %'], options: { align: 'center', bold: true } }
                    ]);
                });

                sBank.addTable(bTable, {
                    x: 0.6, y: 1.2, w: 8.8, h: 3.5,
                    colW: [2.2, 1.1, 1.6, 1.5, 1.4, 1.0],
                    fontSize: 9,
                    fontFace: 'Arial',
                    border: { pt: 0.5, color: 'CBD5E1' }
                });
            }

            // 5. SLIDE: CARDHOLDER UTILIZATION
            if (checked.includes('cardholders')) {
                const sHolders = pptx.addSlide();
                addSlideHeader(sHolders, 'Cardholder Portfolio & Available Spending Limits', 'Spending concentration, card allocation and remaining credit headroom per cardholder');

                const chRows = datasets.cardholders.data;
                const chTable = [
                    [
                        { text: 'Cardholder / Sole Owner', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
                        { text: 'Cards', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                        { text: 'Total Limit', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Debit Spend', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Available Cushion', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Utilization %', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } }
                    ]
                ];

                chRows.slice(0, 6).forEach(h => {
                    chTable.push([
                        { text: h['Cardholder / Owner'] },
                        { text: String(h['Active Cards Count']), options: { align: 'center' } },
                        { text: window.Utils.formatCurrency(h['Total Sanctioned Limit']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(h['Total Debit Spend']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(h['Available Cushion']), options: { align: 'right' } },
                        { text: h['Utilization %'], options: { align: 'center', bold: true } }
                    ]);
                });

                sHolders.addTable(chTable, {
                    x: 0.6, y: 1.2, w: 8.8, h: 3.5,
                    colW: [2.5, 0.8, 1.5, 1.4, 1.5, 1.1],
                    fontSize: 9,
                    fontFace: 'Arial',
                    border: { pt: 0.5, color: 'CBD5E1' }
                });
            }

            // 6. SLIDE: MONTHLY STATEMENTS
            if (checked.includes('monthly')) {
                const sMonth = pptx.addSlide();
                addSlideHeader(sMonth, 'Monthly Billing Cycles & Outstanding Dues', 'Billing trends across statement months with opening balances and closing dues');

                const mRows = datasets.monthly.data;
                const mTable = [
                    [
                        { text: 'Statement Month', options: { bold: true, fill: '0F172A', color: 'FFFFFF' } },
                        { text: 'Statements', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'center' } },
                        { text: 'Opening Balance', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Billed Amount', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Unbilled Amount', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } },
                        { text: 'Closing Due', options: { bold: true, fill: '0F172A', color: 'FFFFFF', align: 'right' } }
                    ]
                ];

                mRows.slice(0, 6).forEach(m => {
                    mTable.push([
                        { text: m['Statement Month'] },
                        { text: String(m['Statements Count']), options: { align: 'center' } },
                        { text: window.Utils.formatCurrency(m['Opening Balance']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(m['Billed Amount']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(m['Unbilled Amount']), options: { align: 'right' } },
                        { text: window.Utils.formatCurrency(m['Closing Outstanding Due']), options: { align: 'right', bold: true } }
                    ]);
                });

                sMonth.addTable(mTable, {
                    x: 0.6, y: 1.2, w: 8.8, h: 3.5,
                    colW: [1.8, 1.0, 1.5, 1.5, 1.5, 1.5],
                    fontSize: 9,
                    fontFace: 'Arial',
                    border: { pt: 0.5, color: 'CBD5E1' }
                });
            }

            // 7. SLIDE: DATA HYGIENE & COMPLIANCE
            if (checked.includes('compliance')) {
                const sComp = pptx.addSlide();
                addSlideHeader(sComp, 'Data Hygiene & Governance Compliance Audit', 'Systematic audit of mandatory fields, cardholder contact information & regulatory hygiene');

                const hData = window.DB.getDataHygiene();
                const totalCards = hData.length;
                const cleanCards = hData.filter(h => h.total_missing === 0).length;
                const healthPct = totalCards > 0 ? Math.round((cleanCards / totalCards) * 100) : 100;

                // Health Banner Box
                sComp.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 1.2, w: 8.8, h: 1.3, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
                sComp.addText(`PORTFOLIO COMPLIANCE HEALTH SCORE: ${healthPct}%`, {
                    x: 0.8, y: 1.35, w: 8.4, h: 0.35, fontSize: 13, fontFace: 'Arial', bold: true, color: healthPct >= 80 ? '06D6A0' : 'F59E0B'
                });
                sComp.addText(`${cleanCards} of ${totalCards} cards have 100% complete records across addresses, phones, emails, statement dates and due dates.`, {
                    x: 0.8, y: 1.75, w: 8.4, h: 0.4, fontSize: 9.5, fontFace: 'Arial', color: '64748B'
                });

                // Missing fields summary box
                sComp.addShape(pptx.shapes.RECTANGLE, { x: 0.6, y: 2.7, w: 8.8, h: 2.2, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } });
                sComp.addText('AUDIT RECOMMENDATIONS & ACTION ITEMS', { x: 0.8, y: 2.9, w: 8.4, h: 0.3, fontSize: 10, fontFace: 'Arial', bold: true, color: '0F172A' });

                const recs = [
                    'Ensure billing cycle dates are populated for automated statement fetch & reminders.',
                    'Verify email addresses for all add-on holders for instant OTP and e-statement forwarding.',
                    'Review primary vs add-on linkages in Sole Owner reports prior to quarterly tax filing.'
                ];
                recs.forEach((rec, idx) => {
                    sComp.addText(`✓  ${rec}`, { x: 0.8, y: 3.3 + idx * 0.4, w: 8.4, h: 0.35, fontSize: 9.5, fontFace: 'Arial', color: '334155' });
                });
            }

            const fileDate = new Date().toISOString().slice(0, 10);
            await pptx.writeFile({ fileName: `CCMS_Executive_Presentation_${fileDate}.pptx` });

            if (window.App && window.App.showToast) {
                window.App.showToast(`🎉 Executive Presentation (.pptx) downloaded successfully!`, 'success');
            }
        } catch (err) {
            console.error('PPT generation error:', err);
            alert('Failed to generate presentation: ' + err.message);
        }
    }
};

