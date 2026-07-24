import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent shadow-sm',
      secondary: 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm',
      danger: 'text-white bg-red-600 hover:bg-red-700 border border-transparent shadow-sm',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[44px] sm:min-h-0', // 44px touch target on mobile
      md: 'px-4 py-2 text-sm min-h-[44px] sm:min-h-0',
      lg: 'px-6 py-3 text-base min-h-[44px]',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
