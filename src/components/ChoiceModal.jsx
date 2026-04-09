import React from 'react';

export default function ChoiceModal({ isOpen, title, message, optionA, optionB, onChoose, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
      {/* 👇 bg-app-panel remplace #15151e et border-muted-line remplace white/10 */}
      <div className="bg-app-panel/95 backdrop-blur-xl p-8 rounded-3xl border border-muted-line w-full max-w-[420px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED - Utilisation de secondary et danger pour le dégradé */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-danger shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>

        {/* 👇 text-secondary remplace orange-400 */}
        <h3 className="mt-2 mb-3 text-secondary text-2xl font-black tracking-wide drop-shadow-md uppercase">
          {title}
        </h3>
        {/* 👇 text-muted-light remplace #aaa */}
        <p className="text-muted-light mb-8 text-sm font-medium leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-4 mb-6">
          <button 
            onClick={() => onChoose('A')} 
            className="w-full p-4 bg-app-input text-white border border-muted-line rounded-xl cursor-pointer font-black tracking-wider text-sm hover:border-secondary/50 hover:bg-secondary/10 transition-all shadow-inner group flex items-center justify-center gap-3"
          >
            <span className="text-secondary group-hover:-translate-x-1 transition-transform">👉</span> {optionA}
          </button>
          <button 
            onClick={() => onChoose('B')} 
            className="w-full p-4 bg-app-input text-white border border-muted-line rounded-xl cursor-pointer font-black tracking-wider text-sm hover:border-secondary/50 hover:bg-secondary/10 transition-all shadow-inner group flex items-center justify-center gap-3"
          >
            <span className="text-secondary group-hover:-translate-x-1 transition-transform">👉</span> {optionB}
          </button>
        </div>

        <button 
          onClick={onCancel} 
          
          className="mt-2 px-5 py-2 bg-transparent text-muted-dark font-black text-[10px] uppercase tracking-widest border-none cursor-pointer hover:text-white transition-colors underline-offset-4 hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}