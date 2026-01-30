# Malamar Pre-Release E2E Test Checklist

> Manual verification checklist for end-to-end testing before release.
> Each section should be tested with a fresh database to ensure proper behavior.

---

## Prerequisites

Before testing, ensure:
- [ ] Fresh Malamar instance with empty database (`rm -rf ~/.malamar` or use `MALAMAR_DATA_DIR`)
- [ ] At least one CLI available (Claude Code recommended)
- [ ] Both API (`make dev-api`) and UI (`make dev-ui`) running
- [ ] Browser DevTools open to monitor network requests and console errors

---

## 1. First Startup & Onboarding

### 1.1 First Launch Behavior
- [x] On first launch, sample workspace "Sample: Code Assistant" is automatically created
- [x] Sample workspace has 4 agents: Planner, Implementer, Reviewer, Approver
- [x] Agents have meaningful default instructions
- [x] No sample tasks are created (user creates first task)
- [x] Subsequent restarts do NOT recreate sample workspace (check directory existence)

### 1.2 CLI Health Detection
- [x] On startup, CLI health check runs automatically
- [x] `/api/health` returns correct CLI status
- [x] Healthy CLIs show green indicator in UI (Settings > CLIs)
- [x] Unhealthy CLIs show red indicator with error message
- [x] "Refresh CLI Status" button triggers immediate re-detection

---

## 2. Workspace Management

### 2.1 Create Workspace
- [x] "Create Workspace" button opens dialog/drawer (responsive)
- [x] Title is required (form validation)
- [x] Description is optional
- [x] Working Directory is optional
- [x] New workspace appears in list after creation
- [x] Workspace has correct `last_activity_at` timestamp

### 2.2 List Workspaces
- [x] All workspaces displayed as cards
- [x] Cards show title, description preview, last activity time
- [x] Search by title works (`?q=` parameter)
- [x] Empty state shows "No workspaces yet" with CTA

### 2.3 Update Workspace
- [x] Navigate to workspace settings page
- [x] Can update title, description
- [x] Can change working directory mode (static vs temp)
- [x] Can set static directory path
- [x] Validation: warn if static path doesn't exist (but allow saving)
- [x] Changes persist after page refresh

### 2.4 Delete Workspace
- [x] Delete requires typing workspace name to confirm
- [x] Deleting workspace cascades: agents, tasks, comments, logs, chats, messages
- [x] Any in-progress task/chat CLI subprocess is killed first
- [x] Workspace disappears from list after deletion

---

## 3. Agent Management

### 3.1 Create Agent
- [x] "Add Agent" button opens dialog
- [x] Name is required and unique within workspace
- [x] CLI type dropdown shows all 4 CLIs with health indicator
- [x] Default CLI is first healthy one (priority: Claude > Codex > Gemini > OpenCode)
- [x] Instruction is required (textarea)
- [x] New agent appends to end of list (highest order + 1)

### 3.2 List Agents
- [x] Agents displayed in order (1, 2, 3, 4...)
- [x] Each shows: name, CLI type, instruction preview
- [x] Empty state shows warning banner + prompt to chat with Malamar

### 3.3 Update Agent
- [x] Can edit name, instruction, CLI type
- [x] Name uniqueness enforced (conflict error if duplicate)
- [x] Changes take effect immediately for subsequent task processing

### 3.4 Reorder Agents
- [x] Desktop: Drag-and-drop works
- [x] Mobile: Up/down arrow buttons work
- [x] Order persists after page refresh
- [x] Order affects agent execution sequence in task loop

### 3.5 Delete Agent
- [x] Confirm dialog before deletion
- [x] Deleting agent preserves old comments (shows "(Deleted Agent)")
- [x] Deleting agent preserves old chats (switches to Malamar agent)

### 3.6 Workspace with No Agents
- [x] Warning banner displayed persistently
- [x] Tasks immediately move to "In Review" (no agents = all skip)
- [x] Can still chat with Malamar agent to recreate agents

---

## 4. Task Management

### 4.1 Create Task
- [x] "Create Task" button opens dialog
- [x] Summary is required
- [x] Description is optional (markdown supported)
- [x] New task appears in "Todo" column
- [x] Queue item created (visible via database inspection)
- [x] Activity log: `task_created` event logged

### 4.2 Kanban Board Display
- [x] Four columns: Todo, In Progress, In Review, Done
- [x] Tasks sorted by most recently updated within each column
- [x] Empty column shows no message (not "no tasks")
- [x] Empty board (all columns) shows "No tasks yet" with CTA

