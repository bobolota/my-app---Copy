// DEBUT DE LA MODIFICATION - NOUVEAU FICHIER : src/components/ChoiceModal.jsx

import React from 'react';

export default function ChoiceModal({ isOpen, title, message, optionA, optionB, onChoose, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, backdropFilter: 'blur(3px)'
    }}>
      <div className="glass-effect modal-content" style={{
        background: '#1a1a1a', padding: '25px', borderRadius: '12px',
        border: '1px solid var(--accent-orange)',
        width: '90%', maxWidth: '400px', textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, color: 'var(--accent-orange)', marginBottom: '15px' }}>
          {title}
        </h3>
        <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <button 
            onClick={() => onChoose('A')} 
            style={{ padding: '12px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
            onMouseOver={(e) => e.target.style.borderColor = 'var(--accent-orange)'}
            onMouseOut={(e) => e.target.style.borderColor = '#444'}
          >
            👉 {optionA}
          </button>
          <button 
            onClick={() => onChoose('B')} 
            style={{ padding: '12px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
            onMouseOver={(e) => e.target.style.borderColor = 'var(--accent-orange)'}
            onMouseOut={(e) => e.target.style.borderColor = '#444'}
          >
            👉 {optionB}
          </button>
        </div>

        <button 
          onClick={onCancel} 
          style={{ padding: '8px 20px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// FIN DE LA MODIFICATION