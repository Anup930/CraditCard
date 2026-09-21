window.DataImport = {
    currentType: null,
    parsedData: [],
    validRecords: [],

    openModal: function(type) {
        this.currentType = type;
        this.parsedData = [];
        this.validRecords = [];

        let title = 'Import';
        let templateCols = '';
        if (type === 'statements') {
            title = 'Import Statements';
            templateCols = 'Card Zoho Ledger Name, Statement Month (YYYY-MM), Opening Balance, Billed Amount, Unbilled Amount, Credits/Payments, Closing Outstanding, Minimum Due, Due Date (YYYY-MM-DD), Payment Status';
        } else if (type === 'transactions') {
            title = 'Import Transactions';
            templateCols = 'Card Zoho Ledger Name, Date (YYYY-MM-DD), Statement Month (YYYY-MM), Zoho Ledger (Counterparty), Description, Type (Debit/Credit), Amount, Category';
        } else if (type === 'payments') {
            title = 'Import Payments';
            templateCols = 'Card Zoho Ledger Name, Statement Month (YYYY-MM), Payment Date (YYYY-MM-DD), Amount, Payment Mode, Reference No, Status';
        } else if (type === 'unbilled') {
            title = 'Import Unbilled Transactions';
            templateCols = 'Card Zoho Ledger Name, Date (YYYY-MM-DD), Description, Amount, Expected Statement Month (YYYY-MM)';
        }

        const html = `
            <div class="mb-4">
                <p class="text-muted">Follow these steps to import your ${type}:</p>
                <ol class="mb-4">
                    <li class="mb-2">
                        <strong>Download Template:</strong> Download the template file to see the required format.<br>
                        <button class="btn btn-sm btn-outline-secondary mt-1" onclick="window.DataImport.downloadTemplate()"><i class="fas fa-download"></i> Download Template</button>
                    </li>
                    <li class="mb-2">
                        <strong>Fill Data:</strong> Add your records. The columns are: <br>
                        <small class="text-muted">${templateCols}</small>
                    </li>
                    <li class="mb-2">
                        <strong>Upload File:</strong> Choose your filled CSV or Excel file.<br>
                        <input type="file" id="dataImportFile" class="form-control mt-1" accept=".csv, .xlsx, .xls" onchange="window.DataImport.handleFile(event)">
                    </li>
                </ol>
                <div id="dataImportPreview" style="display:none;">
                    <h5>Preview & Verify</h5>
                    <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                        <table class="table table-sm table-bordered data-table" id="dataImportTable">
                            <thead class="table-light" id="dataImportThead"></thead>
                            <tbody id="dataImportTbody"></tbody>
                        </table>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div id="dataImportStats" class="fw-bold"></div>
                        <button class="btn btn-primary" id="dataImportBtn" onclick="window.DataImport.importData()" disabled><i class="fas fa-check"></i> Import Valid Records</button>
                    </div>
                </div>
            </div>
        `;
        
        if (window.App && window.App.showModal) {
            window.App.showModal(title, html);
        }
    },

    downloadTemplate: function() {
        let ws;
        if (this.currentType === 'statements') {
            const data = [
                ["Card Zoho Ledger Name", "Statement Month (YYYY-MM)", "Opening Balance", "Billed Amount", "Unbilled Amount", "Credits/Payments", "Closing Outstanding", "Minimum Due", "Due Date (YYYY-MM-DD)", "Payment Status"],
                ["Arvind HDFC CC", "2026-04", 500, 7000, 0, 6000, 1500, 350, "2026-05-12", "Pending"]
            ];
            ws = XLSX.utils.aoa_to_sheet(data);
        } else if (this.currentType === 'transactions') {
            const data = [
                ["Card Zoho Ledger Name", "Date (YYYY-MM-DD)", "Statement Month (YYYY-MM)", "Zoho Ledger (Counterparty)", "Description", "Type (Debit/Credit)", "Amount", "Category"],
                ["Arvind HDFC CC", "2026-04-15", "2026-04", "Amazon India", "Amazon Purchase", "Debit", 1250.50, "Shopping"]
            ];
            ws = XLSX.utils.aoa_to_sheet(data);
        } else if (this.currentType === 'payments') {
            const data = [
                ["Card Zoho Ledger Name", "Statement Month (YYYY-MM)", "Payment Date (YYYY-MM-DD)", "Amount", "Payment Mode", "Reference No", "Status"],
                ["Arvind HDFC CC", "2026-04", "2026-05-12", 84336.55, "NEFT", "REF12345", "Completed"]
            ];
            ws = XLSX.utils.aoa_to_sheet(data);
        } else if (this.currentType === 'unbilled') {
            const data = [
                ["Card Zoho Ledger Name", "Date (YYYY-MM-DD)", "Description", "Amount", "Expected Statement Month (YYYY-MM)"],
                ["Arvind HDFC CC", "2026-08-25", "Cloud Server Hosting", 3500.00, "2026-09"]
            ];
            ws = XLSX.utils.aoa_to_sheet(data);
        }
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `${this.currentType}_template.xlsx`);
    },

    handleFile: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, {type:'binary', cellDates: true, dateNF: 'yyyy-mm-dd'});
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "" });
                
                this.parsedData = data;
                this.verifyData();
            } catch (err) {
                alert("Error reading file: " + err.message);
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
    },

    verifyData: function() {
        const allCards = window.DB.cards.getAll() || [];
        const existingStatements = window.DB.statements.getAll() || [];
        const existingTransactions = window.DB.transactions.getAll() || [];
        const existingPayments = window.DB.payments.getAll() || [];
        
        this.validRecords = [];
        let htmlHead = '';
        let htmlBody = '';
        
        if (this.parsedData.length === 0) {
            document.getElementById('dataImportPreview').style.display = 'block';
            document.getElementById('dataImportTbody').innerHTML = '<tr><td colspan="100%">No data found in file.</td></tr>';
            return;
        }

        const keys = Object.keys(this.parsedData[0]);
        htmlHead = '<tr><th>Status</th>' + keys.map(k => `<th>${k}</th>`).join('') + '</tr>';

        let validCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        this.parsedData.forEach(row => {
            let status = 'Valid';
            let reason = '';
            
            // 1. Resolve Card
            const cardName = row["Card Zoho Ledger Name"] || row["Card"] || row["Card Name"] || "";
            let matchedCard = allCards.find(c => String(c.zoho_ledger_name || '').toLowerCase() === String(cardName).toLowerCase());
            if (!matchedCard) {
                matchedCard = allCards.find(c => String(c.cardholder_name || '').toLowerCase() === String(cardName).toLowerCase());
            }

            if (!cardName) {
                status = 'Error'; reason = 'Missing Card Name';
            } else if (!matchedCard) {
                status = 'Error'; reason = 'Card not found in DB';
            } else {
                if (this.currentType === 'statements') {
                    const month = row["Statement Month (YYYY-MM)"] || row["Month"];
                    if (!month) {
                        status = 'Error'; reason = 'Missing Month';
                    } else {
                        // Check duplicate
                        const isDup = existingStatements.find(s => s.card_id === matchedCard.card_id && s.statement_month === month);
                        if (isDup) {
                            status = 'Duplicate'; reason = 'Statement already exists';
                        }
                    }
                } else if (this.currentType === 'transactions') {
                    const date = row["Date (YYYY-MM-DD)"] || row["Date"];
                    const amount = row["Amount"];
                    if (!date || amount === "" || amount === undefined) {
                        status = 'Error'; reason = 'Missing Date or Amount';
                    } else {
                        const amtNum = window.Utils.parseNum(amount);
                        const type = row["Type (Debit/Credit)"] || row["Type"] || "Debit";
                        const isDup = existingTransactions.find(t => 
                            t.card_id === matchedCard.card_id && 
                            t.txn_date === String(date) && 
                            t.amount === amtNum &&
                            t.txn_type === type
                        );
                        if (isDup) {
                            status = 'Duplicate'; reason = 'Transaction already exists';
                        }
                    }
                } else if (this.currentType === 'payments') {
                    const date = row["Payment Date (YYYY-MM-DD)"] || row["Date"];
                    const amount = row["Amount"];
                    if (!date || amount === "" || amount === undefined) {
                        status = 'Error'; reason = 'Missing Date or Amount';
                    } else {
                        const amtNum = window.Utils.parseNum(amount);
                        const isDup = existingPayments.find(p => 
                            p.card_id === matchedCard.card_id && 
                            p.payment_date === String(date) && 
                            p.amount === amtNum
                        );
                        if (isDup) {
                            status = 'Duplicate'; reason = 'Payment already exists';
                        }
                    }
                } else if (this.currentType === 'unbilled') {
                    const date = row["Date (YYYY-MM-DD)"] || row["Date"] || row["Txn Date"];
                    const amount = row["Amount"];
                    if (!date || amount === "" || amount === undefined) {
                        status = 'Error'; reason = 'Missing Date or Amount';
                    }
                }
            }

            // Record Valid data
            if (status === 'Valid') {
                validCount++;
                let record = { card_id: matchedCard.card_id };
                
                if (this.currentType === 'statements') {
                    record.statement_month = String(row["Statement Month (YYYY-MM)"] || row["Month"]);
                    record.opening_balance = window.Utils.parseNum(row["Opening Balance"]);
                    record.billed_amount = window.Utils.parseNum(row["Billed Amount"]);
                    record.unbilled_amount = window.Utils.parseNum(row["Unbilled Amount"]);
                    record.credits_payments = window.Utils.parseNum(row["Credits/Payments"] || row["Credits Payments"]);
                    record.closing_outstanding = window.Utils.parseNum(row["Closing Outstanding"]);
                    record.minimum_due = window.Utils.parseNum(row["Minimum Due"]);
                    record.due_date = row["Due Date (YYYY-MM-DD)"] || row["Due Date"] || "";
                    record.payment_status = row["Payment Status"] || "Pending";
                } else if (this.currentType === 'transactions') {
                    let dStr = row["Date (YYYY-MM-DD)"] || row["Date"];
                    record.txn_date = String(dStr);
                    const smRaw = row["Statement Month (YYYY-MM)"] || row["Statement Month"] || row["Stmt Month"] || row["Billing Month"] || row["Statement Period"] || row["Billing Cycle"] || row["Statement"];
                    if (smRaw && String(smRaw).trim() !== '') {
                        record.statement_month = window.Utils.normalizeStatementMonth(smRaw);
                    } else if (matchedCard && dStr) {
                        record.statement_month = window.Utils.calculateStatementMonth(dStr, matchedCard, existingStatements);
                    } else {
                        record.statement_month = null;
                    }
                    record.zoho_ledger = row["Zoho Ledger (Counterparty)"] || row["Zoho Ledger"] || "";
                    record.description = row["Description"] || "";
                    record.txn_type = row["Type (Debit/Credit)"] || row["Type"] || "Debit";
                    record.amount = window.Utils.parseNum(row["Amount"]);
                    record.category = row["Category"] || "";
                    record.status = "Active";
                } else if (this.currentType === 'payments') {
                    let dStr = row["Payment Date (YYYY-MM-DD)"] || row["Date"];
                    record.payment_date = String(dStr);
                    record.amount = window.Utils.parseNum(row["Amount"]);
                    record.payment_mode = row["Payment Mode"] || "NEFT";
                    record.reference_no = row["Reference No"] || "";
                    record.status = row["Status"] || "Completed";

                    // Try to resolve statement ID if month is provided
                    const month = row["Statement Month (YYYY-MM)"];
                    let resolvedStatementId = "";
                    if (month) {
                        const matchedStatement = existingStatements.find(s => s.card_id === matchedCard.card_id && s.statement_month === month);
                        if (matchedStatement) {
                            resolvedStatementId = matchedStatement.statement_id;
                        }
                    }
                    record.statement_id = resolvedStatementId;
                } else if (this.currentType === 'unbilled') {
                    let dStr = row["Date (YYYY-MM-DD)"] || row["Date"] || row["Txn Date"];
                    record.txn_date = String(dStr);
                    record.description = row["Description"] || "";
                    record.amount = window.Utils.parseNum(row["Amount"]);
                    record.expected_statement_month = row["Expected Statement Month (YYYY-MM)"] || row["Expected Month"] || row["Month"] || "";
                    record.status = "Unbilled";
                    record.statement_id = null;
                }
                this.validRecords.push(record);
            } else if (status === 'Duplicate') {
                duplicateCount++;
            } else {
                errorCount++;
            }

            // HTML Row
            let trClass = '';
            let badgeClass = '';
            if (status === 'Valid') { trClass = 'table-success'; badgeClass = 'bg-success'; }
            if (status === 'Duplicate') { trClass = 'table-warning'; badgeClass = 'bg-warning text-dark'; }
            if (status === 'Error') { trClass = 'table-danger'; badgeClass = 'bg-danger'; }

            htmlBody += `<tr class="${trClass}">
                <td><span class="badge ${badgeClass}">${status}</span> ${reason ? `<small class="d-block text-muted" style="font-size:0.7rem;">${reason}</small>` : ''}</td>
                ${keys.map(k => `<td>${window.Utils.escapeHtml(String(row[k] || ''))}</td>`).join('')}
            </tr>`;
        });

        document.getElementById('dataImportThead').innerHTML = htmlHead;
        document.getElementById('dataImportTbody').innerHTML = htmlBody;
        document.getElementById('dataImportPreview').style.display = 'block';
        
        document.getElementById('dataImportStats').innerHTML = `
            <span class="text-success">${validCount} Valid</span> | 
            <span class="text-warning">${duplicateCount} Duplicates</span> | 
            <span class="text-danger">${errorCount} Errors</span>
        `;

        document.getElementById('dataImportBtn').disabled = (validCount === 0);
    },

    importData: async function() {
        if (this.validRecords.length === 0) return;

        let successCount = 0;
        
        try {
            if (this.currentType === 'statements') {
                for (let record of this.validRecords) {
                    await window.DB.statements.add(record);
                    successCount++;
                }
            } else if (this.currentType === 'transactions') {
                for (let record of this.validRecords) {
                    await window.DB.transactions.add(record);
                    successCount++;
                }
            } else if (this.currentType === 'payments') {
                for (let record of this.validRecords) {
                    await window.DB.payments.add(record);
                    successCount++;
                }
            } else if (this.currentType === 'unbilled') {
                await window.DB.unbilled.addBatch(this.validRecords);
                successCount = this.validRecords.length;
            }
            
            if (window.App && window.App.showToast) {
                window.App.showToast(`Successfully imported ${successCount} records!`, 'success');
            } else {
                alert(`Successfully imported ${successCount} records!`);
            }
            
            window.App.closeModal();

            // Refresh current view
            if ((this.currentType === 'statements' || this.currentType === 'payments' || this.currentType === 'unbilled') && window.Payments) {
                window.Payments.render(document.getElementById('main-content'));
            } else if (this.currentType === 'transactions' && window.Transactions) {
                window.Transactions.render(document.getElementById('main-content'));
            }
            
        } catch (err) {
            console.error("Import error", err);
            alert("An error occurred during import. Check console.");
        }
    }
};
