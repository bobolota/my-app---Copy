import React, { useState, useEffect } from 'react';

export default function PromptModal({ isOpen, title, message, placeholder, onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState('');

  // On vide le champ à chaque ouverture
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-[9999] backdrop-blur-[3px] p-4">
      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[var(--accent-blue)] w-full max-w-[400px] text-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <h3 className="mt-0 mb-4 text-[var(--accent-blue)] text-xl font-bold">
          {title}
        </h3>
        <p className="text-[#ccc] mb-5 text-[0.95rem] whitespace-pre-wrap leading-relaxed">
          {message}
        </p>
        
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder={placeholder} 
          className="w-full mb-6 p-3 rounded-lg bg-[#222] border border-[#444] text-white text-center text-lg focus:outline-none focus:border-[var(--accent-blue)] transition-colors" 
          autoFocus 
        />

        <div className="flex gap-4 justify-center">
          <button 
            onClick={onCancel} 
            className="px-5 py-2.5 bg-[#333] text-white border-none rounded-lg cursor-pointer font-bold flex-1 hover:bg-[#444] transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={() => onConfirm(inputValue)} 
            className="px-5 py-2.5 bg-[var(--success)] text-white border-none rounded-lg cursor-pointer font-bold flex-1 hover:bg-green-600 shadow-lg transition-colors"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}