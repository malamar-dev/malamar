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
- [ ] Any in-progress task/chat CLI subprocess is killed first
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
- [ ] Desktop: Drag-and-drop works
- [ ] Mobile: Up/down arrow buttons work
- [x] Order persists after page refresh
- [x] Order affects agent execution sequence in task loop

### 3.5 Delete Agent
- [x] Confirm dialog before deletion
- [ ] Deleting agent preserves old comments (shows "(Deleted Agent)")
- [ ] Deleting agent preserves old chats (switches to Malamar agent)

### 3.6 Workspace with No Agents
- [x] Warning banner displayed persistently
- [x] Tasks immediately move to "In Review" (no agents = all skip)
- [ ] Can still chat with Malamar agent to recreate agents

---

## 4. Task Management

### 4.1 Create Task
- [x] "Create Task" button opens dialog
- [x] Summary is required
- [x] Description is optional (markdown supported)
- [ ] New task appears in "Todo" column
- [ ] Queue item created (visible via database inspection)
- [ ] Activity log: `task_created` event logged

### 4.2 Kanban Board Display
- [x] Four columns: Todo, In Progress, In Review, Done
- [x] Tasks sorted by most recently updated within each column
- [x] Empty column shows no message (not "no tasks")
- [x] Empty board (all columns) shows "No tasks yet" with CTA

### 4.3 Task Card Display
- [x] Shows summary (truncated with ellipsis if long)
- [x] Shows relative time ("5 min ago", "2 days ago")
- [ ] Shows comment count badge if > 0
- [ ] Shows priority badge if prioritized
- [x] Shows processing indicator (pulsing/spinner) when agent is working

### 4.4 Task Detail Dialog
- [ ] Opens on card click
- [ ] Three tabs: Details, Comments, Activity
- [ ] Details tab: edit summary/description, see status, take actions
- [ ] Comments tab: view all comments, add new comment
- [ ] Activity tab: timeline of events with icons

### 4.5 Update Task
- [ ] Can edit summary and description
- [ ] Can change status (with restrictions per status)
- [ ] Status change logged in activity log

### 4.6 Task Status Transitions (User Actions)
| Current Status | Available Actions |
|----------------|-------------------|
| Todo | Delete, Prioritize |
| In Progress | Delete, Cancel, Move to In Review, Prioritize |
| In Review | Delete, Move to Todo |
| Done | Delete, Move to Todo |

- [ ] Todo → In Progress: happens automatically via runner
- [ ] In Progress → In Review: user can manually trigger
- [ ] In Review → Done: only users can move to Done
- [ ] Done → Todo: reopens task for reprocessing

### 4.7 Delete Task
- [ ] Confirm dialog before deletion
- [ ] Cascade deletes: comments, logs, queue items
- [ ] If in progress, kills CLI subprocess first

### 4.8 Delete All Done Tasks
- [ ] Button in workspace settings or task view
- [ ] Requires typing workspace name to confirm
- [ ] Only deletes tasks with status "Done"
- [ ] Tasks in other statuses unaffected

### 4.9 Task Prioritization
- [ ] "Prioritize" button in task detail
- [ ] Prioritized task shows badge on card
- [ ] Prioritized tasks picked up first by runner
- [ ] "Remove Priority" toggle available
- [ ] Activity log: `task_prioritized` / `task_deprioritized` events

### 4.10 Task Cancellation
- [ ] "Cancel" button available for In Progress tasks
- [ ] Cancelling kills CLI subprocess immediately
- [ ] Task moves to "In Review" (prevents immediate re-pickup)
- [ ] System comment added: "Task cancelled by user"
- [ ] Activity log: `task_cancelled` event
- [ ] User can comment to restart processing

---

## 5. Task Processing (Multi-Agent Loop)

### 5.1 Task Pickup
- [ ] Runner polls for queued tasks (default: 1000ms interval)
- [ ] One task per workspace processed at a time
- [ ] Priority queue items picked first
- [ ] Most recently processed task prioritized (tackle until completion)
- [ ] LIFO fallback for remaining tasks

