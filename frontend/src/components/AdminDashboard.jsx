import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
                      ? 'Admin Dashboard: Manage members and collection dates.'
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

      {/* Members Directory */}
      <MemberManagement />

    </div>
  );
}

export default AdminDashboard;
