/*
Purpose: This file contains the main TaskManager component, which serves as the root component 
for the task management application. It integrates various hooks and components to display tasks, 
handle user interactions, and manage application state.

MOBILE-FRIENDLY UPDATES:
- Responsive grid layouts that stack on mobile
- Touch-friendly button sizes
- Optimized spacing for small screens
- Collapsible sections for mobile
- Better overflow handling
- Improved typography scaling

Variables Summary:
- tasks: Array of task objects fetched from the backend, used to display the task list.
- isLoading: Boolean indicating if tasks are being loaded, used for loading spinner.
- toggleComplete, addTask, deleteTask, updateTask, setTasks: Functions from useTasks hook for CRUD operations on tasks.
- tags: Array of tag objects, used for tagging tasks.
- tagsLoading: Boolean for tag loading state.
- addTag, delTag, updateTag: Functions for tag management CRUD operations on tag.
- state: Object from useTaskManagerState containing UI state variables like modals visibility, form data, filters.
- handlers: Object from useTaskHandlers providing event handlers for user actions.
- filteredTasks: Filtered and sorted array of tasks based on current filters.
- stats: Object with statistics like total, active, completed tasks.

These variables are used to render the UI components and handle user interactions throughout the component.
*/

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { claimOrphanedData } from '@/app/lib/backend-api';
import { Tag } from '@/app/types/task';
import { useTasks, useTags } from '@/app/hooks/useTasksAndTags';
import { useTaskManagerState } from '@/app/hooks/useTaskManagerState';
import { useTaskHandlers } from '@/app/hooks/useTaskHandlers';
import { useTaskFiltering } from '@/app/hooks/useTaskFiltering';
import StatsCard from '@/app/components/StatsCard';
import TaskItem from '@/app/components/task/TaskItem';
import AISubTaskItem from './components/task/AISubTasks';
import { TaskControls } from '@/app/components/TaskControls';
import NewTaskModal from '@/app/components/task/NewTaskModal';
import EditTaskModal from '@/app/components/task/EditTaskModal';
import CreateTagModal from '@/app/components/tag/CreateTagModal';
import EditTagModal from '@/app/components/tag/EditTagListModal';
import { Filter, ChevronDown, ChevronUp, FileText, Settings, Menu, X } from 'lucide-react';
import BigPictureCalendar from '@/app/components/BigPictureCalendar';
import SettingsModal from '@/app/components/SettingsModal';
import NotesGridView from '@/app/components/notes/NotesGridView';
import TagFolderOverlay from '@/app/components/notes/TagFolderOverlay';
import NoteEditorOverlay from '@/app/components/notes/NoteEditorOverlay';
import { useNotes } from '@/app/hooks/useNotes';
import { Note } from '@/app/types/notes';
import BriefingCard from '@/app/components/BriefingCard';

