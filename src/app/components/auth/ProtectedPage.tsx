'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import PageSpinner from '@/app/components/common/PageSpinner';

interface ProtectedPageProps {
  children: React.ReactNode;
}

const ProtectedPage: React.FC<ProtectedPageProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <PageSpinner />;

  if (!user) {
    router.replace('/login');
    return null;
  }

  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>;
};

export default ProtectedPage;
