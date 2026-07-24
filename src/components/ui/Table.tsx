import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg shadow ring-1 ring-black ring-opacity-5">
      <div className="inline-block min-w-full align-middle">
        <table className={`min-w-full divide-y divide-gray-300 ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gray-50">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>;
}

export function TableRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <tr className={`hover:bg-gray-50 transition-colors ${className}`}>{children}</tr>;
}

export function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export function TableCell({ children, className = '', ...props }: TableCellProps) {
  return <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${className}`} {...props}>{children}</td>;
}
