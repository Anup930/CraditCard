window.Dashboard = {
    charts: [],
    render: function(container) {
        container.innerHTML = '';
        const kpis = window.DB.getKPIs();
        
        // Main Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dashboard-wrapper';

        // 1. KPI Grid
        const kpiGrid = document.createElement('div');
        kpiGrid.className = 'kpi-grid mb-4';
        kpiGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;';
        
        const kpiData = [
            { label: 'Total Payable',         sub: 'Imported Statements Only',   value: window.Utils.formatCurrency(kpis.totalPayable),      icon: 'fa-file-invoice-dollar', gradient: 'linear-gradient(135deg,#ff6b6b 0%,#ee5a24 100%)' },
            { label: 'Unbilled Amount',        sub: 'Current Unbilled Records',    value: window.Utils.formatCurrency(kpis.totalUnbilled),     icon: 'fa-clock',               gradient: 'linear-gradient(135deg,#ffa502 0%,#ff6348 100%)' },
            { label: 'Total Reward Points',    sub: 'Active Rewards',             value: window.Utils.formatCurrency(kpis.totalRewards).replace('₹', ''), icon: 'fa-star',    gradient: 'linear-gradient(135deg,#f9ca24 0%,#f0932b 100%)' },
            { label: 'Total Cards',            sub: `${kpis.primaryCards} Primary Cards`, value: kpis.totalCards,                                     icon: 'fa-credit-card',         gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' },
            { label: 'Cards >50% Utilization', sub: 'High Usage',                 value: kpis.over50Count,                                    icon: 'fa-exclamation-triangle',gradient: 'linear-gradient(135deg,#fc5c7d 0%,#6a82fb 100%)' },
            { label: 'Total Limit',            sub: 'Sanctioned Limit',           value: window.Utils.formatCurrency(kpis.totalLimit),        icon: 'fa-chart-line',          gradient: 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)' },
            { label: 'Available Limit',        sub: 'Current Available',          value: window.Utils.formatCurrency(kpis.availableLimit),    icon: 'fa-wallet',              gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)' },
            { label: 'Fee Waiver Balance',     sub: 'Remaining Target',           value: window.Utils.formatCurrency(kpis.feeWaiverBalance),  icon: 'fa-gift',                gradient: 'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)' }
        ];

        kpiData.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = `background:${item.gradient};border-radius:14px;padding:20px 24px;display:flex;align-items:center;gap:16px;box-shadow:0 4px 15px rgba(0,0,0,0.1);transition:transform 0.2s;cursor:default;`;
            card.onmouseover = function() { this.style.transform = 'translateY(-3px)'; };
            card.onmouseout  = function() { this.style.transform = 'translateY(0)'; };
            card.innerHTML = `
                <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${item.icon}" style="font-size:20px;color:#fff;"></i>
                </div>
                <div>
                    <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.2;">${item.value}</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.92);font-weight:600;margin-top:2px;">${item.label}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:1px;">${item.sub}</div>
                </div>
            `;
            kpiGrid.appendChild(card);
        });

        // 2. Dashboard Grid
        const dashGrid = document.createElement('div');
        dashGrid.className = 'dashboard-grid mb-4';
        dashGrid.style.display = 'grid';
        dashGrid.style.gridTemplateColumns = '2fr 1fr';
        dashGrid.style.gap = '20px';

        // Left Side: Charts
        const chartsSection = document.createElement('div');
        chartsSection.className = 'charts-section';
        
        const chartCard1 = document.createElement('div');
        chartCard1.className = 'card mb-3';
        chartCard1.innerHTML = `<div class="card-header"><h3 class="card-title">Spending by Bank</h3></div><div class="card-body chart-container"><canvas id="bankChart"></canvas></div>`;
        
        const chartCard2 = document.createElement('div');
        chartCard2.className = 'card';
        chartCard2.innerHTML = `<div class="card-header"><h3 class="card-title">Monthly Spending Trend</h3></div><div class="card-body chart-container"><canvas id="trendChart"></canvas></div>`;
        
        chartsSection.appendChild(chartCard1);
        chartsSection.appendChild(chartCard2);

        // Right Side: Alerts Panel
        const alertsPanel = document.createElement('div');
        alertsPanel.className = 'card alerts-panel';
        
        // Generate Alerts
        const alertsList = this.generateAlerts();
        let alertsHtml = `<div class="card-header"><h3 class="card-title">Alerts & Notifications</h3></div><div class="card-body alerts-list">`;
        if(alertsList.length === 0) {
            alertsHtml += `<div class="empty-state">No active alerts</div>`;
        } else {
            alertsList.forEach(alert => {
                alertsHtml += `
                <div class="alert alert-${alert.severity} alert-item mb-2">
                    <strong>${alert.title}</strong>: ${alert.message}
                </div>`;
            });
        }
        alertsHtml += `</div>`;
        alertsPanel.innerHTML = alertsHtml;

        dashGrid.appendChild(chartsSection);
        dashGrid.appendChild(alertsPanel);

        // 3. Quick Stats - Card View
        const quickStats = document.createElement('div');
        quickStats.className = 'quick-stats-grid mt-4';
        quickStats.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;';
        const allCards = window.DB.cards.getAll() || [];
        const primaryCount = allCards.filter(c => c.card_category === 'Primary').length;
        const addonCount = allCards.filter(c => c.card_category === 'Add-on').length;
        const activeCount = allCards.filter(c => c.status === 'Active').length;
        const banksCount = new Set(allCards.map(c => c.bank_name).filter(Boolean)).size;

        const statsData = [
            { label: 'Primary Cards', value: primaryCount, icon: 'fa-id-card', gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', iconBg: 'rgba(255,255,255,0.2)' },
            { label: 'Add-on Cards', value: addonCount, icon: 'fa-clone', gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)', iconBg: 'rgba(255,255,255,0.2)' },
            { label: 'Active Cards', value: activeCount, icon: 'fa-check-circle', gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)', iconBg: 'rgba(255,255,255,0.2)' },
            { label: 'Banks Covered', value: banksCount, icon: 'fa-university', gradient: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)', iconBg: 'rgba(255,255,255,0.2)' }
        ];

        statsData.forEach(s => {
            const card = document.createElement('div');
            card.style.cssText = `background:${s.gradient};border-radius:14px;padding:20px 24px;display:flex;align-items:center;gap:16px;box-shadow:0 4px 15px rgba(0,0,0,0.1);transition:transform 0.2s;cursor:default;`;
            card.onmouseover = function() { this.style.transform = 'translateY(-3px)'; };
            card.onmouseout  = function() { this.style.transform = 'translateY(0)'; };
            card.innerHTML = `
                <div style="width:50px;height:50px;border-radius:12px;background:${s.iconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${s.icon}" style="font-size:22px;color:#fff;"></i>
                </div>
                <div>
                    <div style="font-size:28px;font-weight:800;color:#fff;line-height:1.1;">${s.value}</div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.85);font-weight:500;margin-top:2px;">${s.label}</div>
                </div>
            `;
            quickStats.appendChild(card);
        });

        wrapper.appendChild(kpiGrid);
        wrapper.appendChild(dashGrid);
        wrapper.appendChild(quickStats);
        container.appendChild(wrapper);

        // Render Charts after DOM insertion
        this.renderCharts();
    },

    generateAlerts: function() {
        const alerts = [];
        const cards = window.DB.cards.getAll() || [];
        const today = new Date();

        cards.forEach(card => {
            // Utilization Alert
            if(card.credit_limit && card.credit_limit > 0) {
                // Approximate used using unbilled + payable (using statements is better if available)
                const statements = window.DB.statements.getByCard(card.card_id);
                let outstanding = 0;
                if(statements && statements.length > 0) {
                    const latest = statements[statements.length - 1];
                    outstanding = latest.closing_outstanding + latest.unbilled_amount;
                }
                const util = (outstanding / card.credit_limit) * 100;
                if(util > 80) {
                    alerts.push({ severity: 'danger', title: 'High Utilization', message: `${card.cardholder_name}'s ${card.bank_name} card is at ${util.toFixed(1)}% utilization.` });
                } else if(util > 50) {
                    alerts.push({ severity: 'warning', title: 'Utilization Alert', message: `${card.cardholder_name}'s ${card.bank_name} card is >50% utilized.` });
                }
            }

            // Upcoming Due Dates
            if(card.due_date) {
                // If today is near due date (e.g. within 5 days)
                const currentDay = today.getDate();
                if (card.due_date >= currentDay && card.due_date <= currentDay + 5) {
                    alerts.push({ severity: 'warning', title: 'Upcoming Due Date', message: `${card.cardholder_name}'s ${card.bank_name} card is due on ${card.due_date}.` });
                }
            }
            
            // Fee Waiver Deadlines
            if(card.renewal_date) {
                const renDate = new Date(card.renewal_date);
                const diffTime = renDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if(diffDays > 0 && diffDays <= 30) {
                    alerts.push({ severity: 'info', title: 'Fee Waiver Deadline', message: `Renewal for ${card.bank_name} is in ${diffDays} days.` });
                }
            }
        });

        const hygiene = window.DB.getDataHygiene();
        const totalMissing = hygiene.reduce((sum, h) => sum + h.total_missing, 0);
        if(totalMissing > 0) {
            alerts.push({ severity: 'danger', title: 'Data Hygiene', message: `There are ${totalMissing} missing fields across cards.` });
        }

        return alerts;
    },

    renderCharts: function() {
        // Destroy existing charts
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        // 1. Spending by Bank (Doughnut)
        const bankCanvas = document.getElementById('bankChart');
        if(bankCanvas && window.Chart) {
            const txns = window.DB.transactions.getAll() || [];
            const cards = window.DB.cards.getAll() || [];
            const bankTotals = {};
            
            txns.forEach(txn => {
                if(txn.txn_type === 'Debit') {
                    const card = cards.find(c => c.card_id === txn.card_id);
                    if(card && card.bank_name) {
                        bankTotals[card.bank_name] = (bankTotals[card.bank_name] || 0) + txn.amount;
                    }
                }
            });

            const bankChart = new window.Chart(bankCanvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(bankTotals),
                    datasets: [{
                        data: Object.values(bankTotals),
                        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
            this.charts.push(bankChart);
        }

        // 2. Monthly Spending Trend (Bar)
        const trendCanvas = document.getElementById('trendChart');
        if(trendCanvas && window.Chart) {
            const txns = window.DB.transactions.getAll() || [];
            const monthlyData = {};
            
            txns.forEach(txn => {
                if(txn.txn_type === 'Debit' && txn.txn_date) {
                    const d = new Date(txn.txn_date);
                    const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
                    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + txn.amount;
                }
            });

            const sortedKeys = Object.keys(monthlyData).sort();
            const labels = sortedKeys.map(k => {
                const [y, m] = k.split('-');
                return window.Utils.getMonthName(parseInt(m)) + ' ' + y;
            });
            const data = sortedKeys.map(k => monthlyData[k]);

            const trendChart = new window.Chart(trendCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Spend',
                        data: data,
                        backgroundColor: '#4e73df'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
            this.charts.push(trendChart);
        }
    }
};
