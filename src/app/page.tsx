'use client';

import React from 'react';
import ProtectedPage from './components/common/ProtectedPage';
import TaskManager from './TaskManager';

export default function Page() {
  return (
    <ProtectedPage>
      <TaskManager />
    </ProtectedPage>
  );
}
