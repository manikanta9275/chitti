import React, { useState, useEffect } from 'react';
import {
  isOnline,
  getSyncQueue,
  syncPendingToDatabase
} from '../utils/offlineSync';

function SyncStatusButton({ month, year, onSyncComplete }) {
  const [online, setOnline] = useState(isOnline());
  const [queueCount, setQueueCount] = useState(getSyncQueue().length);
  const [syncing, setSyncing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [statusAlert, setStatusAlert] = useState(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const updateStatus = () => {
    setOnline(isOnline());
    setQueueCount(getSyncQueue().length);
  };

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      setOnline(true);
      setStatusAlert({
        type: 'info',
        message: 'Internet connected!'
      });
      setTimeout(() => setStatusAlert(null), 3000);
    };

    const handleOffline = () => {
      setOnline(false);
      setStatusAlert({
        type: 'warning',
        message: 'Working in Offline Mode. Operations are saved locally.'
      });
      setTimeout(() => setStatusAlert(null), 4000);
    };

    const handleQueueChange = () => {
      setQueueCount(getSyncQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('chitti_sync_queue_updated', handleQueueChange);

    const interval = setInterval(updateStatus, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('chitti_sync_queue_updated', handleQueueChange);
      clearInterval(interval);
    };
  }, []);

  // Handle "Update to DB"
  const handleSyncToDb = async () => {
    if (!online) {
      alert('Cannot update to database right now because there is no internet connection. Please connect to mobile data or Wi-Fi first.');
      return;
    }

    setSyncing(true);
    setProgressMsg('Connecting...');

    try {
      const res = await syncPendingToDatabase(apiBaseUrl, (current, total) => {
        setProgressMsg(`Syncing ${current}/${total}...`);
      });

      if (res.success) {
        setStatusAlert({
          type: 'success',
          message: res.message || 'All local changes updated to database!'
        });
        setQueueCount(getSyncQueue().length);
        if (onSyncComplete) onSyncComplete();
      } else {
        setStatusAlert({
          type: 'warning',
          message: res.message
        });
      }
    } catch (err) {
      setStatusAlert({
        type: 'danger',
        message: 'Failed to update database. Please retry.'
      });
    } finally {
      setSyncing(false);
      setProgressMsg('');
      setTimeout(() => setStatusAlert(null), 5000);
    }
  };

  return (
    <div className="d-inline-flex align-items-center">
      {/* Toast Alert popup if any */}
      {statusAlert && (
        <div
          className={`position-fixed bottom-0 end-0 m-3 alert alert-${statusAlert.type} alert-dismissible fade show shadow-lg z-3`}
          style={{ maxWidth: '360px' }}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <i className={`bi bi-${statusAlert.type === 'success' ? 'check-circle-fill' : statusAlert.type === 'warning' ? 'exclamation-triangle-fill' : 'info-circle-fill'} fs-5`}></i>
            <span className="small fw-semibold">{statusAlert.message}</span>
          </div>
          <button type="button" className="btn-close" onClick={() => setStatusAlert(null)}></button>
        </div>
      )}

      {/* Button: "Update to DB (X)" if queue > 0, otherwise "DB Synced" */}
      {queueCount > 0 ? (
        <button
          type="button"
          className="btn btn-warning btn-sm fw-bold d-inline-flex align-items-center gap-1 shadow-sm border text-dark py-1 px-2"
          onClick={handleSyncToDb}
          disabled={syncing || !online}
          title={online ? 'Click to update pending offline payments to MongoDB Database' : 'Offline: Changes saved on device.'}
        >
          {syncing ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span className="small">{progressMsg || 'Syncing...'}</span>
            </>
          ) : (
            <>
              <i className="bi bi-cloud-arrow-up-fill text-danger fs-6"></i>
              <span>Update to DB</span>
              <span className="badge bg-danger text-white rounded-pill px-1" style={{ fontSize: '11px' }}>{queueCount}</span>
            </>
          )}
        </button>
      ) : (
        <div
          className="d-inline-flex align-items-center gap-1 bg-white bg-opacity-25 px-2 py-1 rounded text-white small"
          title="All local data is synchronized with the database"
          style={{ fontSize: '12px' }}
        >
          <i className="bi bi-cloud-check-fill text-white fs-6"></i>
          <span className="fw-semibold">DB Synced</span>
        </div>
      )}
    </div>
  );
}

export default SyncStatusButton;
