import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function CollectionConfigCard({ selectedMonth, selectedYear, onConfigUpdated }) {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit form state
  const [editDates, setEditDates] = useState([]);
  const [customConfigDay, setCustomConfigDay] = useState('');
  const [editBasic, setEditBasic] = useState('5000');
  const [editBonus, setEditBonus] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchCollectionConfig = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/collections/current`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      if (res.data.success && res.data.period) {
        setPeriod(res.data.period);
        setEditDates(res.data.period.collectionDates || []);
        const basic = res.data.period.basicAmountRupees !== undefined ? res.data.period.basicAmountRupees : 5000;
        const bonus = res.data.period.bonusRupees !== undefined ? res.data.period.bonusRupees : 0;
        setEditBasic(String(basic));
        setEditBonus(String(bonus));
      }
    } catch (err) {
      console.error('Failed to fetch collection config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionConfig();
  }, [selectedMonth, selectedYear]);

  const toggleDateSelection = (day) => {
    if (editDates.includes(day)) {
      setEditDates(editDates.filter((d) => d !== day));
    } else {
      setEditDates([...editDates, day].sort((a, b) => a - b));
    }
    setError('');
  };

  const handleAddCustomConfigDay = () => {
    const day = parseInt(customConfigDay, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setError('Collection date must be a valid day between 1 and 31.');
      return;
    }
    if (!editDates.includes(day)) {
      setEditDates([...editDates, day].sort((a, b) => a - b));
    }
    setCustomConfigDay('');
    setError('');
  };

  const calculatedNetActual = Math.max(0, (parseFloat(editBasic) || 0) - (parseFloat(editBonus) || 0));

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const basicVal = parseFloat(editBasic);
    const bonusVal = parseFloat(editBonus) || 0;
    if (isNaN(basicVal) || basicVal <= 0) {
      setError('Please enter a valid basic amount (default ₹5,000).');
      return;
    }
    if (bonusVal < 0) {
      setError('Bonus cannot be negative.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/collections/configure`, {
        month: selectedMonth,
        year: selectedYear,
        collectionDates: editDates,
        basicAmount: basicVal,
        bonus: bonusVal,
        actualAmount: Math.max(0, basicVal - bonusVal)
      });

      if (res.data.success) {
        setPeriod(res.data.period);
        setSuccessMsg(res.data.message);
        setShowModal(false);
        if (onConfigUpdated) onConfigUpdated(res.data.period);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const basicRupees = period?.basicAmountRupees !== undefined ? period.basicAmountRupees : 5000;
  const bonusRupees = period?.bonusRupees || 0;
  const actualRupees = period?.actualAmountRupees !== undefined ? period.actualAmountRupees : Math.max(0, basicRupees - bonusRupees);
  const currentDates = period?.collectionDates || [];

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
          <i className="bi bi-calendar-event text-primary"></i>
          Collection Dates &amp; Common Amount Configuration
        </h5>

        {isAdmin ? (
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
            onClick={() => {
              setEditBasic(String(basicRupees));
              setEditBonus(String(bonusRupees));
              setEditDates(currentDates);
              setShowModal(true);
              setError('');
            }}
          >
            <i className="bi bi-gear-fill"></i>
            Configure (Admin)
          </button>
        ) : (
          <span className="badge bg-light text-secondary border">
            <i className="bi bi-shield-lock me-1"></i> Admin Controlled
          </span>
        )}
      </div>

      <div className="card-body p-4">
        {successMsg && (
          <div className="alert alert-success py-2 small mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMsg}
          </div>
        )}

        <div className="row g-3">
          {/* Amount Calculation Cards */}
          <div className="col-12 col-lg-6">
            <div className="p-3 bg-light rounded-3 border h-100">
              <span className="text-muted small fw-semibold d-block mb-2">
                Monthly Amount Breakdown per Member ({selectedMonth}/{selectedYear})
              </span>
              <div className="row g-2 text-center">
                <div className="col-4">
                  <div className="bg-white p-2 rounded-2 border">
                    <small className="text-muted d-block" style={{ fontSize: '11px' }}>Basic Amount</small>
                    <span className="fw-bold text-secondary fs-6">₹{basicRupees.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="bg-white p-2 rounded-2 border border-warning-subtle">
                    <small className="text-muted d-block" style={{ fontSize: '11px' }}>Monthly Bonus</small>
                    <span className="fw-bold text-warning-emphasis fs-6">- ₹{bonusRupees.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="bg-white p-2 rounded-2 border border-primary-subtle">
                    <small className="text-muted d-block" style={{ fontSize: '11px' }}>Present Month</small>
                    <span className="fw-bold text-primary fs-6">₹{actualRupees.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
              <small className="text-muted mt-2 d-block">
                Basic ₹{basicRupees.toLocaleString('en-IN')} minus Bonus ₹{bonusRupees.toLocaleString('en-IN')} = Net ₹{actualRupees.toLocaleString('en-IN')} assigned to Present Month.
              </small>
            </div>
          </div>

          {/* Collection Dates Buttons Display */}
          <div className="col-12 col-lg-6">
            <div className="p-3 bg-light rounded-3 border h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small fw-semibold">
                  Configured Collection Dates ({currentDates.length} Dates)
                </span>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  Active Schedule
                </span>
              </div>
              <div className="d-flex flex-wrap gap-2 pt-1">
                {currentDates.length === 0 ? (
                  <span className="text-muted small">
                    No collection dates configured yet. Dates created on the Members Directory page will appear here.
                  </span>
                ) : (
                  currentDates.map((day) => (
                    <span
                      key={day}
                      className="badge bg-white text-primary border border-primary shadow-sm px-3 py-2 fs-6 rounded-pill"
                    >
                      <i className="bi bi-calendar2-check me-1 text-primary"></i>
                      {day}th
                    </span>
                  ))
                )}
              </div>
              <small className="text-muted mt-2 d-block">
                Dates created in Members Directory automatically link to this schedule.
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Configuration Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-gear-fill me-2"></i>
                  Common Amount &amp; Dates ({selectedMonth}/{selectedYear})
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveConfig}>
                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {error}
                    </div>
                  )}

                  {/* Basic Amount Field */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Basic Amount per Member (₹)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light fw-bold">₹</span>
                      <input
                        type="number"
                        className="form-control fw-bold"
                        placeholder="5000"
                        min="1"
                        step="1"
                        value={editBasic}
                        onChange={(e) => setEditBasic(e.target.value)}
                        required
                      />
                    </div>
                    <small className="text-muted">Standard basic amount for every person is ₹5,000.</small>
                  </div>

                  {/* Bonus Field */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Monthly Bonus / Discount (₹)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light fw-bold text-warning-emphasis">₹</span>
                      <input
                        type="number"
                        className="form-control fw-bold text-warning-emphasis"
                        placeholder="500"
                        min="0"
                        step="1"
                        value={editBonus}
                        onChange={(e) => setEditBonus(e.target.value)}
                        required
                      />
                    </div>
                    <small className="text-muted">This bonus will be subtracted from ₹{parseFloat(editBasic || 0).toLocaleString('en-IN')}.</small>
                  </div>

                  {/* Live Calculation Preview */}
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-muted fw-semibold">Net Present Month Amount:</span>
                      <span className="badge bg-success-subtle text-success fs-6 fw-bold">
                        ₹{calculatedNetActual.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="small text-muted font-monospace">
                      ₹{parseFloat(editBasic || 0).toLocaleString('en-IN')} (Basic) - ₹{parseFloat(editBonus || 0).toLocaleString('en-IN')} (Bonus) = ₹{calculatedNetActual.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Collection Dates Grid */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary d-block">
                      Collection Dates in Schedule:
                    </label>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {editDates.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className="btn btn-sm px-3 py-2 rounded-pill btn-primary shadow-sm"
                          onClick={() => toggleDateSelection(day)}
                          title="Click to remove date from schedule"
                        >
                          <i className="bi bi-check-circle-fill me-1"></i>
                          {day}th &times;
                        </button>
                      ))}
                      {editDates.length === 0 && (
                        <small className="text-muted">No dates in schedule yet. Add a date below (e.g. 1st).</small>
                      )}
                    </div>

                    {/* Add Custom Day Input */}
                    <div className="input-group input-group-sm mt-2" style={{ maxWidth: '240px' }}>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Day (1-31)"
                        className="form-control"
                        value={customConfigDay}
                        onChange={(e) => setCustomConfigDay(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomConfigDay();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleAddCustomConfigDay}
                      >
                        + Add Date
                      </button>
                    </div>

                    <small className="text-muted mt-2 d-block">
                      Selected: <strong>{editDates.length > 0 ? editDates.map((d) => `${d}th`).join(', ') : 'None'}</strong>
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-semibold"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
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

export default CollectionConfigCard;
