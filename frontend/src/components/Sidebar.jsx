import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { downloadAllForOffline, isOnline } from '../utils/offlineSync';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  month = 10,
  year = 2026,
  selectedDate = null,
  onDataChanged
}) {
  const { user, logout, isAdmin } = useAuth();
  const [savingOffline, setSavingOffline] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  // Admin Delete Modals state
  const [showDeletePaymentsModal, setShowDeletePaymentsModal] = useState(false);
  const [deletingPayments, setDeletingPayments] = useState(false);
  const [deletePaymentsDate, setDeletePaymentsDate] = useState(selectedDate || 1);

  const [showResetModal, setShowResetModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [resettingData, setResettingData] = useState(false);
  const [resetError, setResetError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      desc: 'Overview & Collection Dates'
    },
    {
      id: 'members',
      label: 'Members Directory',
      icon: 'bi-people',
      desc: 'Manage Members & Assignments'
    },
    {
      id: 'config',
      label: 'Collection Dates & Amount',
      icon: 'bi-calendar-event',
      desc: 'Dates, Monthly Amounts & Bonuses'
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      icon: 'bi-clock-history',
      desc: 'Audit Trail of All Changes'
    }
  ];

  const handleItemClick = (id) => {
    onSelectTab(id);
    onClose();
  };

  const handleSaveOffline = async () => {
    if (!isOnline()) {
      alert('You need an active internet connection to download and save latest records for offline use.');
      return;
    }
    setSavingOffline(true);
    setSaveFeedback(null);
    try {
      const res = await downloadAllForOffline(apiBaseUrl, month, year);
      if (res.success) {
        setSaveFeedback({ type: 'success', message: 'All records saved locally for offline use!' });
      } else {
        setSaveFeedback({ type: 'danger', message: res.message });
      }
    } catch (err) {
      setSaveFeedback({ type: 'danger', message: 'Failed to download data for offline use.' });
    } finally {
      setSavingOffline(false);
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  // Confirm delete payments for a date/month
  const handleConfirmDeletePayments = async () => {
    const d = deletePaymentsDate || selectedDate || 1;
    setDeletingPayments(true);
    try {
      if (isOnline()) {
        await axios.delete(`${apiBaseUrl}/collections/date`, {
          data: { month, year, date: d }
        });
      }
      // Clean local cache for this date
      try {
        localStorage.removeItem(`chitti_offline_payments_${month}_${year}_${d}`);
      } catch (e) {}

      setSaveFeedback({ type: 'success', message: `Payments for ${d}th ${MONTH_NAMES[month]} deleted.` });
      setShowDeletePaymentsModal(false);
      if (onDataChanged) onDataChanged();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete payment records.');
    } finally {
      setDeletingPayments(false);
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  // Confirm complete database wipe
  const handleConfirmResetDatabase = async (e) => {
    e.preventDefault();
    if (!adminPinInput) {
      setResetError('Please enter Admin PIN.');
      return;
    }
    setResettingData(true);
    setResetError('');
    try {
      if (isOnline()) {
        await axios.delete(`${apiBaseUrl}/collections/reset-database`, {
          data: { pin: adminPinInput }
        });
      }
      // Clear offline cache and queue
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('chitti_offline_') || k === 'chitti_sync_queue')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {}

      setShowResetModal(false);
      setAdminPinInput('');
      setSaveFeedback({ type: 'success', message: 'All database data successfully wiped clean.' });
      if (onDataChanged) onDataChanged();
      onClose();
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to wipe database. Check your PIN.');
    } finally {
      setResettingData(false);
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040, backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Slide-out Sidebar Drawer */}
      <aside
        className="position-fixed top-0 start-0 h-100 bg-white shadow-lg d-flex flex-column"
        style={{
          width: '280px',
          maxWidth: '85vw',
          zIndex: 1050,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          visibility: isOpen ? 'visible' : 'hidden'
        }}
        aria-label="Left Menu Bar"
      >
        {/* Header */}
        <div className="p-3 bg-primary text-white d-flex align-items-center justify-content-between shadow-xs">
          <div className="d-flex align-items-center gap-2">
            <img
              src="/me_daddy.jpeg"
              alt="Logo"
              className="rounded-circle shadow-xs border border-white"
              style={{ width: '36px', height: '36px', objectFit: 'cover' }}
            />
            <div>
              <div className="fw-bold fs-6 lh-1">Chitti Collection</div>
              <small className="text-white-50" style={{ fontSize: '11px' }}>Menu Bar</small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-link text-white p-0 text-decoration-none"
            onClick={onClose}
            aria-label="Close menu"
          >
            <i className="bi bi-x-lg fs-5"></i>
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="px-3 py-2 bg-light border-bottom d-flex align-items-center gap-2">
            <div
              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36, flexShrink: 0 }}
            >
              <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-person'} fs-5`}></i>
            </div>
            <div className="overflow-hidden">
              <div className="fw-semibold text-truncate text-dark small">{user.displayName || user.username}</div>
              <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-primary'} font-monospace`} style={{ fontSize: '10px' }}>
                {user.role?.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="p-2 flex-grow-1 overflow-y-auto">
          <div className="text-uppercase text-muted px-3 py-2 fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
            Navigation
          </div>
          <nav className="nav nav-pills flex-column gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-link text-start d-flex align-items-center gap-3 px-3 py-2 border-0 rounded-3 ${
                    isActive ? 'active bg-primary text-white fw-bold shadow-xs' : 'text-dark bg-transparent'
                  }`}
                  style={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    borderLeft: isActive ? '4px solid #0a58ca' : '4px solid transparent'
                  }}
                  onClick={() => handleItemClick(item.id)}
                >
                  <i className={`bi ${item.icon} fs-5 ${isActive ? 'text-white' : 'text-primary'}`}></i>
                  <div className="flex-grow-1">
                    <div className="lh-sm">{item.label}</div>
                  </div>
                  {isActive && <i className="bi bi-chevron-right text-white small"></i>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Danger Zone / Delete Controls inside Sidebar */}
        {isAdmin && (
          <div className="px-3 py-2 border-top bg-light">
            <div className="text-uppercase text-danger px-1 py-1 fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
              <i className="bi bi-shield-exclamation me-1"></i> Admin Management
            </div>
            <div className="d-flex flex-column gap-1">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 shadow-xs"
                style={{ fontSize: '12px' }}
                onClick={() => setShowDeletePaymentsModal(true)}
                title="Delete payment records for a collection date"
              >
                <i className="bi bi-trash-fill"></i>
                <span>Del All Payments</span>
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 shadow-xs"
                style={{ fontSize: '12px' }}
                onClick={() => {
                  setShowResetModal(true);
                  setAdminPinInput('');
                  setResetError('');
                }}
                title="Completely wipe all database data to start fresh"
              >
                <i className="bi bi-radioactive"></i>
                <span>Delete All Data</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer with Save Offline button and Logout */}
        <div className="p-3 border-top bg-white mt-auto">
          {saveFeedback && (
            <div className={`alert alert-${saveFeedback.type} py-1 px-2 small mb-2 text-center`} role="alert">
              {saveFeedback.message}
            </div>
          )}

          {/* Save Offline Button inside Sidebar */}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 shadow-xs mb-2 fw-semibold"
            onClick={handleSaveOffline}
            disabled={savingOffline}
            title="Download latest collection records to this device so you can work offline"
          >
            <i className={`bi bi-cloud-arrow-down-fill ${savingOffline ? 'spin' : ''}`}></i>
            <span>{savingOffline ? 'Saving Data...' : 'Save Offline'}</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 shadow-xs"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Delete Payments Modal */}
      {showDeletePaymentsModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-trash-fill me-2"></i> Delete Payments for Date
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeletePaymentsModal(false)}
                  disabled={deletingPayments}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary mb-3">
                  Select collection date to delete all payment records and installment history for <strong>{MONTH_NAMES[month]} {year}</strong>:
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark">Collection Date (Day of Month):</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-control form-control-lg fw-bold text-center"
                    value={deletePaymentsDate}
                    onChange={(e) => setDeletePaymentsDate(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="alert alert-warning py-2 small mb-0">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  This action removes all recorded payments for this date.
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeletePaymentsModal(false)}
                  disabled={deletingPayments}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm fw-bold px-3"
                  onClick={handleConfirmDeletePayments}
                  disabled={deletingPayments}
                >
                  {deletingPayments ? 'Deleting...' : 'Confirm Delete Payments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wipe All Data Modal */}
      {showResetModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-radioactive me-2"></i> Delete All Data (Fresh Start)
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
                    <strong>PERMANENT DELETION:</strong> This will delete all members, payment records, collection dates, and audit history.
                  </div>
                  {resetError && (
                    <div className="alert alert-warning py-2 small mb-3">
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
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowResetModal(false)}
                    disabled={resettingData}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm fw-bold px-3"
                    disabled={resettingData || !adminPinInput}
                  >
                    {resettingData ? 'Wiping Database...' : 'Confirm Wipe All Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
