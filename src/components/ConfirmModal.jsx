// DEBUT DE LA MODIFICATION - NOUVEAU FICHIER : src/components/ConfirmModal.jsx

import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmer", cancelText = "Annuler", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, backdropFilter: 'blur(3px)'
    }}>
      <div className="glass-effect" style={{
        background: '#1a1a1a', padding: '25px', borderRadius: '12px',
        border: `1px solid ${isDanger ? 'var(--danger)' : 'var(--accent-blue)'}`,
        width: '90%', maxWidth: '400px', textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, color: isDanger ? 'var(--danger)' : 'var(--accent-blue)', marginBottom: '15px' }}>
          {title}
        </h3>
        <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button 
            onClick={onCancel} 
            style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="tm-btn-success"
            style={{ padding: '10px 20px', background: isDanger ? 'var(--danger)' : 'var(--success)', border: 'none', flex: 1 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// FIN DE LA MODIFICATION