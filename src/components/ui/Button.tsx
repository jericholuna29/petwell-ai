import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-[#6367FF] text-white hover:bg-[#5257f5] hover:shadow-[0_10px_22px_rgba(99,103,255,0.28)]',
    secondary: 'bg-[#C9BEFF] text-[#24274A] hover:bg-[#b7a8ff] hover:shadow-[0_10px_20px_rgba(132,148,255,0.22)]',
    danger: 'bg-[#D64B7E] text-white hover:bg-[#c13f6f] hover:shadow-[0_10px_20px_rgba(214,75,126,0.25)]',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8494FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
