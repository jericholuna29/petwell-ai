import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[#2B2F66] mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2 border border-[#C9BEFF] rounded-lg hover:border-[#8494FF]/70 focus:outline-none focus:ring-2 focus:ring-[#8494FF]/60 focus:border-transparent transition-all ${
          error ? 'border-[#D64B7E] focus:ring-[#D64B7E]/40 hover:border-[#D64B7E]' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[#D64B7E] text-sm mt-1">{error}</p>}
    </div>
  );
}
