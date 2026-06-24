'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileSymlink, X } from 'lucide-react';
import { Note } from '@/app/types/notes';
import { Tag } from '@/app/types/task';
import NoteFileIcon from './NoteFileIcon';
import NoteEditor from './NoteEditor';

interface TagFolderOverlayProps {
  tag: Tag;
  notes: Note[];
  activeNoteId: number | null;
  allTags: Tag[];
  onUpdate: (id: number, changes: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => void;
  onDeleteNote: (id: number) => void;
  onClose: () => void;
}

const TagFolderOverlay: React.FC<TagFolderOverlayProps> = ({
  tag,
  notes,
  activeNoteId,
  allTags,
  onUpdate,
  onDeleteNote,
  onClose,
}) => {
  const router = useRouter();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNote) {
          setSelectedNote(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedNote]);

  const isEditorView = selectedNote !== null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm rounded-[inherit]"
      onClick={isEditorView ? undefined : onClose}
    >
      <div
        className={`relative rounded-xl shadow-2xl bg-[var(--tm-surface)] border border-[var(--tm-border)] flex flex-col overflow-hidden
          ${isEditorView ? 'w-[95%] h-[90%]' : 'w-[90%]'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tm-border)] shrink-0">
          <div className="flex items-center gap-2">
            {isEditorView ? (
              <button
                onClick={() => setSelectedNote(null)}
                className="btn btn-ghost p-1 rounded-md"
                aria-label="Back to folder"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            )}
            <h2 className="text-sm font-semibold text-[var(--tm-text-primary)]">
              {isEditorView ? selectedNote.title || 'Untitled' : tag.name}
            </h2>
            {!isEditorView && (
              <span className="text-xs text-[var(--tm-text-muted)]">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isEditorView && (
              <button
                onClick={() => { router.push(`/notes?id=${selectedNote!.id}`); onClose(); }}
                className="btn btn-ghost p-1 rounded-md"
                aria-label="View in Notes"
                title="View in Notes"
              >
                <FileSymlink className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-ghost p-1 rounded-md"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {isEditorView ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <NoteEditor
              note={selectedNote}
              allTags={allTags}
              onUpdate={(id, changes) => {
                onUpdate(id, changes);
                if (changes.title !== undefined) {
                  setSelectedNote(prev => prev ? { ...prev, title: changes.title! } : prev);
                }
              }}
            />
          </div>
        ) : (
          <div className="p-4">
            {notes.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {notes.map(note => (
                  <NoteFileIcon
                    key={note.id}
                    note={note}
                    isActive={note.id === activeNoteId}
                    onClick={() => setSelectedNote(note)}
                    onDelete={onDeleteNote}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--tm-text-muted)] text-center py-6">
                No notes in this folder
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagFolderOverlay;
