'use client';

import React from 'react';
import ProtectedPage from '@/app/components/common/ProtectedPage';
import TasksView from '@/app/components/tasks/TasksView';

export default function TasksPage() {
  return (
    <ProtectedPage>
      <TasksView />
    </ProtectedPage>
  );
}
