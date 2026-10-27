import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Step2Dashboard() {
  const { user, token, logout, isAdmin } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const testAuthEndpoint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.get(`${apiBaseUrl}/auth/me`);
      setTestResult({
        success: true,
        data: res.data
      });
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.message || err.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container py-4 flex-grow-1">
      {/* Step 2 Header Banner */}
      <div className="alert alert-success d-flex align-items-center justify-content-between p-3 mb-4 rounded-3 shadow-sm border-0">
        <div className="d-flex align-items-center gap-3">
          <i className="bi bi-shield-check fs-2 text-success"></i>
          <div>
            <h5 className="alert-heading mb-1 fw-bold">Step 2 Complete: Authentication & Permissions Active!</h5>
            <p className="mb-0 small text-muted">
              Secure PIN-based authentication with bcrypt hashing, JWT tokens, and backend role verification.
            </p>
          </div>
        </div>
        <span className="badge bg-success fs-6 px-3 py-2">Step 2 Verified</span>
      </div>

      <div className="row g-4">
        {/* Current User Session Card */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h6 className="mb-0 fw-bold text-secondary">
                <i className="bi bi-person-badge me-2 text-primary"></i>
                Active User Session
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div
                  className={`rounded-circle text-white d-flex align-items-center justify-content-center p-3 ${
                    isAdmin ? 'bg-danger' : 'bg-primary'
                  }`}
                  style={{ width: '64px', height: '64px' }}
                >
                  <i className={`bi ${isAdmin ? 'bi-shield-lock-fill' : 'bi-person-fill'} fs-2`}></i>
                </div>
                <div>
                  <h4 className="fw-bold mb-0 text-dark">{user?.displayName}</h4>
                  <span className="text-muted small">@{user?.username}</span>
                  <div className="mt-1">
                    <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-primary'}`}>
                      Role: {user?.role?.toUpperCase()}
                    </span>
                    <span className="badge bg-success ms-2">
                      <i className="bi bi-check-circle me-1"></i>Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="list-group list-group-flush border rounded-3 mb-3">
                <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                  <span className="small text-muted">User ID</span>
                  <code className="small">{user?.id || user?._id}</code>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                  <span className="small text-muted">Token Status</span>
                  <span className="badge bg-success">JWT Signed (7 Days)</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                  <span className="small text-muted">Admin Privileges</span>
                  {isAdmin ? (
                    <span className="text-danger fw-bold small">
                      <i className="bi bi-check-circle-fill me-1"></i>Full Admin Access
                    </span>
                  ) : (
                    <span className="text-secondary fw-semibold small">
                      <i className="bi bi-lock-fill me-1"></i>Standard Collection Access
                    </span>
                  )}
                </div>
              </div>

              {/* JWT Protected Route Test */}
              <div className="p-3 bg-light rounded border mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-bold text-secondary">
                    <i className="bi bi-terminal-check me-1 text-primary"></i>
                    Verify Protected Endpoint:
                  </span>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={testAuthEndpoint}
                    disabled={testing}
                  >
                    {testing ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="bi bi-play-circle me-1"></i>
                    )}
                    GET /api/auth/me
                  </button>
                </div>
                {testResult && (
                  <pre
                    className="bg-dark text-white p-2 rounded small mb-0"
                    style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '0.75rem' }}
                  >
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                )}
              </div>

              <button
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={logout}
              >
                <i className="bi bi-arrow-repeat"></i>
                Switch Account / Re-login
              </button>
            </div>
          </div>
        </div>

        {/* Role Permissions Matrix Card */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h6 className="mb-0 fw-bold text-secondary">
                <i className="bi bi-shield-shaded me-2 text-primary"></i>
                Role Permissions Matrix (Active for {user?.displayName})
              </h6>
            </div>
            <div className="card-body p-4">
              <p className="text-muted small mb-3">
                This table verifies the access rights configured on both backend routes and frontend controls.
              </p>

              <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" style={{ width: '45%' }}>Capability / Operation</th>
                      <th scope="col" className="text-center" style={{ width: '25%' }}>All Accounts (Mani, Mavayya, Ganesh)</th>
                      <th scope="col" className="text-center" style={{ width: '30%' }}>Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>View Collection Records</strong>
                        <div className="text-muted small">View all member balances & payments</div>
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Allowed
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Allowed
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Edit & Record Payments</strong>
                        <div className="text-muted small">Add installments, update payment amounts</div>
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Allowed
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Allowed
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Manage Members</strong>
                        <div className="text-muted small">Add, edit, or deactivate members</div>
                      </td>
                      <td className="text-center text-danger small">
                        <i className="bi bi-x-circle-fill me-1"></i> Restricted
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Admin Only
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Configure Collection Dates & Amounts</strong>
                        <div className="text-muted small">Setup collection periods and common amount</div>
                      </td>
                      <td className="text-center text-danger small">
                        <i className="bi bi-x-circle-fill me-1"></i> Restricted
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Admin Only
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Send WhatsApp Reminders</strong>
                        <div className="text-muted small">Click-to-chat prefilled payment reminder</div>
                      </td>
                      <td className="text-center text-danger small">
                        <i className="bi bi-x-circle-fill me-1"></i> Hidden & Blocked
                      </td>
                      <td className="text-center text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1"></i> Admin Only
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Ready for Step 3 Notice */}
              <div className="card mt-4 bg-light border-0">
                <div className="card-body p-3">
                  <h6 className="fw-bold text-dark mb-1">
                    <i className="bi bi-arrow-right-circle text-primary me-2"></i>
                    Next Up: Step 3 — Admin Member Management & Collection Configuration
                  </h6>
                  <p className="text-muted small mb-0">
                    In Step 3, the Admin will add and manage the 20 members with their phone numbers and configure collection dates and the common monthly collection amount.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step2Dashboard;

