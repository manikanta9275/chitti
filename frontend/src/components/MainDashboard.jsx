import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

function MainDashboard({ selectedMonth, selectedYear, onSelectDate }) {
  const { isAdmin } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Delete single date modal state
  const [dateToDelete, setDateToDelete] = useState(null);
  const [deleteFromSchedule, setDeleteFromSchedule] = useState(false);
  const [deletingDateAction, setDeletingDateAction] = useState(false);

  // Complete reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [resettingData, setResettingData] = useState(false);
  const [resetError, setResetError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchDashboardSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/payments/dashboard/summary`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to fetch collection summary.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
  }, [selectedMonth, selectedYear]);

  const summary = dashboardData?.summary || {
    totalMembers: 0,
    totalExpectedCollection: 0,
    totalAmountCollected: 0,
    totalOutstandingBalance: 0
  };

  const collectionDates = dashboardData?.period?.collectionDates || [];

  // Handle single date deletion
  const handleConfirmDeleteDate = async () => {
    if (!dateToDelete) return;
    setDeletingDateAction(true);
    try {
      const res = await axios.delete(`${apiBaseUrl}/collections/date`, {
        data: {
          month: selectedMonth,
          year: selectedYear,
          date: dateToDelete,
          deleteFromSchedule
        }
      });
      setFeedback({
        type: 'success',
        message: res.data?.message || `Payments for date ${dateToDelete} deleted.`
      });
      setDateToDelete(null);
      setDeleteFromSchedule(false);
      fetchDashboardSummary();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to delete date payments.'
      });
    } finally {
      setDeletingDateAction(false);
    }
  };

  // Handle complete database wipe
  const handleConfirmResetDatabase = async (e) => {
    e.preventDefault();
    if (!adminPinInput) {
      setResetError('Please enter Admin PIN.');
      return;
    }
    setResettingData(true);
    setResetError('');
    try {
      const res = await axios.delete(`${apiBaseUrl}/collections/reset-database`, {
        data: { pin: adminPinInput }
      });
      setFeedback({
        type: 'success',
        message: res.data?.message || 'Database wiped clean successfully!'
      });
      setShowResetModal(false);
      setAdminPinInput('');
      fetchDashboardSummary();
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to wipe database. Check your PIN.');
    } finally {
      setResettingData(false);
    }
  };

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || '';

  return (
    <div className="container py-4 flex-grow-1">
      {/* Overview Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-wallet2 text-primary"></i> Chitti Dashboard
          </h3>
          <p className="text-muted small mb-0">
            Selected Period: <strong>{monthLabel} {selectedYear}</strong> &bull; Shared database for all 4 accounts
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {isAdmin && (
            <button
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-xs"
              onClick={() => {
                setShowResetModal(true);
                setAdminPinInput('');
                setResetError('');
              }}
              title="Completely wipe all data to start fresh"
            >
              <i className="bi bi-radioactive"></i>
              <span>Wipe All Data</span>
            </button>
          )}
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 shadow-xs"
            onClick={fetchDashboardSummary}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            Refresh Summary
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show`} role="alert">
          <i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
          {feedback.message}
          <button type="button" className="btn-close" onClick={() => setFeedback(null)}></button>
        </div>
      )}

      {/* Metric Cards */}
      

      {/* Metric Cards */}
      {/* <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 border-start border-primary border-4 h-100">
            <div className="card-body p-3">
              <span className="text-muted small fw-semibold text-uppercase">Total Active Members</span>
              <h3 className="fw-bold text-dark mb-0 mt-1">{summary.totalMembers}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 border-start border-info border-4 h-100">
            <div className="card-body p-3">
              <span className="text-muted small fw-semibold text-uppercase">Expected Collection</span>
              <h3 className="fw-bold text-info-emphasis mb-0 mt-1">₹{summary.totalExpectedCollection.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 border-start border-success border-4 h-100">
            <div className="card-body p-3">
              <span className="text-muted small fw-semibold text-uppercase">Amount Collected</span>
              <h3 className="fw-bold text-success mb-0 mt-1">₹{summary.totalAmountCollected.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 border-start border-danger border-4 h-100">
            <div className="card-body p-3">
              <span className="text-muted small fw-semibold text-uppercase">Outstanding Balance</span>
              <h3 className="fw-bold text-danger mb-0 mt-1">₹{summary.totalOutstandingBalance.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>
      </div> */}

      {/* Collection Dates Section */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-calendar-range-fill text-primary"></i> Monthly Collection Dates ({monthLabel} {selectedYear})
          </h5>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
            {collectionDates.length} Dates Configured
          </span>
        </div>
        <div className="card-body p-4">
          

          {collectionDates.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-calendar-x fs-1 d-block mb-2 text-secondary"></i>
              No collection dates configured for this month. Use the <strong>Collection Dates &amp; Amount</strong> tab to set up dates.
            </div>
          ) : (
            <div className="row g-3">
              {collectionDates.map((day) => (
                <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={day}>
                  <div className="position-relative border rounded-3 p-2 bg-light text-center h-100 d-flex flex-column justify-content-between shadow-xs hover-shadow transition">
                    {/* Admin Delete Date Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm position-absolute top-0 end-0 m-1 p-1 lh-1 rounded-circle"
                        style={{ width: '24px', height: '24px', fontSize: '11px' }}
                        title={`Delete payments for ${day}th collection date`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateToDelete(day);
                          setDeleteFromSchedule(false);
                        }}
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-link text-decoration-none text-dark w-100 p-2 d-flex flex-column align-items-center"
                      onClick={() => onSelectDate(day)}
                    >
                      <i className="bi bi-calendar2-check-fill text-primary fs-3 mb-1"></i>
                      <span className="fw-bold fs-5 text-dark">{day}th</span>
                      <small className="text-muted" style={{ fontSize: '11px' }}>View Records</small>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Date Confirmation Modal */}
      {dateToDelete !== null && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Delete Date Data: {dateToDelete}th {monthLabel} {selectedYear}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDateToDelete(null)}
                  disabled={deletingDateAction}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary mb-3">
                  Are you sure you want to delete all payment records and transactions for the <strong>{dateToDelete}th</strong> date for <strong>{monthLabel} {selectedYear}</strong>?
                </p>

                <div className="form-check p-3 bg-light rounded border mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="removeScheduleCheck"
                    checked={deleteFromSchedule}
                    onChange={(e) => setDeleteFromSchedule(e.target.checked)}
                  />
                  <label className="form-check-label small fw-semibold text-dark" htmlFor="removeScheduleCheck">
                    Also remove {dateToDelete}th from this month's collection dates schedule
                  </label>
                  <small className="text-muted d-block mt-1">
                    If checked, the {dateToDelete}th tile will no longer appear on this month's dashboard.
                  </small>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDateToDelete(null)}
                  disabled={deletingDateAction}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-semibold"
                  onClick={handleConfirmDeleteDate}
                  disabled={deletingDateAction}
                >
                  {deletingDateAction ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash-fill me-1"></i>
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Wipe All Database Data Modal */}
      {showResetModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-exclamation me-2"></i>
                  Wipe All Data (Fresh Start)
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowResetModal(false)}
                  disabled={resettingData}
                ></button>
              </div>
              <form onSubmit={handleConfirmResetDatabase}>
                <div className="modal-body p-4">
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    <strong>DANGER ZONE:</strong> This will permanently delete:
                    <ul className="mb-0 mt-1 ps-3">
                      <li>All Member Directory entries</li>
                      <li>All Payment &amp; Installment records</li>
                      <li>All Monthly Collection Date configurations</li>
                      <li>All Activity &amp; Audit history</li>
                    </ul>
                    Your login accounts (Admin: 9999) will remain safe.
                  </div>

                  {resetError && (
                    <div className="alert alert-warning py-2 small mb-3">
                      <i className="bi bi-exclamation-circle-fill me-1"></i>
                      {resetError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Enter Admin PIN to Confirm (Default: 9999) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control fw-bold font-monospace text-center fs-5"
                      placeholder="••••"
                      maxLength="8"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowResetModal(false)}
                    disabled={resettingData}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger fw-bold"
                    disabled={resettingData}
                  >
                    {resettingData ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Wiping Database...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash3-fill me-1"></i>
                        Confirm Wipe All Data
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainDashboard;

