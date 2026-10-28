import React from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar({ onToggleSidebar }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="navbar navbar-expand navbar-dark bg-primary shadow-sm sticky-top">
      <div className="container-fluid px-3">
        {/* Left: Menu button + Brand */}
        <div className="d-flex align-items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 shadow-none border-0"
              style={{ fontSize: '1.25rem', padding: '4px 8px' }}
              title="Open Menu"
              aria-label="Toggle navigation menu"
            >
              <i className="bi bi-list fs-4"></i>
            </button>
          )}
          <span className="navbar-brand fw-bold d-flex align-items-center gap-2 mb-0">
            <i className="bi bi-wallet2 fs-4"></i>
            <span>Chitti Collection</span>
          </span>
        </div>

        {/* Right side user menu */}
        <div className="d-flex align-items-center gap-2">
          {user && (
            <div className="d-flex align-items-center gap-2 bg-white bg-opacity-25 px-3 py-1 rounded-pill text-white small">
              <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-person-circle'} fs-6`}></i>
              <span className="fw-semibold d-none d-sm-inline">{user.displayName}</span>
              <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-light text-primary'} ms-1`}>
                {user.role?.toUpperCase()}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 shadow-sm"
            title="Logout"
          >
            <i className="bi bi-box-arrow-right"></i>
            <span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

