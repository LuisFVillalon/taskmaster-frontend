'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '@/app/types/task';
import { formatDateRange, toLocalDateStr } from '@/app/utils/dateUtils';
import { bucketByTag } from '@/app/utils/tagBucketing';
import { CardShell } from './CardShell';
import {
  ProgressRing, SegmentedProgressRing, CategoryBarChart, HoursLineChart, TagPriorityChart,
  type WeekSegment, type DonutCategory, type TagPriorityCategory,
} from './charts';
import type { TasksVariant } from './types';

// Buckets a task list by tag (plus an "Untagged" catch-all) for CategoryDonut
// — shared by the Tasks card's "Overall" (all tasks) and "Priority"
// (priority-assigned tasks only) rings so both read as a tag distribution.
const tagCategoriesFromTasks = (taskList: Task[]): DonutCategory[] =>
  bucketByTag(taskList, () => 1).map(({ label, value, color }) => ({ label, count: value, color }));

// Like tagCategoriesFromTasks, but also carries the priority number of every
// prioritized task within each tag — used by the Priority carousel slide so
// one view answers both "how many tasks in this tag" (the bar) and "which of
// them are prioritized, at what rank" (badges alongside it) instead of
// priority and tag being two separate breakdowns.
const tagPriorityCategoriesFromTasks = (taskList: Task[]): TagPriorityCategory[] => {
  const tagMap = new Map<string, { color: string; count: number; priorities: number[] }>();
  for (const task of taskList) {
    for (const tag of task.tags) {
      const existing = tagMap.get(tag.name);
      if (existing) {
        existing.count++;
        if (task.priority != null) existing.priorities.push(task.priority);
      } else {
        tagMap.set(tag.name, {
          color: tag.color ?? 'var(--tm-accent)',
          count: 1,
          priorities: task.priority != null ? [task.priority] : [],
        });
      }
    }
  }
  const untaggedTasks = taskList.filter(t => t.tags.length === 0);
  const rows: TagPriorityCategory[] = [
    ...Array.from(tagMap.entries()).map(([name, { color, count, priorities }]) => ({
      label: name,
      count,
      color,
      priorities: [...priorities].sort((a, b) => a - b),
    })),
    ...(untaggedTasks.length > 0 ? [{
      label: 'Untagged',
      count: untaggedTasks.length,
      color: 'var(--tm-border)',
      priorities: untaggedTasks
        .filter(t => t.priority != null)
        .map(t => t.priority as number)
        .sort((a, b) => a - b),
    }] : []),
  ];
  return rows.sort((a, b) => b.count - a.count);
};

