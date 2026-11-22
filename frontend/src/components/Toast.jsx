import React, { useEffect, useState } from 'react';

const ICONS = {
  success: 'bi-check-circle-fill',
  danger: 'bi-exclamation-triangle-fill',
  warning: 'bi-exclamation-circle-fill',
  info: 'bi-info-circle-fill',
};

const COLORS = {
  success: '#198754',
  danger: '#dc3545',
  warning: '#e6a817',
  info: '#0d9fcc',
};

function Toast({ message, type = 'success', onClose }) {
  const [animOut, setAnimOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimOut(true);
      setTimeout(() => { if (onClose) onClose(); }, 400);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        borderLeft: `5px solid ${COLORS[type] || COLORS.info}`,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '260px',
        maxWidth: '380px',
        transform: animOut ? 'translateX(-120%)' : 'translateX(0)',
        opacity: animOut ? 0 : 1,
        transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s',
        animation: 'toastIn 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <i
        className={`bi ${ICONS[type] || ICONS.info}`}
        style={{ fontSize: '20px', color: COLORS[type] || COLORS.info, flexShrink: 0 }}
      ></i>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#222', flex: 1 }}>{message}</span>
      <button
        onClick={() => { setAnimOut(true); setTimeout(() => { if (onClose) onClose(); }, 400); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px', padding: '0 0 0 6px', lineHeight: 1 }}
        title="Dismiss"
      >✕</button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast message={t.message} type={t.type} onClose={() => onRemove(t.id)} />
        </div>
      ))}
    </div>
  );
}

export default Toast;
