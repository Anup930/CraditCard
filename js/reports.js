window.Reports = {
    render: function(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="page-header mb-4">
                <h2 class="page-title">Reports & Analytics</h2>
                <div class="page-subtitle text-muted">Generate and export system reports</div>
            </div>
            
            <div id="report-menu-wrapper">
                <div class="report-grid d-flex flex-wrap gap-3" id="report-menu">
                    ${this.getReportCardsHtml()}
                </div>
            </div>
            
            <div id="report-view" class="d-none">
                <div class="d-flex justify-content-between mb-4">
                    <button class="btn btn-secondary" onclick="window.Reports.backToMenu()"><i class="fas fa-arrow-left"></i> Go to Home Report</button>
                    <button class="btn btn-success" onclick="window.Reports.exportCurrentReport()"><i class="fas fa-file-excel"></i> Export to Excel</button>
                </div>
                <div id="report-content" class="card p-4"></div>
            </div>
        `;
    },

    getReportCardsHtml: function() {
        const reports = [
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

        if(id === 'sole_owner') {
            const owners = window.DB.cards.getOwners();
            
            // Prepare Chart Data
            const chartLabels = [];
            const chartData = [];
            
            html += setChartLayout('chart_owner');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0">`;
            owners.forEach(owner => {
                const oCards = cards.filter(c => c.primary_cardholder === owner);
                const limit = oCards.reduce((sum, c) => sum + (c.credit_limit||0), 0);
                
                chartLabels.push(owner);
                chartData.push(limit);

                html += `<tr class="table-light"><th colspan="6">Owner: ${owner} (Cards: ${oCards.length} | Total Limit: ${window.Utils.formatCurrency(limit)})</th></tr>`;
                html += `<tr><th>Cardholder</th><th>Bank</th><th>Card Type</th><th>Last4</th><th class="text-right">Limit</th><th>Status</th></tr>`;
                oCards.forEach(c => {
                    html += `<tr><td>${c.cardholder_name}</td><td>${c.bank_name}</td><td>${c.card_type}</td><td>${c.card_last4}</td><td class="text-right">${window.Utils.formatCurrency(c.credit_limit)}</td><td><span class="badge bg-info">${c.status}</span></td></tr>`;
                    this.exportData.push({ Owner: owner, Cardholder: c.cardholder_name, Bank: c.bank_name, Type: c.card_type, Last4: c.card_last4, Limit: c.credit_limit, Status: c.status });
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
                ['Total Payable', window.Utils.formatCurrency(kpis.totalPayable)],
                ['Unbilled Amount', window.Utils.formatCurrency(kpis.totalUnbilled)],
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
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Card</th><th>Bank</th><th class="text-right">Total Limit</th><th class="text-right">Used</th><th class="text-right">Available</th><th class="text-right">Util %</th></tr></thead><tbody>`;
            
            let chartLabels = [];
            let chartUsed = [];
            let chartAvail = [];
            
            cards.filter(c=>c.card_category==='Primary').forEach(c => {
                const cStmts = stmts.filter(s => s.card_id === c.card_id);
                const latest = cStmts.length > 0 ? cStmts[cStmts.length-1] : null;
                const used = latest ? (latest.closing_outstanding + latest.unbilled_amount) : 0;
                const avail = (c.credit_limit||0) - used;
                const util = c.credit_limit ? ((used/c.credit_limit)*100).toFixed(1) : 0;
                const clz = util > 80 ? 'text-danger fw-bold' : (util > 50 ? 'text-warning fw-bold' : '');
                
                chartLabels.push(c.cardholder_name + ' (*' + c.card_last4 + ')');
                chartUsed.push(used);
                chartAvail.push(avail);
                
                html += `<tr><td>${c.cardholder_name}</td><td>${c.bank_name}</td><td class="text-right">${window.Utils.formatCurrency(c.credit_limit)}</td><td class="text-right ${clz}">${window.Utils.formatCurrency(used)}</td><td class="text-right">${window.Utils.formatCurrency(avail)}</td><td class="text-right ${clz}">${util}%</td></tr>`;
                this.exportData.push({ Card: c.cardholder_name, Bank: c.bank_name, Limit: c.credit_limit, Used: used, Available: avail, 'Utilization %': util });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChartMulti('chart_limit', 'bar', chartLabels, 
                [{label: 'Used', data: chartUsed, backgroundColor: '#ef476f'}, 
                 {label: 'Available', data: chartAvail, backgroundColor: '#06d6a0'}]);
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
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-striped mb-0"><thead><tr class="table-light"><th>Bank</th><th class="text-center">Card Count</th><th class="text-right">Total Limit</th><th class="text-right">Total Spent</th></tr></thead><tbody>`;
            
            let chartLabels = [];
            let chartSpent = [];
            
            banks.forEach(b => {
                const bCards = cards.filter(c => c.bank_name === b);
                const limit = bCards.reduce((s,c)=>s+(c.credit_limit||0),0);
                const cIds = bCards.map(c=>c.card_id);
                const spent = txns.filter(t => cIds.includes(t.card_id) && t.txn_type==='Debit').reduce((s,t)=>s+t.amount,0);
                
                chartLabels.push(b);
                chartSpent.push(spent);
                
                html += `<tr><td>${b}</td><td class="text-center">${bCards.length}</td><td class="text-right">${window.Utils.formatCurrency(limit)}</td><td class="text-right fw-bold">${window.Utils.formatCurrency(spent)}</td></tr>`;
                this.exportData.push({ Bank: b, 'Card Count': bCards.length, 'Total Limit': limit, 'Total Spent': spent });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_bank', 'doughnut', chartLabels, chartSpent, 'Spend by Bank');
        }
        else if (id === 'card_txn') {
            html += setChartLayout('chart_card_txn');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table table-hover mb-0"><thead><tr class="table-light"><th>Card</th><th>Bank</th><th class="text-center">Txn Count</th><th class="text-right">Total Spend</th></tr></thead><tbody>`;
            
            let cardStats = [];
            cards.forEach(c => {
                const cTxns = txns.filter(t => t.card_id === c.card_id && t.txn_type === 'Debit');
                const spent = cTxns.reduce((s,t)=>s+t.amount,0);
                if(cTxns.length > 0) {
                    cardStats.push({ name: c.cardholder_name + ' (*' + c.card_last4 + ')', bank: c.bank_name, count: cTxns.length, spent: spent });
                }
            });
            cardStats.sort((a,b) => b.spent - a.spent); // Sort top spenders
            
            let chartLabels = [];
            let chartData = [];
            cardStats.slice(0, 7).forEach(c => {
                chartLabels.push(c.name);
                chartData.push(c.spent);
            });
            
            cardStats.forEach(c => {
                html += `<tr><td>${c.name}</td><td>${c.bank}</td><td class="text-center">${c.count}</td><td class="text-right">${window.Utils.formatCurrency(c.spent)}</td></tr>`;
                this.exportData.push({ Card: c.name, Bank: c.bank, 'Txn Count': c.count, 'Total Spend': c.spent });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_card_txn', 'bar', chartLabels, chartData, 'Top 7 Cards by Spend');
        }
        else if (id === 'cardholder_txn') {
            html += setChartLayout('chart_holder');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table mb-0"><thead><tr class="table-light"><th>Cardholder</th><th class="text-center">Cards Owned</th><th class="text-right">Total Spent</th></tr></thead><tbody>`;
            
            let holderStats = {};
            cards.forEach(c => {
                if(!holderStats[c.cardholder_name]) holderStats[c.cardholder_name] = { cards: 0, spent: 0 };
                holderStats[c.cardholder_name].cards++;
                const spent = txns.filter(t => t.card_id === c.card_id && t.txn_type === 'Debit').reduce((s,t)=>s+t.amount,0);
                holderStats[c.cardholder_name].spent += spent;
            });
            
            let chartLabels = [];
            let chartData = [];
            Object.keys(holderStats).forEach(h => {
                chartLabels.push(h);
                chartData.push(holderStats[h].spent);
                html += `<tr><td>${h}</td><td class="text-center">${holderStats[h].cards}</td><td class="text-right fw-bold">${window.Utils.formatCurrency(holderStats[h].spent)}</td></tr>`;
                this.exportData.push({ Cardholder: h, 'Cards Owned': holderStats[h].cards, 'Total Spent': holderStats[h].spent });
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            
            this.renderChart('chart_holder', 'pie', chartLabels, chartData, 'Spend by Cardholder');
        }
        else if (id === 'monthly_stmt') {
            html += setChartLayout('chart_monthly');
            html += `<div class="card data-table-wrapper table-responsive"><table class="table data-table mb-0"><thead><tr class="table-light"><th>Month</th><th class="text-center">Statements</th><th class="text-right">Total Billed</th><th class="text-right">Total Outstanding</th></tr></thead><tbody>`;
            
            let monthStats = {};
            stmts.forEach(s => {
                const m = window.Utils.formatMonthYear(s.statement_month);
                if(!monthStats[m]) monthStats[m] = { count: 0, billed: 0, out: 0, rawDate: new Date(s.statement_month).getTime() };
                monthStats[m].count++;
                monthStats[m].billed += (s.billed_amount || 0);
                monthStats[m].out += (s.closing_outstanding || 0);
            });
            
            let sortedMonths = Object.keys(monthStats).sort((a,b) => monthStats[a].rawDate - monthStats[b].rawDate);
            let chartLabels = [];
            let chartBilled = [];
            let chartOut = [];
            
            sortedMonths.forEach(m => {
                chartLabels.push(m);
                chartBilled.push(monthStats[m].billed);
                chartOut.push(monthStats[m].out);
                html += `<tr><td><strong>${m}</strong></td><td class="text-center">${monthStats[m].count}</td><td class="text-right">${window.Utils.formatCurrency(monthStats[m].billed)}</td><td class="text-right text-danger">${window.Utils.formatCurrency(monthStats[m].out)}</td></tr>`;
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
        const hData = window.DB.getDataHygiene();
        
        let mName=0, mAddr=0, mPhone=0, mEmail=0, mLimit=0;
        hData.forEach(h => {
            if(h.missing_name) mName++;
            if(h.missing_address) mAddr++;
            if(h.missing_phone) mPhone++;
            if(h.missing_email) mEmail++;
            if(h.missing_limit) mLimit++;
        });

        let html = `
            <div class="page-header mb-4">
                <h2 class="page-title">Data Hygiene</h2>
                <div class="page-subtitle text-muted">Identify and fix missing card information</div>
            </div>
            
            <div class="hygiene-grid d-flex flex-wrap gap-3 mb-4">
                <div class="card p-3 flex-fill text-center border-danger"><h3 class="text-danger">${mName}</h3><div>Missing Name</div></div>
                <div class="card p-3 flex-fill text-center border-warning"><h3 class="text-warning">${mAddr}</h3><div>Missing Address</div></div>
                <div class="card p-3 flex-fill text-center border-info"><h3 class="text-info">${mPhone}</h3><div>Missing Phone</div></div>
                <div class="card p-3 flex-fill text-center border-primary"><h3 class="text-primary">${mEmail}</h3><div>Missing Email</div></div>
                <div class="card p-3 flex-fill text-center border-secondary"><h3 class="text-secondary">${mLimit}</h3><div>Missing Limit</div></div>
            </div>

            <div class="card data-table-wrapper table-responsive">
                <table class="table table-hover table-bordered mb-0 text-center">
                    <thead class="table-light">
                        <tr>
                            <th class="text-start">Cardholder Name</th>
                            <th class="text-start">Owner</th>
                            <th>Bank</th>
                            <th>Last4</th>
                            <th>Name</th>
                            <th>Address</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Limit</th>
                            <th>Stmt Date</th>
                            <th>Due Date</th>
                            <th class="text-danger">Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const getIco = (miss) => miss ? '<i class="fas fa-times text-danger"></i>' : '<i class="fas fa-check text-success"></i>';

        hData.forEach(h => {
            if(h.total_missing > 0) {
                html += `
                    <tr>
                        <td class="text-start">${h.cardholder_name}</td>
                        <td class="text-start">${h.primary_cardholder}</td>
                        <td>${h.bank_name}</td>
                        <td>${h.card_last4}</td>
                        <td>${getIco(h.missing_name)}</td>
                        <td>${getIco(h.missing_address)}</td>
                        <td>${getIco(h.missing_phone)}</td>
                        <td>${getIco(h.missing_email)}</td>
                        <td>${getIco(h.missing_limit)}</td>
                        <td>${getIco(h.missing_statement_date)}</td>
                        <td>${getIco(h.missing_due_date)}</td>
                        <td class="fw-bold text-danger">${h.total_missing}</td>
                    </tr>
                `;
            }
        });

        html += `</tbody></table></div>`;
        this.container.innerHTML = html;
    }
};
