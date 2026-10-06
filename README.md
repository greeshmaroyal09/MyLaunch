# MyLaunch

MyLaunch is a responsive React and TypeScript application for a personal career-preparation journey. The current implementation includes the Phase 1 shell, Phase 2 daily scheduler, Phase 3 curriculum progression, Phase 4 points/XP/levels/streaks, and Phase 5 browser persistence and calendar foundation.

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local URL after startup. If the default port is occupied, Vite will select another available port.

## Checks

```sh
npm run build
npm run lint
```

## Structure

- `src/components/` contains reusable navigation, character placeholder, points display, roadmap, Today dashboard, schedule summary, and task components.
- `src/data/curriculum.ts` defines the structured primary and AI/ML curriculum and flattens its tasks for scheduling.
- `src/domain/` contains task, curriculum, prerequisite, progress, daily schedule, calendar, leave, and persisted app-state models.
- `src/services/RuleBasedScheduler.ts` deterministically selects due required tasks with AVAILABLE or IN_PROGRESS state, checks completed prerequisites, and respects available minutes.
- `src/services/ScheduleService.ts` derives progression states, generates the daily schedule, completes tasks, unlocks successors, and derives schedule/curriculum summaries.
- `src/services/ProgressService.ts` records idempotent completion/skip events and derives canonical points, XP, curriculum counts, and streak state.
- `src/services/PointsCalculator.ts`, `LevelCalculator.ts`, and `StreakCalculator.ts` isolate deterministic rules.
- `src/services/DateService.ts` owns local `YYYY-MM-DD` date handling; `CalendarService.ts` determines learning, holiday, and leave dates.
- `src/services/StorageService.ts` reads/writes and validates the versioned `mylaunch_state_v1` localStorage snapshot.
- `src/state/` shares and persists curriculum progress, event ledger, schedule history, calendar settings, and leave records between Home, Today, and Roadmaps.
- `src/pages/CalendarPage.tsx` renders the month grid, selected-date schedule history, and controlled leave action.
- `src/components/CurriculumRoadmap.tsx` renders the curriculum hierarchy and task states for both tracks.
- `src/pages/` contains Home composition and section placeholder descriptions.
- `src/types.ts` defines the complete navigation section type.

## Current scope

Navigation is interactive across Home, Today, Roadmaps, Calendar, Progress, Tests, Projects, Internships, Jobs, Resources, and Settings. The curriculum has 18 subjects and 60 ordered tasks across primary career preparation and AI/ML tracks. Tasks begin available only when their prerequisites are complete; subsequent tasks remain locked until progression reaches them. Home, Today, and Roadmaps use the same in-memory progress state. Today scheduling is deterministic and limited to 100 minutes.

Completion awards points equal to estimated minutes and XP equal to those points. Levels are 1 at 0-99 XP, 2 at 100-249, 3 at 250-449, 4 at 450-699, and 5 at 700-999; after 1000 XP, successive level ranges grow by 50 XP each. A calendar date counts once toward streaks when at least one task is completed; configured holidays and leave dates are ignored when checking missed learning days. Skipping records a separate -10 points/-10 XP event, with balances clamped at zero; skipped work remains unfinished and can be scheduled on a later date. Completion rewards and same-day skip penalties cannot be repeated for the same event.

The academic date configuration is an editable foundation seeded with weekdays and no assumed official holidays; its example date range is 2026-09-01 through 2027-06-30. Leave may be set for today or a future learning day and requires a reason. A holiday/leave schedule is empty; unfinished work remains eligible on later learning dates. The local storage payload is schema version 1; malformed or unknown versions fall back to a valid first-time state. Browser state persists across refreshes and dev-server restarts on the same origin.

Curriculum content is an initial planned outline, not a claim that the user has learned these subjects or the final curriculum. The avatar, adventure path, and animal companions remain visual placeholders. Backend/cloud sync, authentication, real college calendar imports, leave-excuse penalties, attendance integration, weekly tests, and later-phase workflows are not implemented.
