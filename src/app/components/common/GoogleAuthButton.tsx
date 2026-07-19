import React from 'react';
import { Loader2 } from 'lucide-react';
import GoogleLogo from '@/app/components/GoogleLogo';

interface GoogleAuthButtonProps {
  label: string;
  loading?: boolean;
  onClick: () => void;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ label, loading = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full flex items-center justify-center gap-3 px-4 py-2.5  border text-sm font-medium transition-all hover:shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mb-5"
    style={{
      backgroundColor: '#ffffff',
      borderColor: '#dadce0',
      color: '#3c4043',
      fontFamily: "'Roboto', sans-serif",
    }}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4285F4' }} /> : <GoogleLogo />}
    {label}
  </button>
);

export default GoogleAuthButton;