### 4.3 Task Card Display
- [x] Shows summary (truncated with ellipsis if long)
- [x] Shows relative time ("5 min ago", "2 days ago")
- [x] Shows comment count badge if > 0
- [x] Shows priority badge if prioritized
- [x] Shows processing indicator (pulsing/spinner) when agent is working

### 4.4 Task Detail Dialog
- [x] Opens on card click
- [x] Three tabs: Details, Comments, Activity
- [x] Details tab: edit summary/description, see status, take actions
- [x] Comments tab: view all comments, add new comment
- [x] Activity tab: timeline of events with icons

### 4.5 Update Task
- [x] Can edit summary and description
- [x] Can change status (with restrictions per status)
- [x] Status change logged in activity log

### 4.6 Task Status Transitions (User Actions)
| Current Status | Available Actions |
|----------------|-------------------|
| Todo | Delete, Prioritize |
| In Progress | Delete, Cancel, Move to In Review, Prioritize |
| In Review | Delete, Move to Todo |
| Done | Delete, Move to Todo |

- [x] Todo → In Progress: happens automatically via runner
- [x] In Progress → In Review: user can manually trigger
- [x] In Review → Done: only users can move to Done
- [x] Done → Todo: reopens task for reprocessing

### 4.7 Delete Task
- [x] Confirm dialog before deletion
- [x] Cascade deletes: comments, logs, queue items
- [x] If in progress, kills CLI subprocess first

### 4.8 Delete All Done Tasks
- [x] Button in workspace settings or task view
- [x] Requires typing workspace name to confirm
- [x] Only deletes tasks with status "Done"
- [x] Tasks in other statuses unaffected

### 4.9 Task Prioritization
- [x] "Prioritize" button in task detail
- [x] Prioritized task shows badge on card
- [x] Prioritized tasks picked up first by runner
- [x] "Remove Priority" toggle available
- [x] Activity log: `task_prioritized` / `task_deprioritized` events

### 4.10 Task Cancellation
- [x] "Cancel" button available for In Progress tasks
- [x] Cancelling kills CLI subprocess immediately
- [x] Task moves to "In Review" (prevents immediate re-pickup)
- [x] System comment added: "Task cancelled by user"
- [x] Activity log: `task_cancelled` event
- [x] User can comment to restart processing

---

## 5. Task Processing (Multi-Agent Loop)

### 5.1 Task Pickup
- [x] Runner polls for queued tasks (default: 1000ms interval)
- [x] One task per workspace processed at a time
- [x] Priority queue items picked first
- [x] Most recently processed task prioritized (tackle until completion)
- [x] LIFO fallback for remaining tasks

### 5.2 Agent Execution Sequence
- [x] Agents execute in order (by `order` column)
- [x] Each agent receives: workspace instruction, task summary, description, comments, activity log
- [x] Agent sees list of other agents in workflow
- [x] Activity log: `agent_started` event when agent begins
- [x] Activity log: `agent_finished` event with action type

### 5.3 Agent Actions
| Action | Result |
|--------|--------|
| Skip | Nothing happens, pass to next agent |
| Comment | Add comment, triggers loop restart from first agent |
| Change Status (in_review) | Stop loop, move task to In Review |
| Comment + Change Status | Add comment, then move to In Review |

- [x] Skip: agent has nothing to do, no comment added
- [x] Comment: markdown summary added, loop restarts
- [x] Change Status: task moves to In Review, loop stops

### 5.4 Loop Continuation
- [x] If any agent added a comment → loop restarts from first agent
- [x] If all agents skipped → task moves to "In Review"
- [x] If any agent requests "In Review" → stop immediately
- [x] Safety limit: max 100 iterations (prevents infinite loops)

### 5.5 Error Handling
- [x] CLI exit non-zero: system comment with error
- [x] Output file missing: system comment with error
- [x] Output file empty: system comment with error
- [x] JSON parse failure: system comment with error
- [x] Schema validation failure: system comment with error
- [x] Task does NOT move to "In Review" on error
- [x] Error triggers retry via queue (natural retry)

### 5.6 Working Directory
- [x] Temp Folder mode: `/tmp/malamar_task_{task_id}` created
- [x] Static Directory mode: uses workspace path as-is
- [x] Static mode: warning logged if directory doesn't exist
- [x] Directory passed as `cwd` to CLI subprocess

### 5.7 Context Files
- [x] Input file: `/tmp/malamar_input_{random_nanoid}.md` (uses nanoid for uniqueness)
- [x] Output file: `/tmp/malamar_output_{random_nanoid}.json`
- [x] Input includes: workspace instruction, agent instruction, other agents, task details
- [x] Comments in JSONL format inside code block
- [x] Activity logs in JSONL format inside code block
- [x] Output instruction specifies exact output path

