import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/app/types/notes';
import {
  fetchNotes,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
} from '@/app/lib/backend-api';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes()
      .then(data => setNotes(data))
      .catch(() => setError('Failed to load notes'))
      .finally(() => setIsLoading(false));
  }, []);

  const addNote = useCallback(async (title = 'Untitled Note'): Promise<Note> => {
    const created = await apiCreateNote({ title, content: '', tags: [] });
    setNotes(prev => [created, ...prev]);
    return created;
  }, []);

  const updateNote = useCallback(
    async (id: number, changes: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
      setNotes(prev =>
        prev.map(note =>
          note.id === id ? { ...note, ...changes, updated_date: new Date().toISOString() } : note,
        ),
      );
      try {
        const updated = await apiUpdateNote(id, changes);
        setNotes(prev => prev.map(note => (note.id === id ? updated : note)));
      } catch {
        setError('Failed to save note');
      }
    },
    [],
  );

  const deleteNote = useCallback(async (id: number) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    try { await apiDeleteNote(id); }
    catch { setError('Failed to delete note'); }
  }, []);

  return { notes, isLoading, error, addNote, updateNote, deleteNote };
};
