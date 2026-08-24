'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CalendarDays, TrendingUp, Type, NotebookText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Note } from '@/app/types/notes';
import { formatUpdatedDate } from '@/app/utils/dateUtils';
import { CardShell } from './CardShell';
import { CategoryDonut } from './charts';
import type { NotesVariant } from './types';

// Tiptap stores note content as HTML — strip tags to approximate word count.
const countWords = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
};

interface CategoryLegendRowProps {
  label: string;
  count: number;
  color: string;
}

// A compact legend row — color dot, label, numeric count — paired with
// CategoryDonut so the exact per-category totals sit beside the chart
// that shows their relative share.
const CategoryLegendRow: React.FC<CategoryLegendRowProps> = ({ label, count, color }) => (
  <div className="flex items-center gap-1">
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <span className="text-xs sm:text-sm text-text-secondary truncate">{label}</span>
    <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--tm-text-primary)' }}>
      {count}
    </span>
  </div>
);

interface NoteRowProps {
  note: Note;
  metric: string;
  onOpen: (note: Note) => void;
}

// A note row that doubles as a nav link — clicking it opens the note in the
// full notes view (/notes?id=…). `metric` is whatever the active carousel
// slide wants shown on the right (last-updated time, word count, …).
const NoteRow: React.FC<NoteRowProps> = ({ note, metric, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(note)}
    title={`Open "${note.title || 'Untitled'}"`}
    className="w-full flex items-center gap-2 py-0.5 -mx-1.5 px-1.5 rounded-md text-left transition-colors hover:bg-surface-raised"
  >
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {note.tags.length > 0 ? (
        note.tags.slice(0, 3).map(tag => (
          <span
            key={tag.id}
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: tag.color ?? 'var(--tm-accent)' }}
            title={tag.name}
          />
        ))
      ) : (
        <FileText className="w-2.5 h-2.5 text-text-muted flex-shrink-0" />
      )}
    </span>
    <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--tm-text-primary)' }}>
      {note.title || 'Untitled'}
    </span>
    <span className="text-xs text-text-muted flex-shrink-0">{metric}</span>
  </button>
);

interface ActivityStatRowProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

