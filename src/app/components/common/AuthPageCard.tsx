import React from 'react';

interface AuthPageCardProps {
  children: React.ReactNode;
}

const AuthPageCard: React.FC<AuthPageCardProps> = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <div className="coil" />
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p
          className="text-center text-xs uppercase mb-6"
          style={{ letterSpacing: '0.1em', color: 'var(--tm-accent-hover)' }}
        >
          OneTab
        </p>
        <div
          className="w-full border p-8"
          style={{ backgroundColor: 'var(--tm-surface)', borderColor: 'var(--tm-text-primary)', borderWidth: '1.5px' }}
        >
          {children}
        </div>
      </div>
    </div>
  </div>
);

export default AuthPageCard;
