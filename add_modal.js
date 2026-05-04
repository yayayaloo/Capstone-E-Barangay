const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const modalCode = `
            {/* Complaint Detail Modal */}
            {complaintModal.isOpen && complaintModal.complaint && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setComplaintModal({ isOpen: false, complaint: null })}>
                    <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Complaint Details</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Complaint ID</label>
                                <strong style={{ fontFamily: 'monospace' }}>{complaintModal.complaint.id.slice(0, 8).toUpperCase()}</strong>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Filed By</label>
                                <strong>{complaintModal.complaint.resident_name}</strong>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Type</label>
                                <span className="badge badge-info">{complaintModal.complaint.complaint_type}</span>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Date Filed</label>
                                <span>{new Date(complaintModal.complaint.created_at).toLocaleString()}</span>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Respondent</label>
                                <strong>{complaintModal.complaint.respondent_name}</strong>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Location</label>
                                <span>{complaintModal.complaint.location}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Subject</label>
                            <strong>{complaintModal.complaint.subject}</strong>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Description</label>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{complaintModal.complaint.description}</p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Update Status</label>
                            <select
                                className={styles.filterSelect}
                                style={{ width: '100%', marginBottom: '1rem' }}
                                value={complaintNewStatus}
                                onChange={e => setComplaintNewStatus(e.target.value)}
                            >
                                <option value="Received">Received</option>
                                <option value="Under Investigation">Under Investigation</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Dismissed">Dismissed</option>
                            </select>

                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Admin Notes</label>
                            <textarea
                                rows={3}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: '1.5rem' }}
                                placeholder="Add notes for this complaint..."
                                value={complaintNotes}
                                onChange={e => setComplaintNotes(e.target.value)}
                            />

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setComplaintModal({ isOpen: false, complaint: null })}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} disabled={savingComplaint} onClick={() => updateComplaintStatus(complaintModal.complaint.id, complaintNewStatus, complaintNotes)}>
                                    {savingComplaint ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}`;

const lastDiv = content.lastIndexOf('</div>');
content = content.substring(0, lastDiv) + modalCode + '\\r\\n        ' + content.substring(lastDiv);
fs.writeFileSync('app/admin/page.tsx', content, 'utf8');
console.log('SUCCESS: Complaint modal added');
