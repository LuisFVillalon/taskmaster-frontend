import { useState } from 'react';
import { FilterType, Tag, EditTaskModalState, NewTag, BaseTaskForm, NewHabit } from '@/app/types/task';
import { DEFAULT_ACCENT } from '@/app/lib/theme';

export const useTaskManagerState = () => {
  const [sortOrder, setSortOrder] = useState<Record<FilterType, 'asc' | 'desc'>>({
    all: 'asc',
    active: 'asc',
    completed: 'asc',
    priority: 'asc',
    created: 'asc',
    duration: 'asc',
  });

  // Independent of the task filter/sort above — controls only the note
  // list's edit-recency order, so toggling it never touches the active
  // task filter or the tasks' own sort order.
  const [noteSortOrder, setNoteSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal states
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState<EditTaskModalState>({
    status: false,
    task: null,
  });
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showCreateHabitModal, setShowCreateHabitModal] = useState(false);

  // Form states
  const [newTag, setNewTag] = useState<NewTag>({
    name: '',
    color: DEFAULT_ACCENT
  });
  const [newHabit, setNewHabit] = useState<NewHabit>({
    title: '',
    tags: [],
  });
  const [newTask, setNewTask] = useState<BaseTaskForm>({
    id: 0,
    title: '',
    description: '',
    priority: null,
    due_date: '',
    due_time: '',
    tags: [],
    category: null,
    estimated_time: 0,
    session_type: null,
    created_date: '',
  });
  const [listView, setListView] = useState<'list' | 'calendar'>('list');

  return {
    // State
    sortOrder,
    setSortOrder,
    noteSortOrder,
    setNoteSortOrder,
    selectedTags,
    setSelectedTags,
    showTagDropdown,
    setShowTagDropdown,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    showNewTaskModal,
    setShowNewTaskModal,
    showEditTaskModal,
    setShowEditTaskModal,
    showCreateTagModal,
    setShowCreateTagModal,
    showEditTagModal,
    setShowEditTagModal,
    editingTag,
    setEditingTag,
    showCreateHabitModal,
    setShowCreateHabitModal,
    newTag,
    setNewTag,
    newHabit,
    setNewHabit,
    newTask,
    setNewTask,
    listView,
    setListView,
  };
};