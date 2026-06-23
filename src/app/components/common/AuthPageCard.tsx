import React from 'react';

interface AuthPageCardProps {
  children: React.ReactNode;
}

const AuthPageCard: React.FC<AuthPageCardProps> = ({ children }) => (
  <div
    className="min-h-screen flex items-center justify-center px-4"
    style={{ backgroundColor: 'var(--tm-bg)' }}
  >
    <div
      className="w-full max-w-sm rounded-2xl border p-8 shadow-sm"
      style={{ backgroundColor: 'var(--tm-surface)', borderColor: 'var(--tm-border)' }}
    >
      {children}
    </div>
  </div>
);

export default AuthPageCard;