const TaskManager: React.FC = () => {
  const router = useRouter();
  const { signOut, user } = useAuth();

  // ── One-time orphaned-data claim ────────────────────────────────────────────
  // Runs once per user account (guarded by a localStorage flag).
  // Fixes any account that signed up before claim-data was wired to the login
  // flow — including the current session — without requiring a re-login.
  const claimRan = useRef(false);
  useEffect(() => {
    if (!user || claimRan.current) return;
    const flagKey = `taskmaster_claimed_${user.id}`;
    if (localStorage.getItem(flagKey)) return;  // already ran for this account
    claimRan.current = true;

    claimOrphanedData().then(claimed => {
      if (claimed) {
        // Mark as done so we never call this again for this account.
        localStorage.setItem(flagKey, '1');
        const total = claimed.tasks + claimed.notes + claimed.tags + claimed.calendar_settings;
        if (total > 0) {
          // Data was found and linked — reload so tasks/notes lists refresh.
          console.info(`[claim-data] Linked ${claimed.tasks} tasks, ${claimed.notes} notes to account.`);
          window.location.reload();
        } else {
          // Nothing to claim — still mark as done to skip future attempts.
          localStorage.setItem(flagKey, '1');
        }
      }
    });
  }, [user]);

  const handleLogout = async () => {
    // 1. Destroy the Supabase session (clears the JWT from storage).
    await signOut();
    // 2. Clear any user-specific cached data so the next user starts clean.
    //    Wipe every taskmaster_* key rather than individual keys so nothing
    //    leaks if new cache keys are added later.
    Object.keys(localStorage)
      .filter(k => k.startsWith('taskmaster_'))
      .forEach(k => localStorage.removeItem(k));
    // 3. Navigate to login — this unmounts the entire app, wiping all
    //    in-memory state (BriefingCard, ResourceSidebar, task list, etc.).
    router.replace('/login');
  };
  const { tasks, isLoading, toggleComplete, addTask, deleteTask, updateTask, setTasks, sendTaskToAI, addTasks } = useTasks();

  const occupiedPriorityLevels = useMemo(
    () => tasks
      .filter(task => !task.completed && task.priority != null)
      .map(task => task.priority as number),
    [tasks]
  );

  const { tags, tagsLoading, addTag, delTag, updateTag } = useTags();

  const [showSettings, setShowSettings] = useState(false);
  const [taskSidebarOpen, setTaskSidebarOpen] = useState(true);

  // Mobile-specific state
  const [showStats, setShowStats] = useState(false);

  // Resizable split pane
  const [tasksWidthPct, setTasksWidthPct] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !splitContainerRef.current) return;
      const { left, width } = splitContainerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - left) / width) * 100;
      setTasksWidthPct(Math.min(70, Math.max(15, pct)));
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // State management
  const state = useTaskManagerState();

  // Handlers
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
    setAiPlan: state.setAiPlan,
    addTask,
    sendTaskToAI,
    updateTask,
    addTag,
    updateTag,
    delTag,
    setDisplayAISubTasks: state.setDisplayAISubTasks,
  });

  const { handleNewAITask } = handlers;

  // Filtering and stats
  const { filteredTasks, stats } = useTaskFiltering(
    tasks,
    state.filter,
    state.sortOrder,
    state.searchTerm,
    state.selectedTags
  );

  // Notes state — use raw notes so TaskManager can filter them with the shared
  // selectedTags / searchTerm state from TaskControls instead of the hook's own.
  const { notes: allNotes, addNote, deleteNote, updateNote } = useNotes();
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [notesFolderOverlay, setNotesFolderOverlay] = useState<{ tag: Tag; notes: Note[] } | null>(null);
  const [noteEditorOverlay, setNoteEditorOverlay] = useState<Note | null>(null);

  // Per-tag note counts for the Total StatsCard
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
    let result = allNotes;
    if (state.selectedTags.length > 0) {
      result = result.filter(note =>
        state.selectedTags.some(st => note.tags.some(nt => nt.id === st.id)),
      );
    }
    if (state.searchTerm.trim()) {
      const lower = state.searchTerm.toLowerCase();
      result = result.filter(
        note =>
          note.title.toLowerCase().includes(lower) ||
          note.content.replace(/<[^>]+>/g, '').toLowerCase().includes(lower),
      );
    }
    return result;
  }, [allNotes, state.selectedTags, state.searchTerm]);

  if (isLoading || tagsLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--tm-accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-text-secondary">Loading {isLoading ? 'tasks' : 'tags'}…</p>
        </div>
      </div>
    );
  }

  return (
      <div className="relative min-h-screen bg-bg">
        <div
          className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-10"
        >
          {/* Header - Mobile Optimized */}
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
            onNewTask={() => state.setShowNewTaskModal(true)}
            onNewNote={async () => { const note = await addNote(); setNoteEditorOverlay(note); }}
            onViewNotes={() => router.push('/notes')}
            onCreateTag={() => state.setShowCreateTagModal(true)}
            onEditTag={() => { if (tags.length > 0) handlers.openEditTagModal(tags[0]); }}
            onCreateHabit={() => {}}
            onEditHabit={() => {}}
            menuCollapsed={!taskSidebarOpen}
            onToggleMenu={() => setTaskSidebarOpen(prev => !prev)}
          />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:mb-4 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-text-primary">Task Master</h1>
                <p className="text-xs sm:text-sm lg:text-base text-text-secondary">Less planning, more doing.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="btn px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium w-full sm:w-auto flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-secondary)', border: '1px solid var(--tm-border)' }}
                title="Account Settings"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="btn px-3 py-2 sm:px-4 text-white rounded-lg text-xs sm:text-sm font-medium w-full sm:w-auto"
                style={{ backgroundColor: 'var(--tm-danger)' }}
              >
                Logout
              </button>
              <button
                onClick={() => setTaskSidebarOpen(prev => !prev)}
                className="fixed z-50 btn px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-md"
                style={{ top: '1rem', right: '0.75rem', backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-secondary)', border: '1px solid var(--tm-border)' }}
                aria-label={taskSidebarOpen ? 'Close task menu' : 'Open task menu'}
              >
                {taskSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Daily Briefing */}
          <BriefingCard />

          {/* Academic Calendar & Stats Cards - Mobile Responsive */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6'>
            <BigPictureCalendar/>

            {/* Stats Cards - Collapsible on mobile */}
            <div className="w-full lg:w-auto">
              <button
                onClick={() => setShowStats(!showStats)}
                className="lg:hidden w-full flex items-center justify-between p-3 card mb-2"
              >
                <span className="font-semibold text-text-primary">Statistics</span>
                {showStats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4 ${!showStats ? 'hidden lg:grid' : ''}`}>
                <StatsCard
                  variant="tasks"
                  total={stats.total.tasks.length}
                  completed={stats.completed.tasks.length}
                  active={stats.active.tasks.length}
                  topPriority={stats.prioritized.tasks.length}
                  activeTags={stats.active.tags}
                  completedTags={stats.completed.tags}
                  prioritizedTags={stats.prioritized.tags}
                />
                <StatsCard
                  variant="notes"
                  noteCount={allNotes.length}
                  taggedCount={allNotes.filter(n => n.tags.length > 0).length}
                  noteTags={noteTags}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Tasks & Notes — split layout */}
            <div
              ref={splitContainerRef}
              className="flex flex-col md:flex-row"
              style={{ ['--tasks-w' as string]: `${tasksWidthPct}%` }}
            >

              {/* Tasks column */}
              <div className="split-tasks flex flex-col space-y-2 sm:space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="card p-6 sm:p-8 text-center mt-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: 'var(--tm-surface-raised)' }}
                    >
                      <Filter className="w-6 h-6 text-text-muted" />
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-2">No tasks found</h3>
                    <p className="text-sm text-text-secondary">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 overflow-y-auto h-[50vh] lg:h-[600px] pl-2 pr-1 scrollbar-custom">
                    {filteredTasks.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        index={index}
                        onToggleComplete={toggleComplete}
                        tags={tags}
                        onDeleteTask={deleteTask}
                        onEditTaskClick={() =>
                          state.setShowEditTaskModal({ status: true, task })
                        }
                        compact={tasksWidthPct < 33}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Drag handle — visible only on md+ */}
              <div
                onMouseDown={handleSplitterMouseDown}
                className="hidden md:flex w-2 shrink-0 items-stretch cursor-col-resize group py-1"
              >
                <div
                  className="mx-auto w-px rounded-full transition-colors duration-150"
                  style={{ backgroundColor: 'var(--tm-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--tm-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--tm-border)')}
                />
              </div>

              {/* Notes column */}
              <div className="split-notes relative flex flex-col space-y-2 sm:space-y-3">
                {filteredNotes.length === 0 ? (
                  <div className="card p-6 sm:p-8 text-center mt-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: 'var(--tm-surface-raised)' }}
                    >
                      <FileText className="w-6 h-6 text-text-muted" />
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-2">No notes yet</h3>
                    <p className="text-sm text-text-secondary">Create a note to get started</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto h-[50vh] lg:h-[600px] pl-2 pr-1 scrollbar-custom pt-2">
                    <NotesGridView
                      notes={filteredNotes}
                      allTags={tags}
                      activeNoteId={activeNoteId}
                      onSelectNote={note => { setActiveNoteId(note.id); setNoteEditorOverlay(note); }}
                      onDeleteNote={deleteNote}
                      onFolderClick={(tag, notes) => setNotesFolderOverlay({ tag, notes })}
                      wide
                    />
                  </div>
                )}
                {notesFolderOverlay && (
                  <TagFolderOverlay
                    tag={notesFolderOverlay.tag}
                    notes={notesFolderOverlay.notes}
                    activeNoteId={activeNoteId}
                    allTags={tags}
                    onUpdate={updateNote}
                    onDeleteNote={deleteNote}
                    onClose={() => setNotesFolderOverlay(null)}
                  />
                )}
                {noteEditorOverlay && (
                  <NoteEditorOverlay
                    note={noteEditorOverlay}
                    allTags={tags}
                    onUpdate={(id, changes) => {
                      updateNote(id, changes);
                      if (changes.title !== undefined) {
                        setNoteEditorOverlay(prev => prev ? { ...prev, title: changes.title! } : prev);
                      }
                    }}
                    onDeleteNote={id => { deleteNote(id); setNoteEditorOverlay(null); }}
                    onClose={() => setNoteEditorOverlay(null)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      
      {/* List of sub tasks generated by the AI service */}
      { state.displayAISubTasks &&       
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-panel w-[95%] max-w-2xl p-6">
            <h2 className="text-center font-bold text-text-primary text-3xl pb-4">Recommended Task Plan:</h2>
            <div className="flex flex-col gap-2 overflow-y-auto h-[50vh] sm:h-[60vh] lg:h-[600px] pl-2 pr-1 scrollbar-custom">
              {state.aiPlan?.map((task, index) => (
                <AISubTaskItem
                  key={index}
                  task={task}
                  index={index}
                  tags={tags}
                  aiTasks={state.aiPlan}
                  setAiTasks={state.setAiPlan}
                  setDisplayAITasks={state.setDisplayAISubTasks}
                  addTasks={addTasks}
                  setTasks={setTasks}
                />
              ))}
            </div>

          </div>
        </div>
      }

      {/* Modals */}
      <NewTaskModal
        isOpen={state.showNewTaskModal}
        onClose={() => state.setShowNewTaskModal(false)}
        newTask={state.newTask}
        onTaskChange={state.setNewTask}
        tags={tags}
        onToggleTag={handlers.toggleTag}
        onSubmit={handlers.handleCreateTask}
        newAITask={state.newAITask}
        setNewAITask={state.setNewAITask}
        handleNewAITask={handleNewAITask}
        activeTaskCount={tasks.filter(task => !task.completed).length}
        usedPriorityLevels={occupiedPriorityLevels}
      />

      <EditTaskModal
        isOpen={state.showEditTaskModal.status}
        onClose={() => state.setShowEditTaskModal({status:false, task: null})}
        onTaskChange={(updatedTask) => state.setShowEditTaskModal(prev => ({...prev, task: updatedTask}))}
        tags={tags}
        onToggleTag={handlers.toggleEditTag}
        onSubmit={handlers.handleEditTask}
        values={state.showEditTaskModal}
        activeTaskCount={tasks.filter(task => !task.completed).length}
        usedPriorityLevels={occupiedPriorityLevels}
      />

      <CreateTagModal
        isOpen={state.showCreateTagModal}
        onClose={() => state.setShowCreateTagModal(false)}
        newTag={state.newTag}
        onTagChange={state.setNewTag}
        onSubmit={handlers.handleCreateTag}
      />

      {state.editingTag && (
        <EditTagModal
          isOpen={state.showEditTagModal}
          onClose={() => {
            state.setShowEditTagModal(false);
            state.setEditingTag(null);
          }}
          allTags={tags}
          onDeleteTag={handlers.handleDeleteTag}
          onEditTag={handlers.handleEditTag}
        />
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onAccountDeleted={handleLogout}
      />

      {/* ── Work block confirmed toast ──────────────────────────────────── */}
      </div>
  );
};

export default TaskManager;