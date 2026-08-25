// ─── AUTH ─────────────────────────────────────────────────────
window.Auth = {
    currentUser: null,

    async login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const btnText    = document.getElementById('login-btn-text');
        const btnLoading = document.getElementById('login-btn-loading');
        const errBox     = document.getElementById('login-error');
        const errMsg     = document.getElementById('login-error-msg');
        const btn        = document.getElementById('btn-login');

        // Show loading state
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
        btn.disabled = true;
        errBox.classList.add('hidden');

        try {
            const res = await DB.apiPost({ action: 'login', data: { username, password } });

            if (res.success && res.user) {
                this.currentUser = res.user;
                sessionStorage.setItem('ccms_user', JSON.stringify(res.user));
                await this._launchApp();
            } else {
                errMsg.textContent = res.error || 'Invalid username or password';
                errBox.classList.remove('hidden');
                document.getElementById('login-password').value = '';
                document.getElementById('login-password').focus();
            }
        } catch(err) {
            errMsg.textContent = 'Cannot connect to server. Check your internet connection.';
            errBox.classList.remove('hidden');
        } finally {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            btn.disabled = false;
        }
    },

    async _launchApp() {
        // Hide login, show app
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // Show user info in header
        const u = this.currentUser;
        const nameEl = document.getElementById('user-name-display');
        const roleEl = document.getElementById('user-role-display');
        if (nameEl) nameEl.textContent = u.full_name || u.username;
        if (roleEl) roleEl.textContent = u.role || '';

        // Hide admin-only elements if not Super Admin
        if (u.role !== 'Super Admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        }

        // Boot the main app
        await App.init();
    },

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.removeItem('ccms_user');
            this.currentUser = null;
            // Reset login form
            document.getElementById('login-form').reset();
            document.getElementById('login-error').classList.add('hidden');
            // Show login, hide app
            document.getElementById('app').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        }
    },

    togglePassword() {
        const input = document.getElementById('login-password');
        const icon  = document.getElementById('pwd-eye-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    },

    // Check if session exists (on page reload)
    checkSession() {
        const saved = sessionStorage.getItem('ccms_user');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
                return true;
            } catch(e) {}
        }
        return false;
    }
};

