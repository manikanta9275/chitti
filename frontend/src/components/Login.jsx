import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isOnline } from '../utils/offlineSync';

const ACCOUNTS = [
  { username: 'admin', displayName: 'Admin', role: 'admin', defaultPin: '9999', icon: 'bi-shield-lock-fill', color: 'danger' },
  { username: 'mavayya', displayName: 'Mavayya', role: 'user', defaultPin: '9278', icon: 'bi-person-badge-fill', color: 'success' }
];

function Login() {
  const { login, loading, authError, setAuthError } = useAuth();
  const [selectedUsername, setSelectedUsername] = useState('admin');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
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

  const handleSelectAccount = (account) => {
    setSelectedUsername(account.username);
    setPin('');
    if (authError) setAuthError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setAuthError('Please enter your 4-digit PIN.');
      return;
    }
    await login(selectedUsername, pin);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 col-xl-5">

          {/* App Header */}
          <div className="text-center mb-4">
            <img
              src="/me_daddy.jpeg"
              alt="Logo"
              className="rounded-circle shadow border border-2 border-primary mb-3"
              style={{ width: '80px', height: '80px', objectFit: 'cover' }}
            />
            <h3 className="fw-bold text-dark mb-1">Chitti Collection</h3>
            <p className="text-muted small mb-1">Secure PIN Authentication</p>
            {/* Online / Offline Status Badge */}
            <span className={`badge ${online ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'} px-2 py-1`}>
              <i className={`bi ${online ? 'bi-wifi me-1' : 'bi-wifi-off me-1'}`}></i>
              {online ? 'Online Server Available' : 'Offline Mode Active (Local Login Ready)'}
            </span>
          </div>

          {/* Login Card */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold text-secondary mb-3 d-flex align-items-center justify-content-between">
                <span>
                  <i className="bi bi-person-check-fill me-2 text-primary"></i>
                  Select Account &amp; Enter PIN
                </span>
              </h5>

              {/* Account Selector Cards - Only 2 Main Accounts: Admin & Mavayya */}
              <label className="form-label text-muted small fw-semibold">Choose Account (Admin or Mavayya):</label>
              <div className="row g-2 mb-3">
                {ACCOUNTS.map((account) => {
                  const isSelected = selectedUsername === account.username;
                  return (
                    <div className="col-6" key={account.username}>
                      <button
                        type="button"
                        className={`btn w-100 p-3 text-start d-flex align-items-center gap-2 border rounded-3 ${
                          isSelected ? 'btn-primary text-white shadow-sm' : 'btn-light text-dark'
                        }`}
                        onClick={() => handleSelectAccount(account)}
                      >
                        <i className={`bi ${account.icon} fs-4 text-${isSelected ? 'white' : account.color}`}></i>
                        <div className="text-truncate">
                          <div className="fw-bold fs-6">{account.displayName}</div>
                          <span className={`badge ${isSelected ? 'bg-light text-primary' : 'bg-secondary'} py-0 px-1`} style={{ fontSize: '0.65rem' }}>
                            {account.role.toUpperCase()}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* PIN Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="pinInput" className="form-label text-muted small fw-semibold mb-0">
                      Enter Security PIN for <span className="text-primary fw-bold">{selectedUsername.toUpperCase()}</span>:
                    </label>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-key-fill text-muted"></i>
                    </span>
                    <input
                      id="pinInput"
                      type={showPin ? 'text' : 'password'}
                      className="form-control form-control-lg text-center fw-bold fs-4"
                      placeholder="••••"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPin(!showPin)}
                      title={showPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      <i className={`bi ${showPin ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {authError && (
                  <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                    <div>{authError}</div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 fw-semibold shadow-sm mb-3"
                  disabled={loading || !pin}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                  )}
                  {loading ? 'Verifying PIN...' : `Login as ${selectedUsername.toUpperCase()}`}
                </button>
              </form>

            </div>
          </div>

          <div className="text-center mt-3 text-muted small">
            <i className="bi bi-shield-lock me-1"></i> Works offline &amp; online &bull; Syncs with database automatically
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;
