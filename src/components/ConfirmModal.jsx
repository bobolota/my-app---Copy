import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmer", cancelText = "Annuler", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
      <div className="bg-[#15151e]/95 backdrop-blur-xl p-8 rounded-3xl border border-white/10 w-full max-w-[420px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED Dynamique (Rouge si danger, Vert si succès) */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${isDanger ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}></div>

        {/* Lueur de fond douce */}
        <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none opacity-20 ${isDanger ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

        <h3 className={`mt-2 mb-3 text-2xl font-black tracking-wide drop-shadow-md ${isDanger ? 'text-red-400' : 'text-emerald-400'}`}>
          {title}
        </h3>
        <p className="text-[#aaa] mb-8 text-sm font-medium leading-relaxed relative z-10">
          {message}
        </p>
        
        <div className="flex gap-4 justify-center relative z-10">
          <button 
            onClick={onCancel} 
            className="px-5 py-3.5 bg-black/40 text-[#888] border border-white/5 rounded-xl cursor-pointer font-black text-xs tracking-widest uppercase flex-1 hover:bg-white/10 hover:text-white transition-all shadow-inner"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-5 py-3.5 border-none rounded-xl cursor-pointer font-black tracking-widest uppercase text-xs flex-1 text-white shadow-lg transition-all hover:-translate-y-0.5 ${isDanger ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-[0_4px_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)]'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}