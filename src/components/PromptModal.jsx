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
      {/* bg-app-panel et border-muted-line */}
      <div className="bg-app-panel/95 backdrop-blur-xl p-8 rounded-3xl border border-muted-line w-full max-w-[420px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Ligne LED Bleue -> Action */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-action to-action-light shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>

        {/* Lueur de fond */}
        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none opacity-20 bg-action"></div>

        <h3 className="mt-2 mb-3 text-action text-2xl font-black tracking-wide drop-shadow-md">
          {title}
        </h3>
        <p className="text-muted-light mb-6 text-sm font-medium whitespace-pre-wrap leading-relaxed relative z-10">
          {message}
        </p>
        
        {/* Input : Utilisation de bg-app-input et placeholder:text-muted-dark */}
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder={placeholder} 
          className="w-full mb-8 p-4 rounded-xl bg-app-input border border-muted-line text-white text-center font-bold focus:outline-none focus:border-action focus:bg-app-bg transition-all shadow-inner placeholder:text-muted-dark relative z-10" 
          autoFocus 
        />

        <div className="flex gap-4 justify-center relative z-10">
          <button 
            onClick={onCancel} 
            className="px-5 py-3.5 bg-app-input text-muted border border-muted-line rounded-xl cursor-pointer font-black text-xs tracking-widest uppercase flex-1 hover:bg-white/10 hover:text-white transition-all shadow-inner"
          >
            Annuler
          </button>
          <button 
            onClick={() => onConfirm(inputValue)} 
            className="px-5 py-3.5 border-none rounded-xl cursor-pointer font-black tracking-widest uppercase text-xs flex-1 text-white shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-r from-primary to-primary-dark hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)]"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}