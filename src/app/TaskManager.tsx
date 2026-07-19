'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { createHabit, deleteHabit, updateHabit, planTasks, AiSubtask, createTask } from '@/app/lib/backend-api';
import { Tag } from '@/app/types/task';
import { useTasks, useTags } from '@/app/hooks/useTasksAndTags';
import { useTaskManagerState } from '@/app/hooks/useTaskManagerState';
import { useTaskManagerUIState } from '@/app/hooks/useTaskManagerUIState';
import { useSplitPanel } from '@/app/hooks/useSplitPanel';
import { useTaskHandlers } from '@/app/hooks/useTaskHandlers';
import { useTaskFiltering } from '@/app/hooks/useTaskFiltering';
import { useClaimOrphanedData } from '@/app/hooks/useClaimOrphanedData';
import { useProfileName } from '@/app/hooks/useProfileName';
import { useNotes } from '@/app/hooks/useNotes';
import { useHabits } from '@/app/hooks/useHabits';
import { Note } from '@/app/types/notes';
import DragHandle from '@/app/components/common/DragHandle';
import { TaskControls } from '@/app/components/TaskControls';
import TasksPanel from '@/app/components/tasks/TasksPanel';
import NotesPanel from '@/app/components/notes/NotesPanel';
import CalendarAndStats from '@/app/components/CalendarAndStats';
import TaskManagerModals from '@/app/components/TaskManagerModals';
import TaskDebriefPanel from '@/app/components/TaskDebriefPanel';
import PageSpinner from '@/app/components/common/PageSpinner';
import { Settings, Menu, X, Maximize2, Minimize2 } from 'lucide-react';

