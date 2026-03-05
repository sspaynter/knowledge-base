---
title: Settings
parent: feature-areas
order: 70
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Settings — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** No dedicated story IDs — Settings is a supporting screen, not a user-journey entry point
**Opportunities addressed:** Enables OPP-02 (Calendar connection), OPP-04 (Statuses management)
**Status:** Gate 3 prototype — Settings screen not built in prototype. Spec is based on Gate 2 design doc Section 3.
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Prototype:** Not prototyped — lower priority than core screens. To be built in Gate 4.

---

## What this feature area does

Settings is the configuration screen. It does not deliver day-to-day value — it enables the features that do. Simon comes here to connect external services (Google Calendar), manage the vocabulary of the system (statuses, tags), and review his profile.

Settings does NOT manage tasks, projects, or personal groups. It is not a frequently visited screen.

---

## Settings sections

### 1. Google Calendar connection

**Purpose:** Connect Simon's Google Calendar so that Today can show available hours and Plan My Day can factor in real capacity.

**What Simon sees:**
- Connection status: Connected (shows calendar name + email) or Not connected
- "Connect Google Calendar" button (if not connected) → triggers Google OAuth flow
- "Disconnect" button (if connected) → removes OAuth tokens and clears calendar data from Today
- Last sync timestamp: "Last synced: 3 minutes ago"

**How it works (technical):**
- Separate OAuth flow from login auth (which uses Google Identity for SSO)
- Calendar OAuth tokens stored per-user in the `todo` schema (`gcal_tokens` table — separate from session auth)
- Server polls availability on each Today load; re-authorises silently if token is fresh
- If OAuth tokens expire and silent re-auth fails, a banner appears on the Today screen: "Calendar disconnected — reconnect in Settings"

**Screen states:**
| State | What Simon sees |
|---|---|
| Not connected | "Connect Google Calendar" button; Today shows Available hours as "—" |
| Connected | Calendar name + email shown; last sync timestamp; "Disconnect" option |
| Sync error | Warning: "Calendar sync failed — check connection" + "Reconnect" button |
| OAuth in progress | Loading state while Google OAuth popup completes |

---

### 2. Statuses management

**Purpose:** The default status set (To-Do / In Progress / Done / Blocked / Parked) is extensible. Simon can add custom statuses, reorder them, rename them, and delete unused ones.

**Default statuses (seeded on setup):**
```
To-Do → In Progress → Blocked → Done → Parked
```

**What Simon sees:**
- List of all statuses with: colour swatch, name, drag handle for reorder, delete button
- "Add status" input at the bottom
- Colour picker per status (limited palette — not free-form colour)
- Reorder via drag handle — float-based order, no integer renumbering
- Delete only available if the status has zero tasks currently assigned

**Rules:**
- "Done" and "To-Do" are protected — cannot be renamed or deleted (they are referenced by system logic)
- New statuses are global by default (apply to all containers)
- Per-container status overrides: v2 (schema supports it via `container_id` on statuses table — config change only)

**Screen states:**
| State | What Simon sees |
|---|---|
| Default | 5 default statuses listed with drag handles |
| Delete attempted (tasks exist) | "Cannot delete — X tasks use this status" |
| Delete confirmed (zero tasks) | Status removed immediately |
| Add new | Inline input at bottom; Enter to save |
| Reorder | Drag handle active; order saves on drop |

---

### 3. Tags management

**Purpose:** Tags are optional labels that can be applied to any task across any container. They provide a cross-project vocabulary that is separate from container organisation.

**What Simon sees:**
- List of existing tags with: colour swatch, name, task count, delete button
- "Add tag" input
- Colour picker per tag

**How tags work in the app:**
- Tags can be added to any item in the task detail panel
- Tags appear as coloured chips on task rows in list view
- Tags are searchable via Cmd+K and filterable in All Tasks (v2 — S-M13)
- Tags are global — not scoped to a container

**Rules:**
- Deleting a tag removes it from all tasks it was applied to
- A confirmation is shown before deleting a tag with tasks: "This tag is on X tasks. Deleting it removes the tag from all of them."
- Tags are optional — no task is required to have a tag

**Screen states:**
| State | What Simon sees |
|---|---|
| No tags | "No tags yet — add one below" |
| Delete with tasks | Confirmation: "Remove tag from X tasks?" |
| Delete with no tasks | Immediate delete, no confirmation |

---

### 4. Day reset time

**Purpose:** Define when "today" ends and the carry-over logic runs. Default is midnight. Configurable for users who work late.

**What Simon sees:**
- A time picker labelled "Day resets at" with default value 00:00
- A helper line: "Tasks not completed before this time will appear as carry-over tomorrow."
- Save button (or auto-save on change)

**How it works (technical):**
- Stored as `day_reset_time` (TIME) on the user preferences record
- Default: `00:00`
- On first load of ToDo after the reset time on a new calendar day, the carry-over prompt is generated
- "First load" = the first session load where `now > reset_time` on a date after the last known active date
- No cron job required — evaluated on page load

**Screen states:**
| State | What Simon sees |
|---|---|
| Default (not changed) | 00:00 shown; helper text visible |
| Changed | New time shown; save confirms |
| Save failed | Inline error: "Could not save preference — try again" |

---

### 5. Profile

**Purpose:** View and manage account information.

**What Simon sees:**
- Name (from Google account — read-only)
- Email (from Google account — read-only)
- Profile photo (from Google account — read-only)
- "Sign out" button

**Note:** Profile details are sourced from Google OAuth — Simon manages them in his Google account, not in ToDo. ToDo does not have its own name/email/password fields.

---

## Non-functional requirements

| Requirement | Target | Notes |
|---|---|---|
| Settings load | < 1 second | No heavy data — statuses and tags lists are small |
| OAuth flow | Redirect + callback pattern | Google handles timing. ToDo just stores the result. |
| Accessibility | WCAG 2.1 AA — not targeted v1 | Single-user personal tool |
| Mobile/responsive | Not supported v1 | 1280px minimum desktop |

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Calendar OAuth separate from login OAuth | Two separate OAuth flows | Login is identity (Google SSO). Calendar is data access (read availability). They have different scopes and different token lifetimes. |
| Tags are global, not per-container | Global | Keeps the tagging vocabulary consistent. Per-container tags create fragmentation and management overhead. |
| "Done" and "To-Do" protected | Cannot delete | System logic (Today committed list, task completion) references these status names. Deleting them breaks core features. |
| Per-container status overrides are v2 | Global defaults in v1 | Data model supports it (container_id column on statuses). Zero development cost to enable later. |
| Day reset time default is midnight | 00:00 | Most users expect a new day at midnight. Configurable to 05:00 or similar for late workers. No cron job — evaluated on page load. |

---

## v2 backlog (this feature area)

| Feature | Description |
|---|---|
| Per-container status overrides | Allow specific projects to have custom status sets (e.g., a Kanban project with Done / Won't Do instead of Archived). Schema already supports this. |
| Tag filtering in All Tasks | Tags appear as filter options in S-M13 (advanced filter) |
| Notification preferences | In-app or email notifications for overdue tasks, blocked items — deferred |
| API token management | Regenerate the Bearer token used by Claude session integration — currently a manual script |
