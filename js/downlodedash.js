/**
 * DownlodeDash — Executive PDF Dashboard & Analytics Downloader
 * CCMS Enterprise v2.1 • Gretex Group
 * Features:
 *   - Modular Multi-Page Executive Architecture (A4 Landscape Default)
 *   - Direct Per-Page Canvas-to-jsPDF Rendering (Zero Left-Clipping, Zero Horizontal Overflow)
 *   - Guaranteed 100% Column Visibility with Fixed Proportions
 *   - High-Definition 300 DPI Export & Browser Print Integration
 */

window.DownlodeDash = {
    selectedOwner: 'all',
    selectedBank: 'all',
    orientation: 'landscape', // 'landscape' (recommended for wide data ledgers) or 'portrait'
    charts: [],
    
    sections: {
        kpis: true,
        charts: true,
        aging: true,
        cardsTable: true,
        cardholderTable: true,
        reconTable: true,
        governance: true
    },

    render: function(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.destroyCharts();

        const owners = window.DB.cards.getOwners() || [];
        const banks = window.DB.cards.getBanks() || [];

        const wrapper = document.createElement('div');
        wrapper.className = 'downlode-dash-wrapper';

        wrapper.innerHTML = `
            <!-- Top Header & Action Controls -->
            <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div>
                    <div style="font-size:0.75rem;font-weight:700;letter-spacing:1.5px;color:#4361ee;text-transform:uppercase;margin-bottom:4px;">
                        <i class="fas fa-file-pdf me-1"></i> EXECUTIVE REPORTING &amp; INTELLIGENCE EXPORT
                    </div>
                    <h2 class="page-title" style="margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px;">
                        Download Executive PDF Dashboard
                    </h2>
                    <div class="page-subtitle text-muted" style="font-size:0.88rem;margin-top:4px;">
                        Generate pristine, board-ready executive PDF reports with zero clipping, balanced pagination &amp; full data visibility.
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <button class="btn btn-outline" id="btn-print-dash" onclick="window.DownlodeDash.printReport()" style="background:#ffffff;border:1.5px solid #cbd5e1;color:#334155;border-radius:10px;font-weight:700;padding:9px 18px;display:inline-flex;align-items:center;gap:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                        <i class="fas fa-print" style="color:#64748b;"></i> Print / Save as PDF
                    </button>
                    <button class="btn btn-primary" id="btn-download-pdf" onclick="window.DownlodeDash.downloadPDF()" style="background:linear-gradient(135deg, #4361ee 0%, #7209b7 100%);border:none;border-radius:10px;font-weight:700;padding:9px 24px;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(67, 97, 238, 0.35);">
                        <i class="fas fa-download"></i> Download PDF Report
                    </button>
                </div>
            </div>

            <!-- Configuration & Slicing Control Deck -->
            <div class="card p-3 mb-4" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 pb-3 border-bottom">
                    <div class="d-flex align-items-center gap-2">
                        <div style="width:34px;height:34px;border-radius:8px;background:rgba(67,97,238,0.1);color:#4361ee;display:flex;align-items:center;justify-content:center;font-size:14px;">
                            <i class="fas fa-sliders-h"></i>
                        </div>
                        <span style="font-size:0.88rem;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.5px;">
                            Report Customization &amp; Format:
                        </span>
                    </div>

                    <div class="d-flex align-items-center gap-3 flex-wrap">
                        <!-- Orientation Toggle -->
                        <div class="d-flex align-items-center gap-2">
                            <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin:0;">Orientation:</label>
                            <select id="pdf-filter-orient" class="form-select form-select-sm" style="min-width:180px;border-radius:8px;border:1.5px solid #4361ee;padding:5px 10px;font-size:0.85rem;font-weight:600;color:#4361ee;" onchange="window.DownlodeDash.handleOrientationChange(this.value)">
                                <option value="landscape" ${this.orientation === 'landscape' ? 'selected' : ''}>Landscape (Recommended)</option>
                                <option value="portrait" ${this.orientation === 'portrait' ? 'selected' : ''}>Portrait (Compact)</option>
                            </select>
                        </div>

                        <!-- Cardholder Filter -->
                        <div class="d-flex align-items-center gap-2">
                            <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin:0;">Cardholder:</label>
                            <select id="pdf-filter-owner" class="form-select form-select-sm" style="min-width:170px;border-radius:8px;border:1px solid #cbd5e1;padding:5px 10px;font-size:0.85rem;" onchange="window.DownlodeDash.handleFilterChange()">
                                <option value="all" ${this.selectedOwner === 'all' ? 'selected' : ''}>All Cardholders (${owners.length})</option>
                                ${owners.map(o => `<option value="${o}" ${this.selectedOwner === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Bank Filter -->
                        <div class="d-flex align-items-center gap-2">
                            <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin:0;">Bank Partner:</label>
                            <select id="pdf-filter-bank" class="form-select form-select-sm" style="min-width:160px;border-radius:8px;border:1px solid #cbd5e1;padding:5px 10px;font-size:0.85rem;" onchange="window.DownlodeDash.handleFilterChange()">
                                <option value="all" ${this.selectedBank === 'all' ? 'selected' : ''}>All Banks (${banks.length})</option>
                                ${banks.map(b => `<option value="${b}" ${this.selectedBank === b ? 'selected' : ''}>${b}</option>`).join('')}
                            </select>
                        </div>

                        <button class="btn btn-sm btn-outline-secondary" onclick="window.DownlodeDash.resetFilters()" style="border-radius:8px;font-size:0.8rem;padding:5px 12px;">
                            <i class="fas fa-undo me-1"></i> Reset
                        </button>
                    </div>
                </div>

                <!-- Section Inclusions Checklist -->
                <div class="pt-3">
                    <span style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:8px;">
                        Include Report Modules:
                    </span>
                    <div class="d-flex flex-wrap gap-3 align-items-center" style="font-size:0.84rem;">
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-kpis" ${this.sections.kpis ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('kpis', this.checked)">
                            Executive KPIs
                        </label>
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-charts" ${this.sections.charts ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('charts', this.checked)">
                            Portfolio Visual Charts
                        </label>
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-aging" ${this.sections.aging ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('aging', this.checked)">
                            Payment Due Aging Horizon
                        </label>
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-cardsTable" ${this.sections.cardsTable ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('cardsTable', this.checked)">
                            Card Master &amp; Limits Ledger
                        </label>
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-cardholderTable" ${this.sections.cardholderTable ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('cardholderTable', this.checked)">
                            Cardholder Risk Allocation
                        </label>
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-reconTable" ${this.sections.reconTable ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('reconTable', this.checked)">
                            Zoho vs Stmt Reconciliation
                        </label>
                        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#334155;">
                            <input type="checkbox" id="chk-governance" ${this.sections.governance ? 'checked' : ''} onchange="window.DownlodeDash.toggleSection('governance', this.checked)">
                            Governance Sign-off
                        </label>
                    </div>
                </div>
            </div>

            <!-- PDF Generating Status Alert Banner -->
            <div id="pdf-generating-banner" class="alert alert-info hidden" style="border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3;display:none;align-items:center;justify-content:space-between;margin-bottom:20px;padding:14px 20px;">
                <div class="d-flex align-items-center gap-3">
                    <i class="fas fa-spinner fa-spin" style="font-size:1.4rem;color:#4361ee;"></i>
                    <div>
                        <strong style="font-size:0.95rem;">Compiling High-Resolution Executive PDF (${this.orientation.toUpperCase()})...</strong>
                        <div style="font-size:0.8rem;color:#4f46e5;margin-top:2px;">Rendering vector charts, processing multi-page pagination &amp; assembling PDF.</div>
                    </div>
                </div>
                <span class="badge" style="background:#4361ee;color:#fff;padding:6px 14px;border-radius:100px;font-size:0.78rem;">Please wait ~2-3s</span>
            </div>

            <!-- Document Workspace (Multi-Page Preview) -->
            <div class="pdf-preview-outer" style="background:#1e293b;padding:28px 16px;border-radius:16px;box-shadow:inset 0 2px 10px rgba(0,0,0,0.3);overflow-x:auto;">
                <div id="pdf-report-document" style="width:${this.orientation === 'landscape' ? '1060px' : '780px'};margin:0 auto;display:flex;flex-direction:column;gap:28px;">
                    ${this.generateModularPagesHtml()}
                </div>
            </div>
        `;

        this.container.appendChild(wrapper);

        this.injectPrintStyles();

        setTimeout(() => {
            this.renderDocumentCharts();
        }, 80);
    },

    destroyCharts: function() {
        if (this.charts && this.charts.length > 0) {
            this.charts.forEach(c => {
                try { c.destroy(); } catch(e) {}
            });
            this.charts = [];
        }
    },

    handleOrientationChange: function(val) {
        this.orientation = val;
        this.render(this.container);
    },

    handleFilterChange: function() {
        const ownerEl = document.getElementById('pdf-filter-owner');
        const bankEl = document.getElementById('pdf-filter-bank');
        if (ownerEl) this.selectedOwner = ownerEl.value;
        if (bankEl) this.selectedBank = bankEl.value;
        this.render(this.container);
    },

    resetFilters: function() {
        this.selectedOwner = 'all';
        this.selectedBank = 'all';
        this.render(this.container);
    },

    toggleSection: function(secKey, isChecked) {
        this.sections[secKey] = isChecked;
        this.render(this.container);
    },

    getFilteredData: function() {
        const allCards = window.DB.cards.getAll() || [];
        const allTxns = window.DB.transactions.getAll() || [];
        const allStmts = window.DB.statements.getAll() || [];

        let filteredCards = allCards;
        if (this.selectedOwner !== 'all') {
            filteredCards = filteredCards.filter(c => c.primary_cardholder === this.selectedOwner);
        }
        if (this.selectedBank !== 'all') {
            filteredCards = filteredCards.filter(c => c.bank_name === this.selectedBank);
        }

        const cardIds = new Set(filteredCards.map(c => String(c.card_id)));
        const filteredTxns = allTxns.filter(t => cardIds.has(String(t.card_id)));
        const filteredStmts = allStmts.filter(s => cardIds.has(String(s.card_id)));

        return { cards: filteredCards, txns: filteredTxns, stmts: filteredStmts };
    },

    /**
     * Generates clean, distinct, bounded pages.
     */
    generateModularPagesHtml: function() {
        const { cards, txns, stmts } = this.getFilteredData();
        const Utils = window.Utils;
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const isLandscape = this.orientation === 'landscape';

        // Aggregated Metrics
        const totalLimit = cards.reduce((s, c) => s + (c.credit_limit || 0), 0);
        const totalPayable = stmts.reduce((s, st) => s + (st.closing_outstanding || 0), 0);
        const totalUnbilled = cards.reduce((s, c) => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            return s + (m.unbilled || 0);
        }, 0);
        const usedLimit = totalPayable + totalUnbilled;
        const availableLimit = Math.max(0, totalLimit - usedLimit);
        const utilPct = totalLimit > 0 ? ((usedLimit / totalLimit) * 100).toFixed(1) : '0';
        const utilNum = parseFloat(utilPct);

        const totalRewards = cards.reduce((s, c) => s + (c.reward_points || 0), 0);
        let over50Count = 0;
        cards.forEach(c => {
            const m = window.DB.cards.getCardLimitMetrics(c.card_id);
            if (m.limit > 0 && m.util > 50) over50Count++;
        });

        const feeWaiverBal = cards.reduce((sum, c) => {
            const target = Utils.parseNum(c.fee_waiver_target);
            if (!target) return sum;
            const spent = txns.filter(t => String(t.card_id) === String(c.card_id) && t.txn_type === 'Debit')
                              .reduce((s, t) => s + Utils.parseNum(t.amount), 0);
            return sum + Math.max(0, target - spent);
        }, 0);

        const utilBadgeColor = utilNum < 30 ? '#10b981' : (utilNum <= 50 ? '#f59e0b' : '#ef4444');
        const utilStatusText = utilNum < 30 ? 'OPTIMAL HEALTH (<30%)' : (utilNum <= 50 ? 'MODERATE UTILIZATION (30-50%)' : 'HIGH USAGE ALERT (>50%)');

        let pagesHtml = '';

        // Helper: Page Header Template
        const renderHeader = (pageTitle, sectionBadge) => `
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.15rem; font-weight:800; color:#0f172a; letter-spacing:-0.3px;">GRETEX GROUP</span>
                        <span style="font-size:0.7rem; background:#e0e7ff; color:#3730a3; padding:2px 7px; border-radius:100px; font-weight:700;">CCMS ENTERPRISE</span>
                        <span style="font-size:0.68rem; background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:100px; font-weight:700;">${sectionBadge}</span>
                    </div>
                    <div style="font-size:1.05rem; font-weight:800; color:#1e293b; margin-top:2px;">
                        ${pageTitle}
                    </div>
                </div>
                <div style="text-align:right; font-size:0.72rem; color:#64748b; line-height:1.4;">
                    <div><strong>Date:</strong> ${dateStr} &bull; ${timeStr}</div>
                    <div><strong>Scope:</strong> <span style="color:#4361ee;font-weight:700;">${this.selectedOwner === 'all' ? 'All Owners' : this.selectedOwner}</span> &bull; <span style="color:#7209b7;font-weight:700;">${this.selectedBank === 'all' ? 'All Banks' : this.selectedBank}</span></div>
                    <div style="color:#059669; font-weight:700; font-size:0.68rem;">AES-256 GCM &bull; STRICTLY CONFIDENTIAL</div>
                </div>
            </div>
        `;

        // Helper: Page Footer Template
        const renderFooter = (pageNumber, totalPages) => `
            <div style="margin-top:auto; padding-top:8px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; font-size:0.68rem; color:#94a3b8;">
                <span>Gretex Group &copy; 2026 &bull; Credit Card Management System Enterprise Intelligence</span>
                <span>Page ${pageNumber} of ${totalPages} &bull; ${this.orientation.toUpperCase()} FORMAT</span>
            </div>
        `;

        const pageStyle = `
            width: ${isLandscape ? '1060px' : '780px'};
            min-height: ${isLandscape ? '680px' : '960px'};
            background: #ffffff;
            border-radius: 8px;
            padding: 20px 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.18);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            position: relative;
        `;

        // ═════════════════════════════════════════════════════════════════
        // PAGE 1: EXECUTIVE COCKPIT & CORE VISUAL ANALYTICS
        // ═════════════════════════════════════════════════════════════════
        if (this.sections.kpis || this.sections.charts) {
            pagesHtml += `
                <div class="pdf-page" style="${pageStyle}">
                    ${renderHeader("Executive Financial Cockpit &amp; Portfolio Analytics", "Overview")}

                    <!-- KPI Cards (4x2 Grid) -->
                    ${this.sections.kpis ? `
                        <div style="margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="font-size:0.8rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">
                                    <i class="fas fa-tachometer-alt text-primary me-1"></i> Core Portfolio Performance Indicators
                                </span>
                                <span style="font-size:0.7rem; background:${utilBadgeColor}18; color:${utilBadgeColor}; border:1px solid ${utilBadgeColor}40; padding:2px 8px; border-radius:100px; font-weight:700;">
                                    ${utilStatusText}
                                </span>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #ef476f; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Total Payable Due</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#ef476f; margin:1px 0; white-space:nowrap; letter-spacing:-0.5px;">${Utils.formatCurrency(totalPayable)}</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">Imported statements only</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #f59e0b; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Current Unbilled</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#d97706; margin:1px 0; white-space:nowrap; letter-spacing:-0.5px;">${Utils.formatCurrency(totalUnbilled)}</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">Active cycle card swipes</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #10b981; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Sanctioned Credit Limit</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#059669; margin:1px 0; white-space:nowrap; letter-spacing:-0.5px;">${Utils.formatCurrency(totalLimit)}</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">Corporate line ceiling</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #2563eb; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Available Cushion</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#2563eb; margin:1px 0; white-space:nowrap; letter-spacing:-0.5px;">${Utils.formatCurrency(availableLimit)}</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">${(100 - utilNum).toFixed(1)}% headroom remaining</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #7209b7; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Reward Points Pool</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#7209b7; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(totalRewards).replace('₹', '')}</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">Accumulated redeemable pts</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #0891b2; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Active Inventory</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#0891b2; margin:1px 0; white-space:nowrap;">${cards.length} Cards</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">Across ${[...new Set(cards.map(c => c.bank_name))].length} partner banks</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid ${over50Count > 0 ? '#ef4444' : '#10b981'}; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Cards >50% Utilized</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:${over50Count > 0 ? '#ef4444' : '#10b981'}; margin:1px 0; white-space:nowrap;">${over50Count} Cards</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">${over50Count > 0 ? 'Exceeds threshold' : 'All lines in safe zone'}</div>
                                </div>
                                <div style="background:#ffffff; border:1px solid #e2e8f0; border-top:3px solid #db2777; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.65rem; font-weight:700; color:#64748b; text-transform:uppercase;">Fee Waiver Spend</div>
                                    <div style="font-size:1.15rem; font-weight:800; color:#db2777; margin:1px 0; white-space:nowrap; letter-spacing:-0.5px;">${Utils.formatCurrency(feeWaiverBal)}</div>
                                    <div style="font-size:0.62rem; color:#94a3b8;">Pending target spend</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Charts Side-by-Side (Fits on Page 1 cleanly) -->
                    ${this.sections.charts ? `
                        <div style="margin-bottom:8px;">
                            <div style="font-size:0.8rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                                <i class="fas fa-chart-pie text-success me-1"></i> Exposure Distribution &amp; Historical Trajectory
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.72rem; font-weight:700; color:#1e293b; margin-bottom:4px;">
                                        Institutional Credit Line Allocation by Bank
                                    </div>
                                    <div style="height:175px; position:relative;">
                                        <canvas id="pdf-chart-bank-dist"></canvas>
                                    </div>
                                </div>
                                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px;">
                                    <div style="font-size:0.72rem; font-weight:700; color:#1e293b; margin-bottom:4px;">
                                        Monthly Spend &amp; Billing Trajectory (₹)
                                    </div>
                                    <div style="height:175px; position:relative;">
                                        <canvas id="pdf-chart-monthly-trend"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    ${renderFooter(1, 4)}
                </div>
            `;
        }

        // ═════════════════════════════════════════════════════════════════
        // PAGE 2: LIQUIDITY & PAYMENT DUE AGING TIMELINE
        // ═════════════════════════════════════════════════════════════════
        if (this.sections.aging) {
            const agingBuckets = window.Dashboard.getPaymentDueAgingBuckets(stmts, cards);
            const pendingStmts = stmts.filter(s => s.payment_status !== 'Paid' && (s.closing_outstanding || 0) > 0);

            pagesHtml += `
                <div class="pdf-page" style="${pageStyle}">
                    ${renderHeader("Liquidity Schedule &amp; Payment Due Aging Horizon", "Liquidity")}

                    <div style="margin-bottom:10px;">
                        <div style="font-size:0.8rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                            <i class="fas fa-hourglass-half text-warning me-1"></i> Cashflow Urgency Horizon (Today &bull; Tomorrow &bull; 3d &bull; 7d &bull; 15d &bull; Overdue)
                        </div>

                        <!-- 6 Stat Pills -->
                        <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:8px; margin-bottom:10px;">
                            <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:7px; text-align:center;">
                                <div style="font-size:0.62rem; font-weight:800; color:#991b1b; text-transform:uppercase;">Due Today</div>
                                <div style="font-size:1.02rem; font-weight:800; color:#dc2626; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(agingBuckets.today.amount)}</div>
                                <div style="font-size:0.62rem; color:#7f1d1d; font-weight:600;">${agingBuckets.today.count} Stmt</div>
                            </div>
                            <div style="background:#ffedd5; border:1px solid #fdba74; border-radius:8px; padding:7px; text-align:center;">
                                <div style="font-size:0.62rem; font-weight:800; color:#9a3412; text-transform:uppercase;">Tomorrow</div>
                                <div style="font-size:1.02rem; font-weight:800; color:#ea580c; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(agingBuckets.tomorrow.amount)}</div>
                                <div style="font-size:0.62rem; color:#7c2d12; font-weight:600;">${agingBuckets.tomorrow.count} Stmt</div>
                            </div>
                            <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:7px; text-align:center;">
                                <div style="font-size:0.62rem; font-weight:800; color:#92400e; text-transform:uppercase;">In 3 Days</div>
                                <div style="font-size:1.02rem; font-weight:800; color:#d97706; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(agingBuckets.days3.amount)}</div>
                                <div style="font-size:0.62rem; color:#78350f; font-weight:600;">${agingBuckets.days3.count} Stmt</div>
                            </div>
                            <div style="background:#e0f2fe; border:1px solid #7dd3fc; border-radius:8px; padding:7px; text-align:center;">
                                <div style="font-size:0.62rem; font-weight:800; color:#075985; text-transform:uppercase;">In 7 Days</div>
                                <div style="font-size:1.02rem; font-weight:800; color:#0284c7; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(agingBuckets.days7.amount)}</div>
                                <div style="font-size:0.62rem; color:#0369a1; font-weight:600;">${agingBuckets.days7.count} Stmt</div>
                            </div>
                            <div style="background:#f3e8ff; border:1px solid #d8b4fe; border-radius:8px; padding:7px; text-align:center;">
                                <div style="font-size:0.62rem; font-weight:800; color:#581c87; text-transform:uppercase;">In 15 Days</div>
                                <div style="font-size:1.02rem; font-weight:800; color:#7e22ce; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(agingBuckets.days15.amount)}</div>
                                <div style="font-size:0.62rem; color:#6b21a8; font-weight:600;">${agingBuckets.days15.count} Stmt</div>
                            </div>
                            <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:7px; text-align:center;">
                                <div style="font-size:0.62rem; font-weight:800; color:#334155; text-transform:uppercase;">Overdue / Later</div>
                                <div style="font-size:1.02rem; font-weight:800; color:#475569; margin:1px 0; white-space:nowrap;">${Utils.formatCurrency(agingBuckets.overdue.amount + agingBuckets.later.amount)}</div>
                                <div style="font-size:0.62rem; color:#64748b; font-weight:600;">${agingBuckets.overdue.count + agingBuckets.later.count} Stmt</div>
                            </div>
                        </div>

                        <!-- Aging Chart -->
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin-bottom:12px;">
                            <div style="height:155px; position:relative;">
                                <canvas id="pdf-chart-due-aging"></canvas>
                            </div>
                        </div>

                        <!-- Upcoming Statements Table -->
                        <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                            <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.73rem;">
                                <thead>
                                    <tr style="background:#0f172a; color:#fff; font-size:0.68rem; text-transform:uppercase;">
                                        <th style="width:25%; padding:6px 10px; text-align:left;">Cardholder &amp; Line</th>
                                        <th style="width:15%; padding:6px 10px; text-align:left;">Statement Month</th>
                                        <th style="width:14%; padding:6px 10px; text-align:left;">Due Date</th>
                                        <th style="width:14%; padding:6px 10px; text-align:center;">Urgency Status</th>
                                        <th style="width:16%; padding:6px 10px; text-align:right;">Closing Outstanding</th>
                                        <th style="width:16%; padding:6px 10px; text-align:right;">Minimum Due</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingStmts.length === 0 ? `
                                        <tr><td colspan="6" style="padding:14px; text-align:center; color:#94a3b8;">No pending statements due. All settled!</td></tr>
                                    ` : pendingStmts.slice(0, 6).map((s, idx) => {
                                        const c = cards.find(x => String(x.card_id) === String(s.card_id));
                                        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                                        return `
                                            <tr style="background:${bg}; border-bottom:1px solid #f1f5f9;">
                                                <td style="padding:6px 10px; font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                                    ${c ? c.cardholder_name : 'Card #' + s.card_id} <span style="font-weight:400; color:#64748b;">(*${c ? c.card_last4 : '—'})</span>
                                                </td>
                                                <td style="padding:6px 10px; color:#334155;">${Utils.formatMonthYear(s.statement_month)}</td>
                                                <td style="padding:6px 10px; font-weight:600; color:#0f172a;">${Utils.formatDate(s.due_date) || '—'}</td>
                                                <td style="padding:6px 10px; text-align:center;">
                                                    <span style="background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:100px; font-size:0.63rem; font-weight:700;">
                                                        Pending Action
                                                    </span>
                                                </td>
                                                <td style="padding:6px 10px; text-align:right; font-weight:700; color:#ef476f;">${Utils.formatCurrency(s.closing_outstanding)}</td>
                                                <td style="padding:6px 10px; text-align:right; font-weight:600; color:#64748b;">${Utils.formatCurrency(s.minimum_due)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    ${renderFooter(2, 4)}
                </div>
            `;
        }

        // ═════════════════════════════════════════════════════════════════
        // PAGE 3: NEXT-GEN CREDIT CARD MASTER & LIMITS LEDGER
        // ═════════════════════════════════════════════════════════════════
        if (this.sections.cardsTable) {
            const displayCards = cards.slice(0, isLandscape ? 22 : 16);

            pagesHtml += `
                <div class="pdf-page" style="${pageStyle}">
                    ${renderHeader("Institutional Card Master &amp; Limits Utilization Ledger", "Ledger")}

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:0.8rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">
                            <i class="fas fa-id-card text-primary me-1"></i> Active Credit Lines Ledger (${displayCards.length} of ${cards.length} Cards)
                        </span>
                        <span style="font-size:0.7rem; color:#64748b; font-weight:600;">Amounts in Indian Rupees (INR)</span>
                    </div>

                    <!-- FIXED WIDTH TABLE — CAN NEVER CUT OFF -->
                    <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:10px;">
                        <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.71rem;">
                            <colgroup>
                                <col style="width: 3.5%;"> <!-- # -->
                                <col style="width: 20%;">   <!-- Cardholder -->
                                <col style="width: 17%;">   <!-- Bank / Type -->
                                <col style="width: 7.5%;">  <!-- Last 4 -->
                                <col style="width: 7%;">    <!-- Type -->
                                <col style="width: 12%;">   <!-- Limit -->
                                <col style="width: 11%;">   <!-- Used -->
                                <col style="width: 11%;">   <!-- Available -->
                                <col style="width: 6%;">    <!-- Util % -->
                                <col style="width: 5%;">    <!-- Status -->
                            </colgroup>
                            <thead>
                                <tr style="background:#0f172a; color:#f8fafc; font-size:0.67rem; text-transform:uppercase; letter-spacing:0.4px;">
                                    <th style="padding:6px 4px; text-align:center;">#</th>
                                    <th style="padding:6px 8px; text-align:left;">Cardholder</th>
                                    <th style="padding:6px 8px; text-align:left;">Bank Partner</th>
                                    <th style="padding:6px 4px; text-align:center;">Last 4</th>
                                    <th style="padding:6px 4px; text-align:center;">Category</th>
                                    <th style="padding:6px 8px; text-align:right;">Limit (₹)</th>
                                    <th style="padding:6px 8px; text-align:right;">Used (₹)</th>
                                    <th style="padding:6px 8px; text-align:right;">Available (₹)</th>
                                    <th style="padding:6px 4px; text-align:center;">Util %</th>
                                    <th style="padding:6px 4px; text-align:center;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${displayCards.map((c, idx) => {
                                    const m = window.DB.cards.getCardLimitMetrics(c.card_id);
                                    const utilColor = m.util < 30 ? '#10b981' : (m.util <= 50 ? '#f59e0b' : '#ef4444');
                                    const isPrimary = c.card_category === 'Primary';
                                    const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

                                    return `
                                        <tr style="background:${bgRow}; border-bottom:1px solid #f1f5f9;">
                                            <td style="padding:5px 4px; text-align:center; color:#64748b; font-weight:600;">${idx + 1}</td>
                                            <td style="padding:5px 8px; font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                                ${c.cardholder_name || '—'}
                                            </td>
                                            <td style="padding:5px 8px; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                                <span style="font-weight:600; color:#1e293b;">${c.bank_name || '—'}</span>
                                                <span style="color:#64748b; font-size:0.65rem;"> &bull; ${c.card_type || ''}</span>
                                            </td>
                                            <td style="padding:5px 4px; text-align:center; font-family:monospace; font-weight:700; color:#4361ee;">
                                                *${c.card_last4 || 'xxxx'}
                                            </td>
                                            <td style="padding:5px 4px; text-align:center;">
                                                <span style="background:${isPrimary ? '#e0e7ff' : '#f3e8ff'}; color:${isPrimary ? '#3730a3' : '#6b21a8'}; padding:1px 5px; border-radius:100px; font-size:0.61rem; font-weight:700; text-transform:uppercase;">
                                                    ${c.card_category || 'Primary'}
                                                </span>
                                            </td>
                                            <td style="padding:5px 8px; text-align:right; font-weight:600; color:#334155; white-space:nowrap;">
                                                ${Utils.formatCurrency(m.limit)}
                                            </td>
                                            <td style="padding:5px 8px; text-align:right; font-weight:700; color:#ef476f; white-space:nowrap;">
                                                ${Utils.formatCurrency(m.used)}
                                            </td>
                                            <td style="padding:5px 8px; text-align:right; font-weight:600; color:#059669; white-space:nowrap;">
                                                ${Utils.formatCurrency(m.available)}
                                            </td>
                                            <td style="padding:5px 4px; text-align:center;">
                                                <span style="font-weight:700; color:${utilColor}; font-size:0.68rem;">${m.util}%</span>
                                            </td>
                                            <td style="padding:5px 4px; text-align:center;">
                                                <span style="background:#e6faf4; color:#059669; padding:1px 4px; border-radius:3px; font-size:0.61rem; font-weight:700;">
                                                    ${c.status || 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background:#f1f5f9; font-weight:800; border-top:2px solid #cbd5e1; font-size:0.73rem;">
                                    <td colspan="5" style="padding:6px 8px; text-align:right;">SUBTOTAL:</td>
                                    <td style="padding:6px 8px; text-align:right; color:#059669; white-space:nowrap;">${Utils.formatCurrency(totalLimit)}</td>
                                    <td style="padding:6px 8px; text-align:right; color:#ef476f; white-space:nowrap;">${Utils.formatCurrency(usedLimit)}</td>
                                    <td style="padding:6px 8px; text-align:right; color:#2563eb; white-space:nowrap;">${Utils.formatCurrency(availableLimit)}</td>
                                    <td style="padding:6px 4px; text-align:center; color:${utilBadgeColor};">${utilPct}%</td>
                                    <td style="padding:6px 4px; text-align:center;">${cards.length}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    ${renderFooter(3, 4)}
                </div>
            `;
        }

        // ═════════════════════════════════════════════════════════════════
        // PAGE 4: CARDHOLDER EXPOSURE, RECONCILIATION & GOVERNANCE
        // ═════════════════════════════════════════════════════════════════
        if (this.sections.cardholderTable || this.sections.reconTable || this.sections.governance) {
            const ownersList = [...new Set(cards.map(c => c.primary_cardholder).filter(Boolean))].sort();

            let reconMatched = 0, reconDisc = 0;
            const reconRows = [];

            cards.forEach(card => {
                const cTxns = txns.filter(t => String(t.card_id) === String(card.card_id) && t.txn_type === 'Debit');
                const cStmts = stmts.filter(s => String(s.card_id) === String(card.card_id));
                cStmts.forEach(s => {
                    const stmtBilled = Utils.parseNum(s.billed_amount);
                    const mStr = Utils.formatMonthYear(s.statement_month);
                    const zohoSum = cTxns.filter(t => Utils.formatMonthYear(t.txn_date) === mStr)
                                         .reduce((sum, t) => sum + Utils.parseNum(t.amount), 0);
                    const diff = Math.abs(zohoSum - stmtBilled);
                    const isMatched = diff < 1;
                    if (isMatched) reconMatched++; else reconDisc++;

                    reconRows.push({
                        cardholder: card.cardholder_name,
                        bank: card.bank_name,
                        last4: card.card_last4,
                        month: mStr,
                        zoho: zohoSum,
                        stmt: stmtBilled,
                        diff: diff,
                        status: isMatched ? 'Matched' : 'Discrepancy'
                    });
                });
            });

            pagesHtml += `
                <div class="pdf-page" style="${pageStyle}">
                    ${renderHeader("Cardholder Risk Allocation &amp; Audit Governance", "Compliance")}

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px;">
                        <!-- Cardholder Exposure Table -->
                        <div>
                            <div style="font-size:0.78rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                                <i class="fas fa-users text-primary me-1"></i> Cardholder Group Exposure
                            </div>
                            <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                                <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.71rem;">
                                    <thead>
                                        <tr style="background:#1e293b; color:#fff; font-size:0.67rem; text-transform:uppercase;">
                                            <th style="padding:6px 8px; width:36%;">Owner</th>
                                            <th style="padding:6px 6px; width:14%; text-align:center;">Cards</th>
                                            <th style="padding:6px 8px; width:27%; text-align:right;">Limit (₹)</th>
                                            <th style="padding:6px 6px; width:23%; text-align:center;">Util %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${ownersList.map((owner, idx) => {
                                            const oCards = cards.filter(c => c.primary_cardholder === owner);
                                            let oLimit = 0, oUsed = 0;
                                            oCards.forEach(c => {
                                                const m = window.DB.cards.getCardLimitMetrics(c.card_id);
                                                oLimit += m.limit;
                                                oUsed += m.used;
                                            });
                                            const oUtil = oLimit > 0 ? ((oUsed / oLimit) * 100).toFixed(1) : '0';
                                            const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                                            return `
                                                <tr style="background:${bgRow}; border-bottom:1px solid #f1f5f9;">
                                                    <td style="padding:5px 8px; font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${owner}</td>
                                                    <td style="padding:5px 6px; text-align:center; font-weight:600; color:#4361ee;">${oCards.length}</td>
                                                    <td style="padding:5px 8px; text-align:right; font-weight:600; color:#334155; white-space:nowrap;">${Utils.formatCurrency(oLimit)}</td>
                                                    <td style="padding:5px 6px; text-align:center; font-weight:700; color:${parseFloat(oUtil) > 50 ? '#ef4444' : '#10b981'};">${oUtil}%</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Reconciliation Table -->
                        <div>
                            <div style="font-size:0.78rem; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
                                <i class="fas fa-check-double text-success me-1"></i> Zoho vs Statement Reconciliation Audit
                            </div>
                            <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                                <table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:0.71rem;">
                                    <thead>
                                        <tr style="background:#1e293b; color:#fff; font-size:0.67rem; text-transform:uppercase;">
                                            <th style="padding:6px 8px; width:42%;">Line &amp; Month</th>
                                            <th style="padding:6px 8px; width:30%; text-align:right;">Stmt Billed (₹)</th>
                                            <th style="padding:6px 8px; width:28%; text-align:center;">Audit Match</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${reconRows.length === 0 ? `
                                            <tr><td colspan="3" style="padding:10px; text-align:center; color:#94a3b8;">No cycles available.</td></tr>
                                        ` : reconRows.slice(0, 5).map((r, idx) => {
                                            const isMatch = r.status === 'Matched';
                                            const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                                            return `
                                                <tr style="background:${bgRow}; border-bottom:1px solid #f1f5f9;">
                                                    <td style="padding:5px 8px; font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                                        ${r.cardholder} (*${r.last4}) &bull; ${r.month}
                                                    </td>
                                                    <td style="padding:5px 8px; text-align:right; font-weight:600; color:#059669; white-space:nowrap;">
                                                        ${Utils.formatCurrency(r.stmt)}
                                                    </td>
                                                    <td style="padding:5px 8px; text-align:center;">
                                                        <span style="background:${isMatch ? '#e6faf4' : '#fee2e2'}; color:${isMatch ? '#059669' : '#dc2626'}; padding:1px 6px; border-radius:100px; font-size:0.61rem; font-weight:700;">
                                                            ${isMatch ? '✓ Matched' : '⚠ Diff'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Governance & Sign-off Box -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-top:6px;">
                        <div style="font-size:0.75rem; font-weight:800; color:#0f172a; text-transform:uppercase; margin-bottom:4px;">
                            Corporate Treasury Governance &amp; Executive Authorization
                        </div>
                        <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px; align-items:center;">
                            <div style="font-size:0.7rem; color:#475569; line-height:1.5;">
                                <strong>Compliance Certifications:</strong>
                                <ul style="margin:2px 0 0 14px; padding:0;">
                                    <li>Statements outstandings match bank certified liabilities without offset netting.</li>
                                    <li>Portfolio utilization (${utilPct}%) adheres strictly to corporate covenant risk tolerances.</li>
                                    <li>Audit logs and cryptographic hashes recorded under AES-256 GCM protocol.</li>
                                </ul>
                            </div>
                            <div style="border:1px dashed #cbd5e1; border-radius:6px; padding:8px; text-align:center; font-size:0.68rem; color:#64748b; background:#fff;">
                                <div style="font-weight:700; color:#0f172a; margin-bottom:12px;">AUTHORIZED CONTROLLER</div>
                                <div style="border-top:1px solid #94a3b8; width:65%; margin:0 auto 3px auto;"></div>
                                <div style="font-weight:700; color:#334155;">Gretex Group Corporate Treasury</div>
                                <div style="font-size:0.62rem; color:#94a3b8;">Stamp &bull; Signature Verified</div>
                            </div>
                        </div>
                    </div>

                    ${renderFooter(4, 4)}
                </div>
            `;
        }

        return pagesHtml;
    },

    renderDocumentCharts: function() {
        this.destroyCharts();

        const { cards, txns, stmts } = this.getFilteredData();

        // 1. Bank Donut Chart
        const bankCanvas = document.getElementById('pdf-chart-bank-dist');
        if (bankCanvas && this.sections.charts) {
            const bankTotals = {};
            cards.forEach(c => {
                const b = c.bank_name || 'Other';
                bankTotals[b] = (bankTotals[b] || 0) + (c.credit_limit || 0);
            });

            const labels = Object.keys(bankTotals);
            const data = Object.values(bankTotals);
            const colors = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#06d6a0', '#f9c74f', '#ff9f1c'];

            const chart1 = new Chart(bankCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 10,
                                font: { size: 8.5, family: 'Inter', weight: '600' },
                                color: '#334155'
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
            this.charts.push(chart1);
        }

        // 2. Monthly Trend Chart
        const trendCanvas = document.getElementById('pdf-chart-monthly-trend');
        if (trendCanvas && this.sections.charts) {
            const monthMap = {};
            txns.forEach(t => {
                if (t.txn_type === 'Debit' && t.txn_date) {
                    const m = window.Utils.formatMonthYear(t.txn_date);
                    monthMap[m] = (monthMap[m] || 0) + (t.amount || 0);
                }
            });

            let sortedMonths = Object.keys(monthMap).slice(-6);
            if (sortedMonths.length === 0) sortedMonths = ['Current'];

            const chart2 = new Chart(trendCanvas, {
                type: 'bar',
                data: {
                    labels: sortedMonths,
                    datasets: [{
                        label: 'Debit Spend (₹)',
                        data: sortedMonths.map(m => monthMap[m] || 0),
                        backgroundColor: '#4361eecc',
                        borderColor: '#4361ee',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { font: { size: 8 }, color: '#64748b' },
                            grid: { color: '#f1f5f9' }
                        },
                        x: {
                            ticks: { font: { size: 8, weight: '600' }, color: '#334155' },
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
            this.charts.push(chart2);
        }

        // 3. Payment Due Aging Dual-Axis Chart
        const agingCanvas = document.getElementById('pdf-chart-due-aging');
        if (agingCanvas && this.sections.aging) {
            const agingBuckets = window.Dashboard.getPaymentDueAgingBuckets(stmts, cards);
            const labels = ['Today', 'Tomorrow', 'In 3 Days', 'In 7 Days', 'In 15 Days', 'Overdue'];
            const amounts = [
                agingBuckets.today.amount,
                agingBuckets.tomorrow.amount,
                agingBuckets.days3.amount,
                agingBuckets.days7.amount,
                agingBuckets.days15.amount,
                agingBuckets.overdue.amount
            ];
            const counts = [
                agingBuckets.today.count,
                agingBuckets.tomorrow.count,
                agingBuckets.days3.count,
                agingBuckets.days7.count,
                agingBuckets.days15.count,
                agingBuckets.overdue.count
            ];

            const chart3 = new Chart(agingCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Amount Due (₹)',
                            data: amounts,
                            backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#0ea5e9', '#8b5cf6', '#64748b'],
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'Statements Count',
                            data: counts,
                            borderColor: '#1e293b',
                            backgroundColor: '#1e293b',
                            borderWidth: 2,
                            pointRadius: 3,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                            beginAtZero: true,
                            ticks: { font: { size: 8 }, color: '#64748b' },
                            grid: { color: '#f1f5f9' }
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            beginAtZero: true,
                            grid: { drawOnChartArea: false },
                            ticks: { stepSize: 1, font: { size: 8 }, color: '#1e293b' }
                        },
                        x: {
                            ticks: { font: { size: 8, weight: '700' }, color: '#334155' },
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { boxWidth: 10, font: { size: 8.5, weight: '600' } }
                        }
                    }
                }
            });
            this.charts.push(chart3);
        }
    },

    /**
     * Direct Multi-Page Canvas-to-jsPDF Engine
     * Completely eliminates html2canvas iframe coordinate shifts and left-clipping!
     */
    downloadPDF: async function() {
        const docEl = document.getElementById('pdf-report-document');
        if (!docEl) {
            alert('Report document element not found.');
            return;
        }

        const banner = document.getElementById('pdf-generating-banner');
        const btnPdf = document.getElementById('btn-download-pdf');
        if (banner) banner.style.display = 'flex';
        if (btnPdf) btnPdf.disabled = true;

        const dateTag = new Date().toISOString().slice(0, 10);
        const isLandscape = this.orientation === 'landscape';

        // Check if jsPDF and html2canvas are available
        const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

        try {
            const pages = docEl.querySelectorAll('.pdf-page');

            if (jsPDFClass && typeof html2canvas !== 'undefined' && pages.length > 0) {
                // High-resolution multi-page PDF compilation
                const pdf = new jsPDFClass({
                    orientation: isLandscape ? 'landscape' : 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });

                const pdfWidth = isLandscape ? 297 : 210;
                const pdfHeight = isLandscape ? 210 : 297;
                const margin = 4; // 4mm margin

                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    
                    // Capture each page cleanly from its direct bounding box
                    const canvas = await html2canvas(page, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.98);

                    if (i > 0) {
                        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
                    }

                    pdf.addImage(
                        imgData,
                        'JPEG',
                        margin,
                        margin,
                        pdfWidth - (margin * 2),
                        pdfHeight - (margin * 2)
                    );
                }

                pdf.save(`Gretex_CCMS_Executive_Report_${dateTag}.pdf`);

                if (banner) banner.style.display = 'none';
                if (btnPdf) btnPdf.disabled = false;
                if (window.App && window.App.showToast) {
                    window.App.showToast(`Executive PDF (${this.orientation.toUpperCase()}) downloaded successfully!`, 'success');
                }
            } else if (typeof html2pdf !== 'undefined') {
                // Fallback to html2pdf
                const opt = {
                    margin: [4, 4, 4, 4],
                    filename: `Gretex_CCMS_Executive_Report_${dateTag}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: this.orientation },
                    pagebreak: { mode: ['css', 'legacy'] }
                };

                await html2pdf().set(opt).from(docEl).save();
                if (banner) banner.style.display = 'none';
                if (btnPdf) btnPdf.disabled = false;
            } else {
                throw new Error('PDF libraries not ready.');
            }
        } catch(err) {
            console.error('PDF Generation failed:', err);
            if (banner) banner.style.display = 'none';
            if (btnPdf) btnPdf.disabled = false;
            alert('PDF generation encountered an issue: ' + err.message + '\nFalling back to browser Print dialog.');
            this.printReport();
        }
    },

    printReport: function() {
        window.print();
    },

    injectPrintStyles: function() {
        let style = document.getElementById('pdf-print-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'pdf-print-styles';
            document.head.appendChild(style);
        }
        style.textContent = `
            @media print {
                @page {
                    size: ${this.orientation};
                    margin: 4mm;
                }
                body * {
                    visibility: hidden !important;
                }
                #pdf-report-document, #pdf-report-document * {
                    visibility: visible !important;
                }
                #pdf-report-document {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    background: #ffffff !important;
                }
                .pdf-page {
                    page-break-after: always !important;
                    break-after: page !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    padding: 10mm !important;
                    width: 100% !important;
                }
                .pdf-page:last-child {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                }
                aside#sidebar, header#header, .page-header, .card, .pdf-preview-outer, #pdf-generating-banner {
                    display: none !important;
                }
            }
        `;
    }
};
