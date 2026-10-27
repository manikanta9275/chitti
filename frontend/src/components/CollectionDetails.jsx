import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PaymentModal from './PaymentModal';
import WhatsAppModal from './WhatsAppModal';
import MemberStatementModal from './MemberStatementModal';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function CollectionDetails({ month, year, date, onBack }) {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [period, setPeriod] = useState(null); // period info including base actualAmountRupees
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedStatementMember, setSelectedStatementMember] = useState(null);
  const [selectedWhatsAppPayment, setSelectedWhatsAppPayment] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [memberHistories, setMemberHistories] = useState({}); // memberId -> merged paymentHistory
  const [deletingDate, setDeletingDate] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleDeleteDatePayments = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL payment records and transactions for ${date}th ${MONTH_NAMES[month]} ${year}? This cannot be undone.`)) {
      return;
    }
    setDeletingDate(true);
    try {
      const res = await axios.delete(`${apiBaseUrl}/collections/date`, {
        data: { month, year, date }
      });
      setFeedback({ type: 'success', message: res.data?.message || 'Date payment records deleted successfully.' });
      fetchPayments();
      fetchHistorical();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.response?.data?.message || 'Failed to delete date records.' });
    } finally {
      setDeletingDate(false);
    }
  };

  // Fetch current month collection records
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/payments`, {
        params: { month, year, date, search, status: statusFilter !== 'ALL' ? statusFilter : undefined }
      });
      if (res.data.success) {
        setPayments(res.data.payments || []);
        // Store period so we know the base actualAmountRupees (without carry-forward)
        if (res.data.period) setPeriod(res.data.period);
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to load collection records.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch merged historical payments (previous month) for each member on this date
  const fetchHistorical = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/dashboard/summary`, {
        params: { month, year }
      });
      if (res.data.success) {
        const dateObj = (res.data.datesBreakdown || []).find(d => Number(d.date) === Number(date));
        const map = {};
        (dateObj?.members || []).forEach(m => {
          // paymentHistory contains merged previous + current month entries
          map[m.memberId] = m.paymentHistory || [];
        });
        setMemberHistories(map);
      }
    } catch (e) {
      console.error('Failed to fetch historical data', e);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchHistorical();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, date, search, statusFilter]);

  const handlePaymentUpdated = () => {
    setFeedback({ type: 'success', message: 'Payment recorded successfully! Shared database refreshed.' });
    fetchPayments();
    fetchHistorical();
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleWhatsAppReminder = payment => {
    if (!isAdmin) return;
    setSelectedWhatsAppPayment(payment);
  };

  // Base amount for current period (without carry-forward)
  const baseMonthAmount = period?.actualAmountRupees || 0;

  return (
    <div className="container py-4 flex-grow-1">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 mb-2 shadow-xs" onClick={onBack}>
            <i className="bi bi-arrow-left"></i> Back to Collection Dates
          </button>
          <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-calendar2-check text-primary"></i>
            Collection Details — {date} {MONTH_NAMES[month]} {year}
          </h3>
          <small className="text-muted">Shared database records • All 4 accounts can view &amp; record payments</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          {isAdmin && (
            <button
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
              onClick={handleDeleteDatePayments}
              disabled={deletingDate || loading}
              title="Delete all payment records for this collection date"
            >
              <i className="bi bi-trash-fill"></i>
              <span>{deletingDate ? 'Deleting...' : 'Delete All Payments for Date'}</span>
            </button>
          )}
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 shadow-sm" onClick={() => { fetchPayments(); fetchHistorical(); }} disabled={loading}>
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i> Refresh Records
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show`} role="alert">
          <i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
          {feedback.message}
          <button type="button" className="btn-close" onClick={() => setFeedback(null)}></button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light"><i className="bi bi-search text-muted"></i></span>
                <input type="text" className="form-control" placeholder="Search by member name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>Clear</button>}
              </div>
            </div>
            <div className="col-12 col-md-6 d-flex justify-content-md-end">
              <div className="btn-group btn-group-sm w-100 w-md-auto">
                <button className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setStatusFilter('ALL')}>All</button>
                <button className={`btn ${statusFilter === 'PAID' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setStatusFilter('PAID')}>Paid</button>
                <button className={`btn ${statusFilter === 'PARTIAL' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`} onClick={() => setStatusFilter('PARTIAL')}>Partial</button>
                <button className={`btn ${statusFilter === 'NOT_PAID' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setStatusFilter('NOT_PAID')}>Not Paid</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-nowrap">
            <thead className="table-light small text-secondary">
              <tr>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: '20%' }}>Member Name</th>
                {/* Amount columns */}
                <th className="text-end" style={{ width: '11%' }}>
                  Present Month
                  <div className="fw-normal text-muted" style={{ fontSize: '10px' }}>({MONTH_NAMES[month]})</div>
                </th>
                <th className="text-end" style={{ width: '11%' }}>
                  Pending Amt
                  <div className="fw-normal text-muted" style={{ fontSize: '10px' }}>(Prev Month)</div>
                </th>
                <th className="text-end" style={{ width: '11%' }}>
                  Total Amount
                  <div className="fw-normal text-muted" style={{ fontSize: '10px' }}>(Present+Pending)</div>
                </th>
                <th className="text-end" style={{ width: '11%' }}>Total Paid</th>
                <th className="text-end" style={{ width: '11%' }}>Remaining Balance</th>
                <th className="text-center" style={{ width: '10%' }}>Status</th>
                <th className="text-center" style={{ width: '11%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div> Loading collection records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-2 d-block mb-2"></i> No collection records found.
                  </td>
                </tr>
              ) : (
                payments.map((p, index) => {
                  // totalAmount = actualAmountRupees on the payment (includes carry-forward)
                  const totalAmount = p.actualAmountRupees || p.actualAmountPaise / 100;
                  // presentMonthAmount = base period amount (no carry-forward)
                  const presentMonthAmount = baseMonthAmount || totalAmount;
                  // pendingAmount = carry-forward from previous month
                  const pendingAmount = Math.max(0, totalAmount - presentMonthAmount);
                  const paid = p.totalPaidRupees || p.totalPaidPaise / 100;
                  const balance = Math.max(0, p.balanceRupees !== undefined ? p.balanceRupees : totalAmount - paid);

                  return (
                    <React.Fragment key={p._id}>
                      <tr>
                        <td className="text-muted small">{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-light text-dark border font-monospace small">{p.memberId?.memberId}</span>
                            <span className="fw-bold text-dark"><i className="bi bi-star-fill me-1 text-warning"></i>{p.memberId?.name}</span>
                          </div>
                        </td>

                        {/* Present Month Amount */}
                        <td className="text-end fw-semibold text-dark">
                          ₹{presentMonthAmount.toLocaleString('en-IN')}
                        </td>

                        {/* Pending Amount (carry-forward) */}
                        <td className="text-end fw-semibold">
                          {pendingAmount > 0
                            ? <span className="text-warning-emphasis">₹{pendingAmount.toLocaleString('en-IN')}</span>
                            : <span className="text-muted">—</span>}
                        </td>

                        {/* Total Amount = Present + Pending */}
                        <td className="text-end fw-bold text-dark">
                          ₹{totalAmount.toLocaleString('en-IN')}
                          {pendingAmount > 0 && (
                            <div className="text-muted fw-normal" style={{ fontSize: '10px' }}>
                              {presentMonthAmount}+{pendingAmount}
                            </div>
                          )}
                        </td>

                        {/* Total Paid */}
                        <td className="text-end fw-bold text-success">
                          ₹{paid.toLocaleString('en-IN')}
                        </td>

                        {/* Remaining Balance */}
                        <td className="text-end fw-bold">
                          {balance === 0
                            ? <span className="text-muted">—</span>
                            : <span className="text-danger">₹{balance.toLocaleString('en-IN')}</span>}
                        </td>

                        {/* Status */}
                        <td className="text-center">
                          {p.status === 'PAID' && <span className="badge bg-success-subtle text-success px-2 py-1"><i className="bi bi-check2-circle me-1"></i>Paid</span>}
                          {p.status === 'PARTIAL' && <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1"><i className="bi bi-hourglass-split me-1"></i>Partial</span>}
                          {p.status === 'NOT_PAID' && <span className="badge bg-danger-subtle text-danger px-2 py-1"><i className="bi bi-x-circle me-1"></i>Not Paid</span>}
                        </td>

                        {/* Actions */}
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-primary d-inline-flex align-items-center gap-1"
                              onClick={() => setSelectedPayment(p)}
                              title="Record or Edit Payment"
                            >
                              <i className="bi bi-pencil-square"></i> Edit
                            </button>
                            <button
                              className="btn btn-outline-info text-dark d-inline-flex align-items-center gap-1"
                              onClick={() => setSelectedStatementMember(p.memberId)}
                              title="View Complete Payment History & Statement"
                            >
                              <i className="bi bi-file-earmark-spreadsheet"></i> Details
                            </button>
                            {isAdmin && (
                              <button
                                className="btn btn-success d-inline-flex align-items-center gap-1"
                                onClick={() => handleWhatsAppReminder(p)}
                                title="Send WhatsApp Payment Reminder (Admin Only)"
                                disabled={balance === 0}
                              >
                                <i className="bi bi-whatsapp"></i> Reminder
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          memberHistory={memberHistories[selectedPayment.memberId?._id] || []}
          onClose={() => setSelectedPayment(null)}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}
      {selectedStatementMember && (
        <MemberStatementModal
          member={selectedStatementMember}
          collectionDate={date}
          onClose={() => setSelectedStatementMember(null)}
        />
      )}
      {selectedWhatsAppPayment && (
        <WhatsAppModal
          payment={selectedWhatsAppPayment}
          baseMonthAmount={baseMonthAmount}
          basicAmount={period?.basicAmountRupees !== undefined ? period.basicAmountRupees : 5000}
          bonus={period?.bonusRupees || 0}
          month={month}
          year={year}
          date={date}
          onClose={() => setSelectedWhatsAppPayment(null)}
        />
      )}
    </div>
  );
}

export default CollectionDetails;