---

## 6. Task Comments

### 6.1 User Comments
- [x] Can add comment from task detail dialog
- [x] Comment content is required (non-empty)
- [x] User comments show "User" as author
- [x] Adding comment to "In Review" task moves it back to "Todo"
- [x] New queue item created on comment

### 6.2 Agent Comments
- [x] Agent comments show agent name as author
- [x] Markdown content rendered correctly
- [x] Agent comments trigger loop restart

### 6.3 System Comments
- [x] System comments show "System" as author
- [x] Include error messages, cancellation notices
- [x] System comments do NOT trigger agent responses

### 6.4 Comment Display
- [x] Comments ordered by created_at (oldest first for reading flow)
- [x] Each shows: author, content (rendered markdown), timestamp
- [x] Deleted agent comments show "(Deleted Agent)"

---

## 7. Task Activity Log

### 7.1 Event Types
- [x] `task_created`: logged on task creation
- [x] `status_changed`: logged with old_status, new_status
- [x] `comment_added`: logged when any comment added
- [x] `agent_started`: logged with agent_name
- [x] `agent_finished`: logged with agent_name, action_type
- [x] `task_cancelled`: logged on user cancellation
- [x] `task_prioritized`: logged when prioritized
- [x] `task_deprioritized`: logged when priority removed

### 7.2 Log Display
- [x] Logs ordered by created_at (ascending)
- [x] Each shows: icon, description, actor, timestamp
- [x] Actor: "User", agent name, or "System"
- [x] Hover tooltip shows full timestamp

---

## 8. Chat Feature

### 8.1 Create Chat
- [x] "New Chat" dropdown with agent list + Malamar option
- [x] Can select specific agent or Malamar agent
- [x] New chat has title "Untitled chat"
- [x] Chat appears in sidebar list

### 8.2 List Chats
- [x] Chats listed in sidebar
- [x] Search by title works (`?q=` parameter)
- [x] Most recently updated first
- [x] Empty state: "No conversations yet" with CTA

### 8.3 Chat Messages
- [x] User messages: right-aligned, colored background
- [x] Agent messages: left-aligned, markdown rendered
- [x] System messages: centered, muted style
- [x] Each shows: author, content, timestamp
- [x] Infinite scroll / load more pagination

### 8.4 Send Message
- [x] Input at bottom of chat
- [x] Send button or Ctrl/Cmd+Enter to submit
- [x] Message appears immediately (optimistic update)
- [x] Processing indicator shows while agent responds
- [x] Cannot send while processing (input disabled)

### 8.5 Cancel Processing
- [x] "Stop" button appears while processing
- [x] Cancelling kills CLI subprocess
- [x] System message added about cancellation
- [x] Can resume by sending another message

### 8.6 Chat Title
- [x] Default: "Untitled chat"
- [x] Agent can rename on first response only
- [x] After first response, `rename_chat` action ignored
- [x] User can edit title anytime via UI

### 8.7 Agent Switching
- [x] Can change agent mid-conversation
- [x] Full history preserved
- [x] System message: "Switched from [A] to [B]"
- [x] New agent sees entire conversation

### 8.8 CLI Override
- [x] Can override CLI for the chat
- [x] Overrides agent's default CLI
- [x] Persists for all messages in chat

### 8.9 File Attachments
- [x] Can upload files to chat
- [x] Files stored in `/tmp/malamar_chat_{chat_id}_attachments/`
- [x] System message notes uploaded file path
- [x] Duplicate filenames overwrite existing
- [x] No file size/type restrictions

### 8.10 Chat Working Directory
- [x] Temp Folder mode: `/tmp/malamar_chat_{chat_id}`
- [x] Static Directory mode: workspace path
- [x] CLI invoked with appropriate `cwd`

### 8.11 Delete Chat
- [x] Confirm dialog before deletion
- [x] Cascade deletes: messages, queue items
- [x] Attachment directory left for OS cleanup

---

## 9. Malamar Agent (Special Built-in)

### 9.1 Available Actions
| Action | Description |
|--------|-------------|
| `create_agent` | Create new agent |
| `update_agent` | Update existing agent |
| `delete_agent` | Delete agent |
| `reorder_agents` | Change agent order |
| `update_workspace` | Update workspace settings |
| `rename_chat` | Rename chat (first response only) |

- [x] Malamar agent can create agents
- [x] Malamar agent can update agents
- [x] Malamar agent can delete agents
- [x] Malamar agent can reorder agents
- [x] Malamar agent can update workspace settings
- [x] Actions execute immediately and reflected in UI

