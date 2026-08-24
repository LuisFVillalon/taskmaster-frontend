'use client';

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useTags as useTagsData } from '@/app/hooks/useTasksAndTags';

type TagsContextValue = ReturnType<typeof useTagsData>;

const TagsContext = createContext<TagsContextValue | null>(null);

/**
 * Fetches tags once per signed-in session and shares them app-wide. See
 * TasksContext.tsx for why this is a context rather than a plain hook.
 */
export const TagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const value = useTagsData(!!user);
  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
};

export function useTagsContext(): TagsContextValue {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error('useTagsContext must be used inside <TagsProvider>');
  return ctx;
}
