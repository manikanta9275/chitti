import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import MainDashboard from './components/MainDashboard';
import CollectionDetails from './components/CollectionDetails';
import MemberManagement from './components/MemberManagement';
import CollectionConfigCard from './components/CollectionConfigCard';
import ActivityHistory from './components/ActivityHistory';

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

function MainApp() {
  const { user, loading, isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(10); // Default: October 2026 per specs
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'members' | 'config' | 'logs'
  const [selectedDate, setSelectedDate] = useState(null); // When set, shows CollectionDetails for that date

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h5 className="fw-semibold text-secondary">Checking session...</h5>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const handleBackToDashboard = () => {
    setSelectedDate(null);
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <Navbar />

      {/* Global Period & Navigation Bar */}
      <div className="bg-white border-bottom shadow-xs py-2 sticky-top" style={{ top: '56px', zIndex: 1020 }}>
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            {/* Navigation Tabs (Role Matrix completely removed) */}
            <div className="btn-group btn-group-sm flex-wrap">
              <button
                className={`btn ${activeTab === 'dashboard' && !selectedDate ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedDate(null);
                }}
              >
                <i className="bi bi-speedometer2 me-1"></i>
                Dashboard
              </button>
              <button
                className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setActiveTab('members');
                  setSelectedDate(null);
                }}
              >
                <i className="bi bi-people me-1"></i>
                Members Directory
              </button>
              <button
                className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setActiveTab('config');
                  setSelectedDate(null);
                }}
              >
                <i className="bi bi-calendar-event me-1"></i>
                Collection Dates & Amount
              </button>
              <button
                className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setActiveTab('logs');
                  setSelectedDate(null);
                }}
              >
                <i className="bi bi-clock-history me-1"></i>
                Activity Logs
              </button>
            </div>

            {/* Month & Year Filter Dropdown */}
            <div className="d-flex align-items-center gap-2 justify-content-end">
              <label className="small text-muted fw-bold text-nowrap mb-0">
                <i className="bi bi-calendar3 text-primary me-1"></i>Period:
              </label>
              <select
                className="form-select form-select-sm fw-bold border-primary shadow-xs"
                style={{ width: '130px' }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                className="form-select form-select-sm fw-bold border-primary shadow-xs"
                style={{ width: '90px' }}
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

      {/* Main Content Area */}
      <main className="flex-grow-1">
        {selectedDate ? (
          <CollectionDetails
            month={selectedMonth}
            year={selectedYear}
            date={selectedDate}
            onBack={handleBackToDashboard}
          />
        ) : activeTab === 'dashboard' ? (
          <MainDashboard
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        ) : activeTab === 'members' ? (
          <div className="container py-4">
            <MemberManagement />
          </div>
        ) : activeTab === 'config' ? (
          <div className="container py-4">
            <CollectionConfigCard
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </div>
        ) : (
          <ActivityHistory />
        )}
      </main>

      {/* Global Footer */}
      <footer className="bg-white border-top py-3 text-center text-muted small mt-auto">
        <div className="container">
          Chitti Collection Management System &copy; 2026 &bull; Shared Records Active
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
