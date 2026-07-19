'use client';

import React from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { Tag } from '@/app/types/task';

interface NoteFolderProps {
  tag: Tag;
  noteCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

const NoteFolder: React.FC<NoteFolderProps> = ({ tag, noteCount, isOpen, onToggle }) => {
  const Icon = isOpen ? FolderOpen : Folder;

  return (
    <div
      onClick={onToggle}
      className="group flex flex-col items-center gap-0.5 p-1 cursor-pointer"
    >
      <div className="relative">
        <Icon
          className="w-10 h-10 transition-opacity group-hover:opacity-80"
          fill={tag.color}
          stroke="none"
        />
        <span
          className="absolute -top-1 -right-1.5 text-[9px] font-bold text-white  min-w-[1rem] h-3.5 flex items-center justify-center px-0.5"
          style={{ backgroundColor: tag.color }}
        >
          {noteCount > 9 ? '9+' : noteCount}
        </span>
      </div>

      <span
        className="text-[11px] font-medium text-center leading-tight line-clamp-2 w-full"
        style={{ color: 'var(--tm-text-secondary)' }}
      >
        {tag.name}
      </span>
    </div>
  );
};

export default NoteFolder;
