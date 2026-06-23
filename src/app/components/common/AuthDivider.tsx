import React from 'react';

const AuthDivider: React.FC = () => (
  <div className="flex items-center gap-3 mb-5">
    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--tm-border)' }} />
    <span className="text-xs" style={{ color: 'var(--tm-text-muted)' }}>or</span>
    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--tm-border)' }} />
  </div>
);

export default AuthDivider;
