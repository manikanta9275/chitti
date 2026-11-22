import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PaymentModal from './PaymentModal';
import WhatsAppModal from './WhatsAppModal';
import MemberStatementModal from './MemberStatementModal';
import {
  saveOfflinePayments,
  getOfflinePayments,
  getOfflineSummary,
  saveOfflineSummary,
  getOfflineMembers,
  getOfflineConfig,
  isOnline
} from '../utils/offlineSync';

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
  const [memberPendingMap, setMemberPendingMap] = useState({}); // memberId -> previousPendingRupees
  const [deletingDate, setDeletingDate] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [notConfiguredMsg, setNotConfiguredMsg] = useState('');

  const toggleMemberExpand = (id) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

  // Fetch current month collection records (online with local offline fallback)
  const fetchPayments = async () => {
    // 1. FAST RESPONSE (0ms delay): Render cached records immediately so UI is instant
    const initialCached = getOfflinePayments(month, year, date);
    if (initialCached && Array.isArray(initialCached.payments) && initialCached.payments.length > 0) {
      let list = initialCached.payments;
      if (search) {
        const s = search.toLowerCase();
        list = list.filter((p) => p.memberId?.name?.toLowerCase().includes(s) || p.memberId?.phoneNumber?.includes(s));
      }
      if (statusFilter !== 'ALL') {
        list = list.filter((p) => p.status === statusFilter);
      }
      setPayments(list);
      if (initialCached.period) setPeriod(initialCached.period);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await axios.get(`${apiBaseUrl}/payments`, {
        params: { month, year, date, search, status: statusFilter !== 'ALL' ? statusFilter : undefined },
        timeout: 10000
      });
      if (res.data.success) {
        if (res.data.notConfigured) {
          setPayments([]);
          if (res.data.period) setPeriod(res.data.period);
          setNotConfiguredMsg(res.data.message || `Chitti for ${date}th was not started or active in ${MONTH_NAMES[month]} ${year}.`);
        } else {
          setNotConfiguredMsg('');
          const fetched = res.data.payments || [];
          setPayments(fetched);
          if (res.data.period) setPeriod(res.data.period);
          if (res.data.memberPendingMap) {
            setMemberPendingMap(res.data.memberPendingMap);
          }
          saveOfflinePayments(month, year, date, fetched, res.data.period);
        }
      }
    } catch (err) {
      // Offline fallback: load from cached payments
      let cached = getOfflinePayments(month, year, date);
      const cachedConfig = getOfflineConfig(month, year);
      const isDateInConfig = cachedConfig?.collectionDates?.includes(Number(date));

      if (!isDateInConfig && (!cached || !cached.payments || cached.payments.length === 0)) {
        setPayments([]);
        setNotConfiguredMsg(`Chitti for ${date}th was not started or active in ${MONTH_NAMES[month]} ${year}.`);
        return;
      }

      setNotConfiguredMsg('');
      const offlineMembersObj = getOfflineMembers();
      const offlineMembersList = Array.isArray(offlineMembersObj?.members) ? offlineMembersObj.members : [];
      const activeMembers = offlineMembersList.filter((m) => m.isActive !== false);
      const actualAmount = cachedConfig?.actualAmountRupees || period?.actualAmountRupees || 4500;

      if (!cached || !Array.isArray(cached.payments) || cached.payments.length === 0) {
        const dNum = Number(date);
        const membersForDate = activeMembers.filter((m) => {
          const dates = m.assignedDates;
          if (!dates || dates.length === 0) return true;
          return dates.includes(dNum);
        });

        const synthPayments = membersForDate.map((m) => ({
          _id: `off_p_${m._id || m.memberId}_${date}`,
          memberId: m,
          collectionDate: dNum,
          actualAmountRupees: actualAmount,
          totalPaidRupees: 0,
          balanceRupees: actualAmount,
          status: 'NOT_PAID'
        }));

        const synthPeriod = cachedConfig || period || {
          month: Number(month),
          year: Number(year),
          actualAmountRupees: actualAmount
        };

        cached = {
          payments: synthPayments,
          period: synthPeriod,
          updatedAt: Date.now()
        };
        saveOfflinePayments(month, year, date, synthPayments, synthPeriod);
      }

      let list = cached.payments || [];
      if (search) {
        const s = search.toLowerCase();
        list = list.filter((p) => p.memberId?.name?.toLowerCase().includes(s) || p.memberId?.phoneNumber?.includes(s));
      }
      if (statusFilter !== 'ALL') {
        list = list.filter((p) => p.status === statusFilter);
      }
      setPayments(list);
      if (cached.period) setPeriod(cached.period);
    } finally {
      setLoading(false);
    }
  };

  // Fetch merged historical payments (previous month) for each member on this date
  const fetchHistorical = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/dashboard/summary`, {
        params: { month, year },
        timeout: 10000
      });
      if (res.data.success) {
        saveOfflineSummary(month, year, res.data);
        const dateObj = (res.data.datesBreakdown || []).find(d => Number(d.date) === Number(date));
        const map = {};
        const pMap = {};
        (dateObj?.members || []).forEach(m => {
          map[m.memberId] = m.paymentHistory || [];
          pMap[m.memberId] = m.previousPendingRupees || 0;
        });
        setMemberHistories(map);
        setMemberPendingMap(prev => ({ ...prev, ...pMap }));
      }
    } catch (e) {
      const cachedSummary = getOfflineSummary(month, year);
      if (cachedSummary) {
        const dateObj = (cachedSummary.datesBreakdown || []).find(d => Number(d.date) === Number(date));
        const map = {};
        const pMap = {};
        (dateObj?.members || []).forEach(m => {
          map[m.memberId] = m.paymentHistory || [];
          pMap[m.memberId] = m.previousPendingRupees || 0;
        });
        setMemberHistories(map);
        setMemberPendingMap(prev => ({ ...prev, ...pMap }));
      }
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, date, search, statusFilter]);

  useEffect(() => {
    fetchHistorical();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, date]);

  const handlePaymentUpdated = (updatedPayment) => {
    // Immediately update local React state so user sees deposit results instantly on screen!
    if (updatedPayment && updatedPayment._id) {
      setPayments((prev) =>
        prev.map((p) => (p._id === updatedPayment._id ? { ...p, ...updatedPayment } : p))
      );
    }
    const isOff = !isOnline();
    setFeedback({
      type: 'success',
      message: isOff
        ? 'Payment deposited and saved locally! Click "Update to DB" when network is available.'
        : 'Payment recorded successfully! Database updated.'
    });
    fetchPayments();
    fetchHistorical();
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleAfterPayment = (updatedPayment) => {
    handlePaymentUpdated(updatedPayment);
    // Auto-open WhatsApp with updated paid + balance info
    const paid = updatedPayment.totalPaidRupees ?? (updatedPayment.totalPaidPaise / 100);
    const actual = updatedPayment.actualAmountRupees ?? (updatedPayment.actualAmountPaise / 100);
    const balance = Math.max(0, actual - paid);
    setSelectedPayment(null);
    setSelectedWhatsAppPayment({
      ...updatedPayment,
      actualAmountRupees: actual,
      totalPaidRupees: paid,
      balanceRupees: balance
    });
  };

  const handleWhatsAppReminder = (payment) => {
    setSelectedWhatsAppPayment(payment);
  };

  // Base amount for current period (without carry-forward)
  const baseMonthAmount = period?.actualAmountRupees || 0;

  // Helper to compute amounts for a payment row
  const getPaymentRowData = (p) => {
    const memberIdStr = p.memberId?._id || p.memberId;
    const histEntries = memberHistories[memberIdStr] || [];
    const prevEntries = histEntries.filter(
      (h) => Number(h.month) !== Number(month) || Number(h.year) !== Number(year)
    );
    const lastPrev = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1] : null;

    let pendingAmount = 0;
    if (memberPendingMap[memberIdStr] !== undefined) {
      pendingAmount = memberPendingMap[memberIdStr];
    } else if (lastPrev) {
      pendingAmount =
        lastPrev.status === 'PAID' || lastPrev.balanceRupees === 0
          ? 0
          : Math.max(0, lastPrev.balanceRupees);
    } else {
      pendingAmount = Math.max(
        0,
        (p.actualAmountRupees || p.actualAmountPaise / 100) - (baseMonthAmount || 0)
      );
    }

    const presentMonthAmount = baseMonthAmount || (p.actualAmountRupees || p.actualAmountPaise / 100);
    const totalAmount = presentMonthAmount + pendingAmount;
    const paid = p.totalPaidRupees || p.totalPaidPaise / 100;
    const balance = Math.max(0, totalAmount - paid);

    return {
      memberIdStr,
      presentMonthAmount,
      pendingAmount,
      totalAmount,
      paid,
      balance
    };
  };

  return (
    <div className="container py-4 flex-grow-1">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 mb-2 shadow-xs" onClick={onBack}>
            <i className="bi bi-arrow-left"></i> Back to Collection Dates
          </button>
          {/* <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-calendar2-check text-primary"></i>
            Collection Details — {date} {MONTH_NAMES[month]} {year}
          </h3> */}
          {/* <small className="text-muted">Shared database records • All 4 accounts can view &amp; record payments</small> */}
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

      {/* If this collection date was not started / active in this month */}
      {notConfiguredMsg ? (
        <div className="card shadow-sm border-0 border-start border-warning border-4 p-4 text-center my-4">
          <div className="py-4">
            <i className="bi bi-exclamation-triangle-fill text-warning display-4 d-block mb-3"></i>
            <h4 className="fw-bold text-dark mb-2">{notConfiguredMsg}</h4>
            <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '480px' }}>
              No collection records exist for <strong>{date}th {MONTH_NAMES[month]} {year}</strong> because the chitti for this date was not active or started in this month.
            </p>
            <button className="btn btn-outline-secondary px-4 fw-semibold" onClick={onBack}>
              <i className="bi bi-arrow-left me-2"></i> Return to Collection Dates
            </button>
          </div>
        </div>
      ) : (
        <>
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

      {/* Mobile Phone View (Only displays Member Name & Total Amount; expands on clicking name/row) */}
      <div className="d-md-none mb-4">
        {loading && payments.length === 0 ? (
          <div className="card shadow-sm border-0 p-4 text-center text-muted">
            <div className="spinner-border text-primary spinner-border-sm me-2"></div> Loading collection records...
          </div>
        ) : payments.length === 0 ? (
          <div className="card shadow-sm border-0 p-4 text-center text-muted">
            <i className="bi bi-inbox fs-2 d-block mb-2"></i> No collection records found.
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {payments.map((p, index) => {
              const {
                presentMonthAmount,
                pendingAmount,
                totalAmount,
                paid,
                balance
              } = getPaymentRowData(p);
              const isExpanded = !!expandedMembers[p._id];

              return (
                <div key={`mob_${p._id}`} className="card shadow-sm border-0 overflow-hidden">
                  {/* Row Header: Displays ONLY Member Name & Total Amount */}
                  <div
                    className="card-body p-3 d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#f8f9fa' : '#ffffff' }}
                    onClick={() => toggleMemberExpand(p._id)}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '11px' }}>
                        #{index + 1}
                      </span>
                      {p.memberId?.isStarred && (
                        <i className="bi bi-star-fill text-warning" title="Starred Member"></i>
                      )}
                      <span className="fw-bold text-dark fs-6">{p.memberId?.name}</span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <div className="text-end">
                        <small className="text-muted d-block" style={{ fontSize: '10px' }}>Total Amount</small>
                        <span className="fw-bold text-dark fs-6">₹{totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <i className={`bi bi-chevron-${isExpanded ? 'up text-primary' : 'down text-muted'} fs-6 ms-1`}></i>
                    </div>
                  </div>

                  {/* Expanded Section: Displays Remaining Details & 3 Action Buttons */}
                  {isExpanded && (
                    <div className="card-footer bg-white border-top p-3">
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="p-2 bg-light rounded border">
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>
                              Present Month ({MONTH_NAMES[month]})
                            </small>
                            <strong className="text-dark">₹{presentMonthAmount.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 bg-light rounded border">
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>
                              Pending Amt (Prev Month)
                            </small>
                            <strong className={pendingAmount > 0 ? 'text-warning-emphasis' : 'text-muted'}>
                              {pendingAmount > 0 ? `₹${pendingAmount.toLocaleString('en-IN')}` : '—'}
                            </strong>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 bg-light rounded border">
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>Total Amount</small>
                            <strong className="text-primary">
                              ₹{totalAmount.toLocaleString('en-IN')}
                              {pendingAmount > 0 && (
                                <span className="text-muted fw-normal ms-1" style={{ fontSize: '10px' }}>
                                  ({presentMonthAmount}+{pendingAmount})
                                </span>
                              )}
                            </strong>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 bg-light rounded border">
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>Total Paid</small>
                            <strong className="text-success">₹{paid.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 bg-light rounded border">
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>Remaining Balance</small>
                            <strong className={balance === 0 ? 'text-muted' : 'text-danger'}>
                              {balance === 0 ? '—' : `₹${balance.toLocaleString('en-IN')}`}
                            </strong>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 bg-light rounded border">
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>Status</small>
                            <div>
                              {p.status === 'PAID' && <span className="badge bg-success-subtle text-success"><i className="bi bi-check2-circle me-1"></i>Paid</span>}
                              {p.status === 'PARTIAL' && <span className="badge bg-warning-subtle text-warning-emphasis"><i className="bi bi-hourglass-split me-1"></i>Partial</span>}
                              {p.status === 'NOT_PAID' && <span className="badge bg-danger-subtle text-danger"><i className="bi bi-x-circle me-1"></i>Not Paid</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="row g-2">
                        <div className="col-6">
                          <button
                            className="btn btn-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
                            onClick={() => setSelectedPayment({
                              ...p,
                              actualAmountRupees: totalAmount,
                              balanceRupees: balance,
                              status: balance === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'NOT_PAID')
                            })}
                            title="Record or Edit Payment"
                          >
                            <i className="bi bi-pencil-square"></i> Edit
                          </button>
                        </div>
                        <div className="col-6">
                          <button
                            className="btn btn-outline-info text-dark btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
                            onClick={() => setSelectedStatementMember(p.memberId)}
                            title="View Complete Payment History & Statement"
                          >
                            <i className="bi bi-file-earmark-spreadsheet"></i> Details
                          </button>
                        </div>
                        <div className="col-6">
                          <button
                            className="btn btn-success btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 py-2 fw-semibold"
                            onClick={() => handleWhatsAppReminder({
                              ...p,
                              actualAmountRupees: totalAmount,
                              balanceRupees: balance
                            })}
                            title="Send WhatsApp Payment Details & Reminder"
                          >
                            <i className="bi bi-whatsapp"></i> Reminder
                          </button>
                        </div>
                        <div className="col-6">
                          <a
                            href={p.memberId?.phoneNumber ? `tel:${p.memberId.phoneNumber}` : '#'}
                            className={`btn btn-outline-secondary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 py-2 fw-semibold ${!p.memberId?.phoneNumber ? 'disabled' : ''}`}
                            title={p.memberId?.phoneNumber ? `Direct Call to ${p.memberId.name} (${p.memberId.phoneNumber})` : 'No phone number'}
                          >
                            <i className="bi bi-telephone-fill text-success"></i> Call
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Payments Table (Screen md and above: d-none d-md-block) */}
      <div className="card shadow-sm border-0 d-none d-md-block">
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
                  const {
                    presentMonthAmount,
                    pendingAmount,
                    totalAmount,
                    paid,
                    balance
                  } = getPaymentRowData(p);

                  return (
                    <React.Fragment key={p._id}>
                      <tr>
                        <td className="text-muted small">{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            {p.memberId?.isStarred && (
                              <i className="bi bi-star-fill text-warning me-1" title="Starred Member"></i>
                            )}
                            <span className="fw-bold text-dark">{p.memberId?.name}</span>
                          </div>
                          {p.memberId?.phoneNumber && (
                            <a
                              href={`tel:${p.memberId.phoneNumber}`}
                              className="text-muted small text-decoration-none d-inline-flex align-items-center gap-1 mt-1"
                              style={{ fontSize: '11px' }}
                              title={`Direct Call ${p.memberId.name}`}
                            >
                              <i className="bi bi-telephone-fill text-success" style={{ fontSize: '10px' }}></i>
                              {p.memberId.phoneNumber}
                            </a>
                          )}
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
                              onClick={() => setSelectedPayment({
                                ...p,
                                actualAmountRupees: totalAmount,
                                balanceRupees: balance,
                                status: balance === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'NOT_PAID')
                              })}
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
                            <button
                              className="btn btn-success d-inline-flex align-items-center gap-1"
                              onClick={() => handleWhatsAppReminder({
                                ...p,
                                actualAmountRupees: totalAmount,
                                balanceRupees: balance
                              })}
                              title="Send WhatsApp Payment Details & Reminder"
                            >
                              <i className="bi bi-whatsapp"></i> Reminder
                            </button>
                            {p.memberId?.phoneNumber && (
                              <a
                                href={`tel:${p.memberId.phoneNumber}`}
                                className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
                                title={`Direct Call to ${p.memberId.name} (${p.memberId.phoneNumber})`}
                              >
                                <i className="bi bi-telephone-fill text-success"></i> Call
                              </a>
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
      </>
      )}

      {/* Modals */}
      {selectedPayment && (
        <PaymentModal
          payment={selectedPayment}
          memberHistory={memberHistories[selectedPayment.memberId?._id] || []}
          onClose={() => setSelectedPayment(null)}
          onPaymentUpdated={handlePaymentUpdated}
          onAfterPayment={handleAfterPayment}
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
