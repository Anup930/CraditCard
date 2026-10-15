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
                
                // Initialize AES-GCM 256-bit encryption key bound to user session
                if (window.CryptoStore) {
                    await CryptoStore.init(res.user);
                }
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
            // 1. 100% Data Purge Standard: Wipe all AES-GCM keys and encrypted caches
            if (window.CryptoStore) {
                CryptoStore.wipeAll();
            }
            // 2. Clear in-memory datastore
            if (window.DB) {
                DB.clear();
            }
            // 3. Clear session
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

    toggleFieldPassword(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon  = document.getElementById(iconId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            if (icon) icon.className = 'fas fa-eye';
        }
    },

    showChangePasswordModal() {
        const u = this.currentUser || JSON.parse(sessionStorage.getItem('ccms_user') || '{}');
        if (!u || !u.username) {
            if (window.App) window.App.showToast('Please log in first', 'warning');
            return;
        }

        const modalHtml = `
            <form id="change-pwd-form" onsubmit="event.preventDefault(); Auth.submitChangePassword()">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px;">
                    <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #4361ee, #3a0ca3); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; flex-shrink: 0;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div style="flex: 1; overflow: hidden;">
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.full_name || u.username}</div>
                        <div style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 8px; margin-top: 3px;">
                            <span>@${u.username}</span>
                            <span style="display:inline-block; width:4px; height:4px; background:#94a3b8; border-radius:50%;"></span>
                            <span class="badge" style="background:#e0e7ff; color:#4338ca; font-size:0.7rem; padding:2px 8px; border-radius: 4px;">${u.role || 'User'}</span>
                        </div>
                    </div>
                </div>

                <div id="cp_error" class="hidden" style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-size: 0.84rem; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 1rem; flex-shrink: 0;"></i>
                    <span id="cp_error_msg">Error text</span>
                </div>

                <div class="form-group mb-3">
                    <label class="form-label" style="font-weight:600;">Current Password <span style="color:#ef4444;">*</span></label>
                    <div style="position: relative;">
                        <input type="password" class="form-control" id="cp_current_password" required placeholder="Enter your current password" style="padding-right: 40px;" autocomplete="current-password">
                        <button type="button" onclick="Auth.toggleFieldPassword('cp_current_password', 'cp_eye_curr')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;" title="Show/Hide Password">
                            <i class="fas fa-eye" id="cp_eye_curr"></i>
                        </button>
                    </div>
                </div>

                <div class="form-group mb-3">
                    <label class="form-label" style="font-weight:600;">New Password <span style="color:#ef4444;">*</span></label>
                    <div style="position: relative;">
                        <input type="password" class="form-control" id="cp_new_password" required minlength="6" placeholder="Enter new password (min. 6 characters)" style="padding-right: 40px;" autocomplete="new-password">
                        <button type="button" onclick="Auth.toggleFieldPassword('cp_new_password', 'cp_eye_new')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;" title="Show/Hide Password">
                            <i class="fas fa-eye" id="cp_eye_new"></i>
                        </button>
                    </div>
                    <small class="form-text" style="color: #64748b; font-size: 0.75rem;">Password must be at least 6 characters long.</small>
                </div>

                <div class="form-group mb-4">
                    <label class="form-label" style="font-weight:600;">Confirm New Password <span style="color:#ef4444;">*</span></label>
                    <div style="position: relative;">
                        <input type="password" class="form-control" id="cp_confirm_password" required minlength="6" placeholder="Re-type new password" style="padding-right: 40px;" autocomplete="new-password">
                        <button type="button" onclick="Auth.toggleFieldPassword('cp_confirm_password', 'cp_eye_conf')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;" title="Show/Hide Password">
                            <i class="fas fa-eye" id="cp_eye_conf"></i>
                        </button>
                    </div>
                </div>

                <div class="modal-actions" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button type="submit" id="cp_submit_btn" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:8px;">
                        <i class="fas fa-key"></i> <span id="cp_btn_text">Update Password</span>
                    </button>
                </div>
            </form>
        `;

        if (window.App && typeof window.App.showModal === 'function') {
            window.App.showModal('Change Account Password', modalHtml);
            setTimeout(() => {
                const el = document.getElementById('cp_current_password');
                if (el) el.focus();
            }, 100);
        }
    },

    async submitChangePassword() {
        const errBox = document.getElementById('cp_error');
        const errMsg = document.getElementById('cp_error_msg');
        const btn = document.getElementById('cp_submit_btn');
        const btnText = document.getElementById('cp_btn_text');

        const showError = (msg) => {
            if (errMsg) errMsg.textContent = msg;
            if (errBox) errBox.classList.remove('hidden');
        };

        if (errBox) errBox.classList.add('hidden');

        const currentPwd = (document.getElementById('cp_current_password')?.value || '').trim();
        const newPwd = (document.getElementById('cp_new_password')?.value || '').trim();
        const confirmPwd = (document.getElementById('cp_confirm_password')?.value || '').trim();

        if (!currentPwd) {
            showError('Please enter your current password.');
            return;
        }
        if (!newPwd) {
            showError('Please enter your new password.');
            return;
        }
        if (newPwd.length < 6) {
            showError('New password must be at least 6 characters long.');
            return;
        }
        if (newPwd !== confirmPwd) {
            showError('New password and Confirm password do not match.');
            return;
        }
        if (newPwd === currentPwd) {
            showError('New password cannot be identical to your current password.');
            return;
        }

        const u = this.currentUser || JSON.parse(sessionStorage.getItem('ccms_user') || '{}');
        if (!u || !u.username) {
            showError('Session expired. Please re-login to change password.');
            return;
        }

        // Set loading state
        if (btn) btn.disabled = true;
        if (btnText) btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            // 1. Verify current password
            let isVerified = false;

            const userRecord = (window.DB?.data?.users || []).find(x => 
                (x.user_id && String(x.user_id) === String(u.user_id)) || 
                (x.username && String(x.username).toLowerCase() === String(u.username || '').toLowerCase())
            );

            if (userRecord && userRecord.password_hash) {
                const currentHash = Utils.md5(currentPwd);
                if (currentHash.toLowerCase() === String(userRecord.password_hash).toLowerCase()) {
                    isVerified = true;
                }
            }

            // Fallback: Verify via backend login check if local hash is missing or not matching
            if (!isVerified) {
                try {
                    const checkRes = await window.DB.apiPost({
                        action: 'login',
                        data: { username: u.username, password: currentPwd }
                    });
                    if (checkRes && checkRes.success) {
                        isVerified = true;
                    }
                } catch(e) {
                    console.warn('[Auth] Remote verification check failed:', e);
                }
            }

            if (!isVerified) {
                showError('Current password is incorrect. Please check and try again.');
                if (btn) btn.disabled = false;
                if (btnText) btnText.innerHTML = '<i class="fas fa-key"></i> Update Password';
                return;
            }

            // 2. Hash new password
            const newHash = Utils.md5(newPwd);
            const targetUserId = (userRecord && userRecord.user_id) || u.user_id;

            // 3. Update database & Google Sheets
            if (window.DB && window.DB.users && typeof window.DB.users.update === 'function') {
                await window.DB.users.update(targetUserId, {
                    password_hash: newHash
                });
            } else {
                await window.DB.apiPost({
                    action: 'update',
                    sheet: 'users',
                    id: targetUserId,
                    data: { password_hash: newHash, updated_at: Utils.now() }
                });
            }

            // 4. Update in-memory session
            this.currentUser.password_hash = newHash;
            sessionStorage.setItem('ccms_user', JSON.stringify(this.currentUser));

            // 5. Activity log
            if (window.DB && typeof window.DB.logActivity === 'function') {
                window.DB.logActivity('Security', 'Password Change', `User ${u.username} successfully updated their password`);
            }

            // 6. Close modal and show success toast
            if (window.App) {
                window.App.closeModal();
                window.App.showToast('Password changed successfully!', 'success');
            }

        } catch (err) {
            console.error('Password change error:', err);
            showError('Failed to change password: ' + (err.message || 'Server error'));
            if (btn) btn.disabled = false;
            if (btnText) btnText.innerHTML = '<i class="fas fa-key"></i> Update Password';
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
        // Show loading screen while initializing
        const content = document.getElementById('content');
        if (content && (!window.DB || !window.DB._isLoaded)) {
            content.innerHTML = `
                <div class="loading-screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70vh;gap:16px;color:#6c757d;">
                    <div class="spinner"></div>
                    <p style="font-size:1rem;font-weight:500;">Securing session & loading data...</p>
                    <p style="font-size:0.8rem;color:#adb5bd;">Hardware-Accelerated AES-GCM 256-bit Engine</p>
                </div>`;
        }

        // Subscribe to DB real-time sync & mutation events
        if (window.DB && !this._dbSubscribed) {
            this._dbSubscribed = true;
            DB.subscribe((event, payload) => {
                const syncIcon = document.getElementById('sync-icon');
                const syncText = document.getElementById('sync-text');
                if (event === 'sync_start') {
                    if (syncIcon) syncIcon.classList.add('fa-spin');
                    if (syncText) syncText.textContent = 'Syncing...';
                } else if (event === 'sync_success') {
                    if (syncIcon) syncIcon.classList.remove('fa-spin');
                    if (syncText) syncText.textContent = 'Synced';
                    this.updateCardCount();
                } else if (event === 'sync_error') {
                    if (syncIcon) syncIcon.classList.remove('fa-spin');
                    if (syncText) syncText.textContent = 'Sync Failed';
                } else if (event === 'card_added' || event === 'card_updated' || event === 'card_deleted') {
                    this.updateCardCount();
                }
            });
        }

        // Update DB status badge
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.innerHTML = '<i class="fas fa-shield-alt"></i> AES-256';
            dbStatus.className = 'badge badge-success';
        }

        try {
            // 0ms Instant boot from encrypted cache + background sync
            await DB.init();

            // Set up UI after data is ready
            this._setupUI();

            // Update card count badge
            this.updateCardCount();

            // Navigate to dashboard
            this.navigate('dashboard');

        } catch(err) {
            console.error('Failed to initialize database:', err);
            if (dbStatus) {
                dbStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Sync Error';
                dbStatus.className = 'badge';
                dbStatus.style.background = '#ef476f';
                dbStatus.style.color = '#fff';
            }
            if (content) {
                content.innerHTML = `
                    <div style="text-align:center;padding:80px 20px;color:#6c757d;">
                        <i class="fas fa-cloud-slash" style="font-size:3rem;color:#dee2e6;margin-bottom:16px;display:block;"></i>
                        <h3 style="color:#1a1a2e;margin-bottom:8px;">Cannot connect to backend</h3>
                        <p style="margin-bottom:24px;">${err.message || 'Network error. Check your connection.'}</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-sync-alt"></i> Retry
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

        // Topbar Cloud Sync button
        const btnSync = document.getElementById('btn-cloud-sync');
        if (btnSync) {
            btnSync.addEventListener('click', async () => {
                this.showToast('Syncing with Google Sheets in background...', 'info');
                try {
                    await DB.syncFromCloud(true);
                    this.showToast('Cloud sync complete & encrypted!', 'success');
                    if (['dashboard', 'master', 'transactions', 'payments', 'reports'].includes(this.currentPage)) {
                        this.navigate(this.currentPage);
                    }
                } catch(err) {
                    this.showToast('Sync failed: ' + err.message, 'error');
                }
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
            downlodedash: 'Downlode Dashboard',
            users:        'User Management',
            logs:         'Activity Logs'
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
            case 'downlodedash': if (window.DownlodeDash  && DownlodeDash.render)  DownlodeDash.render(content);  break;
            case 'users':        if (window.Users         && Users.render)         Users.render(content);         break;
            case 'logs':         if (window.Logs          && Logs.render)          Logs.render(content);          break;
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
    },

    // ── SYSTEM UPDATES & QUERIES RESOLUTION OVERLAY ───────────
    _updateTimer: null,
    _updateCountdownInterval: null,

    showUpdateModal() {
        const overlay = document.getElementById('update-modal-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');

        // Reset iframe src if needed
        const frame = document.getElementById('update-frame');
        if (frame && !frame.src.includes('update.html')) {
            frame.src = 'update.html';
        }

        // Auto close by default in 15 minutes (15 * 60 * 1000 = 900,000 ms)
        if (this._updateTimer) clearTimeout(this._updateTimer);
        this._updateTimer = setTimeout(() => {
            this.closeUpdateModal();
        }, 15 * 60 * 1000);

        // Update badge countdown in top overlay bar
        let remainingSeconds = 15 * 60;
        if (this._updateCountdownInterval) clearInterval(this._updateCountdownInterval);
        const timerBadge = document.getElementById('overlay-timer-badge');
        if (timerBadge) timerBadge.textContent = '15:00';

        this._updateCountdownInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(this._updateCountdownInterval);
                this._updateCountdownInterval = null;
                this.closeUpdateModal();
                return;
            }
            if (timerBadge) {
                const mins = Math.floor(remainingSeconds / 60);
                const secs = remainingSeconds % 60;
                timerBadge.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
        }, 1000);
    },

    closeUpdateModal() {
        const overlay = document.getElementById('update-modal-overlay');
        if (overlay) overlay.classList.add('hidden');

        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
            this._updateTimer = null;
        }
        if (this._updateCountdownInterval) {
            clearInterval(this._updateCountdownInterval);
            this._updateCountdownInterval = null;
        }
    }
};

// Global keydown handler for Escape to close update modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (window.App && typeof window.App.closeUpdateModal === 'function') {
            window.App.closeUpdateModal();
        }
    }
});

// Boot: show login screen, or auto-resume session
document.addEventListener('DOMContentLoaded', async () => {
    // System update overlay auto-popup disabled by default per user request.
    // Available on-demand via top navbar "Updates" button.

    if (Auth.checkSession()) {
        // Initialize AES-GCM encryption key for resumed session
        if (window.CryptoStore) {
            await CryptoStore.init(Auth.currentUser);
        }
        // Session found — launch app directly
        await Auth._launchApp();
    }
    // else: login screen is already visible from HTML, waiting for user input
});
