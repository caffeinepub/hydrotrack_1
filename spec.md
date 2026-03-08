# HydroTrack

## Current State
- Motoko backend stores per-user water log entries (id, amount, timestamp) and a daily goal (default 2000ml).
- Backend exposes: `logWaterIntake`, `deleteEntry`, `setDailyGoal`, `getDailyGoal`, `getTodaysEntries`, `getTodaySummary`.
- Frontend: single-page React app with a circular progress ring, quick-add buttons (150/250/500ml + custom), today's entry log, and a collapsible settings panel for the daily goal.

## Requested Changes (Diff)

### Add
1. **Weekly intake chart** – bar chart showing daily total intake (ml) for the past 7 days, including today.
2. **Daily streak counter** – number of consecutive days where the user met their daily goal.
3. **Reminder feature** – user can configure a recurring reminder interval (e.g. every 30 min, 1 hr, 2 hr). The browser fires a notification (or a visible in-app alert/buzz) at the chosen interval. This is frontend-only using `setInterval` + Web Notifications API (no backend needed for reminders, just local browser state/storage).

### Modify
- Backend: add `getWeeklyEntries` query returning all entries for the last 7 days (to power the chart).
- Backend: add `getStreak` query computing consecutive days of goal completion up to today.
- Frontend: add a stats row/section between the progress ring and the quick-add buttons, showing the streak badge.
- Frontend: add the weekly chart section below the streak.
- Frontend: add a Reminder card in the Settings section.

### Remove
- Nothing removed.

## Implementation Plan
1. **Backend**: Add `getWeeklyEntries` returning entries for the past 7 days. Add `getStreak` computing consecutive-day streak against daily goal.
2. **Frontend hooks**: Add `useWeeklyEntries` and `useStreak` query hooks.
3. **Weekly chart**: Use recharts BarChart (already in shadcn chart component) to render the 7-day bar chart. Aggregate entries by day on the frontend. Show day labels (Mon–Sun), highlight today.
4. **Streak counter**: Show a flame-icon badge with the streak count in the stats row. Animate the number.
5. **Reminder feature**: Fully frontend. UI in Settings: select interval (15min, 30min, 1hr, 2hr, custom) + toggle on/off. Use `setInterval` to fire browser Notification API reminders. Request notification permission on enable. Persist interval to `localStorage`. Show countdown to next reminder.
