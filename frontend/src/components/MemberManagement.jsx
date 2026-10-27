import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function MemberManagement() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [dateCounts, setDateCounts] = useState({});
  const [totalActive, setTotalActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Dynamic collection dates created by user
  const [createdDates, setCreatedDates] = useState(() => {
    try {
      const saved = localStorage.getItem('chitti_created_dates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCreateDateModal, setShowCreateDateModal] = useState(false);
  const [newDateInput, setNewDateInput] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Modal / Form state for Add/Edit Member
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    assignedDates: [1]
  });
  const [customDayInput, setCustomDayInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Payments modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetMember, setDeleteTargetMember] = useState(null);
  const [deleteSelectedDates, setDeleteSelectedDates] = useState([]);
  const [deletingPayments, setDeletingPayments] = useState(false);

  // Fetch members from backend
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/members`, {
        params: {
          search,
          includeInactive: showInactive,
          date: selectedDateFilter !== 'ALL' ? selectedDateFilter : undefined
        }
      });
      if (response.data.success) {
        setMembers(response.data.members || []);
        if (response.data.dateCounts) setDateCounts(response.data.dateCounts);
        if (response.data.totalActive !== undefined) setTotalActive(response.data.totalActive);
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to load members from server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, showInactive, selectedDateFilter]);

  // Compute all known dates: user created + dates from members in database
  const activeDateNumbers = Object.keys(dateCounts)
    .map(Number)
    .filter((d) => !isNaN(d) && (dateCounts[d] || 0) > 0);
  const allKnownDates = Array.from(new Set([...createdDates, ...activeDateNumbers])).sort((a, b) => a - b);

  // Handle creating a new date
  const handleCreateNewDate = async (dayNum) => {
    const day = parseInt(dayNum, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setFeedback({ type: 'danger', message: 'Please enter a valid day of the month between 1 and 31.' });
      return;
    }
    const updated = Array.from(new Set([...createdDates, day])).sort((a, b) => a - b);
    setCreatedDates(updated);
    try {
      localStorage.setItem('chitti_created_dates', JSON.stringify(updated));
      await axios.post(`${apiBaseUrl}/collections/add-date`, { date: day });
    } catch (err) {
      console.warn('Could not register date in backend period:', err);
    }
    setSelectedDateFilter(String(day));
    setFeedback({
      type: 'success',
      message: `Collection date ${day}th created! You can now click "Add Member" to add members for the ${day}th.`
    });
    setShowCreateDateModal(false);
    setNewDateInput('');
  };

  // Open Add Member Modal
  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedMember(null);
    const defaultDate = selectedDateFilter !== 'ALL'
      ? parseInt(selectedDateFilter, 10)
      : (allKnownDates.length > 0 ? allKnownDates[0] : 1);
    setFormData({
      name: '',
      phoneNumber: '+91',
      assignedDates: [defaultDate]
    });
    setFormError('');
    setCustomDayInput('');
  };

  // Open Edit Member Modal
  const handleOpenEdit = (member) => {
    setModalMode('edit');
    setSelectedMember(member);
    setFormData({
      name: member.name,
      phoneNumber: member.phoneNumber,
      assignedDates: member.assignedDates && member.assignedDates.length > 0 ? member.assignedDates : [1]
    });
    setFormError('');
    setCustomDayInput('');
  };

  const toggleModalDate = (day) => {
    const cur = formData.assignedDates || [];
    if (cur.includes(day)) {
      if (cur.length === 1) {
        setFormError('Member must be assigned to at least one collection date.');
        return;
      }
      setFormData({ ...formData, assignedDates: cur.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, assignedDates: [...cur, day].sort((a, b) => a - b) });
    }
    setFormError('');
  };

  const handleAddCustomDay = () => {
    const day = parseInt(customDayInput, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setFormError('Collection date must be between 1 and 31.');
      return;
    }
    const cur = formData.assignedDates || [];
    if (!cur.includes(day)) {
      setFormData({ ...formData, assignedDates: [...cur, day].sort((a, b) => a - b) });
    }
    // Also add to known dates
    if (!createdDates.includes(day)) {
      const next = [...createdDates, day].sort((a, b) => a - b);
      setCreatedDates(next);
      try { localStorage.setItem('chitti_created_dates', JSON.stringify(next)); } catch {}
    }
    setCustomDayInput('');
    setFormError('');
  };

  // Save Member (Add or Edit)
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phoneNumber.trim()) {
      setFormError('Please provide both name and phone number.');
      return;
    }
    if (!formData.assignedDates || formData.assignedDates.length === 0) {
      setFormError('Please assign at least one collection date.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      if (modalMode === 'add') {
        const res = await axios.post(`${apiBaseUrl}/members`, formData);
        setFeedback({ type: 'success', message: res.data.message });
      } else {
        const res = await axios.put(`${apiBaseUrl}/members/${selectedMember._id}`, formData);
        setFeedback({ type: 'success', message: res.data.message });
      }

      // Persist assigned dates into createdDates list
      const assigned = formData.assignedDates || [];
      if (assigned.length > 0) {
        setCreatedDates((prev) => {
          const next = Array.from(new Set([...prev, ...assigned])).sort((a, b) => a - b);
          try { localStorage.setItem('chitti_created_dates', JSON.stringify(next)); } catch {}
          return next;
        });
      }

      setModalMode(null);
      fetchMembers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Action failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Deactivate / Reactivate Member
  const handleToggleActive = async (member) => {
    const action = member.isActive ? 'deactivate' : 'activate';
    const confirmMsg = member.isActive
      ? `Are you sure you want to deactivate ${member.name} (${member.memberId})? Payment history will be preserved safely.`
      : `Reactivate ${member.name} (${member.memberId})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.patch(`${apiBaseUrl}/members/${member._id}/${action}`);
      setFeedback({ type: 'success', message: res.data.message });
      fetchMembers();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Action failed.'
      });
    }
  };

  // Delete Payments modal handlers
  const handleOpenDelete = (member) => {
    setDeleteTargetMember(member);
    setDeleteSelectedDates([]);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    if (deletingPayments) return;
    setShowDeleteModal(false);
    setDeleteTargetMember(null);
    setDeleteSelectedDates([]);
  };

  const toggleDeleteDate = (day) => {
    const cur = deleteSelectedDates;
    if (cur.includes(day)) {
      setDeleteSelectedDates(cur.filter((d) => d !== day));
    } else {
      setDeleteSelectedDates([...cur, day]);
    }
  };

  const handleDeletePayments = async () => {
    if (!deleteTargetMember) return;
    setDeletingPayments(true);
    try {
      const payload = deleteSelectedDates.length > 0 ? { dates: deleteSelectedDates } : {};
      const res = await axios.delete(`${apiBaseUrl}/members/${deleteTargetMember._id}/payments`, { data: payload });
      setFeedback({
        type: 'success',
        message: res.data?.message || `Deleted payments for ${deleteTargetMember.name}.`
      });
      fetchMembers();
      setShowDeleteModal(false);
      setDeleteTargetMember(null);
      setDeleteSelectedDates([]);
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Failed to delete payments.'
      });
    } finally {
      setDeletingPayments(false);
    }
  };

  // Modal collection date options
  const allModalDates = Array.from(new Set([...allKnownDates, ...(formData.assignedDates || [])])).sort((a, b) => a - b);

  return (
    <div className="card shadow-sm border-0 mb-4">
      {/* Card Header */}
      <div className="card-header bg-white py-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <i className="bi bi-people-fill text-primary"></i>
              Members Directory
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-6 ms-2">
                {members.length} {selectedDateFilter !== 'ALL' ? `on ${selectedDateFilter}th` : 'Members'}
              </span>
            </h5>
            <small className="text-muted">
              Add your real-world members and assign them to your collection dates (e.g. 1st, 10th...)
            </small>
          </div>

          <div className="d-flex align-items-center gap-2">
            {isAdmin && (
              <button
                className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
                onClick={() => {
                  setNewDateInput('');
                  setShowCreateDateModal(true);
                }}
              >
                <i className="bi bi-calendar-plus"></i>
                <span>Create Date (e.g. 1st)</span>
              </button>
            )}

            {isAdmin ? (
              <button
                className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
                onClick={handleOpenAdd}
              >
                <i className="bi bi-person-plus-fill"></i>
                <span>Add Member</span>
              </button>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary border px-3 py-2">
                <i className="bi bi-shield-lock me-1"></i> Add Member (Admin Only)
              </span>
            )}

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchMembers}
              disabled={loading}
              title="Refresh Members"
            >
              <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Feedback Alert */}
        {feedback && (
          <div className={`alert alert-${feedback.type} alert-dismissible fade show`} role="alert">
            <i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
            {feedback.message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setFeedback(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* Collection Date Tabs */}
        <div className="mb-4">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-2">
            <label className="small text-muted fw-bold mb-0">
              <i className="bi bi-calendar-event text-primary me-1"></i>
              Filter Members by Collection Date:
            </label>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-sm btn-link text-primary text-decoration-none p-0 fw-semibold"
                onClick={() => {
                  setNewDateInput('');
                  setShowCreateDateModal(true);
                }}
              >
                <i className="bi bi-plus-circle me-1"></i>
                + Add Another Date
              </button>
            )}
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button
              type="button"
              className={`btn btn-sm px-3 py-2 rounded-pill d-flex align-items-center gap-2 ${
                selectedDateFilter === 'ALL'
                  ? 'btn-primary shadow-sm fw-bold'
                  : 'btn-outline-secondary bg-white'
              }`}
              onClick={() => setSelectedDateFilter('ALL')}
            >
              <i className="bi bi-people"></i>
              All Members
              <span className={`badge ${selectedDateFilter === 'ALL' ? 'bg-light text-primary' : 'bg-secondary'}`}>
                {totalActive || members.length}
              </span>
            </button>

            {allKnownDates.map((day) => {
              const isSelected = selectedDateFilter === String(day);
              const count = dateCounts[day] || 0;
              return (
                <button
                  key={day}
                  type="button"
                  className={`btn btn-sm px-3 py-2 rounded-pill d-flex align-items-center gap-2 ${
                    isSelected
                      ? 'btn-primary shadow-sm fw-bold'
                      : 'btn-outline-secondary bg-white'
                  }`}
                  onClick={() => setSelectedDateFilter(String(day))}
                >
                  <i className={`bi ${isSelected ? 'bi-calendar-check-fill' : 'bi-calendar-event'}`}></i>
                  {day}th Date
                  <span className={`badge ${isSelected ? 'bg-light text-primary' : 'bg-primary-subtle text-primary border'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {allKnownDates.length === 0 && (
              <div className="p-3 bg-light rounded-3 border w-100 mt-2 text-center">
                <i className="bi bi-calendar-plus text-primary fs-3 d-block mb-1"></i>
                <span className="fw-semibold text-dark d-block">No collection dates created yet.</span>
                <small className="text-muted d-block mb-3">
                  Create your first date (e.g. 1st) then start adding your members.
                </small>
                {isAdmin && (
                  <button
                    className="btn btn-primary btn-sm px-3"
                    onClick={() => {
                      setNewDateInput('1');
                      setShowCreateDateModal(true);
                    }}
                  >
                    <i className="bi bi-plus-circle me-1"></i> Create Date 1st
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, phone (+91), or ID (M-001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch('')}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="col-12 col-md-4 d-flex align-items-center justify-content-md-end">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="showInactiveSwitch"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <label className="form-check-label small text-muted" htmlFor="showInactiveSwitch">
                Show Inactive Members
              </label>
            </div>
          </div>
        </div>

        {/* Member Table */}
        <div className="table-responsive border rounded-3">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col" style={{ width: '10%' }}>ID</th>
                <th scope="col" style={{ width: '28%' }}>Member Name</th>
                <th scope="col" style={{ width: '20%' }}>Phone Number</th>
                <th scope="col" className="text-center" style={{ width: '20%' }}>
                  Assigned Collection Date
                </th>
                <th scope="col" className="text-center" style={{ width: '10%' }}>Status</th>
                <th scope="col" className="text-end" style={{ width: '12%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                    <span className="text-muted">Loading members from database...</span>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <i className="bi bi-person-x fs-2 d-block mb-2 text-secondary"></i>
                    No members found {selectedDateFilter !== 'ALL' ? `for the ${selectedDateFilter}th collection date.` : '.'}
                    {isAdmin && (
                      <div className="mt-2">
                        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
                          <i className="bi bi-person-plus-fill me-1"></i> Add Member
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id} className={!member.isActive ? 'table-light opacity-75' : ''}>
                    <td>
                      <span className="badge bg-light text-dark border font-monospace">
                        {member.memberId}
                      </span>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{member.name}</div>
                    </td>
                    <td>
                      <span className="text-muted small">
                        <i className="bi bi-telephone me-1"></i>
                        {member.phoneNumber}
                      </span>
                    </td>
                    {/* Respective Collection Date Badges */}
                    <td className="text-center">
                      <div className="d-flex flex-wrap justify-content-center gap-1">
                        {(member.assignedDates && member.assignedDates.length > 0
                          ? member.assignedDates
                          : [1]
                        ).map((d) => (
                          <span
                            key={d}
                            className={`badge px-2 py-1 rounded-pill ${
                              selectedDateFilter === String(d)
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-primary-subtle text-primary border border-primary-subtle'
                            }`}
                          >
                            <i className="bi bi-calendar2-check me-1"></i>
                            {d}th
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-center">
                      {member.isActive ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      {isAdmin ? (
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleOpenEdit(member)}
                            title="Edit Member & Assign Dates"
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            className={`btn ${member.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleActive(member)}
                            title={member.isActive ? 'Deactivate Member' : 'Activate Member'}
                          >
                            <i className={`bi ${member.isActive ? 'bi-person-dash' : 'bi-person-check'}`}></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleOpenDelete(member)}
                            title="Delete Payments for Member"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">
                          <i className="bi bi-eye text-secondary" title="View Only"></i>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Collection Date Modal */}
      {showCreateDateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white py-2">
                <h6 className="modal-title fw-bold mb-0">
                  <i className="bi bi-calendar-plus me-2"></i>
                  Create Collection Date
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowCreateDateModal(false)}
                ></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateNewDate(newDateInput);
              }}>
                <div className="modal-body p-3">
                  <label className="form-label small fw-semibold text-secondary">
                    Collection Day of Month (1 - 31)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="e.g. 1"
                      className="form-control fw-bold font-monospace text-center fs-5"
                      value={newDateInput}
                      onChange={(e) => setNewDateInput(e.target.value)}
                      required
                      autoFocus
                    />
                    <span className="input-group-text bg-light fw-bold">th</span>
                  </div>
                  <small className="text-muted mt-2 d-block">
                    Enter <strong>1</strong> for the 1st of every month, <strong>10</strong> for 10th, etc.
                  </small>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowCreateDateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary fw-semibold"
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Create Date
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {modalMode && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className={`bi ${modalMode === 'add' ? 'bi-person-plus-fill' : 'bi-pencil-square'} me-2`}></i>
                  {modalMode === 'add' ? 'Add New Member' : `Edit Member: ${selectedMember?.memberId}`}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalMode(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveMember}>
                <div className="modal-body p-4">
                  {formError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {formError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Naidu"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Phone Number (for WhatsApp reminders) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+919876543210"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      required
                    />
                    <small className="text-muted">
                      Include country code (e.g., +91 for India) for WhatsApp links.
                    </small>
                  </div>

                  {/* Assign Collection Date(s) */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary d-block">
                      Assign Collection Date(s) <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {allModalDates.map((day) => {
                        const isAssigned = (formData.assignedDates || []).includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`btn btn-sm px-3 py-2 rounded-pill ${
                              isAssigned ? 'btn-primary shadow-xs' : 'btn-outline-secondary'
                            }`}
                            onClick={() => toggleModalDate(day)}
                          >
                            <i className={`bi ${isAssigned ? 'bi-check-circle-fill' : 'bi-circle'} me-1`}></i>
                            {day}th
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Custom Day Input */}
                    <div className="input-group input-group-sm mt-2" style={{ maxWidth: '240px' }}>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Day (1-31)"
                        className="form-control"
                        value={customDayInput}
                        onChange={(e) => setCustomDayInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomDay();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleAddCustomDay}
                      >
                        + Add Date
                      </button>
                    </div>

                    <small className="text-muted mt-2 d-block">
                      Assigned Dates:{' '}
                      <strong className="text-primary">
                        {(formData.assignedDates || []).map((d) => `${d}th`).join(', ')}
                      </strong>
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalMode(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-semibold"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      'Save Member'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Payments Modal */}
      {showDeleteModal && deleteTargetMember && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Delete Payments: {deleteTargetMember.name} ({deleteTargetMember.memberId})
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleCloseDelete}
                  disabled={deletingPayments}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary mb-3">
                  Select collection dates whose payments and all associated transactions you wish to permanently delete for <strong>{deleteTargetMember.name}</strong>.
                </p>
                <div className="alert alert-warning py-2 small mb-3">
                  <i className="bi bi-info-circle-fill me-1"></i>
                  <strong>Note:</strong> If no dates are checked, <strong>ALL</strong> payment records and transactions for this member across all dates will be deleted.
                </div>

                <label className="form-label small fw-semibold text-secondary d-block">
                  Select Collection Date(s):
                </label>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {Array.from(new Set([...allKnownDates, ...(deleteTargetMember.assignedDates || [])])).sort((a,b)=>a-b).map((day) => {
                    const isChecked = deleteSelectedDates.includes(day);
                    const isAssigned = (deleteTargetMember.assignedDates || []).includes(day);
                    return (
                      <label
                        key={day}
                        className={`btn btn-sm px-3 py-2 rounded-pill border ${
                          isChecked
                            ? 'btn-danger text-white'
                            : isAssigned
                            ? 'btn-outline-danger'
                            : 'btn-outline-secondary'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          className="d-none"
                          checked={isChecked}
                          onChange={() => toggleDeleteDate(day)}
                        />
                        <i className={`bi ${isChecked ? 'bi-check-square-fill' : 'bi-square'} me-1`}></i>
                        {day}th Date {isAssigned ? '(Assigned)' : ''}
                      </label>
                    );
                  })}
                </div>

                <div className="p-3 bg-light rounded border small">
                  <strong>Selected Action:</strong>{' '}
                  {deleteSelectedDates.length > 0 ? (
                    <span className="text-danger fw-bold">
                      Delete records only for: {deleteSelectedDates.sort((a,b)=>a-b).map(d => `${d}th`).join(', ')}
                    </span>
                  ) : (
                    <span className="text-danger fw-bold">
                      Delete ALL payment records across all collection dates!
                    </span>
                  )}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDelete}
                  disabled={deletingPayments}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-semibold"
                  onClick={handleDeletePayments}
                  disabled={deletingPayments}
                >
                  {deletingPayments ? (
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
    </div>
  );
}

export default MemberManagement;