### 5.2 Agent Execution Sequence
- [ ] Agents execute in order (by `order` column)
- [ ] Each agent receives: workspace instruction, task summary, description, comments, activity log
- [ ] Agent sees list of other agents in workflow
- [ ] Activity log: `agent_started` event when agent begins
- [ ] Activity log: `agent_finished` event with action type

### 5.3 Agent Actions
| Action | Result |
|--------|--------|
| Skip | Nothing happens, pass to next agent |
| Comment | Add comment, triggers loop restart from first agent |
| Change Status (in_review) | Stop loop, move task to In Review |
| Comment + Change Status | Add comment, then move to In Review |

- [ ] Skip: agent has nothing to do, no comment added
- [ ] Comment: markdown summary added, loop restarts
- [ ] Change Status: task moves to In Review, loop stops

### 5.4 Loop Continuation
- [ ] If any agent added a comment → loop restarts from first agent
- [ ] If all agents skipped → task moves to "In Review"
- [ ] If any agent requests "In Review" → stop immediately
- [ ] Safety limit: max 100 iterations (prevents infinite loops)

### 5.5 Error Handling
- [ ] CLI exit non-zero: system comment with error
- [ ] Output file missing: system comment with error
- [ ] Output file empty: system comment with error
- [ ] JSON parse failure: system comment with error
- [ ] Schema validation failure: system comment with error
- [ ] Task does NOT move to "In Review" on error
- [ ] Error triggers retry via queue (natural retry)

### 5.6 Working Directory
- [ ] Temp Folder mode: `/tmp/malamar_task_{task_id}` created
- [ ] Static Directory mode: uses workspace path as-is
- [ ] Static mode: warning logged if directory doesn't exist
- [ ] Directory passed as `cwd` to CLI subprocess

### 5.7 Context Files
- [ ] Input file: `/tmp/malamar_task_{task_id}.md`
- [ ] Output file: `/tmp/malamar_output_{random_nanoid}.json`
- [ ] Input includes: workspace instruction, agent instruction, other agents, task details
- [ ] Comments in JSONL format inside code block
- [ ] Activity logs in JSONL format inside code block
- [ ] Output instruction specifies exact output path

---

## 6. Task Comments

### 6.1 User Comments
- [ ] Can add comment from task detail dialog
- [ ] Comment content is required (non-empty)
- [ ] User comments show "User" as author
- [ ] Adding comment to "In Review" task moves it back to "Todo"
- [ ] New queue item created on comment

### 6.2 Agent Comments
- [ ] Agent comments show agent name as author
- [ ] Markdown content rendered correctly
- [ ] Agent comments trigger loop restart

### 6.3 System Comments
- [ ] System comments show "System" as author
- [ ] Include error messages, cancellation notices
- [ ] System comments do NOT trigger agent responses

### 6.4 Comment Display
- [ ] Comments ordered by created_at (oldest first for reading flow)
- [ ] Each shows: author, content (rendered markdown), timestamp
- [ ] Deleted agent comments show "(Deleted Agent)"

---

## 7. Task Activity Log

### 7.1 Event Types
- [ ] `task_created`: logged on task creation
- [ ] `status_changed`: logged with old_status, new_status
- [ ] `comment_added`: logged when any comment added
- [ ] `agent_started`: logged with agent_name
- [ ] `agent_finished`: logged with agent_name, action_type
- [ ] `task_cancelled`: logged on user cancellation
- [ ] `task_prioritized`: logged when prioritized
- [ ] `task_deprioritized`: logged when priority removed

### 7.2 Log Display
- [ ] Logs ordered by created_at (ascending)
- [ ] Each shows: icon, description, actor, timestamp
- [ ] Actor: "User", agent name, or "System"
- [ ] Hover tooltip shows full timestamp

---

## 8. Chat Feature

### 8.1 Create Chat
- [ ] "New Chat" dropdown with agent list + Malamar option
- [ ] Can select specific agent or Malamar agent
- [ ] New chat has title "Untitled chat"
- [ ] Chat appears in sidebar list

