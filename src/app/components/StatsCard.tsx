import React, { useState } from 'react';
import { FileText, CheckSquare, Flame, Check, Activity, Star, LayersPlus } from 'lucide-react';
import { TagStats } from '@/app/types/task';
import { Habit } from '@/app/lib/backend-api';

// ── Prop types ────────────────────────────────────────────────────────────────

type TasksVariant = {
  variant: 'tasks';
  total: number;
  completed: number;
  active: number;
  topPriority: number;
  activeTags: TagStats[];
  completedTags: TagStats[];
  prioritizedTags: TagStats[];
};

type NotesVariant = {
  variant: 'notes';
  noteCount: number;
  taggedCount: number;   // notes that have ≥1 tag
  noteTags: TagStats[];
};

type HabitsVariant = {
  variant: 'habits';
  habits: Habit[];
  onToggle: (id: number) => void;
  onCreate?: () => void;
  onViewHistory?: (id: number) => void;
};

type StatsCardProps = TasksVariant | NotesVariant | HabitsVariant;

// ── Shared sub-components ─────────────────────────────────────────────────────

interface CardShellProps {
  icon: React.ReactNode;
  header: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

const CardShell: React.FC<CardShellProps> = ({ icon, header, children, headerAction }) => {
  return (
    <div className="card p-3 sm:p-4 lg:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] xs:text-xs sm:text-sm text-text-muted font-medium uppercase tracking-wide">
          {header}
        </span>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      {children}
    </div>
  );
};

interface StatPillProps {
  label: string;
  value: number;
  color: string;
}

const StatPill: React.FC<StatPillProps> = ({ label, value, color }) => (
  <div
    className="flex flex-col items-start px-3 py-2 "
    style={{ backgroundColor: 'var(--tm-surface-raised)' }}
  >
    <span className="text-[10px] text-text-muted font-medium leading-none mb-1">{label}</span>
    <span className="text-2xl sm:text-xl lg:text-2xl font-bold leading-none" style={{ color }}>
      {value}
    </span>
  </div>
);

interface TagChipsProps {
  tags: TagStats[];
  icon?: React.ReactNode;
}

const TagChips: React.FC<TagChipsProps> = ({ tags, icon }) => {
  if (tags.length === 0) {
    return <p className="text-[10px] xs:text-xs text-text-muted italic">No tags</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-x-3 sm:gap-y-1.5">
      {tags.map(tag => (
        <span
          key={tag.name}
          style={{ backgroundColor: tag.color ?? 'var(--tm-accent)', color: 'white' }}
          className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1  text-[10px] xs:text-xs font-medium whitespace-nowrap shadow-sm hover:shadow transition-shadow"
        >
          {icon}
          {tag.name} ({tag.count})
        </span>
      ))}
    </div>
  );
};

interface TagSectionProps {
  label: string;
  color: string;
  tags: TagStats[];
}

const TagSection: React.FC<TagSectionProps> = ({ label, color, tags }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
      {label}
    </span>
    <TagChips tags={tags} />
  </div>
);

interface HabitRowProps {
  habit: Habit;
  onToggle: (id: number) => void;
  onViewHistory?: (id: number) => void;
}

const HabitRow: React.FC<HabitRowProps> = ({ habit, onToggle }) => {
  const [confirmingUncheck, setConfirmingUncheck] = useState(false);

  const handleCheckboxClick = () => {
    if (habit.logged_today) {
      setConfirmingUncheck(true);
    } else {
      onToggle(habit.id);
    }
  };

  const handleConfirmUncheck = () => {
    setConfirmingUncheck(false);
    onToggle(habit.id);
  };

  return (
    <div className="flex flex-col py-0.5">
      <div className="flex items-center gap-2">
        <button
          onClick={handleCheckboxClick}
          className="flex-shrink-0 w-4 h-4  border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: 'var(--tm-accent)',
            backgroundColor: habit.logged_today ? 'var(--tm-accent)' : 'transparent',
          }}
          aria-label={habit.logged_today ? `Unmark ${habit.title}` : `Mark ${habit.title} done`}
        >
          {habit.logged_today && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </button>
        <span
          className="flex-1 flex items-center gap-1 min-w-0"
          style={{
            textDecoration: habit.logged_today ? 'line-through' : 'none',
            opacity: habit.logged_today ? 0.5 : 1,
          }}
        >
          {habit.tags.length > 0 && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              {habit.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-block w-2 h-2  flex-shrink-0"
                  style={{ backgroundColor: tag.color ?? 'var(--tm-accent)' }}
                  title={tag.name}
                />
              ))}
            </span>
          )}
          <span className="text-sm truncate font-medium" style={{ color: 'var(--tm-text-primary)' }}>
            {habit.title}
          </span>
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Flame className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
          <span className="text-xs font-semibold" style={{ color: '#F97316' }}>
            {habit.current_streak}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Star className="w-3.5 h-3.5" style={{ color: '#EAB308' }} />
          <span className="text-xs font-semibold" style={{ color: '#EAB308' }}>
            {habit.max_streak}
          </span>
        </div>
      </div>
      {confirmingUncheck && (
        <div className="ml-6 mt-1 flex items-start gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted leading-snug">
            Are you sure you want to uncheck this? Doing so will recalculate your streak.
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleConfirmUncheck}
              className="text-[10px] font-semibold text-red-500 hover:underline"
            >
              Yes, uncheck
            </button>
            <button
              onClick={() => setConfirmingUncheck(false)}
              className="text-[10px] font-semibold text-text-muted hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const StatsCard: React.FC<StatsCardProps> = (props) => {

  if (props.variant === 'tasks') {
    const { total, completed, active, activeTags, completedTags } = props;
    return (
      <CardShell
        icon={<CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
        header="Tasks"
      >
        {/* 2×2 status grid */}
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Total"       value={total}       color="var(--tm-accent)" />
          <StatPill label="In Progress" value={active}      color="var(--tm-accent-hover)" />
          <StatPill label="Completed"   value={completed}   color="var(--tm-success)" />
        </div>

        {/* Per-status tag breakdowns */}
        <div className="grid grid-cols-2 gap-2">
          <TagSection label="In Progress" color="var(--tm-accent-hover)" tags={activeTags} />
          <TagSection label="Completed"   color="var(--tm-success)" tags={completedTags} />
        </div>
      </CardShell>
    );
  }

  if (props.variant === 'notes') {
    const { noteCount, taggedCount, noteTags } = props;
    return (
      <CardShell
        icon={<FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
        header="Notes"
      >
        {/* 1×2 count row */}
        <div className="grid grid-cols-2 gap-2">
          <StatPill label="Total"  value={noteCount}   color="var(--tm-accent)" />
          <StatPill label="Tagged" value={taggedCount} color="var(--tm-accent-2)" />
        </div>

        {/* Per-tag breakdown */}
        <TagChips
          tags={noteTags}
          icon={<FileText className="w-2.5 h-2.5 flex-shrink-0" />}
        />
      </CardShell>
    );
  }

  // variant === 'habits'
  const { habits, onToggle, onCreate, onViewHistory } = props;

  const habitTagMap = new Map<string, { color: string; count: number }>();
  for (const habit of habits) {
    for (const tag of habit.tags) {
      const existing = habitTagMap.get(tag.name);
      if (existing) { existing.count++; }
      else { habitTagMap.set(tag.name, { color: tag.color ?? 'var(--tm-accent)', count: 1 }); }
    }
  }
  const habitTags = Array.from(habitTagMap.entries()).map(([name, { color, count }]) => ({ name, color, count }));

  return (
    <CardShell
      icon={<Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
      header="Habits"
      headerAction={onCreate && (
        <button
          onClick={onCreate}
          className="px-2 py-1  font-medium text-xs flex items-center gap-1 btn-primary"
          style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
        >
          <LayersPlus className="w-3 h-3" />
          Create Habit
        </button>
      )}
    >
      {habits.length === 0 ? (
        <p className="text-[10px] xs:text-xs text-text-muted italic">No habits yet</p>
      ) : (
        <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto scrollbar-custom pr-1">
          {habits.map(h => (
            <HabitRow key={h.id} habit={h} onToggle={onToggle} onViewHistory={onViewHistory} />
          ))}
        </div>
      )}

      <TagChips tags={habitTags} />
    </CardShell>
  );
};

export default StatsCard;