### 9.2 Workspace Agents (No Actions)
- [x] Workspace agents (Planner, etc.) provide advice only
- [x] No workspace modification actions available
- [x] Can only rename chat on first response

---

## 10. Real-Time Updates

### 10.1 SSE Events
| Event | Trigger |
|-------|---------|
| `task.status_changed` | Task status changes |
| `task.comment_added` | Comment added |
| `task.error_occurred` | CLI error |
| `agent.execution_started` | Agent begins work |
| `agent.execution_finished` | Agent completes |
| `chat.message_added` | Chat message added |
| `chat.processing_started` | Chat processing begins |
| `chat.processing_finished` | Chat processing ends |

- [ ] SSE endpoint `/api/events` is accessible
- [ ] Events trigger React Query invalidation
- [ ] UI updates without manual refresh
- [ ] Reconnection works after connection loss

### 10.2 Polling Fallback
- [x] Chat messages polled when processing active (5s interval)
- [x] Polling stops when processing completes
- [x] Refetch on window focus

### 10.3 Toast Notifications
- [ ] Important events trigger toast
- [ ] Duration: 5 seconds auto-dismiss
- [ ] Max 3 visible at once
- [ ] Position: bottom-right
- [ ] Clickable (navigates to item)

---

## 11. Settings

### 11.1 Global Settings Page
- [x] CLI configuration section
- [x] Each CLI shows: name, status, binary path, version
- [x] Healthy = green dot, Unhealthy = red dot + error
- [x] "Refresh" button re-runs health check

### 11.2 Workspace Settings
- [x] Title editable
- [x] Description editable
- [x] Working Directory Mode: static vs temp toggle
- [x] Static Directory Path input (with validation warning)
- [ ] Notification settings (per workspace)

### 11.3 Notification Settings
- [ ] Mailgun API key (global)
- [ ] Mailgun domain (global)
- [ ] From email (global)
- [ ] To email (global)
- [ ] "Test Email" button sends test
- [ ] Per-workspace toggles: On error, On In Review

---

## 12. Error Handling & Edge Cases

### 12.1 API Errors
- [x] 400 Validation errors show field-specific messages
- [x] 404 Not found shows "Resource not found"
- [x] 409 Conflict shows "Duplicate" error
- [x] 500 Server errors show generic error

### 12.2 Network Errors
- [ ] Offline state handled gracefully
- [ ] Retry logic for failed mutations
- [ ] Error toasts for failed operations

### 12.3 Race Conditions
- [ ] Concurrent edits: last save wins
- [ ] Multiple tabs: SSE keeps all synchronized
- [ ] Comment while processing: agent sees it next iteration

### 12.4 CLI Unavailable
- [ ] Zero CLIs healthy: warning in header
- [ ] Agent's CLI unhealthy: warning banner on workspace
- [ ] Chat with no CLI: error preventing send

---

## 13. Startup Recovery & Graceful Shutdown

### 13.1 Startup Recovery
- [x] On restart, `in_progress` queue items reset to `queued`
- [x] Runner picks them up naturally
- [x] Tasks stay "In Progress" status
- [x] No data loss or duplication

### 13.2 Graceful Shutdown
- [x] SIGTERM/SIGINT handled
- [x] Stops accepting new queue pickups
- [x] Kills active CLI subprocesses
- [ ] Closes SSE connections
- [x] Closes database connection

---

## 14. Cleanup Jobs

### 14.1 Task Queue Cleanup
- [ ] Runs daily
- [ ] Deletes completed/failed items > 7 days old

### 14.2 Chat Queue Cleanup
- [ ] Runs daily
- [ ] Deletes completed/failed items > 7 days old

### 14.3 Done Task Cleanup (Workspace Retention)
- [ ] Respects workspace `retention_days` setting
- [ ] Default: 7 days
- [ ] 0 = disable auto-cleanup
- [ ] Only affects "Done" status tasks

---

## 15. UI/UX Details

### 15.1 Responsive Design
- [x] Desktop: Dialog for forms
- [ ] Mobile: Drawer for forms
- [ ] Sidebar collapses on mobile
- [ ] Kanban columns stack or scroll on mobile

### 15.2 Theme Support
- [x] Light mode
- [x] Dark mode
- [x] System preference detection
- [x] Toggle in header
- [x] Preference persists in localStorage

### 15.3 Date/Time Formatting
| Age | Format |
|-----|--------|
| < 1 hour | "5 min ago", "just now" |
| < 24 hours | "3 hours ago" |
| < 7 days | "2 days ago" |
| ≥ 7 days (current year) | "Jan 15" |
| ≥ 7 days (past year) | "Jan 15, 2025" |

