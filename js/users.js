// ============================================================
//  Users Module — Manage system users (Admin Only)
// ============================================================

window.Users = {
    render: function(container) {
        // Security Check: Only allow Super Admin
        const currentUser = Auth.currentUser;
        if (!currentUser || currentUser.role !== 'Super Admin') {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock" style="color: #ef476f; font-size: 3rem; margin-bottom: 16px;"></i>
                    <h3 style="color: #ef476f;">Access Denied</h3>
                    <p>Only Super Admins can access User Management.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="page-header d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="page-title">User Management</h2>
                    <div class="page-subtitle text-muted">Add, edit, deactivate, and manage system users</div>
                </div>
                <button class="btn btn-primary" onclick="window.Users.showForm()">
                    <i class="fas fa-user-plus"></i> Add User
                </button>
            </div>

            <div class="data-table-wrapper card p-0">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="users-tbody">
                        <!-- Users loaded here -->
                    </tbody>
                </table>
            </div>
        `;

        this.renderTable();
    },

    renderTable: function() {
        const tbody = document.getElementById('users-tbody');
        if(!tbody) return;

        const users = window.DB.users.getAll();

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 empty-state">No users found.</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(u => {
            const roleBadgeClass = u.role === 'Super Admin' ? 'bg-primary' : (u.role === 'Manager' ? 'bg-info' : 'bg-secondary');
            const statusBadgeClass = u.status === 'Active' ? 'bg-success' : 'bg-danger';

            return `
            <tr>
                <td><strong>${Utils.escapeHtml(u.full_name)}</strong></td>
                <td><span style="font-family: monospace; color: #4361ee; background: #eef0ff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${Utils.escapeHtml(u.username)}</span></td>
                <td>${Utils.escapeHtml(u.email || '-')}</td>
                <td>
                    <span class="status badge ${roleBadgeClass}">
                        ${u.role}
                    </span>
                </td>
                <td>
                    <span class="status badge ${statusBadgeClass}">
                        ${u.status || 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="actions">
                        <button class="btn-icon text-primary" title="Edit User" onclick="window.Users.showForm('${u.user_id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon text-warning" title="Reset Password" onclick="window.Users.showResetPassword('${u.user_id}')">
                            <i class="fas fa-key"></i>
                        </button>
                        ${u.user_id !== window.Auth.currentUser.user_id ? `
                            <button class="btn-icon ${u.status === 'Active' ? 'text-danger' : 'text-success'}" title="${u.status === 'Active' ? 'Deactivate' : 'Activate'}" onclick="window.Users.toggleStatus('${u.user_id}', '${u.status}')">
                                <i class="fas fa-${u.status === 'Active' ? 'ban' : 'check-circle'}"></i>
                            </button>
                            <button class="btn-icon text-danger" title="Delete User" onclick="window.Users.deleteUser('${u.user_id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <span class="text-muted" style="font-size: 0.75rem; display: flex; align-items: center; padding: 0 8px;">(You)</span>
                        `}
                    </div>
                </td>
            </tr>
        `}).join('');
    },

    showForm: function(userId = null) {
        const u = userId ? window.DB.data.users.find(x => String(x.user_id) === String(userId)) : {};
        const isEdit = !!userId;

        const html = `
            <form onsubmit="event.preventDefault(); window.Users.saveUser('${userId || ''}')">
                <div class="row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-control" id="fu_name" value="${u.full_name || ''}" required>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" id="fu_email" value="${u.email || ''}" required>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-control" id="fu_username" value="${u.username || ''}" required ${isEdit ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Role</label>
                        <select class="form-select" id="fu_role" required>
                            <option value="User" ${u.role === 'User' ? 'selected' : ''}>User (View Only)</option>
                            <option value="Manager" ${u.role === 'Manager' ? 'selected' : ''}>Manager (Add/Edit Cards)</option>
                            <option value="Super Admin" ${u.role === 'Super Admin' ? 'selected' : ''}>Super Admin (Full Access)</option>
                        </select>
                    </div>
                </div>
                ${!isEdit ? `
                <div class="row mb-3">
                    <div class="col-md-6 form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-control" id="fu_password" required minlength="6">
                    </div>
                    <div class="col-md-6 form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" id="fu_status">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                ` : ''}
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Update User' : 'Create User'}</button>
                </div>
            </form>
        `;
        window.App.showModal(isEdit ? "Edit User" : "Add New User", html);
    },

    saveUser: async function(userId) {
        // Retrieve values BEFORE closing the modal (closing destroys the elements)
        const fullName = document.getElementById('fu_name').value.trim();
        const email    = document.getElementById('fu_email').value.trim();
        const role     = document.getElementById('fu_role').value;
        
        let username = '', status = '', rawPwd = '';
        if (!userId) {
            username = document.getElementById('fu_username').value.trim();
            status   = document.getElementById('fu_status').value;
            rawPwd   = document.getElementById('fu_password').value;
        }

        if(window.App) window.App.closeModal();
        if(window.App) window.App.showToast('Saving user...', 'info');

        if(userId) {
            // UPDATE
            await window.DB.users.update(userId, {
                full_name: fullName,
                email:     email,
                role:      role
            });
            if(window.App) window.App.showToast('User updated successfully', 'success');
        } else {
            // CREATE
            await window.DB.users.add({
                full_name: fullName,
                email:     email,
                username:  username,
                role:      role,
                status:    status,
                password_hash: Utils.md5(rawPwd) // Hash before sending
            });
            if(window.App) window.App.showToast('User created successfully', 'success');
        }

        this.renderTable();
    },

    showResetPassword: function(userId) {
        const html = `
            <form onsubmit="event.preventDefault(); window.Users.resetPassword('${userId}')">
                <div class="form-group mb-3">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-control" id="fr_password" required minlength="6">
                </div>
                <div class="text-end mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-warning">Reset Password</button>
                </div>
            </form>
        `;
        window.App.showModal("Reset Password", html);
    },

    resetPassword: async function(userId) {
        const rawPwd = document.getElementById('fr_password').value;
        if(window.App) window.App.closeModal();
        if(window.App) window.App.showToast('Resetting password...', 'info');

        await window.DB.users.update(userId, {
            password_hash: Utils.md5(rawPwd) // Hash the new password
        });

        if(window.App) window.App.showToast('Password reset successfully', 'success');
    },

    toggleStatus: async function(userId, currentStatus) {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        if(window.App) window.App.showToast(`Changing status to ${newStatus}...`, 'info');
        
        await window.DB.users.update(userId, { status: newStatus });
        
        if(window.App) window.App.showToast(`User marked as ${newStatus}`, 'success');
        this.renderTable();
    },

    deleteUser: function(userId) {
        window.App.showConfirm('Delete User', 'Are you sure you want to completely delete this user? This cannot be undone.', async () => {
            if(window.App) window.App.showToast('Deleting user...', 'info');
            await window.DB.users.delete(userId);
            if(window.App) window.App.showToast('User deleted successfully', 'success');
            this.renderTable();
        });
    }
};
