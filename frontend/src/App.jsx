import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import SyncStatusButton from './components/SyncStatusButton';
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

const TAB_INFO = {
  dashboard: { label: 'Dashboard', icon: 'bi-speedometer2' },
  members: { label: 'Members Directory', icon: 'bi-people' },
  config: { label: 'Collection Dates & Amount', icon: 'bi-calendar-event' },
  logs: { label: 'Activity Logs', icon: 'bi-clock-history' }
};

function MainApp() {
  const { user, loading, isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(10); // Default: October 2026 per specs
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'members' | 'config' | 'logs'
  const [selectedDate, setSelectedDate] = useState(null); // When set, shows CollectionDetails for that date
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        month={selectedMonth}
        year={selectedYear}
        onSyncComplete={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Left-side Navigation Sidebar Menu (hides Dashboard, Members Directory, Collection Dates & Amount, Activity Logs) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        month={selectedMonth}
        year={selectedYear}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedDate(null);
        }}
      />

      {/* Global Period & Breadcrumb Bar */}
      <div className="bg-white border-bottom shadow-xs py-2 sticky-top" style={{ top: '56px', zIndex: 1020 }}>
        <div className="container">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            {/* Left side: Menu trigger button & Current Active View */}
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 shadow-xs"
                onClick={() => setSidebarOpen(true)}
                title="Open Navigation Menu"
              >
                <i className="bi bi-list fs-5 lh-1"></i>
                <span className="fw-semibold">Menu</span>
              </button>

              <div className="vr my-1 d-none d-sm-block text-secondary"></div>

              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 d-inline-flex align-items-center gap-1 fs-6 fw-semibold">
                  <i className={`bi ${TAB_INFO[activeTab]?.icon || 'bi-speedometer2'}`}></i>
                  <span>{TAB_INFO[activeTab]?.label || 'Dashboard'}</span>
                </span>
                {selectedDate && (
                  <span className="badge bg-light text-dark border small">
                    Date: {selectedDate}th
                  </span>
                )}
              </div>
            </div>

            {/* Right side: Period Filter Dropdown */}
            <div className="d-flex align-items-center gap-2 justify-content-end flex-wrap">
              <div className="d-flex align-items-center gap-1">
                <label className="small text-muted fw-bold text-nowrap mb-0 d-none d-md-inline">
                  <i className="bi bi-calendar3 text-primary me-1"></i>Period:
                </label>
                <select
                  className="form-select form-select-sm fw-bold border-primary shadow-xs"
                  style={{ width: '120px' }}
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
                  style={{ width: '85px' }}
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

      {/* Main Content Area */}
      <main className="flex-grow-1" key={refreshKey}>
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
