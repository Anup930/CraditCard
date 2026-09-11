window.Logs = {
    state: {
        page: 1,
        pageSize: 15,
        filters: {
            dateFrom: '',
            dateTo: '',
            user: '',
            module: ''
        }
    },

    render: function(container) {
        this.container = container;

        const allLogs = window.DB.data.audit_logs || [];
        const users = [...new Set(allLogs.map(l => l.username).filter(Boolean))].sort();
        const modules = [...new Set(allLogs.map(l => l.module).filter(Boolean))].sort();

        let html = `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">

            <!-- Header -->
            <div style="padding:20px 24px;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-history" style="color:#fff;font-size:16px;"></i>
                    </div>
                    <div>
                        <h4 style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e;">Activity Logs</h4>
                        <span style="font-size:12px;color:#6c757d;">Track all user actions across the system</span>
                    </div>
                </div>
                <span style="background:#f0f0f5;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;color:#6c757d;" id="log-total-badge">${allLogs.length} total entries</span>
            </div>

            <!-- Filters Row -->
            <div style="padding:16px 24px;background:#f8f9fa;border-bottom:1px solid #e9ecef;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
                <div style="flex:1;min-width:150px;">
                    <label style="display:block;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">From Date</label>
                    <input type="date" id="log-filter-from" value="${this.state.filters.dateFrom}"
                        onchange="Logs.updateFilter('dateFrom', this.value)"
                        style="width:100%;padding:7px 10px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;background:#fff;color:#495057;outline:none;">
                </div>
                <div style="flex:1;min-width:150px;">
                    <label style="display:block;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">To Date</label>
                    <input type="date" id="log-filter-to" value="${this.state.filters.dateTo}"
                        onchange="Logs.updateFilter('dateTo', this.value)"
                        style="width:100%;padding:7px 10px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;background:#fff;color:#495057;outline:none;">
                </div>
                <div style="flex:1;min-width:150px;">
                    <label style="display:block;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">User</label>
                    <select id="log-filter-user" onchange="Logs.updateFilter('user', this.value)"
                        style="width:100%;padding:7px 10px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;background:#fff;color:#495057;outline:none;cursor:pointer;">
                        <option value="">All Users</option>
                        ${users.map(u => '<option value="' + u + '"' + (this.state.filters.user === u ? ' selected' : '') + '>' + u + '</option>').join('')}
                    </select>
                </div>
                <div style="flex:1;min-width:150px;">
                    <label style="display:block;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Module</label>
                    <select id="log-filter-module" onchange="Logs.updateFilter('module', this.value)"
                        style="width:100%;padding:7px 10px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;background:#fff;color:#495057;outline:none;cursor:pointer;">
                        <option value="">All Modules</option>
                        ${modules.map(m => '<option value="' + m + '"' + (this.state.filters.module === m ? ' selected' : '') + '>' + m + '</option>').join('')}
                    </select>
                </div>
                <div>
                    <button onclick="Logs.clearFilters()" style="padding:7px 16px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;background:#fff;color:#6c757d;cursor:pointer;white-space:nowrap;">
                        <i class="fas fa-times" style="margin-right:4px;"></i> Clear
                    </button>
                </div>
            </div>

            <!-- Table -->
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th style="padding:12px 16px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;white-space:nowrap;">
                                <i class="fas fa-calendar-alt" style="margin-right:4px;opacity:0.5;"></i> Date & Time</th>
                            <th style="padding:12px 16px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">
                                <i class="fas fa-user" style="margin-right:4px;opacity:0.5;"></i> User</th>
                            <th style="padding:12px 16px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">
                                <i class="fas fa-cube" style="margin-right:4px;opacity:0.5;"></i> Module</th>
                            <th style="padding:12px 16px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">
                                <i class="fas fa-bolt" style="margin-right:4px;opacity:0.5;"></i> Action</th>
                            <th style="padding:12px 16px;font-size:11px;font-weight:700;color:#6c757d;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:2px solid #e9ecef;">
                                <i class="fas fa-info-circle" style="margin-right:4px;opacity:0.5;"></i> Details</th>
                        </tr>
                    </thead>
                    <tbody id="logs-tbody"></tbody>
                </table>
            </div>

            <!-- Footer -->
            <div id="logs-footer" style="padding:14px 24px;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;background:#fff;"></div>
        </div>`;

        container.innerHTML = html;
        this.renderData();
    },

    clearFilters: function() {
        this.state.filters = { dateFrom: '', dateTo: '', user: '', module: '' };
        this.state.page = 1;
        this.render(this.container);
    },

    updateFilter: function(key, value) {
        this.state.filters[key] = value;
        this.state.page = 1;
        this.renderData();
    },

    changePageSize: function(size) {
        this.state.pageSize = parseInt(size);
        this.state.page = 1;
        this.renderData();
    },

    changePage: function(p) {
        this.state.page = p;
        this.renderData();
    },

    formatDate: function(ts) {
        var d = new Date(ts);
        if (isNaN(d)) return ts;
        var day   = d.getDate();
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var mon   = months[d.getMonth()];
        var year  = d.getFullYear();
        var hh    = d.getHours();
        var mm    = String(d.getMinutes()).padStart(2, '0');
        var ampm  = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        return day + ' ' + mon + ' ' + year + ', ' + hh + ':' + mm + ' ' + ampm;
    },

    getActionStyle: function(action) {
        var a = (action || '').toLowerCase();
        if (a.includes('add') || a.includes('import')) return 'background:#d1fae5;color:#065f46;';
        if (a.includes('update'))                       return 'background:#dbeafe;color:#1e40af;';
        if (a.includes('delete'))                       return 'background:#fee2e2;color:#991b1b;';
        return 'background:#f3f4f6;color:#374151;';
    },

    getModuleIcon: function(module) {
        var m = (module || '').toLowerCase();
        if (m.includes('credit'))      return 'fa-credit-card';
        if (m.includes('transaction')) return 'fa-exchange-alt';
        if (m.includes('statement'))   return 'fa-file-invoice';
        if (m.includes('payment'))     return 'fa-money-bill-wave';
        if (m.includes('user'))        return 'fa-users';
        if (m.includes('categor'))     return 'fa-tags';
        if (m.includes('import'))      return 'fa-file-import';
        return 'fa-cube';
    },

    renderData: function() {
        var logs = window.DB.data.audit_logs || [];

        // Filter
        if (this.state.filters.dateFrom) {
            var from = this.state.filters.dateFrom;
            logs = logs.filter(function(l) { return (l.timestamp || '').substring(0,10) >= from; });
        }
        if (this.state.filters.dateTo) {
            var to = this.state.filters.dateTo;
            logs = logs.filter(function(l) { return (l.timestamp || '').substring(0,10) <= to; });
        }
        if (this.state.filters.user) {
            var u = this.state.filters.user;
            logs = logs.filter(function(l) { return l.username === u; });
        }
        if (this.state.filters.module) {
            var mod = this.state.filters.module;
            logs = logs.filter(function(l) { return l.module === mod; });
        }

        // Sort oldest to newest
        logs = logs.slice().sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });

        // Paginate
        var total = logs.length;
        var totalPages = Math.ceil(total / this.state.pageSize) || 1;
        if (this.state.page > totalPages) this.state.page = totalPages;
        if (this.state.page < 1) this.state.page = 1;
        var start = (this.state.page - 1) * this.state.pageSize;
        var paged = logs.slice(start, start + this.state.pageSize);

        // Update badge
        var badge = document.getElementById('log-total-badge');
        if (badge) badge.textContent = total + ' entries' + (total !== (window.DB.data.audit_logs || []).length ? ' (filtered)' : '');

        // Render rows
        var tbody = document.getElementById('logs-tbody');
        var self = this;

        if (paged.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:60px 20px;color:#adb5bd;">' +
                '<i class="fas fa-inbox" style="font-size:40px;display:block;margin-bottom:12px;color:#dee2e6;"></i>' +
                '<div style="font-size:15px;font-weight:600;color:#6c757d;margin-bottom:4px;">No logs found</div>' +
                '<div style="font-size:13px;">Try adjusting your filters or perform some actions to generate logs.</div>' +
                '</td></tr>';
        } else {
            var rowsHtml = '';
            paged.forEach(function(log, idx) {
                var bgColor = idx % 2 === 0 ? '#fff' : '#fafbfc';
                var actionStyle = self.getActionStyle(log.action);
                var modIcon = self.getModuleIcon(log.module);
                var dateStr = self.formatDate(log.timestamp);

                rowsHtml += '<tr style="background:' + bgColor + ';" onmouseover="this.style.background=\'#f0f4ff\'" onmouseout="this.style.background=\'' + bgColor + '\'">' +
                    '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;white-space:nowrap;font-size:13px;color:#495057;">' +
                        '<i class="far fa-clock" style="margin-right:6px;color:#adb5bd;"></i>' + dateStr +
                    '</td>' +
                    '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;">' +
                        '<span style="display:inline-flex;align-items:center;gap:6px;">' +
                            '<span style="width:28px;height:28px;border-radius:50%;background:#e9ecef;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#495057;">' +
                                (log.username ? log.username.charAt(0).toUpperCase() : '?') +
                            '</span>' +
                            '<span style="font-weight:600;color:#1a1a2e;">' + (log.username || '-') + '</span>' +
                        '</span>' +
                    '</td>' +
                    '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;">' +
                        '<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;background:#f0f0f5;color:#495057;font-size:12px;font-weight:600;">' +
                            '<i class="fas ' + modIcon + '" style="font-size:10px;opacity:0.6;"></i> ' + (log.module || '-') +
                        '</span>' +
                    '</td>' +
                    '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;">' +
                        '<span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;' + actionStyle + '">' + (log.action || '-') + '</span>' +
                    '</td>' +
                    '<td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#495057;max-width:350px;overflow:hidden;text-overflow:ellipsis;">' + (log.details || '-') + '</td>' +
                '</tr>';
            });
            tbody.innerHTML = rowsHtml;
        }

        // Footer
        var footer = document.getElementById('logs-footer');
        var pgHtml = '';

        if (totalPages > 1) {
            pgHtml += '<div style="display:flex;gap:4px;align-items:center;">';
            pgHtml += '<button onclick="Logs.changePage(' + (this.state.page - 1) + ')" ' + (this.state.page === 1 ? 'disabled' : '') +
                ' style="padding:5px 10px;border:1px solid #dee2e6;border-radius:6px;background:#fff;color:#495057;cursor:pointer;font-size:12px;">&laquo; Prev</button>';

            for (var i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.state.page - 1 && i <= this.state.page + 1)) {
                    var isActive = this.state.page === i;
                    pgHtml += '<button onclick="Logs.changePage(' + i + ')" style="padding:5px 10px;border:' + (isActive ? 'none' : '1px solid #dee2e6') + ';border-radius:6px;' +
                        (isActive ? 'background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;' : 'background:#fff;color:#495057;') +
                        'cursor:pointer;font-size:12px;font-weight:' + (isActive ? '700' : '400') + ';">' + i + '</button>';
                } else if (i === this.state.page - 2 || i === this.state.page + 2) {
                    pgHtml += '<span style="padding:5px 6px;font-size:12px;color:#adb5bd;">...</span>';
                }
            }

            pgHtml += '<button onclick="Logs.changePage(' + (this.state.page + 1) + ')" ' + (this.state.page === totalPages ? 'disabled' : '') +
                ' style="padding:5px 10px;border:1px solid #dee2e6;border-radius:6px;background:#fff;color:#495057;cursor:pointer;font-size:12px;">Next &raquo;</button>';
            pgHtml += '</div>';
        }

        footer.innerHTML =
            '<div style="display:flex;align-items:center;gap:10px;">' +
                '<select onchange="Logs.changePageSize(this.value)" style="padding:5px 8px;border:1px solid #dee2e6;border-radius:6px;font-size:12px;background:#fff;color:#495057;cursor:pointer;">' +
                    '<option value="15"'  + (this.state.pageSize === 15  ? ' selected' : '') + '>15 rows</option>' +
                    '<option value="30"'  + (this.state.pageSize === 30  ? ' selected' : '') + '>30 rows</option>' +
                    '<option value="50"'  + (this.state.pageSize === 50  ? ' selected' : '') + '>50 rows</option>' +
                    '<option value="100"' + (this.state.pageSize === 100 ? ' selected' : '') + '>100 rows</option>' +
                    '<option value="500"' + (this.state.pageSize === 500 ? ' selected' : '') + '>500 rows</option>' +
                '</select>' +
                '<span style="font-size:12px;color:#6c757d;">Showing <strong>' + (total > 0 ? start + 1 : 0) + '</strong> to <strong>' + Math.min(start + this.state.pageSize, total) + '</strong> of <strong>' + total + '</strong></span>' +
            '</div>' +
            pgHtml;
    }
};
