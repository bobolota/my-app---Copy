import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmer", cancelText = "Annuler", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
      {/* 👇 bg-app-panel et border-muted-line */}
      <div className="bg-app-panel/95 backdrop-blur-xl p-8 rounded-3xl border border-muted-line w-full max-w-[420px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED Dynamique (Danger ou Primary) */}
        <div className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-500 ${
          isDanger 
            ? 'bg-gradient-to-r from-danger to-danger-dark shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
            : 'bg-gradient-to-r from-primary to-primary-dark shadow-[0_0_15px_rgba(16,185,129,0.4)]'
        }`}></div>

        {/* Lueur de fond douce */}
        <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none opacity-20 ${isDanger ? 'bg-danger' : 'bg-primary'}`}></div>

        {/* Titre avec couleurs sémantiques */}
        <h3 className={`mt-2 mb-3 text-2xl font-black tracking-wide drop-shadow-md uppercase ${isDanger ? 'text-danger' : 'text-primary'}`}>
          {title}
        </h3>
        
        {/* 👇 text-muted-light remplace #aaa */}
        <p className="text-muted-light mb-8 text-sm font-medium leading-relaxed relative z-10">
          {message}
        </p>
        
        <div className="flex gap-4 justify-center relative z-10">
          {/* 👇 bg-app-input et text-muted remplace black/40 et #888 */}
          <button 
            onClick={onCancel} 
            className="px-5 py-3.5 bg-app-input text-muted border border-muted-line rounded-xl cursor-pointer font-black text-xs tracking-widest uppercase flex-1 hover:bg-white/10 hover:text-white transition-all shadow-inner"
          >
            {cancelText}
          </button>
          
          <button 
            onClick={onConfirm} 
            className={`px-5 py-3.5 border-none rounded-xl cursor-pointer font-black tracking-widest uppercase text-xs flex-1 text-white shadow-lg transition-all hover:-translate-y-0.5 ${
              isDanger 
                ? 'bg-gradient-to-r from-danger to-danger-dark hover:shadow-[0_4px_15px_rgba(239,68,68,0.4)]' 
                : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}