### 8.2 List Chats
- [ ] Chats listed in sidebar
- [ ] Search by title works (`?q=` parameter)
- [ ] Most recently updated first
- [ ] Empty state: "No conversations yet" with CTA

### 8.3 Chat Messages
- [ ] User messages: right-aligned, colored background
- [ ] Agent messages: left-aligned, markdown rendered
- [ ] System messages: centered, muted style
- [ ] Each shows: author, content, timestamp
- [ ] Infinite scroll / load more pagination

### 8.4 Send Message
- [ ] Input at bottom of chat
- [ ] Send button or Ctrl/Cmd+Enter to submit
- [ ] Message appears immediately (optimistic update)
- [ ] Processing indicator shows while agent responds
- [ ] Cannot send while processing (input disabled)

### 8.5 Cancel Processing
- [ ] "Stop" button appears while processing
- [ ] Cancelling kills CLI subprocess
- [ ] System message added about cancellation
- [ ] Can resume by sending another message

### 8.6 Chat Title
- [ ] Default: "Untitled chat"
- [ ] Agent can rename on first response only
- [ ] After first response, `rename_chat` action ignored
- [ ] User can edit title anytime via UI

### 8.7 Agent Switching
- [ ] Can change agent mid-conversation
- [ ] Full history preserved
- [ ] System message: "Switched from [A] to [B]"
- [ ] New agent sees entire conversation

### 8.8 CLI Override
- [ ] Can override CLI for the chat
- [ ] Overrides agent's default CLI
- [ ] Persists for all messages in chat

### 8.9 File Attachments
- [ ] Can upload files to chat
- [ ] Files stored in `/tmp/malamar_chat_{chat_id}_attachments/`
- [ ] System message notes uploaded file path
- [ ] Duplicate filenames overwrite existing
- [ ] No file size/type restrictions

### 8.10 Chat Working Directory
- [ ] Temp Folder mode: `/tmp/malamar_chat_{chat_id}`
- [ ] Static Directory mode: workspace path
- [ ] CLI invoked with appropriate `cwd`

### 8.11 Delete Chat
- [ ] Confirm dialog before deletion
- [ ] Cascade deletes: messages, queue items
- [ ] Attachment directory left for OS cleanup

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

- [ ] Malamar agent can create agents
- [ ] Malamar agent can update agents
- [ ] Malamar agent can delete agents
- [ ] Malamar agent can reorder agents
- [ ] Malamar agent can update workspace settings
- [ ] Actions execute immediately and reflected in UI

### 9.2 Workspace Agents (No Actions)
- [ ] Workspace agents (Planner, etc.) provide advice only
- [ ] No workspace modification actions available
- [ ] Can only rename chat on first response

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
- [ ] Chat messages polled when processing active (5s interval)
- [ ] Polling stops when processing completes
- [ ] Refetch on window focus

### 10.3 Toast Notifications
- [ ] Important events trigger toast
- [ ] Duration: 5 seconds auto-dismiss
- [ ] Max 3 visible at once
- [ ] Position: bottom-right
- [ ] Clickable (navigates to item)

---

## 11. Settings

### 11.1 Global Settings Page
- [ ] CLI configuration section
- [ ] Each CLI shows: name, status, binary path, version
- [ ] Healthy = green dot, Unhealthy = red dot + error
- [ ] "Refresh" button re-runs health check

### 11.2 Workspace Settings
- [ ] Title editable
- [ ] Description editable
- [ ] Working Directory Mode: static vs temp toggle
- [ ] Static Directory Path input (with validation warning)
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
- [ ] 400 Validation errors show field-specific messages
- [ ] 404 Not found shows "Resource not found"
- [ ] 409 Conflict shows "Duplicate" error
- [ ] 500 Server errors show generic error

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
- [ ] On restart, `in_progress` queue items reset to `queued`
- [ ] Runner picks them up naturally
- [ ] Tasks stay "In Progress" status
- [ ] No data loss or duplication

