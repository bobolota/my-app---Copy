import React from 'react';

export default function ChoiceModal({ isOpen, title, message, optionA, optionB, onChoose, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
      <div className="bg-[#15151e]/95 backdrop-blur-xl p-8 rounded-3xl border border-white/10 w-full max-w-[420px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED Orange */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>

        <h3 className="mt-2 mb-3 text-orange-400 text-2xl font-black tracking-wide drop-shadow-md">
          {title}
        </h3>
        <p className="text-[#aaa] mb-8 text-sm font-medium leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-4 mb-6">
          <button 
            onClick={() => onChoose('A')} 
            className="w-full p-4 bg-black/40 text-white border border-white/5 rounded-xl cursor-pointer font-black tracking-wider text-sm hover:border-orange-500/50 hover:bg-orange-500/10 transition-all shadow-inner group flex items-center justify-center gap-3"
          >
            <span className="text-orange-400 group-hover:-translate-x-1 transition-transform">👉</span> {optionA}
          </button>
          <button 
            onClick={() => onChoose('B')} 
            className="w-full p-4 bg-black/40 text-white border border-white/5 rounded-xl cursor-pointer font-black tracking-wider text-sm hover:border-orange-500/50 hover:bg-orange-500/10 transition-all shadow-inner group flex items-center justify-center gap-3"
          >
            <span className="text-orange-400 group-hover:-translate-x-1 transition-transform">👉</span> {optionB}
          </button>
        </div>

        <button 
          onClick={onCancel} 
          className="mt-2 px-5 py-2 bg-transparent text-[#666] font-bold text-xs uppercase tracking-widest border-none cursor-pointer hover:text-white transition-colors underline-offset-4 hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}