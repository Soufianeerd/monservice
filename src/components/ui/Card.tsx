import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-4 border border-gray-200 ${
        onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`flex justify-between items-start mb-2 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`space-y-2 text-sm text-gray-700 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`mt-4 flex justify-end space-x-3 border-t border-gray-100 pt-3 ${className}`}>{children}</div>;
}