### 13.2 Graceful Shutdown
- [ ] SIGTERM/SIGINT handled
- [ ] Stops accepting new queue pickups
- [ ] Kills active CLI subprocesses
- [ ] Closes SSE connections
- [ ] Closes database connection

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
- [ ] Desktop: Dialog for forms
- [ ] Mobile: Drawer for forms
- [ ] Sidebar collapses on mobile
- [ ] Kanban columns stack or scroll on mobile

### 15.2 Theme Support
- [ ] Light mode
- [ ] Dark mode
- [ ] System preference detection
- [ ] Toggle in header
- [ ] Preference persists in localStorage

### 15.3 Date/Time Formatting
| Age | Format |
|-----|--------|
| < 1 hour | "5 min ago", "just now" |
| < 24 hours | "3 hours ago" |
| < 7 days | "2 days ago" |
| ≥ 7 days (current year) | "Jan 15" |
| ≥ 7 days (past year) | "Jan 15, 2025" |

- [ ] Hover tooltip shows full timestamp
- [ ] Uses browser locale
- [ ] Local timezone

### 15.4 Loading States
- [ ] Skeleton placeholders for initial load
- [ ] Spinner on buttons during mutations
- [ ] Disabled state during processing

### 15.5 Empty States
| Context | Message |
|---------|---------|
| Workspace list | "No workspaces yet" |
| Tasks (all) | "No tasks yet" |
| Tasks (column) | (empty, no message) |
| Chats | "No conversations yet" |
| Agents | Warning banner |

### 15.6 Keyboard Shortcuts
- [ ] Ctrl/Cmd+Enter to send chat message
- [ ] Escape to close dialogs

---

## 16. Performance & Limits

### 16.1 No Pagination (v1)
- [ ] All items returned in list endpoints
- [ ] Acceptable for single-user scale

### 16.2 Comment/Log Volume
- [ ] No hard limits on comments per task
- [ ] No hard limits on activity logs per task
- [ ] UI handles reasonable volumes (tens to hundreds)

### 16.3 Agent Loop Limit
- [ ] Max 100 iterations per task processing cycle
- [ ] Prevents infinite loops
- [ ] System comment if limit reached

---

## 17. CLI Adapter Verification

### 17.1 Claude Code
- [ ] Binary detection in PATH
- [ ] Custom path via settings works
- [ ] Version detection works
- [ ] Health check prompt succeeds
- [ ] Task invocation succeeds
- [ ] Chat invocation succeeds
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
- [ ] Workspace delete cascades: agents, tasks, comments, logs, queues, chats, messages
- [ ] Task delete cascades: comments, logs, queue items
- [ ] Chat delete cascades: messages, queue items
- [ ] Agent delete: preserves references in comments/chats

### 18.2 Foreign Key Integrity
- [ ] Cannot create agent without valid workspace_id
- [ ] Cannot create task without valid workspace_id
- [ ] Cannot create chat without valid workspace_id
- [ ] Cannot create comment without valid task_id

### 18.3 Unique Constraints
- [ ] Agent name unique within workspace
- [ ] Agent order unique within workspace (handled by reorder logic)

---

## 19. Security Considerations

### 19.1 Input Validation
- [ ] All API inputs validated via Zod
- [ ] Maximum lengths enforced where appropriate
- [ ] No SQL injection (parameterized queries via Bun SQLite)

### 19.2 File Paths
- [ ] Working directory paths validated (exist check)
- [ ] Temp files created in designated directories
- [ ] No path traversal vulnerabilities

### 19.3 CLI Invocation
- [ ] Environment variables properly handled
- [ ] No shell injection (direct subprocess spawn)

---

## 20. Browser Compatibility

### 20.1 Modern Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 20.2 Features Used
- [ ] CSS Grid
- [ ] CSS Flexbox
- [ ] CSS Variables
- [ ] EventSource (SSE)
- [ ] Fetch API
- [ ] localStorage

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
