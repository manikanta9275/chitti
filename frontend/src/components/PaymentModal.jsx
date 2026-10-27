import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function PaymentModal({ payment, memberHistory = [], onClose, onPaymentUpdated }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'history'

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const memberName = payment.memberId?.name || 'Member';
  const memberId = payment.memberId?.memberId || '';
  const actualRupees = payment.actualAmountRupees || payment.actualAmountPaise / 100;
  const paidRupees = payment.totalPaidRupees || payment.totalPaidPaise / 100;
  const remainingRupees = payment.balanceRupees !== undefined ? payment.balanceRupees : Math.max(0, actualRupees - paidRupees);

  // Fetch full details and transactions history
  const fetchPaymentDetails = async () => {
    setFetchingHistory(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/${payment._id}`);
      if (res.data.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchPaymentDetails();
  }, [payment._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const txType = numAmount >= remainingRupees ? 'FULL_PAYMENT' : 'INSTALLMENT';
      const res = await axios.post(`${apiBaseUrl}/payments/${payment._id}/transactions`, {
        amount: numAmount,
        transactionType: txType,
        notes
      });

      if (res.data.success) {
        if (onPaymentUpdated) {
          onPaymentUpdated(res.data.payment);
        }
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          {/* Modal Header */}
          <div className="modal-header bg-primary text-white py-3">
            <div>
              <h5 className="modal-title fw-bold d-flex align-items-center gap-2 mb-0">
                <i className="bi bi-cash-stack"></i>
                Payment Management — {memberName}
                <span className="badge bg-light text-primary font-monospace ms-1">{memberId}</span>
              </h5>
              <small className="text-white-50">
                Date: {payment.collectionDate}th &bull; Entered by: {user?.displayName}
              </small>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Modal Nav Tabs */}
          <div className="bg-light px-4 pt-3 border-bottom">
            <ul className="nav nav-tabs border-bottom-0">
              <li className="nav-item">
                <button
                  className={`nav-link fw-semibold ${activeTab === 'record' ? 'active bg-white' : 'text-secondary'}`}
                  onClick={() => setActiveTab('record')}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Record Payment / Installment
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-semibold ${activeTab === 'history' ? 'active bg-white' : 'text-secondary'}`}
                  onClick={() => setActiveTab('history')}
                >
                  <i className="bi bi-clock-history me-1"></i>
                  Payment History ({transactions.length})
                </button>
              </li>
            </ul>
          </div>

          {/* Summary Strip */}
          <div className="px-4 py-3 bg-white border-bottom">
            <div className={`p-3 border rounded text-center ${remainingRupees === 0 ? 'bg-light' : 'bg-warning-subtle border-warning-subtle'}`}>
              <span className="text-secondary small d-block mb-1">Remaining Balance</span>
              <span className={`fw-bold fs-4 ${remainingRupees === 0 ? 'text-muted' : 'text-danger'}`}>
                ₹{remainingRupees.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4">
            {activeTab === 'record' ? (
              remainingRupees === 0 ? (
                <div className="text-center py-4">
                  <div className="display-4 text-success mb-2">
                    <i className="bi bi-check-circle-fill"></i>
                  </div>
                  <h5 className="fw-bold text-success">Fully Paid!</h5>
                  <p className="text-muted mb-3">
                    This member has completed their total collection amount of ₹{actualRupees.toLocaleString('en-IN')}.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setActiveTab('history')}
                  >
                    View Payment History
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <div>{error}</div>
                    </div>
                  )}

                  {/* Payment Amount Input */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Payment Amount (₹) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-light fw-bold text-primary">₹</span>
                      <input
                        type="number"
                        className="form-control fw-bold fs-4 text-primary"
                        placeholder="0"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    {parseFloat(amount || 0) > remainingRupees ? (
                      <div className="alert alert-info py-2 small mt-2 mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-info-circle-fill fs-5"></i>
                        <div>
                          <strong>Advance Payment:</strong> ₹{remainingRupees.toLocaleString('en-IN')} will fully pay this collection, and the excess <strong>₹{(parseFloat(amount) - remainingRupees).toLocaleString('en-IN')}</strong> will automatically be credited to next month!
                        </div>
                      </div>
                    ) : (
                      <small className="text-muted">
                        Remaining balance for this collection: ₹{remainingRupees.toLocaleString('en-IN')}
                      </small>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Payment Notes / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Cash received by Mani, UPI Ref 1234..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary fw-semibold px-4"
                      disabled={loading || !amount}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle me-1"></i>
                          Record Payment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )
            ) : (
              /* Payment History Tab */
              <div>
                {/* ── Month-by-Month Summary (previous + current merged) ── */}
                {memberHistory.length > 0 && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-secondary mb-2">
                      <i className="bi bi-calendar3 me-1"></i>
                      Month-by-Month Payment Summary
                    </h6>
                    <div className="table-responsive border rounded-3">
                      <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>Period</th>
                            <th>Date</th>
                            <th className="text-end">Amount Paid</th>
                            <th className="text-end">Balance</th>
                            <th className="text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberHistory.map((h, i) => (
                            <tr key={i}>
                              <td className="text-muted">{h.month ? `${h.month}/${h.year}` : '—'}</td>
                              <td>{h.collectionDate ? `${h.collectionDate}th` : '—'}</td>
                              <td className="text-end fw-bold text-success">
                                ₹{(h.amountPaidRupees || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="text-end fw-bold">
                                {(h.balanceRupees || 0) === 0
                                  ? <span className="text-muted">₹0</span>
                                  : <span className="text-danger">₹{(h.balanceRupees).toLocaleString('en-IN')}</span>}
                              </td>
                              <td className="text-center">
                                {(h.status === 'PAID' || h.status === 'paid') && (
                                  <span className="badge bg-success-subtle text-success">
                                    <i className="bi bi-check2-circle me-1"></i>Paid
                                  </span>
                                )}
                                {(h.status === 'PARTIAL' || h.status === 'pending' || h.status === 'PENDING') && (
                                  <span className="badge bg-warning-subtle text-warning-emphasis">
                                    <i className="bi bi-hourglass-split me-1"></i>Pending
                                  </span>
                                )}
                                {(h.status === 'NOT_PAID' || h.status === 'not_paid') && (
                                  <span className="badge bg-danger-subtle text-danger">
                                    <i className="bi bi-x-circle me-1"></i>Not Paid
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Installment Transactions (this month) ── */}
                <h6 className="fw-bold text-secondary mb-2">
                  <i className="bi bi-receipt me-1"></i>
                  Installment Transactions — This Month ({transactions.length})
                </h6>
                {fetchingHistory ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    <span className="text-muted">Loading transactions...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                    No payments have been recorded yet for this member.
                  </div>
                ) : (
                  <div className="table-responsive border rounded-3">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small">
                        <tr>
                          <th>Date &amp; Time</th>
                          <th>Amount</th>
                          <th>Type</th>
                          <th>Recorded By</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx._id} className="small">
                            <td className="text-nowrap text-muted">
                              {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="fw-bold text-success text-nowrap">
                              +₹{(tx.amountRupees || tx.amountPaise / 100).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <span className="badge bg-light text-secondary border">
                                {tx.transactionType}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold text-dark">
                                <i className="bi bi-person me-1 text-primary"></i>
                                {tx.enteredByName}
                              </span>
                            </td>
                            <td className="text-muted">{tx.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
