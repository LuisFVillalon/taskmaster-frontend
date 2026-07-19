'use client';

import React from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { Note } from '@/app/types/notes';
import { Tag } from '@/app/types/task';
import NotesGridView from './NotesGridView';

interface NotesListProps {
  notes: Note[];
  activeNoteId: number | null;
  allTags: Tag[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectNote: (note: Note) => void;
  onNewNote: () => void;
  onDeleteNote: (id: number) => void;
}

const NotesList: React.FC<NotesListProps> = ({
  notes,
  activeNoteId,
  allTags,
  searchTerm,
  onSearchChange,
  onSelectNote,
  onNewNote,
  onDeleteNote,
}) => {
  return (
    <div className="flex flex-col h-full">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle"
        style={{ backgroundColor: 'var(--tm-surface)' }}
      >
        <h2 className="text-lg font-bold text-text-primary">Notes</h2>
        <button onClick={onNewNote} className="btn btn-primary px-3 py-1.5 text-sm gap-1.5">
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes…"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* ── Grid view ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-custom">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="w-12 h-12  flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--tm-surface-raised)' }}
            >
              <FileText className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              {searchTerm ? 'No notes match your search' : 'No notes yet'}
            </p>
            {!searchTerm && (
              <p className="text-xs text-text-muted mt-1">Click New Note to get started</p>
            )}
          </div>
        ) : (
          <NotesGridView
            notes={notes}
            allTags={allTags}
            activeNoteId={activeNoteId}
            onSelectNote={onSelectNote}
            onDeleteNote={onDeleteNote}
          />
        )}
      </div>
    </div>
  );
};

export default NotesList;
