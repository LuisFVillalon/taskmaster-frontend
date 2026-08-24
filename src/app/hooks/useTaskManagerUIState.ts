import { useState } from 'react';

export const useTaskManagerUIState = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showManageHabitsModal, setShowManageHabitsModal] = useState(false);
  const [createHabitFromManage, setCreateHabitFromManage] = useState(false);
  const [historyHabitId, setHistoryHabitId] = useState<number | null>(null);
  const [historyFromManageHabits, setHistoryFromManageHabits] = useState(false);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(false);

  return {
    showSettings, setShowSettings,
    showManageHabitsModal, setShowManageHabitsModal,
    createHabitFromManage, setCreateHabitFromManage,
    historyHabitId, setHistoryHabitId,
    historyFromManageHabits, setHistoryFromManageHabits,
    taskSidebarOpen, setTaskSidebarOpen,
  };
};
