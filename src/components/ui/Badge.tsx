import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  // Ajustement des couleurs pour garantir un contraste >= 4.5:1
  // Les textes ont été assombris et les fonds ajustés si nécessaire
  const variants = {
    default: 'bg-gray-100 text-gray-800', // Contraste OK
    success: 'bg-green-100 text-green-800', // text-green-800 sur bg-green-100 a un bon contraste
    warning: 'bg-yellow-100 text-yellow-900', // text-yellow-900 pour meilleur contraste sur bg-yellow-100
    error: 'bg-red-100 text-red-900', // text-red-900 sur bg-red-100
    info: 'bg-blue-100 text-blue-900', // text-blue-900 sur bg-blue-100
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
