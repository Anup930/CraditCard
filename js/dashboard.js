window.Dashboard = {
    charts: [],
    selectedOwner: 'all',
    selectedBank: 'all',

    render: function(container) {
        container.innerHTML = '';
        const allCards = window.DB.cards.getAll() || [];
        const allTxns = window.DB.transactions.getAll() || [];
        const allStmts = window.DB.statements.getAll() || [];
        const kpis = window.DB.getKPIs();

        // Unique filters list
        const owners = window.DB.cards.getOwners() || [];
        const banks = window.DB.cards.getBanks() || [];

        // Apply filters
        let filteredCards = allCards;
        if (this.selectedOwner !== 'all') {
            filteredCards = filteredCards.filter(c => c.primary_cardholder === this.selectedOwner);
        }
        if (this.selectedBank !== 'all') {
            filteredCards = filteredCards.filter(c => c.bank_name === this.selectedBank);
        }

        const filteredCardIds = filteredCards.map(c => c.card_id);
        const filteredTxns = allTxns.filter(t => filteredCardIds.includes(t.card_id));
        const filteredStmts = allStmts.filter(s => filteredCardIds.includes(s.card_id));

        // Recomputed metrics based on filter
        const totalLimit = filteredCards.reduce((s, c) => s + (c.credit_limit || 0), 0);
        const totalPayable = filteredStmts.reduce((s, st) => s + (st.closing_outstanding || 0), 0);
        const totalUnbilled = filteredCards.reduce((s, c) => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            return s + (m.unbilled || 0);
        }, 0);
        const usedLimit = totalPayable + totalUnbilled;
        const availableLimit = Math.max(0, totalLimit - usedLimit);
        const utilPct = totalLimit > 0 ? ((usedLimit / totalLimit) * 100).toFixed(1) : '0';
        const utilNum = parseFloat(utilPct);

        // Utilization Health Color
        const utilColor = utilNum < 30 ? '#10b981' : (utilNum <= 50 ? '#f59e0b' : '#ef4444');
        const utilStatus = utilNum < 30 ? 'OPTIMAL HEALTH (<30%)' : (utilNum <= 50 ? 'MODERATE USAGE (30-50%)' : 'HIGH USAGE ALERT (>50%)');

        // Reconciliation Metrics
        let reconMatched = 0;
        let reconDisc = 0;
        filteredCards.forEach(card => {
            const cTxns = allTxns.filter(t => String(t.card_id) === String(card.card_id) && t.txn_type === 'Debit');
            const cStmts = allStmts.filter(s => String(s.card_id) === String(card.card_id));
            cStmts.forEach(s => {
                const stmtBilled = window.Utils.parseNum(s.billed_amount);
                const mStr = window.Utils.formatMonthYear(s.statement_month);
                const zohoSum = cTxns.filter(t => window.Utils.formatMonthYear(t.txn_date) === mStr)
                                     .reduce((sum, t) => sum + window.Utils.parseNum(t.amount), 0);
                if (Math.abs(zohoSum - stmtBilled) < 1) reconMatched++;
                else reconDisc++;
            });
        });
        const totalReconCycles = reconMatched + reconDisc;
        const reconRate = totalReconCycles > 0 ? Math.round((reconMatched / totalReconCycles) * 100) : 100;

        // Main Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dashboard-wrapper';

        // ═════════════════════════════════════════════════════════════════
        // TOP EXECUTIVE BANNER & EXPORT QUICK-ACTIONS
        // ═════════════════════════════════════════════════════════════════
        const bannerHtml = `
            <div class="exec-header-banner">
                <div>
                    <div style="font-size:0.75rem;font-weight:700;letter-spacing:1.5px;color:#70a6ff;text-transform:uppercase;margin-bottom:4px;">
                        <i class="fas fa-shield-alt me-1"></i> CCMS ENTERPRISE INTELLIGENCE &bull; AES-256 ENCRYPTED
                    </div>
                    <div style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;">
                        Executive Financial Cockpit &amp; Portfolio Dashboard
                    </div>
                    <div style="font-size:0.85rem;color:#94a3b8;margin-top:4px;">
                        Real-time aggregate credit allocation, Zoho reconciliation compliance &amp; risk governance
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    <button class="btn btn-sm" onclick="window.Reports && window.Reports.showExcelExportModal ? window.Reports.showExcelExportModal() : App.navigate('reports')" style="background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">
                        <i class="fas fa-file-excel text-success" style="font-size:1rem;"></i> Multi-Sheet Excel
                    </button>
                    <button class="btn btn-sm" onclick="window.Reports && window.Reports.showPptExportModal ? window.Reports.showPptExportModal() : App.navigate('reports')" style="background:linear-gradient(135deg,#4361ee,#7209b7);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(67,97,238,0.3);transition:0.2s;">
                        <i class="fas fa-file-powerpoint text-warning" style="font-size:1rem;"></i> Executive PPT Deck
                    </button>
                </div>
            </div>
        `;
        wrapper.insertAdjacentHTML('beforeend', bannerHtml);

        // ═════════════════════════════════════════════════════════════════
        // INTERACTIVE FILTER BAR
        // ═════════════════════════════════════════════════════════════════
        const filterCard = document.createElement('div');
        filterCard.className = 'card p-3 mb-4';
        filterCard.style.cssText = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;';
        filterCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div class="d-flex align-items-center gap-2">
                    <span style="font-size:0.8rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                        <i class="fas fa-filter text-primary me-1"></i> Interactive Portfolio Slicing:
                    </span>
                </div>
                <div class="d-flex gap-3 align-items-center flex-wrap">
                    <div class="d-flex align-items-center gap-2">
                        <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin:0;">Cardholder:</label>
                        <select id="dash-filter-owner" class="form-select form-select-sm" style="min-width:180px;border-radius:6px;border:1px solid #cbd5e1;padding:4px 8px;font-size:0.85rem;background:#fff;">
                            <option value="all" ${this.selectedOwner === 'all' ? 'selected' : ''}>All Cardholders (${owners.length})</option>
                            ${owners.map(o => `<option value="${o}" ${this.selectedOwner === o ? 'selected' : ''}>${o}</option>`).join('')}
                        </select>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin:0;">Banking Partner:</label>
                        <select id="dash-filter-bank" class="form-select form-select-sm" style="min-width:160px;border-radius:6px;border:1px solid #cbd5e1;padding:4px 8px;font-size:0.85rem;background:#fff;">
                            <option value="all" ${this.selectedBank === 'all' ? 'selected' : ''}>All Banks (${banks.length})</option>
                            ${banks.map(b => `<option value="${b}" ${this.selectedBank === b ? 'selected' : ''}>${b}</option>`).join('')}
                        </select>
                    </div>
                    ${(this.selectedOwner !== 'all' || this.selectedBank !== 'all') ? `
                        <button class="btn btn-sm btn-outline-danger" id="dash-reset-filters" style="font-size:0.75rem;padding:4px 10px;border-radius:6px;">
                            <i class="fas fa-times me-1"></i> Reset Slicers
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        wrapper.appendChild(filterCard);

        // ═════════════════════════════════════════════════════════════════
        // EXECUTIVE KPI CARDS GRID (8 High-Impact Modern Gradient Cards)
        // ═════════════════════════════════════════════════════════════════
        const kpiGrid = document.createElement('div');
        kpiGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;';

        const execKpis = [
            {
                title: 'Total Payable',
                sub: 'Imported Statements Only',
                val: window.Utils.formatCurrency(totalPayable),
                icon: 'fa-file-invoice-dollar',
                gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                shadow: '0 8px 20px rgba(238, 90, 36, 0.28)'
            },
            {
                title: 'Unbilled Amount',
                sub: 'Current Unbilled Swipes',
                val: window.Utils.formatCurrency(totalUnbilled),
                icon: 'fa-clock',
                gradient: 'linear-gradient(135deg, #ffa502 0%, #ff6348 100%)',
                shadow: '0 8px 20px rgba(255, 99, 72, 0.28)'
            },
            {
                title: 'Total Reward Points',
                sub: 'Active Rewards Pool',
                val: window.Utils.formatCurrency(kpis.totalRewards).replace('₹', ''),
                icon: 'fa-star',
                gradient: 'linear-gradient(135deg, #f9ca24 0%, #f0932b 100%)',
                shadow: '0 8px 20px rgba(240, 147, 43, 0.28)'
            },
            {
                title: 'Total Cards',
                sub: `${filteredCards.filter(c => c.card_category === 'Primary').length} Primary Cards`,
                val: filteredCards.length,
                icon: 'fa-credit-card',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadow: '0 8px 20px rgba(102, 126, 234, 0.28)'
            },
            {
                title: 'Cards >50% Utilization',
                sub: utilStatus,
                val: filteredCards.filter(c => {
                    const m = window.DB.cards.getCardLimitMetrics(c.card_id);
                    return m.util > 50;
                }).length,
                icon: 'fa-exclamation-triangle',
                gradient: 'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)',
                shadow: '0 8px 20px rgba(252, 92, 125, 0.28)'
            },
            {
                title: 'Total Limit',
                sub: 'Sanctioned Limit',
                val: window.Utils.formatCurrency(totalLimit),
                icon: 'fa-chart-line',
                gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                shadow: '0 8px 20px rgba(17, 153, 142, 0.28)'
            },
            {
                title: 'Available Limit',
                sub: `${totalLimit > 0 ? ((availableLimit / totalLimit) * 100).toFixed(0) : 0}% Headroom Available`,
                val: window.Utils.formatCurrency(availableLimit),
                icon: 'fa-wallet',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                shadow: '0 8px 20px rgba(79, 172, 254, 0.28)'
            },
            {
                title: 'Fee Waiver Balance',
                sub: 'Remaining Target Spend',
                val: window.Utils.formatCurrency(kpis.feeWaiverBalance),
                icon: 'fa-gift',
                gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                shadow: '0 8px 20px rgba(161, 140, 209, 0.28)'
            }
        ];

        execKpis.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: ${item.gradient};
                border-radius: 16px;
                padding: 20px 24px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: ${item.shadow};
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                cursor: default;
                position: relative;
                overflow: hidden;
            `;
            card.onmouseover = function() {
                this.style.transform = 'translateY(-4px)';
                this.style.boxShadow = '0 12px 26px rgba(0,0,0,0.18)';
            };
            card.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = item.shadow;
            };

            card.innerHTML = `
                <div style="width:50px;height:50px;border-radius:14px;background:rgba(255,255,255,0.22);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 2px rgba(255,255,255,0.3);">
                    <i class="fas ${item.icon}" style="font-size:22px;color:#ffffff;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:1.42rem;font-weight:800;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${item.val}
                    </div>
                    <div style="font-size:0.85rem;color:rgba(255,255,255,0.92);font-weight:600;margin-top:2px;">
                        ${item.title}
                    </div>
                    <div style="font-size:0.72rem;color:rgba(255,255,255,0.78);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${item.sub}
                    </div>
                </div>
            `;
            kpiGrid.appendChild(card);
        });
        wrapper.appendChild(kpiGrid);

        // ═════════════════════════════════════════════════════════════════
        // EXECUTIVE CHARTS & CONCENTRATION SECTION
        // ═════════════════════════════════════════════════════════════════
        const dashGrid = document.createElement('div');
        dashGrid.style.cssText = 'display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px;';

        // Left: Charts
        const chartsSection = document.createElement('div');
        chartsSection.className = 'd-flex flex-column gap-3';

        const chartCard1 = document.createElement('div');
        chartCard1.className = 'card p-3';
        chartCard1.style.cssText = 'border-radius:14px;border:1px solid #e2e8f0;';
        chartCard1.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0;">
                    <i class="fas fa-chart-pie text-primary me-2"></i>Institutional Credit Distribution by Bank
                </h4>
                <span class="badge bg-light text-muted border">Filtered View</span>
            </div>
            <div class="chart-container" style="height:240px;position:relative;">
                <canvas id="bankChart"></canvas>
            </div>
        `;

        const chartCard2 = document.createElement('div');
        chartCard2.className = 'card p-3';
        chartCard2.style.cssText = 'border-radius:14px;border:1px solid #e2e8f0;';
        chartCard2.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0;">
                    <i class="fas fa-chart-line text-success me-2"></i>Monthly Spend &amp; Billing Trajectory
                </h4>
                <span class="badge bg-light text-muted border">Billing Trend</span>
            </div>
            <div class="chart-container" style="height:240px;position:relative;">
                <canvas id="trendChart"></canvas>
            </div>
        `;

        chartsSection.appendChild(chartCard1);
        chartsSection.appendChild(chartCard2);

        // Right: Risk & Operational Alerts Panel
        const alertsPanel = document.createElement('div');
        alertsPanel.className = 'card p-3';
        alertsPanel.style.cssText = 'border-radius:14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;';
        
        const alertsList = this.generateAlerts();
        let alertsHtml = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0;">
                    <i class="fas fa-bell text-warning me-2"></i>Governance &amp; Risk Alerts
                </h4>
                <span class="badge" style="background:#fee2e2;color:#ef4444;font-weight:700;">${alertsList.length} Items</span>
            </div>
            <div style="flex:1;overflow-y:auto;max-height:510px;padding-right:4px;">
        `;

        if (alertsList.length === 0) {
            alertsHtml += `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-check-circle text-success mb-2" style="font-size:2rem;"></i>
                    <div style="font-weight:600;">Zero Risk Flags</div>
                    <div style="font-size:0.75rem;">All cards are operating within sanctioned limits.</div>
                </div>
            `;
        } else {
            alertsList.forEach(alert => {
                alertsHtml += `
                    <div class="p-2 mb-2 rounded border" style="background:#f8fafc;border-left:4px solid ${alert.severity === 'danger' ? '#ef4444' : (alert.severity === 'warning' ? '#f59e0b' : '#3b82f6')} !important;">
                        <div style="font-size:0.82rem;font-weight:700;color:#1e293b;">${alert.title}</div>
                        <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">${alert.message}</div>
                    </div>
                `;
            });
        }
        alertsHtml += `</div>`;
        alertsPanel.innerHTML = alertsHtml;

        dashGrid.appendChild(chartsSection);
        dashGrid.appendChild(alertsPanel);
        wrapper.appendChild(dashGrid);

        // ═════════════════════════════════════════════════════════════════
        // EXECUTIVE BREAKDOWN SUMMARY MATRICES (Bank & Cardholder)
        // ═════════════════════════════════════════════════════════════════
        const matricesGrid = document.createElement('div');
        matricesGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;';

        // Matrix 1: Bank Exposure Breakdown
        const bankSummaryCard = document.createElement('div');
        bankSummaryCard.className = 'card p-3';
        bankSummaryCard.style.cssText = 'border-radius:14px;border:1px solid #e2e8f0;';
        
        let bankTableRows = '';
        const bankRows = window.DB.cards.getBanks().map(bank => {
            const bCards = allCards.filter(c => c.bank_name === bank);
            const bLimit = bCards.reduce((s, c) => s + (c.credit_limit || 0), 0);
            const bSpent = allTxns.filter(t => bCards.map(c => c.card_id).includes(t.card_id) && t.txn_type === 'Debit')
                                  .reduce((s, t) => s + (t.amount || 0), 0);
            const bUtil = bLimit > 0 ? ((bSpent / bLimit) * 100).toFixed(1) : 0;
            return { bank, count: bCards.length, limit: bLimit, spent: bSpent, util: bUtil };
        }).sort((a, b) => b.limit - a.limit);

        bankRows.forEach(b => {
            const utilBarColor = b.util < 30 ? '#10b981' : (b.util <= 50 ? '#f59e0b' : '#ef4444');
            bankTableRows += `
                <tr>
                    <td style="font-weight:600;color:#0f172a;"><i class="fas fa-university text-muted me-2"></i>${b.bank}</td>
                    <td class="text-center"><span class="badge bg-light text-dark border">${b.count}</span></td>
                    <td class="text-end" style="font-weight:600;">${window.Utils.formatCurrency(b.limit)}</td>
                    <td class="text-end text-muted">${window.Utils.formatCurrency(b.spent)}</td>
                    <td style="min-width:100px;">
                        <div class="d-flex align-items-center gap-2">
                            <div class="exec-progress-bar-bg flex-grow-1">
                                <div class="exec-progress-bar-fill" style="width:${Math.min(100, b.util)}%;background:${utilBarColor};"></div>
                            </div>
                            <span style="font-size:0.75rem;font-weight:700;color:#475569;min-width:32px;">${b.util}%</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        bankSummaryCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0;">
                    <i class="fas fa-landmark text-primary me-2"></i>Banking Exposure &amp; Concentration
                </h4>
                <button class="btn btn-sm btn-outline" onclick="App.navigate('reports')" style="font-size:0.75rem;">View Full Report</button>
            </div>
            <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                <table class="exec-matrix-table">
                    <thead>
                        <tr>
                            <th>Bank</th>
                            <th class="text-center">Cards</th>
                            <th class="text-end">Limit</th>
                            <th class="text-end">Spend</th>
                            <th>Utilization</th>
                        </tr>
                    </thead>
                    <tbody>${bankTableRows}</tbody>
                </table>
            </div>
        `;

        // Matrix 2: Cardholder Cushion Allocation
        const holderSummaryCard = document.createElement('div');
        holderSummaryCard.className = 'card p-3';
        holderSummaryCard.style.cssText = 'border-radius:14px;border:1px solid #e2e8f0;';

        let holderTableRows = '';
        const holderRows = owners.map(owner => {
            const oCards = allCards.filter(c => c.primary_cardholder === owner);
            const oLimit = oCards.reduce((s, c) => s + (c.credit_limit || 0), 0);
            const oSpent = allTxns.filter(t => oCards.map(c => c.card_id).includes(t.card_id) && t.txn_type === 'Debit')
                                  .reduce((s, t) => s + (t.amount || 0), 0);
            const oCushion = Math.max(0, oLimit - oSpent);
            const oUtil = oLimit > 0 ? ((oSpent / oLimit) * 100).toFixed(1) : 0;
            return { owner, count: oCards.length, limit: oLimit, spent: oSpent, cushion: oCushion, util: oUtil };
        }).sort((a, b) => b.limit - a.limit);

        holderRows.forEach(h => {
            holderTableRows += `
                <tr>
                    <td style="font-weight:600;color:#0f172a;"><i class="fas fa-user-tie text-muted me-2"></i>${h.owner}</td>
                    <td class="text-center"><span class="badge bg-light text-dark border">${h.count}</span></td>
                    <td class="text-end" style="font-weight:600;">${window.Utils.formatCurrency(h.limit)}</td>
                    <td class="text-end text-success" style="font-weight:600;">${window.Utils.formatCurrency(h.cushion)}</td>
                    <td class="text-center"><span class="badge" style="background:#eef2ff;color:#4361ee;font-weight:700;">${h.util}%</span></td>
                </tr>
            `;
        });

        holderSummaryCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0;">
                    <i class="fas fa-users text-success me-2"></i>Primary Cardholder Cushion Allocation
                </h4>
                <button class="btn btn-sm btn-outline" onclick="App.navigate('reports')" style="font-size:0.75rem;">View Full Report</button>
            </div>
            <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                <table class="exec-matrix-table">
                    <thead>
                        <tr>
                            <th>Cardholder</th>
                            <th class="text-center">Cards</th>
                            <th class="text-end">Limit</th>
                            <th class="text-end">Cushion</th>
                            <th class="text-center">Util %</th>
                        </tr>
                    </thead>
                    <tbody>${holderTableRows}</tbody>
                </table>
            </div>
        `;

        matricesGrid.appendChild(bankSummaryCard);
        matricesGrid.appendChild(holderSummaryCard);
        wrapper.appendChild(matricesGrid);

        // ═════════════════════════════════════════════════════════════════
        // BOTTOM QUICK STATS CARDS (4 Modern Gradient Cards)
        // ═════════════════════════════════════════════════════════════════
        const primaryCount = filteredCards.filter(c => c.card_category === 'Primary').length;
        const addonCount = filteredCards.filter(c => c.card_category === 'Add-on').length;
        const activeCount = filteredCards.filter(c => c.status === 'Active').length;
        const banksCount = new Set(filteredCards.map(c => c.bank_name).filter(Boolean)).size;

        const bottomStats = [
            {
                label: 'Primary Cards',
                val: primaryCount,
                icon: 'fa-id-card',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadow: '0 8px 20px rgba(102, 126, 234, 0.28)'
            },
            {
                label: 'Add-on Cards',
                val: addonCount,
                icon: 'fa-clone',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                shadow: '0 8px 20px rgba(245, 87, 108, 0.28)'
            },
            {
                label: 'Active Cards',
                val: activeCount,
                icon: 'fa-check-circle',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                shadow: '0 8px 20px rgba(79, 172, 254, 0.28)'
            },
            {
                label: 'Banks Covered',
                val: banksCount,
                icon: 'fa-university',
                gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                shadow: '0 8px 20px rgba(67, 233, 123, 0.28)'
            }
        ];

        const bottomGrid = document.createElement('div');
        bottomGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px;margin-bottom:16px;';

        bottomStats.forEach(s => {
            const bCard = document.createElement('div');
            bCard.style.cssText = `
                background: ${s.gradient};
                border-radius: 16px;
                padding: 18px 22px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: ${s.shadow};
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                cursor: default;
                position: relative;
                overflow: hidden;
            `;
            bCard.onmouseover = function() {
                this.style.transform = 'translateY(-4px)';
                this.style.boxShadow = '0 12px 26px rgba(0,0,0,0.18)';
            };
            bCard.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = s.shadow;
            };

            bCard.innerHTML = `
                <div style="width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,0.22);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 2px rgba(255,255,255,0.3);">
                    <i class="fas ${s.icon}" style="font-size:22px;color:#ffffff;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:1.65rem;font-weight:800;color:#ffffff;line-height:1.1;">
                        ${s.val}
                    </div>
                    <div style="font-size:0.85rem;color:rgba(255,255,255,0.92);font-weight:600;margin-top:2px;">
                        ${s.label}
                    </div>
                </div>
            `;
            bottomGrid.appendChild(bCard);
        });

        wrapper.appendChild(bottomGrid);

        container.appendChild(wrapper);

        // ═════════════════════════════════════════════════════════════════
        // ATTACH FILTER EVENTS & RENDER CHARTS
        // ═════════════════════════════════════════════════════════════════
        const ownerSelect = document.getElementById('dash-filter-owner');
        if (ownerSelect) {
            ownerSelect.addEventListener('change', (e) => {
                this.selectedOwner = e.target.value;
                this.render(container);
            });
        }

        const bankSelect = document.getElementById('dash-filter-bank');
        if (bankSelect) {
            bankSelect.addEventListener('change', (e) => {
                this.selectedBank = e.target.value;
                this.render(container);
            });
        }

        const resetBtn = document.getElementById('dash-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.selectedOwner = 'all';
                this.selectedBank = 'all';
                this.render(container);
            });
        }

        // Render Charts with current filtered view
        this.renderCharts(filteredCards, filteredTxns);
    },

    generateAlerts: function() {
        const alerts = [];
        const cards = window.DB.cards.getAll() || [];
        const today = new Date();

        cards.forEach(card => {
            // Utilization Alert
            if (card.credit_limit && card.credit_limit > 0) {
                const statements = window.DB.statements.getByCard(card.card_id);
                let outstanding = 0;
                if (statements && statements.length > 0) {
                    const latest = statements[statements.length - 1];
                    outstanding = (latest.closing_outstanding || 0) + (latest.unbilled_amount || 0);
                }
                const util = (outstanding / card.credit_limit) * 100;
                if (util > 80) {
                    alerts.push({ severity: 'danger', title: 'High Utilization Alert', message: `${card.cardholder_name} (${card.bank_name}) is at ${util.toFixed(1)}% limit usage.` });
                } else if (util > 50) {
                    alerts.push({ severity: 'warning', title: 'Moderate Utilization', message: `${card.cardholder_name} (${card.bank_name}) has exceeded 50% limit.` });
                }
            }

            // Upcoming Due Dates
            if (card.due_date) {
                const currentDay = today.getDate();
                if (card.due_date >= currentDay && card.due_date <= currentDay + 5) {
                    alerts.push({ severity: 'warning', title: 'Upcoming Payment Due', message: `${card.cardholder_name}'s ${card.bank_name} statement is due on day ${card.due_date}.` });
                }
            }
            
            // Fee Waiver Deadlines
            if (card.renewal_date) {
                const renDate = new Date(card.renewal_date);
                const diffTime = renDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays > 0 && diffDays <= 30) {
                    alerts.push({ severity: 'info', title: 'Annual Fee Waiver Deadline', message: `${card.cardholder_name}'s ${card.bank_name} renews in ${diffDays} days.` });
                }
            }
        });

        const hygiene = window.DB.getDataHygiene();
        const totalMissing = hygiene.reduce((sum, h) => sum + h.total_missing, 0);
        if (totalMissing > 0) {
            alerts.push({ severity: 'danger', title: 'Regulatory Data Hygiene', message: `${totalMissing} mandatory fields missing across credit card masters.` });
        }

        return alerts;
    },

    renderCharts: function(cards, txns) {
        cards = cards || window.DB.cards.getAll() || [];
        txns = txns || window.DB.transactions.getAll() || [];

        // Destroy existing charts
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        // 1. Spending by Bank (Doughnut Chart)
        const bankCanvas = document.getElementById('bankChart');
        if (bankCanvas && window.Chart) {
            const bankTotals = {};
            txns.forEach(txn => {
                if (txn.txn_type === 'Debit') {
                    const card = cards.find(c => String(c.card_id) === String(txn.card_id));
                    if (card && card.bank_name) {
                        bankTotals[card.bank_name] = (bankTotals[card.bank_name] || 0) + (txn.amount || 0);
                    }
                }
            });

            const labels = Object.keys(bankTotals);
            const data = Object.values(bankTotals);
            const palette = ['#4361ee', '#7209b7', '#06d6a0', '#f72585', '#3a0ca3', '#4cc9f0', '#f59e0b'];

            const bankChart = new window.Chart(bankCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels.length > 0 ? labels : ['No Data'],
                    datasets: [{
                        data: data.length > 0 ? data : [1],
                        backgroundColor: data.length > 0 ? palette.slice(0, labels.length) : ['#e2e8f0'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11, family: 'Inter, Arial' } } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.label}: ${window.Utils.formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
            this.charts.push(bankChart);
        }

        // 2. Monthly Spending Trend (Bar + Line Combo)
        const trendCanvas = document.getElementById('trendChart');
        if (trendCanvas && window.Chart) {
            const monthlyData = {};
            txns.forEach(txn => {
                if (txn.txn_type === 'Debit' && txn.txn_date) {
                    const d = new Date(txn.txn_date);
                    const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
                    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (txn.amount || 0);
                }
            });

            const sortedKeys = Object.keys(monthlyData).sort();
            const labels = sortedKeys.map(k => {
                const [y, m] = k.split('-');
                return window.Utils.getMonthName(parseInt(m)).slice(0, 3) + ' ' + y;
            });
            const data = sortedKeys.map(k => monthlyData[k]);

            const trendChart = new window.Chart(trendCanvas, {
                type: 'bar',
                data: {
                    labels: labels.length > 0 ? labels : ['Current Period'],
                    datasets: [{
                        label: 'Total Debit Spend',
                        data: data.length > 0 ? data : [0],
                        backgroundColor: 'rgba(67, 97, 238, 0.85)',
                        borderColor: '#4361ee',
                        borderRadius: 6,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f1f5f9' },
                            ticks: {
                                callback: (val) => window.Utils.formatCurrency(val).replace('.00', '')
                            }
                        },
                        x: {
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` Spend: ${window.Utils.formatCurrency(ctx.raw)}`
                            }
                        }
                    }
                }
            });
            this.charts.push(trendChart);
        }
    }
};

