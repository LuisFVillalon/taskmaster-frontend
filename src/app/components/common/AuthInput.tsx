import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const AuthInput: React.FC<AuthInputProps> = ({ label, id, ...inputProps }) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      {...inputProps}
      className="w-full rounded-lg border px-3 py-2.5 text-sm bg-transparent text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 transition-all"
      style={{ borderColor: 'var(--tm-border)', '--tw-ring-color': 'var(--tm-accent)' } as React.CSSProperties}
    />
  </div>
);

export default AuthInput;
