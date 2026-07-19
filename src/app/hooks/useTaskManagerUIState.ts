import { useState } from 'react';
import type { PlanTasksResult } from '@/app/lib/backend-api';

export const useTaskManagerUIState = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showManageHabitsModal, setShowManageHabitsModal] = useState(false);
  const [createHabitFromManage, setCreateHabitFromManage] = useState(false);
  const [historyHabitId, setHistoryHabitId] = useState<number | null>(null);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<PlanTasksResult | null>(null);

  return {
    showSettings, setShowSettings,
    showManageHabitsModal, setShowManageHabitsModal,
    createHabitFromManage, setCreateHabitFromManage,
    historyHabitId, setHistoryHabitId,
    taskSidebarOpen, setTaskSidebarOpen,
    aiPlanResult, setAiPlanResult,
  };
};
