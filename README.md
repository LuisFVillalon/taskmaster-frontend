# TaskMaster Frontend

TaskMaster Frontend is a Next.js application that connects to a backend API and Supabase to provide a full-featured task management experience with notes, habits, a Canvas LMS integration, and AI-powered tools.

## Overview

This application provides a multi-page interface for managing tasks, notes, and habits. Users authenticate via Supabase Auth (email/password or Google OAuth) and get a personalized workspace with per-user data. An AI debrief panel surfaces tag and time analytics, and a Canvas LMS integration pulls in course assignments.

## Features

- **Task Management**: Create, edit, delete, and mark tasks as completed. Supports priority levels, tags, due dates, and AI-generated subtask suggestions.
- **Notes System**: Rich-text note editor (Tiptap) with folder/tag organization, grid and list views, and PDF export.
- **Habit Tracking**: Create habits, log daily completions, and review history.
- **Canvas LMS Integration**: Pull assignments directly from your Canvas courses.
- **AI Debrief Panel**: Analyze task and tag patterns with an AI-powered time & tag audit.
- **Calendar View**: Big-picture calendar showing tasks and events across time.
- **Tagging System**: Create and manage tags to categorize tasks and notes.
- **Filtering**: Filter tasks by completion status, tags, priority, and search terms.
- **Supabase Auth**: Email/password and Google OAuth sign-in with per-user data isolation.
- **Settings**: User profile name and app preferences.
- **Responsive Design**: Built with Tailwind CSS v4 for a modern, responsive UI.

## Tech Stack

- **Framework**: Next.js 16.1.x (App Router)
- **Language**: TypeScript
- **Auth & DB**: Supabase (`@supabase/supabase-js`)
- **Rich Text**: Tiptap v3 (with Highlight and Image extensions)
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
    tasks/                # Tasks page
    components/
      common/             # Shared UI: AuthInput, AuthPageCard, GoogleAuthButton,
      │                   #   DragHandle, PageSpinner, ProtectedPage
      canvas/             # CanvasWrapper, CourseSelection
      habit/              # CreateHabitModal, HabitHistoryModal, ManageHabitsModal
      notes/              # NoteEditor, NoteEditorOverlay, NotesPanel, NotesView,
      │                   #   NotesList, NotesGridView, NoteFolder, NoteItem,
      │                   #   EditorToolbar, TagFolderOverlay, NoteFileIcon
      tag/                # CreateTagModal, EditTagListModal
      task/               # NewTaskModal, NewTaskPanel, TaskItem, TaskTags,
      │                   #   TaskFormFields, PriorityPicker
      tasks/              # TasksPanel, TasksView, TasksList, TaskItem, TaskDetail
      BigPictureCalendar.tsx
      CalendarAndStats.tsx
      GoogleLogo.tsx
      PasswordAuth.tsx
      PasswordStrengthMeter.tsx
      SettingsModal.tsx
      StatsCard.tsx
      TaskControls.tsx
      TaskDebriefPanel.tsx
      TaskManagerModals.tsx
    context/
      AuthContext.tsx      # Supabase session + user context
    hooks/
      useCanvasData.ts
      useClaimOrphanedData.ts
      useHabits.ts
      useNotes.ts
      useProfileName.ts
      useResizableSplit.ts
      useTaskFiltering.ts
      useTaskHandlers.ts
      useTaskManagerState.ts
      useTaskManagerUIState.ts
      useTasksAndTags.ts
    lib/
      backend-api.ts       # Taskmaster backend API client
      canvas_api.ts        # Canvas LMS API client
      passwordValidation.ts
      supabase.ts          # Supabase client initialization
    types/
      calendar.ts
      canvas.ts
      notes.ts
      task.ts
    utils/
      canvasUtils.ts
      dateUtils.ts
      taskUtils.ts
      textUtils.ts
      timezoneUtils.ts
    globals.css
    layout.tsx
    page.tsx
    TaskManager.tsx
  types/
    html2pdf.d.ts
public/
  (static assets)
```

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
