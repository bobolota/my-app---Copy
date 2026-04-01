import React from 'react';

export default function ChoiceModal({ isOpen, title, message, optionA, optionB, onChoose, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-[9999] backdrop-blur-[3px] p-4">
      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[var(--accent-orange)] w-full max-w-[400px] text-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <h3 className="mt-0 mb-4 text-[var(--accent-orange)] text-xl font-bold">
          {title}
        </h3>
        <p className="text-[#ccc] mb-6 text-[0.95rem] leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-3 mb-5">
          <button 
            onClick={() => onChoose('A')} 
            className="p-3 bg-[#222] text-white border border-[#444] rounded-lg cursor-pointer font-bold text-base hover:border-[var(--accent-orange)] transition-colors"
          >
            👉 {optionA}
          </button>
          <button 
            onClick={() => onChoose('B')} 
            className="p-3 bg-[#222] text-white border border-[#444] rounded-lg cursor-pointer font-bold text-base hover:border-[var(--accent-orange)] transition-colors"
          >
            👉 {optionB}
          </button>
        </div>

        <button 
          onClick={onCancel} 
          className="px-5 py-2 bg-transparent text-[#888] border-none cursor-pointer underline hover:text-white transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}