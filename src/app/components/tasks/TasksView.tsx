'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useTasks, useTags } from '@/app/hooks/useTasksAndTags';
import { Task, FilterType, Tag } from '@/app/types/task';
import { useTaskFiltering } from '@/app/hooks/useTaskFiltering';
import { useResizableSplit } from '@/app/hooks/useResizableSplit';
import TasksList from './TasksList';
import TaskDetail from './TaskDetail';
import PageSpinner from '@/app/components/common/PageSpinner';
import DragHandle from '@/app/components/common/DragHandle';

const MIN_SIDE = 160;
const MAX_SIDE = 560;
const DEFAULT_SIDE = 288;

const TasksView: React.FC = () => {
  const { tasks, isLoading, toggleComplete, addTask, deleteTask, updateTask } = useTasks();
  const { tags } = useTags();

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newTaskId, setNewTaskId]       = useState<number | null>(null);
  const [mobileView, setMobileView]     = useState<'list' | 'detail'>('list');
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filter, setFilter]             = useState<FilterType>('all');
  const [sortOrder, setSortOrder]       = useState<Record<FilterType, 'asc' | 'desc'>>({
    all: 'asc', active: 'asc', completed: 'asc', priority: 'asc', complexity: 'asc', duration: 'asc', created: 'asc',
  });
  const [selectedTags, setSelectedTags]       = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [leftWidth, setLeftWidth]             = useState(DEFAULT_SIDE);
  const [isResizingLeft, setIsResizingLeft]   = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
    setMobileView('detail');
  };

  const handleNewTask = async () => {
    const created = await addTask({
      id: 0, title: 'New Task*', description: '', priority: null,
      due_date: null, due_time: null, tags: [], category: null, created_date: new Date(),
    });
    if (created) { setActiveTaskId(created.id); setNewTaskId(created.id); setMobileView('detail'); }
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--tm-bg)' }}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksView;
