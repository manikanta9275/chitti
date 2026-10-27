import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function ActivityHistory() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBaseUrl}/activity-logs`, {
        params: {
          page,
          limit: 15,
          entityType: entityFilter !== 'ALL' ? entityFilter : undefined,
          search
        }
      });
      if (res.data.success) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalLogs(res.data.totalLogs || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, search]);

  const renderActionBadge = (action) => {
    switch (action) {
      case 'PAYMENT_RECORDED':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
            <i className="bi bi-cash-coin me-1"></i>pay rec
          </span>
        );
      case 'ADVANCE_PAYMENT_CREDITED':
      case 'PAYMENT':
        return (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1">
            <i className="bi bi-arrow-right-circle me-1"></i>pay
          </span>
        );
      case 'MEMBER_CREATED':
        return (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
            <i className="bi bi-person-plus-fill me-1"></i>mem add
          </span>
        );
      case 'MEMBER_UPDATED':
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">
            <i className="bi bi-pencil-fill me-1"></i>mem upd
          </span>
        );
      case 'MEMBER_DEACTIVATED':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
            <i className="bi bi-person-dash-fill me-1"></i>mem deact
          </span>
        );
      case 'MEMBER_ACTIVATED':
        return (
          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1">
            <i className="bi bi-person-check-fill me-1"></i>mem act
          </span>
        );
      case 'COLLECTION_CONFIG_CREATED':
      case 'COLLECTION_CONFIG_UPDATED':
        return (
          <span className="badge bg-purple-subtle text-dark border px-2 py-1" style={{ backgroundColor: '#e2d9f3' }}>
            <i className="bi bi-sliders me-1 text-primary"></i>coll con
          </span>
        );
      default:
        return (
          <span className="badge bg-light text-secondary border px-2 py-1">
            {action.toLowerCase().replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const renderDetails = (log) => {
    const nv = log.newValues;
    const pv = log.previousValues;

    if (!nv) return <span className="text-muted small">—</span>;

    if (log.action === 'PAYMENT_RECORDED') {
      return (
        <div className="small font-monospace">
          <div>
            <strong>mem:</strong> {nv.member || 'Member'} &bull;{' '}
            <strong className="text-success">+₹{nv.addedAmountRupees?.toLocaleString('en-IN')}</strong>
          </div>
          <div className="text-muted">
            total: ₹{nv.totalPaidRupees?.toLocaleString('en-IN')} | rem:{' '}
            <span className={nv.remainingBalanceRupees === 0 ? 'text-success fw-bold' : 'text-danger'}>
              ₹{nv.remainingBalanceRupees?.toLocaleString('en-IN')}
            </span>{' '}
            | sta: <strong>{nv.status}</strong>
          </div>
        </div>
      );
    }

    if (log.action === 'ADVANCE_PAYMENT_CREDITED') {
      return (
        <div className="small font-monospace">
          <div>
            <strong>mem:</strong> {nv.member || 'Member'} &bull;{' '}
            <strong className="text-success">+₹{nv.advanceCreditedRupees?.toLocaleString('en-IN')}</strong>
          </div>
          <div className="text-muted">
            per: {nv.creditedToPeriod} | total: ₹{nv.nextMonthTotalPaidRupees?.toLocaleString('en-IN')}
          </div>
        </div>
      );
    }

    if (log.action === 'MEMBER_CREATED' || log.action === 'MEMBER_UPDATED') {
      return (
        <div className="small font-monospace">
          <div>
            <strong>mem:</strong> {nv.name} ({nv.memberId || 'ID'})
          </div>
          <div className="text-muted">
            ph: {nv.phoneNumber}
            {pv && pv.name !== nv.name && (
              <span className="ms-2 text-warning">(was: {pv.name})</span>
            )}
          </div>
        </div>
      );
    }

    if (log.action.includes('COLLECTION_CONFIG')) {
      return (
        <div className="small font-monospace">
          <div>
            <strong>per:</strong> {nv.month}/{nv.year} &bull; amt: <strong>₹{nv.actualAmountRupees?.toLocaleString('en-IN')}</strong>
          </div>
          <div className="text-muted">
            dates: {Array.isArray(nv.collectionDates) ? nv.collectionDates.map((d) => `${d}th`).join(', ') : 'Default'}
          </div>
        </div>
      );
    }

    return (
      <pre className="small mb-0 text-muted" style={{ maxHeight: '60px', overflowY: 'auto' }}>
        {JSON.stringify(nv)}
      </pre>
    );
  };

  return (
    <div className="container py-4 flex-grow-1">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-clock-history text-primary"></i>
            History
          </h3>
          {/* <p className="text-muted small mb-0">
            Immutable audit record of all payment transactions, member updates, and schedule configurations.
          </p> */}
        </div>

        <button
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 shadow-xs"
          onClick={fetchLogs}
          disabled={loading}
        >
          <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
          Refresh Logs
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search */}
            <div className="col-12 col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by user or action (e.g. mani, PAYMENT)..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Entity Type Filter */}
            <div className="col-12 col-md-6 d-flex justify-content-md-end">
              <div className="btn-group btn-group-sm w-100 w-md-auto">
                <button
                  className={`btn ${entityFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setEntityFilter('ALL');
                    setPage(1);
                  }}
                >
                  All Logs ({totalLogs})
                </button>
                <button
                  className={`btn ${entityFilter === 'Payment' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setEntityFilter('Payment');
                    setPage(1);
                  }}
                >
                  Payments
                </button>
                <button
                  className={`btn ${entityFilter === 'Member' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setEntityFilter('Member');
                    setPage(1);
                  }}
                >
                  Members
                </button>
                <button
                  className={`btn ${entityFilter === 'CollectionPeriod' ? 'btn-info text-dark' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setEntityFilter('CollectionPeriod');
                    setPage(1);
                  }}
                >
                  Config
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-secondary">
              <tr>
                <th scope="col" style={{ width: '18%' }}>User</th>
                <th scope="col" style={{ width: '18%' }}>Action</th>
                <th scope="col" style={{ width: '12%' }}>Entity</th>
                <th scope="col" style={{ width: '34%' }}>Changes & Details</th>
                <th scope="col" className="text-end" style={{ width: '18%' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <i className="bi bi-clock-history fs-2 d-block mb-2"></i>
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const role = log.userId?.role || (log.username === 'admin' ? 'admin' : 'user');
                  return (
                    <tr key={log._id}>
                      {/* User */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${role === 'admin' ? 'bi-shield-check text-danger' : 'bi-person-circle text-primary'} fs-5`}></i>
                          <div>
                            <span className="fw-bold text-dark d-block" style={{ fontSize: '0.9rem' }}>
                              {log.userId?.displayName || log.userDisplayName || log.username}
                            </span>
                            <span className={`badge ${role === 'admin' ? 'bg-danger' : 'bg-light text-secondary'} border small`} style={{ fontSize: '0.65rem' }}>
                              @{log.username} ({role})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td>{renderActionBadge(log.action)}</td>

                      {/* Entity */}
                      <td>
                        <span className="badge bg-light text-dark border font-monospace small">
                          {log.entityType}
                        </span>
                      </td>

                      {/* Changes & Details */}
                      <td>{renderDetails(log)}</td>

                      {/* Timestamp */}
                      <td className="text-end small text-muted text-nowrap">
                        <i className="bi bi-clock me-1"></i>
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="card-footer bg-white py-3 d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalLogs} entries)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                <i className="bi bi-chevron-left me-1"></i> Previous
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
              >
                Next <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security & Integrity Alert */}
      <div className="alert alert-secondary py-2 small d-flex align-items-center gap-2 border-0 bg-light">
        <i className="bi bi-shield-lock-fill text-muted fs-5"></i>
        <span>
          <strong>Audit Integrity Notice:</strong> All activity logs are cryptographically immutable. Sensitive tokens, passwords, and hashed PINs are excluded by design to prevent credential exposure.
        </span>
      </div>
    </div>
  );
}

export default ActivityHistory;

