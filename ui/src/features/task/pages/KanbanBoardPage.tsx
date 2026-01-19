import { Outlet } from 'react-router-dom';

export function KanbanBoardPage() {
  return (
    <div className="container px-4 py-6">
      <h2 className="text-xl font-semibold mb-4">Tasks</h2>
      <p className="text-muted-foreground">Kanban board coming soon...</p>
      <Outlet />
    </div>
  );
}
