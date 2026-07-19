'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import NotesGridView from '@/app/components/notes/NotesGridView';
import TagFolderOverlay from '@/app/components/notes/TagFolderOverlay';
import NoteEditorOverlay from '@/app/components/notes/NoteEditorOverlay';
import { Note } from '@/app/types/notes';
import { Tag } from '@/app/types/task';

interface NotesPanelProps {
  notes: Note[];
  tags: Tag[];
  noteEditorOverlay: Note | null;
  onAddNote: () => Promise<Note>;
  onUpdateNote: (id: number, changes: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => void;
  onDeleteNote: (id: number) => void;
  onEditorChange: (note: Note | null) => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  tags,
  noteEditorOverlay,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onEditorChange,
}) => {
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [notesFolderOverlay, setNotesFolderOverlay] = useState<{ tag: Tag; notes: Note[] } | null>(null);

  return (
    <div className="split-notes relative flex flex-col space-y-2 sm:space-y-3">
      <div className="flex justify-end gap-2">
        <button
          onClick={async () => { const note = await onAddNote(); onEditorChange(note); }}
          className="px-3 py-1.5  font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-1.5 btn-primary"
          style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
        >
          <FileText className="w-4 h-4" />
          Create Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="card p-6 sm:p-8 text-center mt-2">
          <div
            className="w-12 h-12  flex items-center justify-center mx-auto mb-3"
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
            notes={notes}
            allTags={tags}
            activeNoteId={activeNoteId}
            onSelectNote={note => { setActiveNoteId(note.id); onEditorChange(note); }}
            onDeleteNote={onDeleteNote}
            onFolderClick={(tag, folderNotes) => setNotesFolderOverlay({ tag, notes: folderNotes })}
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
          onUpdate={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onClose={() => setNotesFolderOverlay(null)}
        />
      )}

      {noteEditorOverlay && (
        <NoteEditorOverlay
          note={noteEditorOverlay}
          allTags={tags}
          onUpdate={(id, changes) => {
            onUpdateNote(id, changes);
            if (changes.title !== undefined) {
              onEditorChange({ ...noteEditorOverlay, title: changes.title });
            }
          }}
          onDeleteNote={id => { onDeleteNote(id); onEditorChange(null); }}
          onClose={() => onEditorChange(null)}
        />
      )}
    </div>
  );
};

export default NotesPanel;
