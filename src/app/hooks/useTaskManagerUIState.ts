import React, { useState, useRef } from 'react';
import type { PlanTasksResult } from '@/app/lib/backend-api';
import { useResizableSplit } from '@/app/hooks/useResizableSplit';

export const useTaskManagerUIState = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showManageHabitsModal, setShowManageHabitsModal] = useState(false);
  const [createHabitFromManage, setCreateHabitFromManage] = useState(false);
  const [historyHabitId, setHistoryHabitId] = useState<number | null>(null);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<PlanTasksResult | null>(null);
  const [showStats, setShowStats] = useState(false);

  const [tasksWidthPct, setTasksWidthPct] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const handleSplitterMouseDown = useResizableSplit(
    splitContainerRef as React.RefObject<HTMLElement>,
    {
      anchor: 'left',
      onResize: (px) => {
        if (!splitContainerRef.current) return;
        const { width } = splitContainerRef.current.getBoundingClientRect();
        setTasksWidthPct(Math.min(95, Math.max(5, (px / width) * 100)));
      },
    },
  );

  return {
    showSettings, setShowSettings,
    showManageHabitsModal, setShowManageHabitsModal,
    createHabitFromManage, setCreateHabitFromManage,
    historyHabitId, setHistoryHabitId,
    taskSidebarOpen, setTaskSidebarOpen,
    aiPlanResult, setAiPlanResult,
    showStats, setShowStats,
    tasksWidthPct,
    splitContainerRef,
    handleSplitterMouseDown,
  };
};