const TaskManager: React.FC = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [focusMode, setFocusMode] = useState(false);

  useClaimOrphanedData(user);
  const profileName = useProfileName(user);

  const handleLogout = async () => {
    await signOut();
    Object.keys(localStorage)
      .filter(k => k.startsWith('onetab_'))
      .forEach(k => localStorage.removeItem(k));
    router.replace('/login');
  };

  const { tasks, isLoading, toggleComplete, addTask, deleteTask, updateTask, setTasks } = useTasks();
  const { tags, tagsLoading, addTag, delTag, updateTag } = useTags();

  const updatePriority = async (taskId: number, priority: number | null) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, {
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date ?? null,
      due_time: task.due_time ?? null,
      priority,
      category: task.category ?? null,
      completed: task.completed,
      completed_date: task.completed_date ?? null,
      tags: task.tags ?? [],
      created_date: task.created_date,
      estimated_time: task.estimated_time ?? null,
      parent_task_id: task.parent_task_id ?? null,
    });
  };

  const occupiedPriorityLevels = useMemo(
    () => tasks.filter(t => !t.completed && t.priority != null).map(t => t.priority as number),
    [tasks],
  );
  const activeTaskCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);

  const state = useTaskManagerState();
  const ui = useTaskManagerUIState();
  const { tasksWidthPct, splitContainerRef, handleSplitterMouseDown } = useSplitPanel();

  const handlers = useTaskHandlers({
    setShowNewTaskModal: state.setShowNewTaskModal,
    setNewTask: state.setNewTask,
    setShowEditTaskModal: state.setShowEditTaskModal,
    setShowCreateTagModal: state.setShowCreateTagModal,
    setNewTag: state.setNewTag,
    setEditingTag: state.setEditingTag,
    setShowEditTagModal: state.setShowEditTagModal,
    setTasks,
    setSortOrder: state.setSortOrder,
    setSelectedTags: state.setSelectedTags,
    setFilter: state.setFilter,
    newTask: state.newTask,
    showEditTaskModal: state.showEditTaskModal,
    newTag: state.newTag,
    filter: state.filter,
    addTask,
    updateTask,
    addTag,
    updateTag,
    delTag,
  });

  const { filteredTasks, stats } = useTaskFiltering(
    tasks, state.filter, state.sortOrder, state.searchTerm, state.selectedTags,
  );

  const { habits, toggle: toggleHabit, toggleDate: toggleHabitDate, refetch: refetchHabits } = useHabits();
  const historyHabit = habits.find(h => h.id === ui.historyHabitId) ?? null;

  const { notes: allNotes, addNote, deleteNote, updateNote } = useNotes();
  const [noteEditorOverlay, setNoteEditorOverlay] = useState<Note | null>(null);

  const noteTags = useMemo(() => {
    const map: Record<number, { name: string; color: string; count: number }> = {};
    allNotes.forEach(note => {
      note.tags?.forEach(tag => {
        if (!map[tag.id]) map[tag.id] = { name: tag.name, color: tag.color, count: 0 };
        map[tag.id].count += 1;
      });
    });
    return Object.values(map);
  }, [allNotes]);

  const filteredNotes = useMemo(() => {
    if (!state.searchTerm.trim()) return allNotes;
    const lower = state.searchTerm.toLowerCase();
    return allNotes.filter(
      note =>
        note.title.toLowerCase().includes(lower) ||
        note.content.replace(/<[^>]+>/g, '').toLowerCase().includes(lower),
    );
  }, [allNotes, state.searchTerm]);

  // ── Habit handlers ────────────────────────────────────────────────────────────

  const handleDeleteHabit = async (id: number) => {
    try {
      await deleteHabit(id);
      refetchHabits();
    } catch (err) {
      console.error('Failed to delete habit:', err);
      alert('Failed to delete habit — please try again.');
    }
  };

  const handleUpdateHabit = async (id: number, title: string, habitTags: Tag[]) => {
    try {
      await updateHabit(id, { title, tags: habitTags });
      refetchHabits();
    } catch (err) {
      console.error('Failed to update habit:', err);
      alert('Failed to update habit — please try again.');
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.newHabit.title.trim()) return;
    try {
      await createHabit({ title: state.newHabit.title.trim(), tags: state.newHabit.tags });
      state.setNewHabit({ title: '', tags: [] });
      state.setShowCreateHabitModal(false);
      if (ui.createHabitFromManage) {
        ui.setCreateHabitFromManage(false);
        ui.setShowManageHabitsModal(true);
      }
      refetchHabits();
    } catch (err) {
      console.error('Failed to create habit:', err);
      alert('Failed to save habit — please try again.');
    }
  };

  // ── AI Smart Plan handlers ────────────────────────────────────────────────────

  const handleSmartPlan = async (task: typeof state.newTask) => {
    const result = await planTasks({
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      due_date: task.due_date instanceof Date
        ? task.due_date.toISOString().slice(0, 10)
        : task.due_date || undefined,
      due_time: task.due_time instanceof Date
        ? task.due_time.toISOString().slice(11, 16)
        : task.due_time || undefined,
      tags: task.tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
      category: task.category ?? null,
      estimated_time: task.estimated_time ?? null,
      session_type: task.session_type ?? 'deep_work',
      created_date: new Date().toISOString(),
    });
    setTasks(prev => [result.new_task, ...prev]);
    ui.setAiPlanResult(result);
    state.setShowNewTaskModal(false);
    state.setNewTask({
      id: 0, title: '', description: '', priority: null,
      due_date: '', due_time: '', tags: [], category: null,
      estimated_time: null, session_type: null, created_date: '',
    });
  };

  const handleSaveSubtasks = async (subtasks: AiSubtask[]) => {
    const created_date = new Date().toISOString();
    try {
      const saved = await Promise.all(
        subtasks.map(s =>
          createTask({
            title: s.title,
            description: s.description,
            due_date: s.due_date ?? undefined,
            due_time: s.due_time ?? undefined,
            tags: s.tags.map(t => ({ name: t.name, color: t.color })),
            category: s.category ?? null,
            estimated_time: s.estimated_time ?? null,
            parent_task_id: s.parent_task_id,
            created_date,
          }),
        ),
      );
      setTasks(prev => [...saved, ...prev]);
      ui.setAiPlanResult(null);
    } catch (err) {
      console.error('Failed to save subtasks:', err);
      alert('Failed to save subtasks. Please try again.');
      throw err;
    }
  };

  if (isLoading || tagsLoading) return <PageSpinner size="lg" />;

  return (
    <div className="relative min-h-screen">
      <div className="coil" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">

        <TaskControls
          searchTerm={state.searchTerm}
          onSearchChange={state.setSearchTerm}
          filter={state.filter}
          sortOrder={state.sortOrder}
          onFilterChange={handlers.handleFilterChange}
          selectedTags={state.selectedTags}
          onTagToggle={handlers.toggleSelectedTag}
          showTagDropdown={state.showTagDropdown}
          onTagDropdownToggle={() => state.setShowTagDropdown(prev => !prev)}
          tags={tags}
          searchPlaceholder={'Search tasks & notes…'}
          onNewTask={() => router.push('/tasks')}
          onNewNote={async () => { const note = await addNote(); setNoteEditorOverlay(note); }}
          onViewNotes={() => router.push('/notes')}
          onEditTag={() => handlers.openEditTagModal(tags[0])}
          onEditHabit={() => ui.setShowManageHabitsModal(true)}
          menuCollapsed={!ui.taskSidebarOpen}
          onToggleMenu={() => ui.setTaskSidebarOpen(prev => !prev)}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:mb-4 sm:gap-0">
          <div className="flex items-end gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-text-primary">OneTab</h1>
              <p className="text-xs sm:text-sm lg:text-base text-text-secondary"></p>
            </div>
            <button
              onClick={() => setFocusMode(prev => !prev)}
              className="btn px-2 py-1 text-[0.65rem] sm:text-xs font-medium flex items-center gap-1"
              style={{ backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-secondary)', border: '1px solid var(--tm-border)' }}
              title={focusMode ? 'Show debrief & calendar' : 'Hide debrief & calendar'}
            >
              {focusMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span>{focusMode ? 'Exit Focus Mode' : 'Focus Mode'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs sm:text-sm text-text-secondary whitespace-nowrap">
              Welcome back, {profileName}
            </span>
            <button
              onClick={() => ui.setShowSettings(true)}
              className="btn px-3 py-2 sm:px-4  text-xs sm:text-sm font-medium w-full sm:w-auto flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-secondary)', border: '1px solid var(--tm-border)' }}
              title="Account Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn px-3 py-2 sm:px-4 text-white  text-xs sm:text-sm font-medium w-full sm:w-auto"
              style={{ backgroundColor: 'var(--tm-danger)' }}
            >
              Logout
            </button>
            <button
              onClick={() => ui.setTaskSidebarOpen(prev => !prev)}
              className="fixed z-50 btn px-3 py-2  text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-md"
              style={{ top: '1rem', right: '0.75rem', backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-secondary)', border: '1px solid var(--tm-border)' }}
              aria-label={ui.taskSidebarOpen ? 'Close task menu' : 'Open task menu'}
            >
              {ui.taskSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!focusMode && (
          <>
            <TaskDebriefPanel />

            <CalendarAndStats
              habits={habits}
              onToggleHabit={toggleHabit}
              onCreateHabit={() => state.setShowCreateHabitModal(true)}
              onViewHabitHistory={id => ui.setHistoryHabitId(id)}
              stats={stats}
              allNotes={allNotes}
              noteTags={noteTags}
            />
          </>
        )}

        {/* Tasks & Notes — split layout */}
        <div className="space-y-4">
          <div
            ref={splitContainerRef}
            className="flex flex-col md:flex-row"
            style={{ ['--tasks-w' as string]: `${tasksWidthPct}%` }}
          >
            <TasksPanel
              filter={state.filter}
              sortOrder={state.sortOrder}
              selectedTags={state.selectedTags}
              showTagDropdown={state.showTagDropdown}
              onTagDropdownToggle={() => state.setShowTagDropdown(prev => !prev)}
              onClearTags={() => {
                state.selectedTags.forEach(tag => handlers.toggleSelectedTag(tag));
                state.setShowTagDropdown(false);
              }}
              onTagToggle={handlers.toggleSelectedTag}
              onFilterChange={handlers.handleFilterChange}
              onCreateTask={() => state.setShowNewTaskModal(true)}
              tags={tags}
              filteredTasks={filteredTasks}
              onToggleComplete={toggleComplete}
              onDeleteTask={deleteTask}
              onUpdatePriority={updatePriority}
              activeTaskCount={activeTaskCount}
              occupiedPriorities={occupiedPriorityLevels}
              compact={tasksWidthPct < 40}
            />

            <DragHandle onMouseDown={handleSplitterMouseDown} />

            <NotesPanel
              notes={filteredNotes}
              tags={tags}
              noteEditorOverlay={noteEditorOverlay}
              onAddNote={addNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onEditorChange={setNoteEditorOverlay}
            />
          </div>
        </div>
      </div>

      <TaskManagerModals
        // New task
        showNewTaskModal={state.showNewTaskModal}
        onCloseNewTaskModal={() => state.setShowNewTaskModal(false)}
        newTask={state.newTask}
        onTaskChange={state.setNewTask}
        onToggleTag={handlers.toggleTag}
        onSubmitTask={handlers.handleCreateTask}
        onSmartPlan={handleSmartPlan}
        activeTaskCount={activeTaskCount}
        occupiedPriorityLevels={occupiedPriorityLevels}
        tags={tags}
        // AI plan
        aiPlanResult={ui.aiPlanResult}
        onSaveSubtasks={handleSaveSubtasks}
        onDiscardAiPlan={() => ui.setAiPlanResult(null)}
        // Create tag
        showCreateTagModal={state.showCreateTagModal}
        onCloseCreateTagModal={() => state.setShowCreateTagModal(false)}
        newTag={state.newTag}
        onTagChange={state.setNewTag}
        onSubmitTag={handlers.handleCreateTag}
        // Edit tag
        editingTag={state.editingTag}
        showEditTagModal={state.showEditTagModal}
        onCloseEditTagModal={() => { state.setShowEditTagModal(false); state.setEditingTag(null); }}
        onDeleteTag={handlers.handleDeleteTag}
        onEditTag={handlers.handleEditTag}
        onOpenCreateTag={() => state.setShowCreateTagModal(true)}
        // Create habit
        showCreateHabitModal={state.showCreateHabitModal}
        onCloseCreateHabitModal={() => {
          state.setShowCreateHabitModal(false);
          state.setNewHabit({ title: '', tags: [] });
          if (ui.createHabitFromManage) {
            ui.setCreateHabitFromManage(false);
            ui.setShowManageHabitsModal(true);
          }
        }}
        newHabit={state.newHabit}
        onHabitChange={state.setNewHabit}
        onSubmitHabit={handleCreateHabit}
        // Manage habits
        showManageHabitsModal={ui.showManageHabitsModal}
        onCloseManageHabitsModal={() => ui.setShowManageHabitsModal(false)}
        habits={habits}
        onCreateHabitFromManage={() => {
          ui.setShowManageHabitsModal(false);
          ui.setCreateHabitFromManage(true);
          state.setShowCreateHabitModal(true);
        }}
        onDeleteHabit={handleDeleteHabit}
        onUpdateHabit={handleUpdateHabit}
        onViewHabitHistory={id => { ui.setShowManageHabitsModal(false); ui.setHistoryHabitId(id); }}
        // Habit history
        historyHabit={historyHabit}
        onCloseHabitHistory={() => ui.setHistoryHabitId(null)}
        onToggleHabitDate={toggleHabitDate}
        // Settings
        showSettings={ui.showSettings}
        onCloseSettings={() => ui.setShowSettings(false)}
        onAccountDeleted={handleLogout}
      />
    </div>
  );
};

export default TaskManager;
