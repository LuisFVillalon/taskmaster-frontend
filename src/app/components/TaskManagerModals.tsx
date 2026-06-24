'use client';

import React from 'react';
import NewTaskModal from '@/app/components/task/NewTaskModal';
import AiSubtasksModal from '@/app/components/task/AiSubtasksModal';
import CreateTagModal from '@/app/components/tag/CreateTagModal';
import EditTagModal from '@/app/components/tag/EditTagListModal';
import CreateHabitModal from '@/app/components/habit/CreateHabitModal';
import ManageHabitsModal from '@/app/components/habit/ManageHabitsModal';
import HabitHistoryModal from '@/app/components/habit/HabitHistoryModal';
import SettingsModal from '@/app/components/SettingsModal';
import { Tag, BaseTaskForm, NewTag, NewHabit } from '@/app/types/task';
import type { PlanTasksResult, AiSubtask, Habit } from '@/app/lib/backend-api';

interface TaskManagerModalsProps {
  // New task
  showNewTaskModal: boolean;
  onCloseNewTaskModal: () => void;
  newTask: BaseTaskForm;
  onTaskChange: (task: BaseTaskForm) => void;
  onToggleTag: (tag: Tag) => void;
  onSubmitTask: (e: React.FormEvent) => void;
  onSmartPlan: (task: BaseTaskForm) => Promise<void>;
  activeTaskCount: number;
  occupiedPriorityLevels: number[];
  tags: Tag[];

  // AI plan result
  aiPlanResult: PlanTasksResult | null;
  onSaveSubtasks: (subtasks: AiSubtask[]) => Promise<void>;
  onDiscardAiPlan: () => void;

  // Create tag
  showCreateTagModal: boolean;
  onCloseCreateTagModal: () => void;
  newTag: NewTag;
  onTagChange: (tag: NewTag) => void;
  onSubmitTag: (e: React.FormEvent) => void;

  // Edit tag
  editingTag: Tag | null;
  showEditTagModal: boolean;
  onCloseEditTagModal: () => void;
  onDeleteTag: (tag: Tag) => void;
  onEditTag: (tag: Tag) => void;
  onOpenCreateTag: () => void;

  // Create habit
  showCreateHabitModal: boolean;
  onCloseCreateHabitModal: () => void;
  newHabit: NewHabit;
  onHabitChange: (habit: NewHabit) => void;
  onSubmitHabit: (e: React.FormEvent) => void;

  // Manage habits
  showManageHabitsModal: boolean;
  onCloseManageHabitsModal: () => void;
  habits: Habit[];
  onCreateHabitFromManage: () => void;
  onDeleteHabit: (id: number) => Promise<void>;
  onUpdateHabit: (id: number, title: string, tags: Tag[]) => Promise<void>;
  onViewHabitHistory: (id: number) => void;

  // Habit history
  historyHabit: Habit | null;
  onCloseHabitHistory: () => void;
  onToggleHabitDate: (id: number, date: string) => Promise<void>;

  // Settings
  showSettings: boolean;
  onCloseSettings: () => void;
  onAccountDeleted: () => void;
}

const TaskManagerModals: React.FC<TaskManagerModalsProps> = ({
  showNewTaskModal, onCloseNewTaskModal, newTask, onTaskChange, onToggleTag,
  onSubmitTask, onSmartPlan, activeTaskCount, occupiedPriorityLevels, tags,
  aiPlanResult, onSaveSubtasks, onDiscardAiPlan,
  showCreateTagModal, onCloseCreateTagModal, newTag, onTagChange, onSubmitTag,
  editingTag, showEditTagModal, onCloseEditTagModal, onDeleteTag, onEditTag, onOpenCreateTag,
  showCreateHabitModal, onCloseCreateHabitModal, newHabit, onHabitChange, onSubmitHabit,
  showManageHabitsModal, onCloseManageHabitsModal, habits, onCreateHabitFromManage,
  onDeleteHabit, onUpdateHabit, onViewHabitHistory,
  historyHabit, onCloseHabitHistory, onToggleHabitDate,
  showSettings, onCloseSettings, onAccountDeleted,
}) => {
  return (
    <>
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={onCloseNewTaskModal}
        newTask={newTask}
        onTaskChange={onTaskChange}
        tags={tags}
        onToggleTag={onToggleTag}
        onSubmit={onSubmitTask}
        onSmartPlan={onSmartPlan}
        activeTaskCount={activeTaskCount}
        usedPriorityLevels={occupiedPriorityLevels}
      />

      {aiPlanResult && (
        <AiSubtasksModal
          isOpen={!!aiPlanResult}
          parentTask={aiPlanResult.new_task}
          subtasks={aiPlanResult.subtasks}
          overloadWarning={aiPlanResult.overload_warning}
          onSave={onSaveSubtasks}
          onDiscard={onDiscardAiPlan}
        />
      )}

      <CreateTagModal
        isOpen={showCreateTagModal}
        onClose={onCloseCreateTagModal}
        newTag={newTag}
        onTagChange={onTagChange}
        onSubmit={onSubmitTag}
      />

      {editingTag && (
        <EditTagModal
          isOpen={showEditTagModal}
          onClose={onCloseEditTagModal}
          allTags={tags}
          onDeleteTag={onDeleteTag}
          onEditTag={onEditTag}
          onCreateTag={onOpenCreateTag}
        />
      )}

      <CreateHabitModal
        isOpen={showCreateHabitModal}
        onClose={onCloseCreateHabitModal}
        newHabit={newHabit}
        onHabitChange={onHabitChange}
        onSubmit={onSubmitHabit}
        availableTags={tags}
      />

      <ManageHabitsModal
        isOpen={showManageHabitsModal}
        onClose={onCloseManageHabitsModal}
        habits={habits}
        availableTags={tags}
        onCreateHabit={onCreateHabitFromManage}
        onDeleteHabit={onDeleteHabit}
        onUpdateHabit={onUpdateHabit}
        onViewHistory={onViewHabitHistory}
      />

      <HabitHistoryModal
        habit={historyHabit}
        onClose={onCloseHabitHistory}
        onToggleDate={onToggleHabitDate}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={onCloseSettings}
        onAccountDeleted={onAccountDeleted}
      />
    </>
  );
};

export default TaskManagerModals;
