import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MemberStatementModal({ member, collectionDate, onClose }) {
  const [statement, setStatement] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const memberId = member?._id || member?.id;
  const memberName = member?.name || 'Member';
  const memberCode = member?.memberId || '';
  const memberPhone = member?.phoneNumber || '';

  const fetchStatement = async () => {
    if (!memberId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/member-statement/${memberId}`, {
        params: { date: collectionDate || undefined }
      });
      if (res.data.success) {
        setStatement(res.data.statement || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load member statement history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [memberId, collectionDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
      {/* Inline styles for professional Print to PDF layout */}
      <style>{`
        @media print {
          body {
            visibility: hidden !important;
            background: #fff !important;
          }
          #printable-member-statement, #printable-member-statement * {
            visibility: visible !important;
          }
          #printable-member-statement {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .d-print-none {
            display: none !important;
          }
          .modal {
            position: static !important;
            display: block !important;
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .modal-dialog {
            max-width: 100% !important;
            margin: 0 !important;
          }
          .modal-content {
            border: none !important;
            box-shadow: none !important;
          }
          .table-responsive {
            overflow: visible !important;
          }
          .table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .table th, .table td {
            border: 1px solid #ccc !important;
            padding: 8px 10px !important;
            font-size: 10pt !important;
          }
          .table-light {
            background-color: #f8f9fa !important;
          }
        }
      `}</style>

      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content border-0 shadow-lg" id="printable-member-statement">
          {/* Header */}
          <div className="modal-header bg-dark text-white py-3">
            <div>
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-file-earmark-spreadsheet text-info"></i>
                Detailed Payment History &amp; Statement — {memberName}
                <span className="badge bg-light text-dark font-monospace ms-1">{memberCode}</span>
              </h5>
              <small className="text-white-50">
                Tracking all transactions from the start till now &bull; Collection Date: {collectionDate ? `${collectionDate}th` : 'All Dates'} {memberPhone && `&bull; Phone: ${memberPhone}`}
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              
            </div>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Printable Letterhead Header for exported PDF */}
            <div className="d-none d-print-block border-bottom pb-3 mb-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h3 className="fw-bold mb-1 text-dark">Chitti Fund — Payment Statement</h3>
                  <p className="mb-0 text-secondary">
                    Member: <strong>{memberName}</strong> ({memberCode}) &bull; Phone: {memberPhone || '—'}
                  </p>
                </div>
                <div className="text-end text-muted small">
                  <div>Statement Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div>Collection Day: {collectionDate ? `${collectionDate}th of every month` : 'All assigned dates'}</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2 d-print-none">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>{error}</div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                Loading complete statement records...
              </div>
            ) : statement.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                No payment history records found for this member.
              </div>
            ) : (
              <div className="table-responsive border rounded-3 shadow-xs">
                <table className="table table-hover align-middle mb-0 text-nowrap">
                  <thead className="table-light small text-secondary">
                    <tr>
                      <th style={{ width: '4%' }}>#</th>
                      <th style={{ width: '9%' }}>Period</th>
                      <th style={{ width: '16%' }}>Date of Pay &amp; Time</th>
                      <th className="text-end" style={{ width: '11%' }}>Pending Amt</th>
                      <th className="text-end" style={{ width: '11%' }}>Actual (This Month)</th>
                      <th className="text-end" style={{ width: '11%' }}>Total Due</th>
                      <th className="text-end" style={{ width: '11%' }}>Paid That Month</th>
                      <th className="text-end" style={{ width: '11%' }}>Remaining Amt</th>
                      <th style={{ width: '16%' }}>Note / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.map((item, index) => {
                      const isFullyCleared = item.remainingAmount === 0;
                      return (
                        <tr key={index} className="small">
                          <td className="text-muted">{index + 1}</td>
                          <td className="fw-semibold text-dark">
                            <span className="badge bg-light text-dark border">
                              {item.period}
                            </span>
                          </td>
                          <td className="text-muted">
                            {item.dateOfPay
                              ? new Date(item.dateOfPay).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })
                              : '—'}
                          </td>
                          {/* Pending Amount */}
                          <td className="text-end fw-semibold">
                            {item.pendingAmount > 0 ? (
                              <span className="text-warning-emphasis">₹{item.pendingAmount.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-muted">₹0</span>
                            )}
                          </td>
                          {/* Actual Amount in that month */}
                          <td className="text-end fw-semibold text-dark">
                            ₹{item.actualAmount.toLocaleString('en-IN')}
                          </td>
                          {/* Total Due (Pending + Actual) */}
                          <td className="text-end fw-bold text-dark">
                            ₹{item.totalDue.toLocaleString('en-IN')}
                          </td>
                          {/* Paid that month */}
                          <td className="text-end fw-bold text-success">
                            {item.paidAmount > 0 ? (
                              `₹${item.paidAmount.toLocaleString('en-IN')}`
                            ) : (
                              <span className="text-muted">₹0</span>
                            )}
                          </td>
                          {/* Remaining Amount */}
                          <td className="text-end fw-bold">
                            {isFullyCleared ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                <i className="bi bi-check2-circle me-1"></i>₹0
                              </span>
                            ) : (
                              <span className="text-danger">
                                ₹{item.remainingAmount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </td>
                          {/* Note / Remarks */}
                          <td>
                            <span className="text-muted text-break">
                              {item.note || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light py-2 px-4 d-flex justify-content-between align-items-center d-print-none">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Statement calculates running balances sequentially from starting collection to current.
            </small>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
                onClick={handlePrint}
              >
                <i className="bi bi-printer-fill"></i> Print / Save as PDF
              </button>
              <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemberStatementModal;
