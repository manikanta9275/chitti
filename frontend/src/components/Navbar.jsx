import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SyncStatusButton from './SyncStatusButton';
import { isOnline } from '../utils/offlineSync';

function Navbar({ onToggleSidebar, month, year, onSyncComplete }) {
  const { user, isAdmin } = useAuth();
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <nav className="navbar navbar-expand navbar-dark bg-primary shadow-sm sticky-top">
      <div className="container-fluid px-3">
        {/* Left: Brand */}
        <div className="d-flex align-items-center gap-2">
          <span className="navbar-brand fw-bold d-flex align-items-center gap-2 mb-0">
            <i className="bi bi-wallet2 fs-4"></i>
            <span>Chitti Collection</span>
          </span>
        </div>

        {/* Right side: DB Synced (left of user name) + User Name with Green/Red dot */}
        <div className="d-flex align-items-center gap-2">
          {/* DB Synced / Update to DB is on the left side of user name */}
          <SyncStatusButton month={month} year={year} onSyncComplete={onSyncComplete} />

          {/* User Name Pill with Green dot (Online) or Red dot (Offline) */}
          {user && (
            <div className="d-flex align-items-center gap-2 bg-white bg-opacity-25 px-3 py-1 rounded-pill text-white small shadow-xs">
              {/* Online/Offline status dot next to user name */}
              <span
                className={`rounded-circle ${online ? 'bg-success' : 'bg-danger'} border border-white flex-shrink-0`}
                style={{
                  width: '10px',
                  height: '10px',
                  display: 'inline-block',
                  boxShadow: online ? '0 0 6px #22c55e' : '0 0 6px #ef4444'
                }}
                title={online ? 'Online (Connected)' : 'Offline (Disconnected)'}
              ></span>

              <span className="fw-bold">{user.displayName}</span>

              <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-light text-primary'} ms-1`} style={{ fontSize: '10px' }}>
                {user.role?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
