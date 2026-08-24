'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Note } from '@/app/types/notes';
import { stripHtml } from '@/app/utils/textUtils';
import { formatUpdatedDate } from '@/app/utils/dateUtils';

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: number) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, isActive, onClick, onDelete }) => {
  const preview = stripHtml(note.content);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl p-3 border-2 cursor-pointer transition-all"
      style={{
        backgroundColor: isActive ? 'var(--tm-accent-subtle)' : 'var(--tm-surface)',
        borderColor: isActive ? '#000000' : 'var(--tm-border-subtle)',
        boxShadow: isActive ? '0 0 0 2px #000000' : 'none',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--tm-surface-raised)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--tm-border)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--tm-surface)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--tm-border-subtle)';
        }
      }}
    >
      {/* Title row + delete button */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className="text-lg font-semibold leading-snug truncate flex-1"
          style={{ color: isActive ? 'var(--tm-accent)' : 'var(--tm-text-primary)' }}
        >
          {note.title || 'Untitled Note'}
        </h3>

        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="btn btn-danger-ghost flex-shrink-0 opacity-0 group-hover:opacity-100 p-1"
          title="Delete note"
          aria-label="Delete note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content preview */}
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-2">
        {preview || <span className="italic text-text-muted">No content yet</span>}
      </p>

      {/* Tags + date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {note.tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
          {formatUpdatedDate(note.updated_date)}
        </span>
      </div>
    </div>
  );
};

export default NoteItem;
