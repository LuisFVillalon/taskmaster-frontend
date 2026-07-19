'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTasks, useTags } from '@/app/hooks/useTasksAndTags';
import { Task, FilterType, Tag, BaseTaskForm } from '@/app/types/task';
import { useTaskFiltering } from '@/app/hooks/useTaskFiltering';
import { useResizableSplit } from '@/app/hooks/useResizableSplit';
import TasksList from './TasksList';
import TaskDetail from './TaskDetail';
import PageSpinner from '@/app/components/common/PageSpinner';
import DragHandle from '@/app/components/common/DragHandle';
import NewTaskPanel from '@/app/components/task/NewTaskPanel';
import AiSubtasksModal from '@/app/components/task/AiSubtasksModal';
import { planTasks, PlanTasksResult, AiSubtask, createTask } from '@/app/lib/backend-api';

const EMPTY_TASK_FORM: BaseTaskForm = {
  id: 0, title: '', description: '', priority: null,
  due_date: null, due_time: null, tags: [], category: null,
  estimated_time: null, session_type: null, created_date: '',
};

const MIN_SIDE = 160;
const MAX_SIDE = 560;
const DEFAULT_SIDE = 288;

const TasksView: React.FC = () => {
  const { tasks, isLoading, toggleComplete, addTask, setTasks, deleteTask, updateTask } = useTasks();
  const { tags } = useTags();
  const searchParams = useSearchParams();

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newTaskId, setNewTaskId]       = useState<number | null>(null);
  const [mobileView, setMobileView]     = useState<'list' | 'detail'>('list');
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filter, setFilter]             = useState<FilterType>('all');
  const [sortOrder, setSortOrder]       = useState<Record<FilterType, 'asc' | 'desc'>>({
    all: 'asc', active: 'asc', completed: 'asc', priority: 'asc', duration: 'asc', created: 'asc',
  });
  const [selectedTags, setSelectedTags]       = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [leftWidth, setLeftWidth]             = useState(DEFAULT_SIDE);
  const [isResizingLeft, setIsResizingLeft]   = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // New task panel state
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);
  const [newTaskForm, setNewTaskForm]             = useState<BaseTaskForm>(EMPTY_TASK_FORM);
  const [aiPlanResult, setAiPlanResult]           = useState<PlanTasksResult | null>(null);
  const [appliedUrlTaskId, setAppliedUrlTaskId]   = useState<string | null>(null);

  const urlTaskIdParam = searchParams.get('taskId');
  if (urlTaskIdParam && tasks.length > 0 && appliedUrlTaskId !== urlTaskIdParam) {
    setAppliedUrlTaskId(urlTaskIdParam);
    const id = parseInt(urlTaskIdParam, 10);
    if (!isNaN(id) && tasks.some(t => t.id === id) && activeTaskId !== id) {
      setActiveTaskId(id);
      setMobileView('detail');
    }
  }

  const { filteredTasks } = useTaskFiltering(tasks, filter, sortOrder, searchTerm, selectedTags);

  const activeTasks        = tasks.filter(t => !t.completed);
  const activeTaskCount    = activeTasks.length;
  const usedPriorityLevels = activeTasks.map(t => t.priority).filter((p): p is number => p !== null);

  const handleLeftDragStart = useResizableSplit(panelRef, {
    min: MIN_SIDE, max: MAX_SIDE, anchor: 'left',
    onResize: setLeftWidth,
    onResizingChange: setIsResizingLeft,
  });

  const handleFilterChange = (newFilter: FilterType) => {
    if (filter === newFilter) {
      setSortOrder(prev => ({ ...prev, [newFilter]: prev[newFilter] === 'asc' ? 'desc' : 'asc' }));
    } else {
      setFilter(newFilter);
    }
  };

  const handleTagToggle = (tag: Tag) =>
    setSelectedTags(prev =>
      prev.some(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag],
    );

  const activeTask: Task | null = tasks.find(t => t.id === activeTaskId) ?? null;

  const handleSelectTask = (task: Task) => {
    setActiveTaskId(task.id);
    setNewTaskId(null);
    setIsCreatingNewTask(false);
    setMobileView('detail');
  };

  const handleNewTask = () => {
    setNewTaskForm(EMPTY_TASK_FORM);
    setActiveTaskId(null);
    setIsCreatingNewTask(true);
    setMobileView('detail');
  };

  const handleCancelNewTask = () => {
    setIsCreatingNewTask(false);
    setNewTaskForm(EMPTY_TASK_FORM);
  };

  // Toggle a tag on the new-task form.
  const handleToggleModalTag = (tag: Tag) => {
    setNewTaskForm(prev => {
      const has = prev.tags.some(t => t.id === tag.id);
      return { ...prev, tags: has ? prev.tags.filter(t => t.id !== tag.id) : [...prev.tags, tag] };
    });
  };

  // Regular (non-AI) task creation from the inline panel.
  const handleSubmitNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await addTask(newTaskForm);
    if (created) {
      setActiveTaskId(created.id);
      setNewTaskId(created.id);
      setIsCreatingNewTask(false);
      setNewTaskForm(EMPTY_TASK_FORM);
      setMobileView('detail');
    }
  };

  // Smart Plan flow: call AI, persist parent task, then show subtask confirmation modal.
  const handleSmartPlan = async (task: BaseTaskForm) => {
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
    // Parent task already persisted by the AI endpoint; add it to local state.
    setTasks(prev => [result.new_task, ...prev]);
    setAiPlanResult(result);
    setActiveTaskId(result.new_task.id);
    setIsCreatingNewTask(false);
    setNewTaskForm(EMPTY_TASK_FORM);
    setMobileView('detail');
  };

  // Save the confirmed subtasks from the AI modal.
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
      setAiPlanResult(null);
    } catch (err) {
      console.error('Failed to save subtasks:', err);
      alert('Failed to save subtasks. Please try again.');
      throw err;
    }
  };

  const handleDeleteTask = async (task: Task) => {
    await deleteTask(task);
    if (activeTaskId === task.id) {
      const next = tasks.filter(t => t.id !== task.id)[0] ?? null;
      setActiveTaskId(next?.id ?? null);
      if (!next) setMobileView('list');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Home
        </Link>
        <span className="text-text-muted select-none">/</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Tasks</h1>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 min-h-0">
        <div ref={panelRef} className="card overflow-hidden flex" style={{ height: 'calc(100vh - 96px)', minHeight: '420px' }}>

          {/* Sidebar */}
          <div
            className={`flex-shrink-0 flex-col overflow-hidden ${
              isResizingLeft ? '' : 'transition-[width] duration-300 ease-in-out'
            } ${mobileView === 'detail' ? 'hidden sm:flex' : 'flex'} ${sidebarOpen ? 'border-r border-border-subtle' : ''}`}
            style={{ width: sidebarOpen ? leftWidth : 0 }}
          >
            <div style={{ width: leftWidth }} className="flex flex-col flex-1 overflow-hidden">
              <TasksList
                tasks={filteredTasks}
                activeTaskId={activeTaskId}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectTask={handleSelectTask}
                onNewTask={handleNewTask}
                onToggleComplete={toggleComplete}
                filter={filter}
                sortOrder={sortOrder}
                onFilterChange={handleFilterChange}
                tags={tags}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                showTagDropdown={showTagDropdown}
                onTagDropdownToggle={() => setShowTagDropdown(v => !v)}
              />
            </div>
          </div>

          {sidebarOpen && <DragHandle onMouseDown={handleLeftDragStart} />}

          {/* Detail panel */}
          <div className={`flex-1 flex-col min-w-0 ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>
            <button
              onClick={() => setMobileView('list')}
              className="sm:hidden flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary border-b border-border-subtle transition-colors shrink-0"
              style={{ backgroundColor: 'var(--tm-surface-raised)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              All Tasks
            </button>

            {isCreatingNewTask ? (
              <NewTaskPanel
                newTask={newTaskForm}
                onTaskChange={setNewTaskForm}
                tags={tags}
                onToggleTag={handleToggleModalTag}
                onSubmit={handleSubmitNewTask}
                onSmartPlan={handleSmartPlan}
                onCancel={handleCancelNewTask}
                activeTaskCount={activeTaskCount}
                usedPriorityLevels={usedPriorityLevels}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(v => !v)}
              />
            ) : (
              <TaskDetail
                task={activeTask}
                allTags={tags}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(v => !v)}
                activeTaskCount={activeTaskCount}
                usedPriorityLevels={usedPriorityLevels}
                isNewTask={activeTaskId !== null && activeTaskId === newTaskId}
              />
            )}
          </div>
        </div>
      </div>

      {/* AI Subtasks Confirmation Modal */}
      {aiPlanResult && (
        <AiSubtasksModal
          isOpen={true}
          parentTask={aiPlanResult.new_task}
          subtasks={aiPlanResult.subtasks}
          overloadWarning={aiPlanResult.overload_warning ?? null}
          onSave={handleSaveSubtasks}
          onDiscard={() => setAiPlanResult(null)}
        />
      )}
    </div>
  );
};

export default TasksView;
