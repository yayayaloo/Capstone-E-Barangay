const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const oldBlock = `{/* ── BLOTTER REPORTS ── */}\r
                        {activeTab === 'blotter' && (\r
                            <div className="animate-fadeIn">\r
                                <div className={styles.pageHeader}>\r
                                    <div>\r
                                        <h1>Blotter Reports</h1>\r
                                        <p className={styles.pageSubtitle}>Manage official blotter and incident reports.</p>\r
                                    </div>\r
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>\r
                                        <button className="btn btn-secondary" onClick={() => setBlotterModal({ isOpen: true, report: { incident_date: new Date().toISOString().slice(0, 16) } })}>\r
                                            + New Report\r
                                        </button>\r
                                        <button className="btn btn-primary" onClick={() => exportBlotterToPDF(blotterReports, 'Blotter_Reports')}>\r
                                            Export PDF\r
                                        </button>\r
                                    </div>\r
                                </div>\r
\r
                                <div className={styles.filterBar}>\r
                                    <input\r
                                        type="text"\r
                                        placeholder="Search complainant or respondent..."\r
                                        value={blotterSearch}\r
                                        onChange={e => setBlotterSearch(e.target.value)}\r
                                        className={styles.searchInput}\r
                                    />\r
                                    <select\r
                                        value={blotterStatusFilter}\r
                                        onChange={e => setBlotterStatusFilter(e.target.value)}\r
                                        className={styles.filterSelect}\r
                                    >\r
                                        <option value="all">All Status</option>\r
                                        <option value="Pending">Pending</option>\r
                                        <option value="Ongoing">Ongoing</option>\r
                                        <option value="Resolved">Resolved</option>\r
                                        <option value="Referred">Referred</option>\r
                                    </select>\r
                                    <span className={styles.searchCount}>{blotterReports.length} report{blotterReports.length !== 1 ? 's' : ''}</span>\r
                                </div>\r
\r
                                <div className={\`\${styles.tableContainer} \${styles.glassTable}\`}>\r
                                    {loading ? <LoadingSpinner text="Loading reports..." /> : (\r
                                        <table className={styles.table}>\r
                                            <thead>\r
                                                <tr>\r
                                                    <th>Case ID</th>\r
                                                    <th>Complainant</th>\r
                                                    <th>Respondent</th>\r
                                                    <th>Location</th>\r
                                                    <th>Incident Date</th>\r
                                                    <th>Status</th>\r
                                                    <th>Actions</th>\r
                                                </tr>\r
                                            </thead>\r
                                            <tbody>\r
                                                {blotterReports.filter(rep => {\r
                                                    const matchSearch = rep.complainant.toLowerCase().includes(blotterSearch.toLowerCase()) || rep.respondent.toLowerCase().includes(blotterSearch.toLowerCase());\r
                                                    const matchStatus = blotterStatusFilter === 'all' || rep.status === blotterStatusFilter;\r
                                                    return matchSearch && matchStatus;\r
                                                }).map(rep => (\r
                                                    <tr key={rep.id}>\r
                                                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{rep.id.slice(0, 6).toUpperCase()}</td>\r
                                                        <td><strong>{rep.complainant}</strong></td>\r
                                                        <td><strong>{rep.respondent}</strong></td>\r
                                                        <td style={{ color: 'var(--text-muted)' }}>{rep.location}</td>\r
                                                        <td>{new Date(rep.incident_date).toLocaleString()}</td>\r
                                                        <td>\r
                                                            <span className={rep.status === 'Resolved' ? 'badge badge-success' : rep.status === 'Ongoing' ? 'badge badge-info' : rep.status === 'Referred' ? 'badge badge-warning' : 'badge badge-error'}>\r
                                                                {rep.status}\r
                                                            </span>\r
                                                        </td>\r
                                                        <td>\r
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>\r
                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setBlotterModal({ isOpen: true, report: rep })}>Edit</button>\r
                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }} onClick={() => deleteBlotterReport(rep.id)}>Delete</button>\r
                                                            </div>\r
                                                        </td>\r
                                                    </tr>\r
                                                ))}\r
                                                {blotterReports.length === 0 && (\r
                                                    <tr>\r
                                                        <td colSpan={7} className={styles.emptyMessage}>No blotter reports found.</td>\r
                                                    </tr>\r
                                                )}\r
                                            </tbody>\r
                                        </table>\r
                                    )}\r
                                </div>\r
                            </div>\r
                        )}`;

