import React from 'react';
import { useAuth } from '../context/AuthContext';

function Sidebar({ isOpen, onClose, activeTab, onSelectTab }) {
  const { user, logout, isAdmin } = useAuth();

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
            <i className="bi bi-wallet2 fs-4"></i>
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
                    <div className={`small fw-normal ${isActive ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '11px' }}>
                      {item.desc}
                    </div>
                  </div>
                  {isActive && <i className="bi bi-chevron-right text-white small"></i>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer with Logout */}
        <div className="p-3 border-top bg-light mt-auto">
          <button
            type="button"
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 shadow-xs"
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
    </>
  );
}

export default Sidebar;

