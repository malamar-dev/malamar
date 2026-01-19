import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <h1 className="text-2xl font-bold p-4">Malamar</h1>
        <p className="p-4 text-muted-foreground">App is loading...</p>
      </div>
    </QueryClientProvider>
  );
}

export default App;
