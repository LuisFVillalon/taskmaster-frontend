import React from 'react';
import { LayoutGrid, Brain, LineSquiggle, type LucideIcon } from 'lucide-react';

export type AppMode = 'normal' | 'focus' | 'doodle';

interface ModeOption {
  key: AppMode;
  icon: LucideIcon;
  title: string;
}

const MODES: ModeOption[] = [
  { key: 'normal', icon: LayoutGrid, title: 'Show debrief, calendar & stats' },
  { key: 'focus', icon: Brain, title: 'Focus — hide debrief & calendar, just tasks & notes' },
  { key: 'doodle', icon: LineSquiggle, title: 'Doodle on the page' },
];

interface ModeSwitcherProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

// Three-way segmented control: exactly one of normal/focus/doodle is active
// at all times, with a sliding accent pill (the user's theme color) marking
// the current selection.
const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ mode, onChange }) => {
  const activeIndex = MODES.findIndex(m => m.key === mode);

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="relative inline-grid grid-cols-3 p-1 rounded-full"
      style={{ backgroundColor: 'var(--tm-surface-raised)' }}
    >
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full transition-transform ease-out"
        style={{
          width: 'calc((100% - 8px) / 3)',
          backgroundColor: 'var(--tm-accent)',
          transform: `translateX(${activeIndex * 100}%)`,
          transitionDuration: 'var(--tm-dur-base)',
        }}
      />
      {MODES.map(({ key, icon: Icon, title }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            title={title}
            onClick={() => onChange(key)}
            className="relative z-10 flex items-center justify-center px-3 py-2 rounded-full transition-colors duration-150"
            style={{ color: active ? 'var(--tm-accent-text)' : 'var(--tm-text-muted)' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

export default ModeSwitcher;
