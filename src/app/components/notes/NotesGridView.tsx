'use client';

import React, { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Note } from '@/app/types/notes';
import { Tag } from '@/app/types/task';
import NoteFileIcon from './NoteFileIcon';
import NoteFolder from './NoteFolder';

interface NotesGridViewProps {
  notes: Note[];
  allTags: Tag[];
  activeNoteId: number | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: number) => void;
  onFolderClick?: (tag: Tag, notes: Note[]) => void;
  /** Use a wider responsive column count (for full-width contexts like TaskManager). */
  wide?: boolean;
}

const NotesGridView: React.FC<NotesGridViewProps> = ({
  notes,
  allTags,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  onFolderClick,
  wide = false,
}) => {
  const [openFolderTagId, setOpenFolderTagId] = useState<number | null>(null);

  // Only surface tags that actually appear among the current (filtered) notes,
  // preserving the canonical allTags ordering for visual stability.
  const activeTags = useMemo(() => {
    const presentIds = new Set(notes.flatMap(n => n.tags.map(t => t.id)));
    return allTags.filter(t => presentIds.has(t.id));
  }, [notes, allTags]);

  const notesByTag = useMemo(() => {
    const map = new Map<number, Note[]>();
    activeTags.forEach(tag => {
      map.set(tag.id, notes.filter(n => n.tags.some(t => t.id === tag.id)));
    });
    return map;
  }, [notes, activeTags]);

  const untaggedNotes = useMemo(() => notes.filter(n => n.tags.length === 0), [notes]);

  const handleFolderClick = (tag: Tag) => {
    if (onFolderClick) {
      onFolderClick(tag, notesByTag.get(tag.id) ?? []);
    } else {
      setOpenFolderTagId(prev => (prev === tag.id ? null : tag.id));
    }
  };

  const gridClass = wide
    ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1'
    : 'grid grid-cols-3 gap-1';

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <FileText className="w-6 h-6 text-text-muted mb-2" />
        <p className="text-sm text-text-secondary">No notes here yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main grid: tag folders first, then untagged file icons */}
      <div className={gridClass}>
        {activeTags.map(tag => (
          <NoteFolder
            key={tag.id}
            tag={tag}
            noteCount={notesByTag.get(tag.id)?.length ?? 0}
            isOpen={openFolderTagId === tag.id}
            onToggle={() => handleFolderClick(tag)}
          />
        ))}
        {untaggedNotes.map(note => (
          <NoteFileIcon
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onClick={() => onSelectNote(note)}
            onDelete={onDeleteNote}
          />
        ))}
      </div>

      {/* Inline expansion — used when no external overlay handler is wired up */}
      {!onFolderClick && openFolderTagId !== null && (() => {
        const tag = activeTags.find(t => t.id === openFolderTagId);
        const tagNotes = notesByTag.get(openFolderTagId) ?? [];
        if (!tag || tagNotes.length === 0) return null;
        return (
          <div className="pl-2 border-l-2" style={{ borderColor: tag.color }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: tag.color }}>
              {tag.name}
            </p>
            <div className={gridClass}>
              {tagNotes.map(note => (
                <NoteFileIcon
                  key={note.id}
                  note={note}
                  isActive={note.id === activeNoteId}
                  onClick={() => onSelectNote(note)}
                  onDelete={onDeleteNote}
                />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default NotesGridView;
