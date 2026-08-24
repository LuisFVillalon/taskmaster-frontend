import React from 'react';

interface CardShellProps {
  icon: React.ReactNode;
  header: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const CardShell: React.FC<CardShellProps> = ({ icon, header, children, headerAction }) => {
  return (
    <div className="card h-full p-3 sm:p-4 lg:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs sm:text-sm md:text-base text-text-muted font-medium uppercase tracking-wide">
          {header}
        </span>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      {children}
    </div>
  );
};
