'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { createHabit, deleteHabit, updateHabit } from '@/app/lib/backend-api';
import { Tag, Task } from '@/app/types/task';
import type { TaskFormData } from '@/app/components/task/TaskFormFields';
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
import { getStoredProfileAvatar } from '@/app/lib/avatar';
import DragHandle from '@/app/components/common/DragHandle';
import ProfileAvatar from '@/app/components/common/ProfileAvatar';
import { TaskControls } from '@/app/components/TaskControls';
import TasksPanel from '@/app/components/tasks/TasksPanel';
import NotesPanel from '@/app/components/notes/NotesPanel';
import CalendarAndStats from '@/app/components/CalendarAndStats';
import TaskManagerModals from '@/app/components/TaskManagerModals';
import TaskDebriefPanel from '@/app/components/TaskDebriefPanel';
import PageSpinner from '@/app/components/common/PageSpinner';
import DoodleCanvas, { DoodleCanvasHandle } from '@/app/components/DoodleCanvas';
import DoodleToolbar from '@/app/components/common/DoodleToolbar';
import ModeSwitcher, { AppMode } from '@/app/components/common/ModeSwitcher';
import { DEFAULT_ACCENT, getStoredThemeColor } from '@/app/lib/theme';

const TaskManager: React.FC = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [mode, setMode] = useState<AppMode>('normal');
  const focusMode = mode === 'focus';
  const doodleMode = mode === 'doodle';
  const doodleCanvasRef = useRef<DoodleCanvasHandle>(null);
  const [doodleColor, setDoodleColor] = useState(() => getStoredThemeColor() ?? DEFAULT_ACCENT);
  const [doodleErasing, setDoodleErasing] = useState(false);

  useClaimOrphanedData(user);
  const [profileName, setProfileName] = useProfileName(user);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(() => getStoredProfileAvatar());

  const handleLogout = async () => {
    await signOut();
    Object.keys(localStorage)
      .filter(k => k.startsWith('komorebi_'))
      .forEach(k => localStorage.removeItem(k));
    router.replace('/login');
  };

  const { tasks, isLoading, toggleComplete, addTask, deleteTask, updateTask, setTasks, pendingTaskIds } = useTasks();
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
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  const state = useTaskManagerState();
  const ui = useTaskManagerUIState();
  const {
    tasksWidthPct,
    panelHeightPx,
    splitContainerRef,
    handleSplitterMouseDown,
    handleHeightSplitterMouseDown,
  } = useSplitPanel();

  const openEditTaskModal = (task: Task) => {
    state.setShowEditTaskModal({ status: true, task });
  };

  const handleEditTaskChange = (next: TaskFormData) => {
    state.setShowEditTaskModal(prev => prev.task ? { ...prev, task: { ...prev.task, ...next } as Task } : prev);
  };

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

  const { habits, habitsLoading, toggle: toggleHabit, toggleDate: toggleHabitDate, pendingHabitIds, refetch: refetchHabits } = useHabits();
  const historyHabit = habits.find(h => h.id === ui.historyHabitId) ?? null;

  const { notes: allNotes, isLoading: notesLoading, addNote, deleteNote, updateNote, discardDraft, pendingNoteIds } = useNotes();
  // Only the id is held in state; the note itself is derived live from
  // allNotes on every render so edits (title/content debounce, tag toggles)
  // always flow straight through — no separate copy to fall out of sync or
  // go stale mid-save.
  const [noteEditorOverlayId, setNoteEditorOverlayIdRaw] = useState<number | null>(null);
  const noteEditorOverlay = useMemo(
    () => (noteEditorOverlayId !== null ? allNotes.find(n => n.id === noteEditorOverlayId) ?? null : null),
    [noteEditorOverlayId, allNotes],
  );
  // Wraps setNoteEditorOverlayId so switching away from (or closing) an
  // untouched draft note removes it instead of leaving a phantom
  // "Untitled Note" behind in the list.
  const setNoteEditorOverlay = useCallback((next: Note | null) => {
    setNoteEditorOverlayIdRaw(prevId => {
      if (prevId !== null && prevId !== next?.id) discardDraft(prevId);
      return next?.id ?? null;
    });
  }, [discardDraft]);

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
    const lower = state.searchTerm.trim().toLowerCase();
    const matching = allNotes.filter(note => {
      const matchesSearch =
        !lower ||
        note.title.toLowerCase().includes(lower) ||
        note.content.replace(/<[^>]+>/g, '').toLowerCase().includes(lower);

      const matchesTags =
        state.selectedTags.length === 0 ||
        (note.tags ?? []).some(noteTag =>
          state.selectedTags.some(selected => selected.id === noteTag.id)
        );

      return matchesSearch && matchesTags;
    });

    // Notes always sort by edit recency, independent of whichever task
    // filter/sort (e.g. Due date) is active. noteSortOrder is its own piece
    // of state so toggling it never touches the task filter or task order
    // (default: most recently edited first).
    const dir = state.noteSortOrder === 'desc' ? 1 : -1;
    return [...matching].sort(
      (a, b) => (new Date(a.updated_date).getTime() - new Date(b.updated_date).getTime()) * dir,
    );
  }, [allNotes, state.searchTerm, state.selectedTags, state.noteSortOrder]);

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

  if (isLoading || tagsLoading) return <PageSpinner size="lg" />;

  return (
    <>
    {/*
     * DoodleCanvas renders first so DOM order keeps it visually behind
     * everything else here. pointer-events-none while doodling lets clicks
     * fall through this whole wrapper to it — otherwise this min-h-screen
     * box (which covers the full viewport regardless of how little content
     * it holds) would win hit-testing and swallow the clicks itself.
     * TaskControls and the header opt back into pointer-events-auto so they
     * stay usable while doodle mode hides everything else.
     */}
    <div className={`relative min-h-screen ${doodleMode ? 'pointer-events-none' : ''}`}>
      <DoodleCanvas ref={doodleCanvasRef} active={doodleMode} color={doodleColor} isErasing={doodleErasing} />

      <div className="pointer-events-auto">
      <TaskControls
        searchTerm={state.searchTerm}
        onSearchChange={state.setSearchTerm}
        filter={state.filter}
        sortOrder={state.sortOrder}
        onFilterChange={handlers.handleFilterChange}
        noteSortOrder={state.noteSortOrder}
        onNoteSortToggle={() => state.setNoteSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
        selectedTags={state.selectedTags}
        onTagToggle={handlers.toggleSelectedTag}
        showTagDropdown={state.showTagDropdown}
        onTagDropdownToggle={() => state.setShowTagDropdown(prev => !prev)}
        tags={tags}
        searchPlaceholder={'Search tasks & notes…'}
        onCreateTask={() => state.setShowNewTaskModal(true)}
        onNewNote={async () => { const note = await addNote(); setNoteEditorOverlay(note); }}
        onViewNotes={() => router.push('/notes')}
        onViewCalendar={() => router.push('/calendar')}
        onEditTag={() => handlers.openEditTagModal(tags[0])}
        onEditHabit={() => ui.setShowManageHabitsModal(true)}
        menuCollapsed={!ui.taskSidebarOpen}
        onToggleMenu={() => ui.setTaskSidebarOpen(prev => !prev)}
        profileName={profileName}
        profileAvatar={profileAvatar}
        onSettings={() => ui.setShowSettings(true)}
        onLogout={handleLogout}
      />
      </div>

      <div className={`transition-[margin] duration-200 ease-out ${ui.taskSidebarOpen ? 'md:ml-72' : 'md:ml-16'}`}>
        <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 pt-0 pb-4 sm:pb-6 lg:pb-10">

          {/*
            Header — pointer-events-auto so the mode switcher stays usable
            while doodling. Also needs relative + a z-index: DoodleCanvas is
            position:fixed, which (per spec) always opens its own stacking
            context even at z-index:auto, so it otherwise outranks this
            plain non-positioned div regardless of DOM order and would
            swallow clicks meant for the mode switcher.
          */}
        <div className="relative z-10 pointer-events-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pb-3 sm:pb-4 mb-4 sm:mb-6 mt-4 sm:mt-6 border-b border-border-subtle">
          <div>
            <p className="text-[0.6875rem] sm:text-xs font-semibold uppercase tracking-wide text-text-muted">
              {todayLabel}
            </p>
            <h1 className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
              <ProfileAvatar avatar={profileAvatar} name={profileName} size={32} />
              Welcome back{profileName ? `, ${profileName}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {doodleMode && (
              <DoodleToolbar
                color={doodleColor}
                onColorChange={setDoodleColor}
                isErasing={doodleErasing}
                onToggleErase={() => setDoodleErasing(prev => !prev)}
                onClear={() => doodleCanvasRef.current?.clear()}
              />
            )}
            <ModeSwitcher mode={mode} onChange={setMode} />
          </div>
        </div>

        {!doodleMode && (
          <>
            {!focusMode && (
              <>
                <TaskDebriefPanel />

                <CalendarAndStats
                  habits={habits}
                  onToggleHabit={toggleHabit}
                  onCreateHabit={() => ui.setShowManageHabitsModal(true)}
                  pendingHabitIds={pendingHabitIds}
                  habitsLoading={habitsLoading}
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
                  tags={tags}
                  filteredTasks={filteredTasks}
                  onToggleComplete={toggleComplete}
                  onDeleteTask={deleteTask}
                  onUpdatePriority={updatePriority}
                  onEditTask={openEditTaskModal}
                  activeTaskCount={activeTaskCount}
                  occupiedPriorities={occupiedPriorityLevels}
                  compact={tasksWidthPct < 40}
                  heightPx={panelHeightPx}
                  pendingTaskIds={pendingTaskIds}
                />

                <DragHandle onMouseDown={handleSplitterMouseDown} />

                <NotesPanel
                  notes={filteredNotes}
                  tags={tags}
                  noteEditorOverlay={noteEditorOverlay}
                  onUpdateNote={updateNote}
                  onDeleteNote={deleteNote}
                  onEditorChange={setNoteEditorOverlay}
                  heightPx={panelHeightPx}
                  isLoading={notesLoading}
                  pendingNoteIds={pendingNoteIds}
                  tagFilter={state.selectedTags}
                />
              </div>

              <DragHandle onMouseDown={handleHeightSplitterMouseDown} orientation="row" alwaysVisible />
            </div>
          </>
        )}
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
        activeTaskCount={activeTaskCount}
        occupiedPriorityLevels={occupiedPriorityLevels}
        tags={tags}
        // Edit task
        showEditTaskModal={state.showEditTaskModal.status}
        editTask={state.showEditTaskModal.task}
        onCloseEditTaskModal={() => state.setShowEditTaskModal({ status: false, task: null })}
        onEditTaskChange={handleEditTaskChange}
        onToggleEditTag={handlers.toggleEditTag}
        onSubmitEditTask={handlers.handleEditTask}
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
        onViewHabitHistory={id => { ui.setShowManageHabitsModal(false); ui.setHistoryFromManageHabits(true); ui.setHistoryHabitId(id); }}
        // Habit history
        historyHabit={historyHabit}
        historyShowBackButton={ui.historyFromManageHabits}
        onCloseHabitHistory={() => {
          ui.setHistoryHabitId(null);
          if (ui.historyFromManageHabits) {
            ui.setHistoryFromManageHabits(false);
            ui.setShowManageHabitsModal(true);
          }
        }}
        onToggleHabitDate={toggleHabitDate}
        // Settings
        showSettings={ui.showSettings}
        onCloseSettings={() => ui.setShowSettings(false)}
        onAccountDeleted={handleLogout}
        onProfileNameChange={setProfileName}
        onProfileAvatarChange={setProfileAvatar}
      />
    </>
  );
};

export default TaskManager;