const newBlock = `{/* ── BLOTTER & COMPLAINTS ── */}
                        {activeTab === 'blotter' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Blotter &amp; Complaints</h1>
                                        <p className={styles.pageSubtitle}>Manage official blotter reports and resident-submitted complaints.</p>
                                    </div>
                                </div>

                                {/* Sub-navigation */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <button
                                        className={\`btn \${blotterView === 'reports' ? 'btn-primary' : 'btn-outline'}\`}
                                        onClick={() => setBlotterView('reports')}
                                    >
                                        Blotter Reports ({blotterReports.length})
                                    </button>
                                    <button
                                        className={\`btn \${blotterView === 'complaints' ? 'btn-primary' : 'btn-outline'}\`}
                                        onClick={() => setBlotterView('complaints')}
                                    >
                                        Resident Complaints ({complaints.length})
                                    </button>
                                </div>

                                {/* ── BLOTTER REPORTS SUB-VIEW ── */}
                                {blotterView === 'reports' && (<>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary" onClick={() => setBlotterModal({ isOpen: true, report: { incident_date: new Date().toISOString().slice(0, 16) } })}>
                                        + New Report
                                    </button>
                                    <button className="btn btn-primary" onClick={() => exportBlotterToPDF(blotterReports, 'Blotter_Reports')}>
                                        Export PDF
                                    </button>
                                </div>

                                <div className={styles.filterBar}>
                                    <input type="text" placeholder="Search complainant or respondent..." value={blotterSearch} onChange={e => setBlotterSearch(e.target.value)} className={styles.searchInput} />
                                    <select value={blotterStatusFilter} onChange={e => setBlotterStatusFilter(e.target.value)} className={styles.filterSelect}>
                                        <option value="all">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Referred">Referred</option>
                                    </select>
                                    <span className={styles.searchCount}>{blotterReports.length} report{blotterReports.length !== 1 ? 's' : ''}</span>
                                </div>

                                <div className={\`\${styles.tableContainer} \${styles.glassTable}\`}>
                                    {loading ? <LoadingSpinner text="Loading reports..." /> : (
                                        <table className={styles.table}>
                                            <thead><tr><th>Case ID</th><th>Complainant</th><th>Respondent</th><th>Location</th><th>Incident Date</th><th>Status</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {blotterReports.filter(rep => {
                                                    const matchSearch = rep.complainant.toLowerCase().includes(blotterSearch.toLowerCase()) || rep.respondent.toLowerCase().includes(blotterSearch.toLowerCase());
                                                    const matchStatus = blotterStatusFilter === 'all' || rep.status === blotterStatusFilter;
                                                    return matchSearch && matchStatus;
                                                }).map(rep => (
                                                    <tr key={rep.id}>
                                                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{rep.id.slice(0, 6).toUpperCase()}</td>
                                                        <td><strong>{rep.complainant}</strong></td>
                                                        <td><strong>{rep.respondent}</strong></td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{rep.location}</td>
                                                        <td>{new Date(rep.incident_date).toLocaleString()}</td>
                                                        <td><span className={rep.status === 'Resolved' ? 'badge badge-success' : rep.status === 'Ongoing' ? 'badge badge-info' : rep.status === 'Referred' ? 'badge badge-warning' : 'badge badge-error'}>{rep.status}</span></td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setBlotterModal({ isOpen: true, report: rep })}>Edit</button>
                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }} onClick={() => deleteBlotterReport(rep.id)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {blotterReports.length === 0 && (<tr><td colSpan={7} className={styles.emptyMessage}>No blotter reports found.</td></tr>)}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                </>)}

                                {/* ── RESIDENT COMPLAINTS SUB-VIEW ── */}
                                {blotterView === 'complaints' && (<>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" onClick={() => exportComplaintsToPDF(complaints, 'Complaints_Report')}>Export PDF</button>
                                </div>

                                <div className={styles.filterBar}>
                                    <input type="text" placeholder="Search by subject, respondent, or resident..." value={complaintSearch} onChange={e => setComplaintSearch(e.target.value)} className={styles.searchInput} />
                                    <select value={complaintStatusFilter} onChange={e => setComplaintStatusFilter(e.target.value)} className={styles.filterSelect}>
                                        <option value="all">All Status</option>
                                        <option value="Received">Received</option>
                                        <option value="Under Investigation">Under Investigation</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Dismissed">Dismissed</option>
                                    </select>
                                    <span className={styles.searchCount}>{filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? 's' : ''}</span>
                                </div>

                                <div className={\`\${styles.tableContainer} \${styles.glassTable}\`}>
                                    {loading ? <LoadingSpinner text="Loading complaints..." /> : (
                                        <table className={styles.table}>
                                            <thead><tr><th>ID</th><th>Resident</th><th>Type</th><th>Subject</th><th>Respondent</th><th>Status</th><th>Date Filed</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {filteredComplaints.map(c => (
                                                    <tr key={c.id}>
                                                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.id.slice(0, 6).toUpperCase()}</td>
                                                        <td><strong>{c.resident_name}</strong></td>
                                                        <td><span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{c.complaint_type}</span></td>
                                                        <td>{c.subject}</td>
                                                        <td><strong>{c.respondent_name}</strong></td>
                                                        <td><span className={c.status === 'Resolved' ? 'badge badge-success' : c.status === 'Under Investigation' ? 'badge badge-info' : c.status === 'Dismissed' ? 'badge badge-error' : 'badge badge-warning'}>{c.status}</span></td>
                                                        <td style={{ fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setComplaintModal({ isOpen: true, complaint: c }); setComplaintNotes(c.admin_notes || ''); setComplaintNewStatus(c.status); }}>View / Update</button>
                                                                {c.status !== 'Resolved' && c.status !== 'Dismissed' && (
                                                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--warning-500)', color: 'var(--warning-500)' }} onClick={() => escalateToBlotter(c)}>Escalate</button>
                                                                )}
                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }} onClick={() => deleteComplaint(c.id)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredComplaints.length === 0 && (<tr><td colSpan={8} className={styles.emptyMessage}>No complaints found.</td></tr>)}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                </>)}
                            </div>
                        )}`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
    console.log('SUCCESS: Blotter tab replaced with sub-view version');
} else {
    // Try without \r
    const oldBlockNoR = oldBlock.replace(/\r/g, '');
    const contentNoR = content.replace(/\r\n/g, '\n');
    if (contentNoR.includes(oldBlockNoR)) {
        content = content.replace(content.substring(content.indexOf('{/* ── BLOTTER REPORTS ── */}'), content.indexOf('{/* ── BLOTTER REPORTS ── */}') + oldBlock.length + 20), '');
        // Fallback: find by markers
    }
    
    // Simpler approach: find start and end markers
    const startMarker = '{/* ── BLOTTER REPORTS ── */}';
    const endMarker = '{/* ── AUDIT TRAIL ── */}';
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);
    
    if (startIdx !== -1 && endIdx !== -1) {
        // Find the whitespace before the start marker
        let lineStart = content.lastIndexOf('\n', startIdx) + 1;
        // Find the whitespace before end marker
        let lineEnd = content.lastIndexOf('\n', endIdx);
        
        const before = content.substring(0, lineStart);
        const after = content.substring(lineEnd);
        
        content = before + '                        ' + newBlock + '\n' + after;
        fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
        console.log('SUCCESS (marker approach): Blotter tab replaced');
    } else {
        console.log('FAILED: Could not find markers. startIdx='+startIdx+' endIdx='+endIdx);
    }
}