- [x] Hover tooltip shows full timestamp
- [x] Uses browser locale
- [x] Local timezone

### 15.4 Loading States
- [x] Skeleton placeholders for initial load
- [x] Spinner on buttons during mutations
- [x] Disabled state during processing

### 15.5 Empty States
| Context | Message |
|---------|---------|
| Workspace list | "No workspaces yet" |
| Tasks (all) | "No tasks yet" |
| Tasks (column) | (empty, no message) |
| Chats | "No conversations yet" |
| Agents | Warning banner |

### 15.6 Keyboard Shortcuts
- [x] Ctrl/Cmd+Enter to send chat message
- [x] Escape to close dialogs

---

## 16. Performance & Limits

### 16.1 No Pagination (v1)
- [x] All items returned in list endpoints
- [x] Acceptable for single-user scale

### 16.2 Comment/Log Volume
- [x] No hard limits on comments per task
- [x] No hard limits on activity logs per task
- [x] UI handles reasonable volumes (tens to hundreds)

### 16.3 Agent Loop Limit
- [x] Max 100 iterations per task processing cycle
- [x] Prevents infinite loops
- [x] System comment if limit reached

---

## 17. CLI Adapter Verification

### 17.1 Claude Code
- [x] Binary detection in PATH
- [ ] Custom path via settings works
- [x] Version detection works
- [x] Health check prompt succeeds
- [x] Task invocation succeeds
- [x] Chat invocation succeeds
- [ ] JSON schema enforcement via `--json-schema` flag

### 17.2 Gemini CLI (if available)
- [ ] Binary detection works
- [ ] Health check works
- [ ] Invocation with schema in prompt

### 17.3 Codex CLI (if available)
- [ ] Binary detection works
- [ ] Health check works
- [ ] Invocation with schema in prompt

### 17.4 OpenCode (if available)
- [ ] Binary detection works
- [ ] Health check works
- [ ] Invocation with schema in prompt

---

## 18. Data Integrity

### 18.1 Cascade Deletes
- [x] Workspace delete cascades: agents, tasks, comments, logs, queues, chats, messages
- [x] Task delete cascades: comments, logs, queue items
- [x] Chat delete cascades: messages, queue items
- [x] Agent delete: preserves references in comments/chats

### 18.2 Foreign Key Integrity
- [x] Cannot create agent without valid workspace_id
- [x] Cannot create task without valid workspace_id
- [x] Cannot create chat without valid workspace_id
- [x] Cannot create comment without valid task_id

### 18.3 Unique Constraints
- [x] Agent name unique within workspace
- [x] Agent order unique within workspace (handled by reorder logic)

---

## 19. Security Considerations

### 19.1 Input Validation
- [x] All API inputs validated via Zod
- [x] Maximum lengths enforced where appropriate
- [x] No SQL injection (parameterized queries via Bun SQLite)

### 19.2 File Paths
- [x] Working directory paths validated (exist check)
- [x] Temp files created in designated directories
- [x] No path traversal vulnerabilities

### 19.3 CLI Invocation
- [x] Environment variables properly handled
- [x] No shell injection (direct subprocess spawn)

---

## 20. Browser Compatibility

### 20.1 Modern Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 20.2 Features Used
- [x] CSS Grid
- [x] CSS Flexbox
- [x] CSS Variables
- [ ] EventSource (SSE)
- [x] Fetch API
- [x] localStorage

---

## Sign-Off

| Section | Tester | Date | Status |
|---------|--------|------|--------|
| 1. First Startup | | | |
| 2. Workspace Management | | | |
| 3. Agent Management | | | |
| 4. Task Management | | | |
| 5. Task Processing | | | |
| 6. Task Comments | | | |
| 7. Task Activity Log | | | |
| 8. Chat Feature | | | |
| 9. Malamar Agent | | | |
| 10. Real-Time Updates | | | |
| 11. Settings | | | |
| 12. Error Handling | | | |
| 13. Startup Recovery | | | |
| 14. Cleanup Jobs | | | |
| 15. UI/UX Details | | | |
| 16. Performance | | | |
| 17. CLI Adapters | | | |
| 18. Data Integrity | | | |
| 19. Security | | | |
| 20. Browser Compatibility | | | |

---

## Notes

- Test with fresh database for each major section when possible
- Document any bugs found with reproduction steps
- Take screenshots of UI issues
- Check console for JavaScript errors during testing
- Monitor network tab for API error responses
