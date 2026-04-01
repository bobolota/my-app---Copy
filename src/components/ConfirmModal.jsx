import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmer", cancelText = "Annuler", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-[9999] backdrop-blur-[3px] p-4">
      <div 
        className={`bg-[#1a1a1a] p-6 rounded-xl border w-full max-w-[400px] text-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${isDanger ? 'border-[var(--danger)]' : 'border-[var(--accent-blue)]'}`}
      >
        <h3 className={`mt-0 mb-4 text-xl font-bold ${isDanger ? 'text-[var(--danger)]' : 'text-[var(--accent-blue)]'}`}>
          {title}
        </h3>
        <p className="text-[#ccc] mb-6 text-[0.95rem] leading-relaxed">
          {message}
        </p>
        
        <div className="flex gap-4 justify-center">
          <button 
            onClick={onCancel} 
            className="px-5 py-2.5 bg-[#333] text-white border-none rounded-lg cursor-pointer font-bold flex-1 hover:bg-[#444] transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-5 py-2.5 border-none rounded-lg cursor-pointer font-bold flex-1 text-white shadow-lg transition-colors ${isDanger ? 'bg-[var(--danger)] hover:bg-red-700' : 'bg-[var(--success)] hover:bg-green-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}