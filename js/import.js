window.Import = {
    currentStep: 1,
    fileData: null,
    mappedData: null,
    validRecords: [],
    errorRecords: [],

    render: function(container) {
        this.container = container;
        this.currentStep = 1;
        this.fileData = null;
        this.mappedData = null;
        
        this.container.innerHTML = `
            <div class="page-header mb-4">
                <h2 class="page-title">Import Data</h2>
                <div class="page-subtitle text-muted">Import transactions from Excel/CSV</div>
            </div>
            
            <div class="wizard-steps d-flex justify-content-between mb-4 card p-3 flex-row">
                <div class="wizard-step active" id="step1-tab"><span class="step-num bg-primary text-white rounded-circle px-2 py-1 me-2">1</span><span class="step-label">Upload</span></div>
                <div class="wizard-step text-muted" id="step2-tab"><span class="step-num bg-secondary text-white rounded-circle px-2 py-1 me-2">2</span><span class="step-label">Map & Preview</span></div>
                <div class="wizard-step text-muted" id="step3-tab"><span class="step-num bg-secondary text-white rounded-circle px-2 py-1 me-2">3</span><span class="step-label">Validate</span></div>
                <div class="wizard-step text-muted" id="step4-tab"><span class="step-num bg-secondary text-white rounded-circle px-2 py-1 me-2">4</span><span class="step-label">Import</span></div>
            </div>

            <div class="card p-4 mb-4" id="wizard-content"></div>

            <div class="card p-4 mt-4">
                <h3 class="card-title mb-3">Import History</h3>
                <div id="import-history"></div>
            </div>
        `;
        
        this.renderStep();
        this.renderHistory();
    },

    renderStep: function() {
        const content = document.getElementById('wizard-content');
        
        // Update Tabs
        [1, 2, 3, 4].forEach(i => {
            const tab = document.getElementById(`step${i}-tab`);
            if(i < this.currentStep) {
                tab.className = 'wizard-step completed text-success fw-bold';
                tab.querySelector('.step-num').className = 'step-num bg-success text-white rounded-circle px-2 py-1 me-2';
            } else if(i === this.currentStep) {
                tab.className = 'wizard-step active fw-bold';
                tab.querySelector('.step-num').className = 'step-num bg-primary text-white rounded-circle px-2 py-1 me-2';
            } else {
                tab.className = 'wizard-step text-muted';
                tab.querySelector('.step-num').className = 'step-num bg-secondary text-white rounded-circle px-2 py-1 me-2';
            }
        });

        if (this.currentStep === 1) {
            content.innerHTML = `
                <div class="text-center p-5 border border-dashed rounded bg-light" id="drop-zone">
                    <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                    <h4>Drag and drop your file here</h4>
                    <p class="text-muted">Supports .xlsx, .xls, .csv</p>
                    <input type="file" id="file-input" class="d-none" accept=".xlsx, .xls, .csv">
                    <button class="btn btn-outline-primary mt-2" onclick="document.getElementById('file-input').click()">Browse Files</button>
                </div>
            `;
            
            document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
            const dropZone = document.getElementById('drop-zone');
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-white'); });
            dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-white'); });
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('bg-white'); this.handleFileUpload(e.dataTransfer.files[0]); });
        }
        else if (this.currentStep === 2) {
            if(!this.fileData || this.fileData.length === 0) return this.prevStep();
            
            const headers = Object.keys(this.fileData[0]);
            
            content.innerHTML = `
                <h4>Map Columns</h4>
                <p class="text-muted mb-4">Select which column in your file corresponds to the required fields.</p>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="form-group mb-2"><label>Date Column</label><select class="form-select" id="map_date">${this.getOptions(headers, 'date')}</select></div>
                        <div class="form-group mb-2">
                            <label>Statement Month Column <span class="badge bg-primary ms-1" style="font-size:0.7rem;">For Reconciliation</span></label>
                            <select class="form-select" id="map_stmt_month">
                                <option value="">-- Optional: Auto-detect from Date --</option>
                                ${this.getOptions(headers, 'statement.*month|stmt.*month|billing.*month|statement_month|statement.*period|billing.*cycle|month')}
                            </select>
                        </div>
                        <div class="form-group mb-2"><label>Ledger/Account Column</label><select class="form-select" id="map_ledger">${this.getOptions(headers, 'ledger|account|name')}</select></div>
                        <div class="form-group mb-2"><label>Description/Details</label><select class="form-select" id="map_desc">${this.getOptions(headers, 'desc|detail|narration')}</select></div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-2"><label>Amount Column</label><select class="form-select" id="map_amount">${this.getOptions(headers, 'amount')}</select></div>
                        <div class="form-group mb-2"><label>Transaction Type (Debit/Credit)</label><select class="form-select" id="map_type"><option value="">-- Auto Detect from Amount --</option>${this.getOptions(headers, 'type|cr/dr')}</select></div>
                        <div class="form-group mb-2"><label>Debit Column (Alternative)</label><select class="form-select" id="map_debit"><option value="">-- None --</option>${this.getOptions(headers, 'debit|dr')}</select></div>
                        <div class="form-group mb-2"><label>Credit Column (Alternative)</label><select class="form-select" id="map_credit"><option value="">-- None --</option>${this.getOptions(headers, 'credit|cr')}</select></div>
                    </div>
                </div>
                
                <h5>Preview (First 5 rows)</h5>
                <div class="table-responsive mb-4">
                    <table class="table table-sm table-bordered">
                        <thead><tr>${headers.map(h => `<th>${window.Utils.escapeHtml(h)}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${this.fileData.slice(0, 5).map(row => `<tr>${headers.map(h => `<td>${window.Utils.escapeHtml(String(row[h] || ''))}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="d-flex justify-content-between mt-4">
                    <button class="btn btn-secondary" onclick="window.Import.prevStep()">Back</button>
                    <button class="btn btn-primary" onclick="window.Import.processMapping()">Next: Validate</button>
                </div>
            `;
        }
        else if (this.currentStep === 3) {
            content.innerHTML = `
                <h4>Validation Results</h4>
                <div class="row mb-4 text-center mt-3">
                    <div class="col-md-4"><div class="card bg-light p-3"><h2 class="text-primary">${this.mappedData.length}</h2><div>Total Records</div></div></div>
                    <div class="col-md-4"><div class="card bg-light p-3"><h2 class="text-success">${this.validRecords.length}</h2><div>Valid Records</div></div></div>
                    <div class="col-md-4"><div class="card bg-light p-3"><h2 class="text-danger">${this.errorRecords.length}</h2><div>Errors / Unmapped</div></div></div>
                </div>
                
                ${this.errorRecords.length > 0 ? `
                <div class="alert alert-danger">
                    <strong>Warning:</strong> ${this.errorRecords.length} records have errors (missing required fields or unmapped ledger). They will not be imported.
                </div>
                ` : '<div class="alert alert-success">All records are valid and ready to import!</div>'}
                
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-sm table-hover">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th>Date</th>
                                <th>Stmt Month</th>
                                <th>Ledger</th>
                                <th>Mapped Card</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.mappedData.map(row => {
                                const isValid = row._isValid;
                                const trClass = isValid ? 'table-success' : 'table-danger';
                                return `
                                <tr class="${trClass}">
                                    <td>${window.Utils.formatDate(row.txn_date)}</td>
                                    <td><span class="badge ${row.statement_month ? 'bg-primary' : 'bg-light text-dark border'}">${row.statement_month ? window.Utils.formatMonthYear(row.statement_month) : 'Auto (Date)'}</span></td>
                                    <td>${window.Utils.escapeHtml(row.zoho_ledger || '')}</td>
                                    <td>${row.card_id ? 'Yes' : '<span class="text-danger">No Match</span>'}</td>
                                    <td>${window.Utils.escapeHtml(row.description || '')}</td>
                                    <td>${row.txn_type}</td>
                                    <td>${window.Utils.formatCurrency(row.amount)}</td>
                                    <td>${isValid ? 'Valid' : row._errorMsg}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="d-flex justify-content-between mt-4">
                    <button class="btn btn-secondary" onclick="window.Import.prevStep()">Back</button>
                    <button class="btn btn-success" onclick="window.Import.commitImport()" ${this.validRecords.length === 0 ? 'disabled' : ''}>Import ${this.validRecords.length} Valid Records</button>
                </div>
            `;
        }
        else if (this.currentStep === 4) {
            content.innerHTML = `
                <div class="text-center p-5">
                    <i class="fas fa-check-circle fa-4x text-success mb-3"></i>
                    <h2>Import Successful!</h2>
                    <p class="text-muted mt-2">Successfully imported ${this.validRecords.length} transactions.</p>
                    <button class="btn btn-primary mt-4" onclick="window.Import.render(window.Import.container)">Start New Import</button>
                </div>
            `;
            this.renderHistory();
        }
    },

    getOptions: function(headers, matchStr) {
        let options = '';
        const regex = new RegExp(matchStr, 'i');
        let matched = false;
        headers.forEach(h => {
            const isMatch = !matched && regex.test(h);
            if(isMatch) matched = true;
            options += `<option value="${h}" ${isMatch ? 'selected' : ''}>${h}</option>`;
        });
        return options;
    },

    handleFileUpload: function(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            if (window.XLSX) {
                const workbook = window.XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                this.fileData = window.XLSX.utils.sheet_to_json(firstSheet, {raw: false});
                
                if(this.fileData && this.fileData.length > 0) {
                    this.currentStep = 2;
                    this.renderStep();
                } else {
                    if(window.App && window.App.showToast) window.App.showToast("File is empty or invalid format", "error");
                }
            } else {
                alert("XLSX library not loaded");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    processMapping: function() {
        const mDate = document.getElementById('map_date').value;
        const mStmtMonthEl = document.getElementById('map_stmt_month');
        const mStmtMonth = mStmtMonthEl ? mStmtMonthEl.value : '';
        const mLedger = document.getElementById('map_ledger').value;
        const mDesc = document.getElementById('map_desc').value;
        const mAmount = document.getElementById('map_amount').value;
        const mType = document.getElementById('map_type').value;
        const mDebit = document.getElementById('map_debit').value;
        const mCredit = document.getElementById('map_credit').value;

        const allCards = window.DB.cards.getAll();
        const ledgerMap = {};
        allCards.forEach(c => {
            if(c.zoho_ledger_name) ledgerMap[c.zoho_ledger_name.trim().toLowerCase()] = c.card_id;
        });

        this.validRecords = [];
        this.errorRecords = [];
        this.mappedData = [];

        this.fileData.forEach((row, i) => {
            const ledgerName = (row[mLedger] || '').trim();
            const dateVal = row[mDate];
            let amount = 0;
            let type = '';

            if (mDebit && row[mDebit]) {
                amount = window.Utils.parseNum(row[mDebit]);
                type = 'Debit';
            } else if (mCredit && row[mCredit]) {
                amount = window.Utils.parseNum(row[mCredit]);
                type = 'Credit';
            } else {
                let rawAmt = window.Utils.parseNum(row[mAmount]);
                if (mType && row[mType]) {
                    type = String(row[mType]).toLowerCase().includes('cr') ? 'Credit' : 'Debit';
                    amount = Math.abs(rawAmt);
                } else {
                    // Auto detect from sign
                    amount = Math.abs(rawAmt);
                    type = rawAmt < 0 ? 'Credit' : 'Debit'; // Assuming negative is credit, change logic if needed
                }
            }

            const cardId = ledgerMap[ledgerName.toLowerCase()] || null;

            let parsedDate = null;
            if(dateVal) {
                let strVal = String(dateVal).trim();
                let m = strVal.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                let d = null;
                if (m) {
                    let p1 = parseInt(m[1], 10);
                    let p2 = parseInt(m[2], 10);
                    let yr = parseInt(m[3], 10);
                    if (p1 > 12) d = new Date(yr, p2 - 1, p1);
                    else if (p2 > 12) d = new Date(yr, p1 - 1, p2);
                    else d = new Date(yr, p2 - 1, p1); // Default to DD/MM/YYYY
                } else {
                    d = new Date(strVal);
                }
                if (d && !isNaN(d.getTime())) {
                    parsedDate = d.toISOString();
                }
            }

            let stmtMonth = null;
            if (mStmtMonth && row[mStmtMonth] && String(row[mStmtMonth]).trim() !== '') {
                stmtMonth = window.Utils.normalizeStatementMonth(row[mStmtMonth]);
            } else if (parsedDate) {
                const card = cardId ? window.DB.cards.getById(cardId) : null;
                stmtMonth = window.Utils.calculateStatementMonth(parsedDate, card, window.DB.statements.getAll());
            }

            const record = {
                txn_date: parsedDate,
                statement_month: stmtMonth,
                zoho_ledger: ledgerName,
                description: row[mDesc] || '',
                amount: amount,
                txn_type: type,
                card_id: cardId,
                status: 'Imported'
            };

            // Validation
            let isValid = true;
            let errorMsg = [];
            if(!parsedDate) { isValid = false; errorMsg.push("Invalid Date"); }
            if(!ledgerName) { isValid = false; errorMsg.push("Missing Ledger"); }
            if(!cardId) { isValid = false; errorMsg.push("Unmapped Ledger"); }
            if(amount === 0 || isNaN(amount)) { isValid = false; errorMsg.push("Invalid Amount"); }

            record._isValid = isValid;
            record._errorMsg = errorMsg.join(', ');

            if(isValid) this.validRecords.push(record);
            else this.errorRecords.push(record);

            this.mappedData.push(record);
        });

        this.currentStep = 3;
        this.renderStep();
    },

    commitImport: function() {
        if(this.validRecords.length === 0) return;

        const batchId = 'IMP-' + Date.now();
        
        // Clean temporary fields
        const cleanRecords = this.validRecords.map(r => {
            const copy = {...r};
            delete copy._isValid;
            delete copy._errorMsg;
            copy.category = 'Categorized'; // simple default
            return copy;
        });

        window.DB.transactions.addBatch(cleanRecords, batchId);
        
        window.DB.importBatches.add({
            batch_id: batchId,
            import_date: new Date().toISOString(),
            record_count: cleanRecords.length,
            status: 'Success'
        });

        window.DB.save();
        this.currentStep = 4;
        this.renderStep();
    },

    renderHistory: function() {
        const historyContainer = document.getElementById('import-history');
        if(!historyContainer) return;

        const batches = window.DB.importBatches.getAll() || [];
        batches.sort((a,b) => new Date(b.import_date) - new Date(a.import_date));

        if(batches.length === 0) {
            historyContainer.innerHTML = '<div class="empty-state">No imports yet.</div>';
            return;
        }

        let html = `
            <table class="table data-table table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Batch ID</th>
                        <th>Import Date</th>
                        <th>Records Added</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        batches.forEach(b => {
            html += `
                <tr>
                    <td>${b.batch_id}</td>
                    <td>${window.Utils.formatDate(b.import_date)}</td>
                    <td>${b.record_count}</td>
                    <td><span class="badge bg-success">${b.status}</span></td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        historyContainer.innerHTML = html;
    },

    prevStep: function() {
        if(this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
        }
    }
};
