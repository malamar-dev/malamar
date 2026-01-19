import { Home, Settings } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link to="/" className="font-bold text-lg">
            Malamar
          </Link>
          <div className="flex items-center gap-2">
            {/* Theme toggle will be added later */}
            <Button variant="ghost" size="icon" asChild className="hidden md:flex">
              <Link to="/settings">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link
            to="/"
            className={cn(
              'flex flex-col items-center gap-1 p-2 text-sm',
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>
          <Link
            to="/settings"
            className={cn(
              'flex flex-col items-center gap-1 p-2 text-sm',
              location.pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
