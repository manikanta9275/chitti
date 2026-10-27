import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CollectionConfigCard from './CollectionConfigCard';
import MemberManagement from './MemberManagement';

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

function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(10); // Default: October 2026 per specs
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'config'

  return (
    <div className="container py-4 flex-grow-1">

      {/* Top Welcome & Month Selector Banner */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-6">
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`rounded-circle text-white d-flex align-items-center justify-content-center ${
                    isAdmin ? 'bg-danger' : 'bg-primary'
                  }`}
                  style={{ width: '56px', height: '56px' }}
                >
                  <i className={`bi ${isAdmin ? 'bi-shield-shaded' : 'bi-person-badge-fill'} fs-3`}></i>
                </div>
                <div>
                  <h4 className="fw-bold mb-1 text-dark">
                    Welcome, {user?.displayName}!
                  </h4>
                  <p className="text-muted small mb-0">
                    {isAdmin
                      ? 'Admin Dashboard: Manage 20 members, collection dates, and common amount.'
                      : 'Member & Schedule View: Shared database records across all accounts.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Month & Year Selectors */}
            <div className="col-12 col-md-6">
              <div className="d-flex flex-wrap align-items-center justify-content-md-end gap-2">
                <div className="d-flex align-items-center gap-2">
                  <label className="small text-muted fw-bold text-nowrap">
                    <i className="bi bi-calendar-month text-primary me-1"></i>Period:
                  </label>
                  <select
                    className="form-select form-select-sm fw-bold border-primary shadow-sm"
                    style={{ width: '140px' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  className="form-select form-select-sm fw-bold border-primary shadow-sm"
                  style={{ width: '100px' }}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                >
                  {[2025, 2026, 2027, 2028].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold d-flex align-items-center gap-2 ${
              activeTab === 'members' ? 'active shadow-sm' : 'bg-white text-secondary border'
            }`}
            onClick={() => setActiveTab('members')}
          >
            <i className="bi bi-people-fill"></i>
            <span>Members Directory (20)</span>
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold d-flex align-items-center gap-2 ${
              activeTab === 'config' ? 'active shadow-sm' : 'bg-white text-secondary border'
            }`}
            onClick={() => setActiveTab('config')}
          >
            <i className="bi bi-sliders"></i>
            <span>Collection Dates & Amount</span>
          </button>
        </li>
      </ul>

      {/* Main Tab Content */}
      {activeTab === 'members' && (
        <>
          {/* Quick Schedule Preview Bar */}
          <div className="alert alert-info py-2 px-3 small d-flex align-items-center justify-content-between mb-3 rounded-3">
            <span>
              <i className="bi bi-info-circle-fill me-2"></i>
              Active Period: <strong>October {selectedYear}</strong> &bull; Common Amount: <strong>₹1,000 / member</strong>
            </span>
            <button
              className="btn btn-link btn-sm text-decoration-none p-0 fw-semibold"
              onClick={() => setActiveTab('config')}
            >
              View Dates Schedule &rarr;
            </button>
          </div>
          <MemberManagement />
        </>
      )}

      {activeTab === 'config' && (
        <CollectionConfigCard
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}

    </div>
  );
}

export default AdminDashboard;

