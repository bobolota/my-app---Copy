import React, { useState, useEffect } from 'react';

export default function PromptModal({ isOpen, title, message, placeholder, onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState('');

  // On vide le champ à chaque ouverture
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
      <div className="bg-[#15151e]/95 backdrop-blur-xl p-8 rounded-3xl border border-white/10 w-full max-w-[420px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED Bleue */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>

        {/* Lueur de fond */}
        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none opacity-20 bg-blue-500"></div>

        <h3 className="mt-2 mb-3 text-blue-400 text-2xl font-black tracking-wide drop-shadow-md">
          {title}
        </h3>
        <p className="text-[#aaa] mb-6 text-sm font-medium whitespace-pre-wrap leading-relaxed relative z-10">
          {message}
        </p>
        
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder={placeholder} 
          className="w-full mb-8 p-4 rounded-xl bg-black/40 border border-white/10 text-white text-center font-bold focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-all shadow-inner placeholder-[#555] relative z-10" 
          autoFocus 
        />

        <div className="flex gap-4 justify-center relative z-10">
          <button 
            onClick={onCancel} 
            className="px-5 py-3.5 bg-black/40 text-[#888] border border-white/5 rounded-xl cursor-pointer font-black text-xs tracking-widest uppercase flex-1 hover:bg-white/10 hover:text-white transition-all shadow-inner"
          >
            Annuler
          </button>
          <button 
            onClick={() => onConfirm(inputValue)} 
            className="px-5 py-3.5 border-none rounded-xl cursor-pointer font-black tracking-widest uppercase text-xs flex-1 text-white shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)]"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}