// A left-aligned icon + value + label row, echoing CategoryLegendRow's flow
// so the "Writing Activity" list reads as part of the same left-aligned
// stack rather than a separate block of centered numbers.
const ActivityStatRow: React.FC<ActivityStatRowProps> = ({ icon, value, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="flex-shrink-0" style={{ color: 'var(--tm-accent)' }}>{icon}</span>
    <span className="text-base font-bold leading-none flex-shrink-0" style={{ color: 'var(--tm-text-primary)' }}>
      {value}
    </span>
    <span className="text-xs sm:text-sm text-text-muted truncate">{label}</span>
  </div>
);

interface NoteCarouselSlide {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface NoteCarouselProps {
  slides: NoteCarouselSlide[];
}

// A tiny dot/arrow carousel that swaps between a few note-derived stats
// inside a fixed-height footer, so the card doesn't reflow between slides.
const NoteCarousel: React.FC<NoteCarouselProps> = ({ slides }) => {
  const [index, setIndex] = React.useState(0);
  const active = slides[Math.min(index, slides.length - 1)];
  const go = (delta: number) => setIndex(prev => (prev + delta + slides.length) % slides.length);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {active.label}
        </span>
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous stat"
              className="p-1 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.label}`}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: i === index ? 'var(--tm-accent)' : 'var(--tm-border)' }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next stat"
              className="p-1 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-0.5" style={{ minHeight: '5rem' }}>
        {active.content}
      </div>
    </div>
  );
};

// Broken out from the main StatsCard switch so its hooks (router, carousel
// index, derived note rankings) stay unconditional — StatsCard's `notes`
// branch just renders this rather than calling hooks inline.
const NotesStatsCard: React.FC<Omit<NotesVariant, 'variant'>> = ({ notes, noteTags }) => {
  const router = useRouter();
  const openNote = (note: Note) => router.push(`/notes?id=${note.id}`);

  const noteCount = notes.length;
  const taggedCount = notes.filter(n => n.tags.length > 0).length;
  const untaggedCount = Math.max(noteCount - taggedCount, 0);

  const categories = [
    ...noteTags.map(t => ({ label: t.name, count: t.count, color: t.color ?? 'var(--tm-accent)' })),
    ...(untaggedCount > 0 ? [{ label: 'Untagged', count: untaggedCount, color: 'var(--tm-border)' }] : []),
  ].sort((a, b) => b.count - a.count);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()).slice(0, 3),
    [notes],
  );
  const longestNotes = useMemo(
    () => [...notes].sort((a, b) => countWords(b.content) - countWords(a.content)).slice(0, 3),
    [notes],
  );
  const activityStats = useMemo(() => {
    const now = new Date().getTime();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const createdThisWeek = notes.filter(n => new Date(n.created_date).getTime() >= weekAgo).length;
    const createdThisMonth = notes.filter(n => new Date(n.created_date).getTime() >= monthAgo).length;
    const avgWords = noteCount > 0
      ? Math.round(notes.reduce((sum, n) => sum + countWords(n.content), 0) / noteCount)
      : 0;
    return { createdThisWeek, createdThisMonth, avgWords };
  }, [notes, noteCount]);

  const slides: NoteCarouselSlide[] = [
    {
      key: 'recent',
      label: 'Recently Updated',
      content: recentNotes.length > 0
        ? recentNotes.map(note => (
            <NoteRow key={note.id} note={note} metric={formatUpdatedDate(note.updated_date)} onOpen={openNote} />
          ))
        : <p className="text-xs sm:text-sm text-text-muted italic py-2 text-center">Nothing edited yet</p>,
    },
    {
      key: 'longest',
      label: 'Longest Notes',
      content: longestNotes.length > 0
        ? longestNotes.map(note => (
            <NoteRow key={note.id} note={note} metric={`${countWords(note.content)} words`} onOpen={openNote} />
          ))
        : <p className="text-xs sm:text-sm text-text-muted italic py-2 text-center">Write more to see rankings</p>,
    },
  ];

  return (
    <CardShell
      icon={<NotebookText className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
      header="Notes"
    >
      {noteCount === 0 ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <FileText className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
          <p className="text-xs sm:text-sm text-text-muted">No notes yet — jot something down.</p>
        </div>
      ) : (
        // flex-1 + justify-center: the card shell stretches to match whatever
        // taller neighbor shares its grid row (draggable grid, so that
        // neighbor varies), and this content is a fixed height — centering it
        // in the available space keeps any leftover height as balanced
        // top/bottom margin instead of one dead gap under the last quadrant.
        <div className="flex-1 flex flex-col justify-center">
          {/* 2x2 layout: totals+categories, donut, carousel, and writing
              activity each own a quadrant so the card reads as a grid of
              equal-weight stats rather than one long row. */}
          <div className="grid grid-cols-[3fr_2fr] gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-2xl lg:text-3xl font-bold leading-none" style={{ color: 'var(--tm-accent)' }}>
                  {noteCount}
                </span>
                <span className="text-xs sm:text-sm text-text-muted font-medium">
                  {noteCount === 1 ? 'note total' : 'notes total'}
                </span>
              </div>
              {categories.length > 0 && (
                // Fills down each column three rows at a time, adding columns as
                // needed; once that runs wider than the card, it scrolls sideways.
                <div className="overflow-x-auto scrollbar-custom pb-1" style={{ maxWidth: '100%' }}>
                  <div
                    className="grid gap-x-3 gap-y-1"
                    style={{ gridTemplateRows: 'repeat(3, auto)', gridAutoFlow: 'column', gridAutoColumns: 'max-content' }}
                  >
                    {categories.map(c => (
                      <CategoryLegendRow key={c.label} label={c.label} count={c.count} color={c.color} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center">
              {categories.length > 0 && (
                <CategoryDonut categories={categories} />
              )}
            </div>
            <div className="min-w-0">
              <NoteCarousel slides={slides} />
            </div>
            {/* Hairline-separated so it reads as a distinct quadrant rather than
                a floating block of numbers. */}
            <div className="flex flex-col gap-1.5 pl-4 border-l" style={{ borderColor: 'var(--tm-border)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Writing Activity
              </span>
              <div className="flex flex-col gap-1">
                <ActivityStatRow icon={<TrendingUp className="w-3 h-3" />} value={activityStats.createdThisWeek} label="this week" />
                <ActivityStatRow icon={<CalendarDays className="w-3 h-3" />} value={activityStats.createdThisMonth} label="this month" />
                <ActivityStatRow icon={<Type className="w-3 h-3" />} value={activityStats.avgWords} label="avg words/note" />
              </div>
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
};

export default NotesStatsCard;
