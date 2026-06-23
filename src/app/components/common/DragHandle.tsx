import React from 'react';

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  /** When true, renders as a block element (no hidden sm:flex wrapping). */
  alwaysVisible?: boolean;
}

const DragHandle: React.FC<DragHandleProps> = ({ onMouseDown, alwaysVisible = false }) => (
  <div
    onMouseDown={onMouseDown}
    className={`${alwaysVisible ? 'flex' : 'hidden sm:flex'} w-2 shrink-0 items-stretch cursor-col-resize group`}
  >
    <div
      className="mx-auto w-px rounded-full transition-colors duration-150"
      style={{ backgroundColor: 'var(--tm-border)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--tm-accent)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--tm-border)')}
    />
  </div>
);

export default DragHandle;