// ─── MAIN APP ─────────────────────────────────────────────────
window.App = {
    currentPage: 'dashboard',

    async init() {
        // Show loading screen while fetching from Google Sheets
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="loading-screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70vh;gap:16px;color:#6c757d;">
                    <div class="spinner"></div>
                    <p style="font-size:1rem;font-weight:500;">Connecting to Google Sheets...</p>
                    <p style="font-size:0.8rem;color:#adb5bd;">Loading your credit card data</p>
                </div>`;
        }

        // Update DB status badge
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            dbStatus.className = 'badge badge-info';
        }

        try {
            // Async load from Google Sheets
            await DB.init();

            // Success — update badge
            if (dbStatus) {
                dbStatus.innerHTML = '<i class="fas fa-cloud"></i> Google Sheets';
                dbStatus.className = 'badge badge-success';
            }

            // Set up UI after data is ready
            this._setupUI();

            // Update card count badge
            this.updateCardCount();

            // Navigate to dashboard
            this.navigate('dashboard');

        } catch(err) {
            console.error('Failed to load from Google Sheets:', err);
            if (dbStatus) {
                dbStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection Error';
                dbStatus.className = 'badge' ;
                dbStatus.style.background = '#ef476f';
                dbStatus.style.color = '#fff';
            }
            if (content) {
                content.innerHTML = `
                    <div style="text-align:center;padding:80px 20px;color:#6c757d;">
                        <i class="fas fa-cloud-slash" style="font-size:3rem;color:#dee2e6;margin-bottom:16px;display:block;"></i>
                        <h3 style="color:#1a1a2e;margin-bottom:8px;">Cannot connect to Google Sheets</h3>
                        <p style="margin-bottom:24px;">${err.message || 'Network error. Check your connection.'}</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-refresh"></i> Retry
                        </button>
                    </div>`;
            }
        }
    },

    _setupUI() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) this.navigate(page);
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-collapsed');
            });
        }

        // Export DB button
        const btnExport = document.getElementById('btn-export-db');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                DB.exportToExcel();
                this.showToast('Database exported successfully!', 'success');
            });
        }

        // Import DB button
        const btnImport = document.getElementById('btn-import-db');
        if (btnImport) {
            btnImport.addEventListener('click', () => {
                document.getElementById('db-file-input').click();
            });
        }

        // DB file input
        const dbFileInput = document.getElementById('db-file-input');
        if (dbFileInput) {
            dbFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                this.showToast('Importing data to Google Sheets...', 'info');
                try {
                    await DB.importFromExcel(file);
                    this.showToast('Data imported to Google Sheets!', 'success');
                    this.navigate(this.currentPage);
                } catch(err) {
                    this.showToast('Import failed: ' + err.message, 'error');
                }
                e.target.value = '';
            });
        }

        // Global search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    this.navigate('master');
                    setTimeout(() => {
                        if (window.Master && Master.search) Master.search(query);
                    }, 100);
                }
            }, 300));
        }

        // Modal close
        const modalClose = document.getElementById('modal-close');
        if (modalClose) modalClose.addEventListener('click', () => App.closeModal());

        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) App.closeModal();
            });
        }
    },

    navigate(page) {
        this.currentPage = page;

        // Update sidebar active
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update page title
        const titles = {
            dashboard:    'Dashboard',
            master:       'Credit Card Master',
            import:       'Zoho Import',
            transactions: 'Transactions',
            payments:     'Payments & Statements',
            reports:      'Reports',
            hygiene:      'Data Hygiene',
            users:        'User Management'
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = titles[page] || page;

        // Render page
        const content = document.getElementById('content');
        if (!content) return;

        switch(page) {
            case 'dashboard':    if (window.Dashboard    && Dashboard.render)    Dashboard.render(content);    break;
            case 'master':       if (window.Master        && Master.render)        Master.render(content);        break;
            case 'import':       if (window.Import        && Import.render)        Import.render(content);        break;
            case 'transactions': if (window.Transactions  && Transactions.render)  Transactions.render(content);  break;
            case 'payments':     if (window.Payments      && Payments.render)      Payments.render(content);      break;
            case 'reports':      if (window.Reports       && Reports.render)       Reports.render(content);       break;
            case 'hygiene':      if (window.Reports       && Reports.renderHygiene) Reports.renderHygiene(content); break;
            case 'users':        if (window.Users         && Users.render)         Users.render(content);         break;
            default:
                content.innerHTML = '<div class="empty-state"><i class="fas fa-question-circle"></i><h3>Page not found</h3></div>';
        }

        this.updateCardCount();
        document.body.classList.remove('sidebar-open');
    },

    updateCardCount() {
        const count   = DB.data.credit_cards.length;
        const countEl = document.getElementById('total-card-count');
        if (countEl) countEl.textContent = count;
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        toast.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    },

    showModal(title, bodyHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-body').innerHTML = '';
    },

    showConfirm(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent   = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-overlay').classList.remove('hidden');
        const okBtn     = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');
        const close = () => {
            document.getElementById('confirm-overlay').classList.add('hidden');
            okBtn.replaceWith(okBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        };
        document.getElementById('confirm-ok').addEventListener('click', () => { close(); onConfirm(); }, { once: true });
        document.getElementById('confirm-cancel').addEventListener('click', close, { once: true });
    },

    closeConfirm() {
        document.getElementById('confirm-overlay').classList.add('hidden');
    }
};

// Boot: show login screen, or auto-resume session
document.addEventListener('DOMContentLoaded', () => {
    if (Auth.checkSession()) {
        // Session found — skip login, launch app directly
        Auth._launchApp();
    }
    // else: login screen is already visible from HTML, waiting for user input
});
