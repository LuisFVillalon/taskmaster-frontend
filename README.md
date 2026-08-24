# Komorebi (TaskMaster Frontend)

Komorebi is a Next.js application — the frontend for the TaskMaster project — that connects to a backend API and Supabase to provide a full-featured task management experience with notes, habits, a customizable dashboard, a doodle canvas, a Canvas LMS integration, and AI-powered tools.

## Overview

This application provides a multi-page interface for managing tasks, notes, and habits. Users authenticate via Supabase Auth (email/password or Google OAuth) and get a personalized workspace with per-user data. The dashboard's calendar, stats widgets, and accent color/page style are all user-customizable. An AI debrief panel surfaces tag and time analytics, and a Canvas LMS integration pulls in course assignments.

## Features

- **Task Management**: Create, edit, delete, and mark tasks as completed. Supports priority levels, tags, due dates, and AI-generated subtask suggestions.
- **Notes System**: Rich-text note editor (Tiptap, with tables, highlights, resizable images, and text alignment) with folder/tag organization, grid and list views, and PDF export.
- **Habit Tracking**: Create habits, log daily completions, and review history.
- **Customizable Dashboard**: Drag-and-drop stats widgets (tasks, notes, habits, timers) via a resizable grid, plus a big-picture calendar with month/summary views.
- **Focus & Doodle Modes**: Switch the dashboard between normal, focus (tasks & notes only), and doodle (freehand drawing canvas) modes.
- **Canvas LMS Integration**: Pull assignments directly from your Canvas courses.
- **AI Debrief Panel**: Analyze task and tag patterns with an AI-powered time & tag audit.
- **Tagging System**: Create and manage tags to categorize tasks and notes.
- **Filtering**: Filter tasks by completion status, tags, priority, and search terms.
- **Supabase Auth**: Email/password and Google OAuth sign-in with per-user data isolation.
- **Theming**: Custom accent colors and notebook page styles, plus automatic OS-based dark mode.
- **Settings**: User profile name/avatar and app preferences.
- **Responsive Design**: Built with Tailwind CSS v4 for a modern, responsive UI.

## Tech Stack

- **Framework**: Next.js 16.1.x (App Router)
- **Language**: TypeScript
- **Auth & DB**: Supabase (`@supabase/supabase-js`)
- **Rich Text**: Tiptap v3 (Highlight, Image, Table, TextAlign, Underline extensions)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Password Strength**: zxcvbn-ts
- **PDF Export**: html2pdf.js
- **Testing**: Vitest
- **Linting**: ESLint

## Project Structure

```
src/
  app/
    auth/callback/        # Supabase OAuth callback route
    login/                # Login page
    signup/               # Sign-up page
    notes/                # Notes page
    calendar/             # Big-picture calendar page
    components/           # Grouped by domain, not by type
      auth/                # AuthInput, AuthPageCard, AuthDivider, GoogleAuthButton,
      │                    #   GoogleLogo, PasswordStrengthMeter, ProtectedPage
      calendar/             # BigPictureCalendar, CalendarView, MonthCalendar,
      │                    #   MonthCarousel, CalendarSummarySlide, DayCell,
      │                    #   DayCharts, DayDetailModal, DaySummary(Panel)
      charts/               # TrendLineChart
      common/               # Modal, DragHandle, DraggableGrid, ColorSwatchPicker,
      │                    #   ModeSwitcher, PageSpinner, ProfileAvatar,
      │                    #   TagChipList, TagMultiSelect
      doodle/               # DoodleCanvas, DoodleToolbar
      habit/                # CreateHabitModal, HabitHistoryModal, ManageHabitsModal
      layout/               # CalendarAndStats, TaskManagerModals (cross-domain composition)
      lms/                  # CanvasWrapper, CourseSelection (Canvas LMS integration)
      notes/                # NoteEditor(Overlay), NotesPanel, NotesView, NotesList,
      │                    #   NotesGridView, NoteFolder, NoteCard, EditorToolbar,
      │                    #   TagFolderOverlay, NoteFileIcon, extensions/ResizableImage
      settings/             # SettingsModal, ThemeAccentPicker
      stats/                # StatsCard + variants (Tasks/Notes/Habits), CardShell,
      │                    #   TimersCard, charts
      tag/                  # CreateTagModal, EditTagListModal
      task/                 # NewTaskModal, EditTaskModal, TaskItem, TaskTags,
      │                    #   TaskFormFields, PriorityPicker, TasksPanel,
      │                    #   TaskControls, TaskDebriefPanel
    context/
      AuthContext.tsx      # Supabase session + user context
      AppDataProvider.tsx  # Mounts Tasks/Tags/Habits/Notes providers once in the root layout
      TasksContext.tsx / TagsContext.tsx / HabitsContext.tsx / NotesContext.tsx
    hooks/
      useCanvasData.ts
      useClaimOrphanedData.ts
      useGridOrder.ts
      useHabits.ts
      useMidnightTick.ts
      useNotePdfExport.ts
      useNotes.ts
      useProfile.ts
      useResizableSplit.ts / useSplitPanel.ts
      useTaskFiltering.ts
      useTaskHandlers.ts
      useTaskManagerState.ts
      useTasksAndTags.ts
      useYearCalendarData.ts
    lib/
      backend-api.ts       # Taskmaster backend API client
      canvas_api.ts        # Canvas LMS API client
      passwordValidation.ts
      supabase.ts          # Supabase client initialization
      theme.ts             # Accent color palette + application
      pageStyle.ts          # Notebook page-ruling styles
      avatar.ts / colorOptions.ts / monthPersonality.ts / restDays.ts
    types/
      calendar.ts, canvas.ts, debrief.ts, drawing.ts, habit.ts,
      learningResources.ts, notes.ts, profile.ts, task.ts
    utils/
      canvasUtils.ts, dateUtils.ts, tagBucketing.ts, taskUtils.ts,
      textUtils.ts, timezoneUtils.ts
    globals.css
    layout.tsx
    page.tsx
    TaskManager.tsx
public/
  (static assets)
```

See [CLAUDE.md](./CLAUDE.md) for a deeper architecture walkthrough (data-loading flow, theming internals, state layering).

## Installation & Setup

### Prerequisites

- Node.js 18 or higher
- npm
- A running [TaskMaster Backend](../taskmaster-backend/) instance
- A Supabase project (for auth and database)

### Installation Steps

1. Clone the repository:
   ```
   git clone <repository-url>
   cd taskmaster-frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables (see below).

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_TASKMASTER_DB_URL=http://your-backend-api-url
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CANVAS_API_KEY=your-canvas-lms-api-token
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_TASKMASTER_DB_URL` | Base URL of the TaskMaster backend API |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project anon/public key |
| `NEXT_PUBLIC_CANVAS_API_KEY` | Canvas LMS user access token (optional) |
| `NEXT_PUBLIC_SITE_URL` | Canonical OAuth redirect base for production (optional; set in Vercel, not locally — `localhost` always uses `window.location.origin` regardless) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

## Author

Luis Fernando Villalon — SDSU learning project for full-stack web development.