interface TaskCarouselSlide {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TaskStatsCarouselProps {
  slides: TaskCarouselSlide[];
}

// Like the Notes card's carousel, but slides transform-translate past each
// other instead of swapping instantly — a continuous sliding-glass motion
// (swipeable on touch too) so the Today/Priority/Active/Completed views read
// as one fluid strip of stats rather than a series of unrelated screens.
const TaskStatsCarousel: React.FC<TaskStatsCarouselProps> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const go = (delta: number) => setIndex(prev => (prev + delta + slides.length) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  // Track the active slide's own height (rather than letting the row
  // stretch to the tallest slide) so switching to a shorter slide doesn't
  // leave dead blank space below its content.
  useEffect(() => {
    const activeEl = slideRefs.current[index];
    if (!activeEl) return;
    setHeight(activeEl.offsetHeight);

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.observe(activeEl);
    return () => observer.disconnect();
  }, [index, slides]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {slides[index].label}
        </span>
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous stat"
              className="p-1.5 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.label}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === index ? '14px' : '6px',
                    backgroundColor: i === index ? 'var(--tm-accent)' : 'var(--tm-border)',
                    transitionDuration: 'var(--tm-dur-base)',
                    transitionTimingFunction: 'var(--tm-ease)',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next stat"
              className="p-1.5 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <div
        className="overflow-hidden"
        style={{
          height,
          transition: `height var(--tm-dur-slow) var(--tm-ease)`,
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex items-start"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: `transform var(--tm-dur-slow) var(--tm-ease)`,
          }}
        >
          {slides.map((s, i) => (
            <div
              key={s.key}
              ref={el => { slideRefs.current[i] = el; }}
              className="w-full flex-shrink-0 min-w-0"
            >
              {s.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TasksStatsCard: React.FC<Omit<TasksVariant, 'variant'>> = ({ tasks, total }) => {
  // Today's due tasks
  const todayDate = new Date();
  const todayStr = toLocalDateStr(todayDate);
  const todayDateLabel = todayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const todaysTasks = tasks.filter(t => t.due_date && toLocalDateStr(t.due_date) === todayStr);
  const todayTotal = todaysTasks.length;
  const todayCompleted = todaysTasks.filter(t => t.completed).length;
  const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  // This week's due tasks, bucketed Monday–Sunday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun .. 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const weekRangeLabel = formatDateRange(monday, sunday);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dStr = toLocalDateStr(d);
    const dTasks = tasks.filter(t => t.due_date && toLocalDateStr(t.due_date) === dStr);
    const hours = dTasks.reduce((sum, t) => sum + (t.estimated_time ?? 0), 0);
    return { date: d, total: dTasks.length, completed: dTasks.filter(t => t.completed).length, isToday: dStr === todayStr, hours };
  });
  const weekTotal = weekDays.reduce((sum, d) => sum + d.total, 0);
  const weekCompleted = weekDays.reduce((sum, d) => sum + d.completed, 0);
  const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
  const weekSegments: WeekSegment[] = weekDays;

  // Tag distribution for "Active" (non-completed tasks) and "Completed",
  // plus a tag×priority breakdown for "Priority" — each rendered as its own
  // bar-chart carousel slide below.
  const activeTagCategories = tagCategoriesFromTasks(tasks.filter(t => !t.completed));
  const completedTagCategories = tagCategoriesFromTasks(tasks.filter(t => t.completed));
  const tagPriorityCategories = tagPriorityCategoriesFromTasks(tasks.filter(t => !t.completed && t.priority != null));
  const activeCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const prioritizedCount = tasks.filter(t => !t.completed && t.priority != null).length;
  const overallPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const carouselSlides: TaskCarouselSlide[] = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <div className="grid grid-cols-3 gap-x-3 gap-y-3 pt-1 items-start">
          <ProgressRing
            label={`Today (${todayDateLabel})`}
            detail={todayTotal > 0 ? `${todayCompleted} / ${todayTotal} done` : 'No tasks today'}
            pct={todayPct}
            color="color-mix(in srgb, var(--tm-accent) 55%, white)"
            fluid
          />
          <SegmentedProgressRing
            label={`This Week (${weekRangeLabel})`}
            detail={weekTotal > 0 ? `${weekCompleted} / ${weekTotal} done` : 'No tasks this week'}
            pct={weekPct}
            color="var(--tm-accent)"
            segments={weekSegments}
            fluid
          />
          <ProgressRing
            label="Active"
            detail={`${completedCount} / ${total} done`}
            pct={overallPct}
            color="color-mix(in srgb, var(--tm-accent) 75%, black)"
            fluid
          />
        </div>
      ),
    },
    {
      key: 'hours',
      label: 'Workload',
      content: (
        <HoursLineChart days={weekDays} rangeLabel={weekRangeLabel} />
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      content: (
        <TagPriorityChart
          categories={tagPriorityCategories}
          total={prioritizedCount}
          totalLabel="prioritized"
          emptyMessage="No priorities set yet"
        />
      ),
    },
    {
      key: 'active',
      label: 'Active',
      content: (
        <CategoryBarChart
          categories={activeTagCategories}
          total={activeCount}
          totalLabel="active"
          emptyMessage="All caught up — nothing active"
        />
      ),
    },
    {
      key: 'completed',
      label: 'Completed',
      content: (
        <CategoryBarChart
          categories={completedTagCategories}
          total={completedCount}
          totalLabel="completed"
          emptyMessage="Nothing completed yet"
        />
      ),
    },
  ];

  return (
    <CardShell
      icon={<CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
      header="Tasks"
    >
      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <CheckSquare className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
          <p className="text-xs sm:text-sm text-text-muted">No tasks yet — add one to get moving.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          {/* Today/Week/Active overview, plus Priority/Active/Completed
              per-category bar charts, one swipeable carousel slide each */}
          <TaskStatsCarousel slides={carouselSlides} />
        </div>
      )}
    </CardShell>
  );
};

export default TasksStatsCard;
