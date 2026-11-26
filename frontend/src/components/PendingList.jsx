import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function PendingList({ month, year, onSelectDate }) {
  const [pendingMembers, setPendingMembers] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const { toasts, showToast, removeToast } = useToast();

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchPendingMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/pending/all`, {
        params: { month, year },
        timeout: 8000
      });
      if (res.data.success) {
        setPendingMembers(res.data.pendingMembers || []);
        setTotalPending(res.data.totalPendingRupees || 0);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load pending members list.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingMembers();
  }, [month, year]);

  const uniqueDates = Array.from(new Set(pendingMembers.map((p) => p.collectionDate))).sort((a, b) => a - b);

  const filtered = pendingMembers.filter((p) => {
    if (dateFilter !== 'ALL' && Number(p.collectionDate) !== Number(dateFilter)) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      const nameMatch = p.memberId?.name?.toLowerCase().includes(s);
      const phoneMatch = p.memberId?.phoneNumber?.includes(s);
      const idMatch = p.memberId?.memberId?.toLowerCase().includes(s);
      return nameMatch || phoneMatch || idMatch;
    }
    return true;
  });

  const filteredTotal = filtered.reduce((sum, p) => sum + (p.balanceRupees || 0), 0);

  const renderStars = (member) => {
    const count = member?.starCount !== undefined ? member.starCount : (member?.isStarred ? 1 : 0);
    if (!count) return null;
    return (
      <span className="d-inline-flex align-items-center me-1" title={`${count} Star(s)`}>
        <i className={`bi ${count >= 1 ? 'bi-star-fill' : 'bi-star'} text-warning`} style={{ fontSize: '13px', marginRight: '1px' }}></i>
        <i className={`bi ${count >= 2 ? 'bi-star-fill' : 'bi-star'} text-warning`} style={{ fontSize: '13px', marginRight: '2px' }}></i>
      </span>
    );
  };

  return (
    <div className="container py-4 flex-grow-1">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-circle-fill text-danger"></i>
            Pending List — {MONTH_NAMES[month]} {year}
          </h3>
          <p className="text-muted small mb-0">
            All pending members across all collection dates ({filtered.length} members &bull; Total Pending: <strong className="text-danger">₹{filteredTotal.toLocaleString('en-IN')}</strong>)
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 align-self-start align-self-md-auto"
          onClick={fetchPendingMembers}
          disabled={loading}
          title="Refresh pending list"
        >
          <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by name, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6 d-flex flex-wrap gap-2 justify-content-md-end">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${dateFilter === 'ALL' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setDateFilter('ALL')}
              >
                All Dates ({pendingMembers.length})
              </button>
              {uniqueDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 ${Number(dateFilter) === Number(d) ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setDateFilter(String(d))}
                >
                  {d}th
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Members List */}
      {loading && pendingMembers.length === 0 ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <p className="text-muted small">Loading pending members...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card shadow-sm border-0 p-5 text-center">
          <i className="bi bi-check-circle-fill text-success display-4 mb-2"></i>
          <h5 className="fw-bold text-dark">No Pending Members!</h5>
          <p className="text-muted small mb-0">
            All members for {MONTH_NAMES[month]} {year} have cleared their dues.
          </p>
        </div>
      ) : (
        <div className="card shadow-sm border-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Member Name</th>
                  <th>Date</th>
                  <th className="text-end">Total Due</th>
                  <th className="text-end">Paid</th>
                  <th className="text-end">Pending Amount</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p._id}>
                    <td className="text-muted small">{idx + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        {renderStars(p.memberId)}
                        <span className="fw-bold text-dark">{p.memberId?.name}</span>
                        {p.chittiCount > 1 && (
                          <span className="badge bg-primary text-white" style={{ fontSize: '10px' }}>
                            {p.chittiCount} Chittis
                          </span>
                        )}
                      </div>
                      {p.memberId?.phoneNumber && (
                        <a
                          href={`tel:${p.memberId.phoneNumber}`}
                          className="text-muted small text-decoration-none d-inline-flex align-items-center gap-1"
                          style={{ fontSize: '11px' }}
                        >
                          <i className="bi bi-telephone-fill text-success" style={{ fontSize: '10px' }}></i>
                          {p.memberId.phoneNumber}
                        </a>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-light text-primary border border-primary-subtle">
                        {p.collectionDate}th
                      </span>
                    </td>
                    <td className="text-end fw-semibold">₹{(p.actualAmountRupees || 0).toLocaleString('en-IN')}</td>
                    <td className="text-end text-success fw-semibold">₹{(p.totalPaidRupees || 0).toLocaleString('en-IN')}</td>
                    <td className="text-end fw-bold text-danger">₹{(p.balanceRupees || 0).toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <div className="d-inline-flex gap-1">
                        {p.memberId?.phoneNumber && (
                          <a
                            href={`tel:${p.memberId.phoneNumber}`}
                            className="btn btn-outline-success btn-sm py-1 px-2"
                            title={`Call ${p.memberId.name}`}
                          >
                            <i className="bi bi-telephone-fill"></i>
                          </a>
                        )}
                        {onSelectDate && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-1 px-2"
                            onClick={() => onSelectDate(p.collectionDate)}
                            title={`Open ${p.collectionDate}th collection`}
                          >
                            <i className="bi bi-box-arrow-up-right"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light fw-bold">
                <tr>
                  <td colSpan="5" className="text-end">Total Pending:</td>
                  <td className="text-end text-danger fs-6">₹{filteredTotal.toLocaleString('en-IN')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default PendingList;
