import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ACCOUNTS = [
  { username: 'admin', displayName: 'Admin', role: 'admin', defaultPin: '9999', icon: 'bi-shield-lock-fill', color: 'danger' },
  // { username: 'mani', displayName: 'Mani', role: 'user', defaultPin: '9275', icon: 'bi-person-badge-fill', color: 'primary' },
  { username: 'mavayya', displayName: 'Mavayya', role: 'user', defaultPin: '9278', icon: 'bi-person-badge-fill', color: 'success' },
  // { username: 'ganesh', displayName: 'Ganesh', role: 'user', defaultPin: '9280', icon: 'bi-person-badge-fill', color: 'info' }
];

function Login() {
  const { login, loading, authError, setAuthError } = useAuth();
  const [selectedUsername, setSelectedUsername] = useState('mani');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

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

  // Quick fill helper for testing ease
  const handleQuickFill = (account) => {
    setSelectedUsername(account.username);
    setPin(account.defaultPin);
    if (authError) setAuthError(null);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 col-xl-5">

          {/* App Header */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle p-3 shadow-sm mb-3" style={{ width: '64px', height: '64px' }}>
              <i className="bi bi-wallet2 fs-2"></i>
            </div>
            <h3 className="fw-bold text-dark mb-1">Chitti Collection</h3>
            <p className="text-muted small">Secure PIN Authentication</p>
          </div>

          {/* Login Card */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold text-secondary mb-3">
                <i className="bi bi-person-check-fill me-2 text-primary"></i>
                Select Account & Enter PIN
              </h5>

              {/* Account Selector Cards */}
              <label className="form-label text-muted small fw-semibold">Choose Your Account:</label>
              <div className="row g-2 mb-3">
                {ACCOUNTS.map((account) => {
                  const isSelected = selectedUsername === account.username;
                  return (
                    <div className="col-6" key={account.username}>
                      <button
                        type="button"
                        className={`btn w-100 p-2 text-start d-flex align-items-center gap-2 border ${
                          isSelected ? 'btn-primary text-white shadow-sm' : 'btn-light text-dark'
                        }`}
                        onClick={() => handleSelectAccount(account)}
                      >
                        <i className={`bi ${account.icon} fs-5 text-${isSelected ? 'white' : account.color}`}></i>
                        <div className="text-truncate">
                          <div className="fw-bold small">{account.displayName}</div>
                          <span className={`badge ${isSelected ? 'bg-light text-primary' : 'bg-secondary'} py-0 px-1`} style={{ fontSize: '0.65rem' }}>
                            {account.role}
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
                  {loading ? 'Verifying PIN...' : 'Login to Chitti'}
                </button>
              </form>

              {/* Quick Testing Helper */}
              {/* <div className="p-3 bg-light rounded border">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small text-muted fw-bold">
                    <i className="bi bi-lightning-charge-fill text-warning me-1"></i>
                    Quick Test Credentials:
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {ACCOUNTS.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      className="btn btn-sm btn-outline-secondary py-1 px-2"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => handleQuickFill(acc)}
                    >
                      <strong>{acc.displayName}</strong>: {acc.defaultPin}
                    </button>
                  ))}
                </div>
              </div> */}

            </div>
          </div>

          <div className="text-center mt-3 text-muted small">
            <i className="bi bi-shield-lock me-1"></i> Passwords stored with bcrypt hashing & JWT sessions
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;

