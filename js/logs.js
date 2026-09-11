window.Logs = {
    render: function(container) {
        let logs = window.DB.data.audit_logs || [];
        logs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let html = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h3 class="card-title">Activity Logs</h3>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Module</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if(logs.length === 0) {
            html += `<tr><td colspan="5" class="text-center py-4">No activity logs found.</td></tr>`;
        } else {
            logs.forEach(log => {
                const ts = new Date(log.timestamp).toLocaleString();
                html += `
                <tr>
                    <td>${ts}</td>
                    <td>${log.username}</td>
                    <td><span class="badge bg-secondary">${log.module}</span></td>
                    <td><span class="badge bg-primary">${log.action}</span></td>
                    <td>${log.details}</td>
                </tr>`;
            });
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
        container.innerHTML = html;
    }
};