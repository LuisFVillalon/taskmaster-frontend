'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Highlighter, Italic, List, ListOrdered,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: 'Yellow' },
  { color: '#bbf7d0', label: 'Green' },
  { color: '#bae6fd', label: 'Blue' },
  { color: '#fbcfe8', label: 'Pink' },
  { color: '#fed7aa', label: 'Orange' },
] as const;

interface ToolbarAction {
  key: string;
  icon: React.ReactNode;
  title: string;
  onClick: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

const TOOLBAR_GROUPS: ToolbarAction[][] = [
  [
    {
      key: 'bold',
      icon: <Bold className="w-4 h-4" />,
      title: 'Bold (Ctrl+B)',
      onClick: e => e.chain().focus().toggleBold().run(),
      isActive: e => e.isActive('bold'),
    },
    {
      key: 'italic',
      icon: <Italic className="w-4 h-4" />,
      title: 'Italic (Ctrl+I)',
      onClick: e => e.chain().focus().toggleItalic().run(),
      isActive: e => e.isActive('italic'),
    },
  ],
  [
    {
      key: 'h1',
      icon: <span className="text-xs font-bold leading-none">H1</span>,
      title: 'Heading 1',
      onClick: e => e.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: e => e.isActive('heading', { level: 1 }),
    },
    {
      key: 'h2',
      icon: <span className="text-xs font-bold leading-none">H2</span>,
      title: 'Heading 2',
      onClick: e => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: e => e.isActive('heading', { level: 2 }),
    },
  ],
  [
    {
      key: 'bullet',
      icon: <List className="w-4 h-4" />,
      title: 'Bullet list',
      onClick: e => e.chain().focus().toggleBulletList().run(),
      isActive: e => e.isActive('bulletList'),
    },
    {
      key: 'ordered',
      icon: <ListOrdered className="w-4 h-4" />,
      title: 'Ordered list',
      onClick: e => e.chain().focus().toggleOrderedList().run(),
      isActive: e => e.isActive('orderedList'),
    },
  ],
];

// ─── ToolbarBtn ───────────────────────────────────────────────────────────────

export interface ToolbarBtnProps {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}

export const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onMouseDown={e => {
      // Prevent the editor from losing focus when clicking toolbar buttons.
      e.preventDefault();
      onClick();
    }}
    title={title}
    className="px-2 py-1.5  text-sm transition-colors"
    style={active ? {
      backgroundColor: 'var(--tm-accent-subtle)',
      color: 'var(--tm-accent)',
    } : {
      color: 'var(--tm-text-secondary)',
    }}
    onMouseEnter={e => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface-raised)';
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
      }
    }}
  >
    {children}
  </button>
);

// ─── HighlightPicker ──────────────────────────────────────────────────────────

const HighlightPicker: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={pickerRef} className="relative">
      <ToolbarBtn
        onClick={() => setOpen(v => !v)}
        active={editor?.isActive('highlight') ?? false}
        title="Highlight text"
      >
        <Highlighter className="w-4 h-4" />
      </ToolbarBtn>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 p-2  shadow-lg z-50 flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--tm-surface-raised)',
            border: '1px solid var(--tm-border)',
          }}
        >
          {HIGHLIGHT_COLORS.map(({ color, label }) => {
            const isActive = editor?.isActive('highlight', { color }) ?? false;
            return (
              <button
                key={color}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  if (isActive) {
                    editor?.chain().focus().unsetHighlight().run();
                  } else {
                    editor?.chain().focus().setHighlight({ color }).run();
                  }
                  setOpen(false);
                }}
                title={label}
                className="w-6 h-6  transition-transform hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: color,
                  outline: isActive ? '2px solid var(--tm-accent)' : '2px solid transparent',
                  outlineOffset: '1px',
                }}
              />
            );
          })}

          <div className="w-px h-4 mx-0.5 shrink-0" style={{ backgroundColor: 'var(--tm-border)' }} />

          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              editor?.chain().focus().unsetHighlight().run();
              setOpen(false);
            }}
            title="Remove highlight"
            className="w-6 h-6  flex items-center justify-center text-xs font-bold transition-colors"
            style={{
              color: 'var(--tm-text-muted)',
              border: '1px solid var(--tm-border)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// ─── EditorToolbar ────────────────────────────────────────────────────────────

interface EditorToolbarProps {
  editor: Editor | null;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  /** Right-side action buttons (Resources, PDF, Save). */
  children?: React.ReactNode;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  sidebarOpen = true,
  onToggleSidebar,
  children,
}) => (
  <div
    className="flex items-center gap-0.5 px-4 py-2 border-b border-border-subtle flex-wrap"
    style={{ backgroundColor: 'var(--tm-surface-raised)' }}
  >
    {onToggleSidebar && (
      <>
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="hidden sm:flex px-2 py-1.5  text-sm transition-colors"
          style={{ color: 'var(--tm-text-secondary)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface-raised)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--tm-text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--tm-text-secondary)';
          }}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <div className="hidden sm:block w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--tm-border)' }} />
      </>
    )}

    {TOOLBAR_GROUPS.map((group, gi) => (
      <React.Fragment key={gi}>
        {group.map(action => (
          <ToolbarBtn
            key={action.key}
            onClick={() => editor && action.onClick(editor)}
            active={editor ? action.isActive(editor) : false}
            title={action.title}
          >
            {action.icon}
          </ToolbarBtn>
        ))}
        {gi < TOOLBAR_GROUPS.length - 1 && (
          <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--tm-border)' }} />
        )}
      </React.Fragment>
    ))}

    <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--tm-border)' }} />
    <HighlightPicker editor={editor} />

    <div className="ml-auto flex items-center gap-2">
      {children}
    </div>
  </div>
);
