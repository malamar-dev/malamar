import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export function LoadMoreButton({
  onClick,
  isLoading,
  hasMore,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" onClick={onClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="animate-spin" />
            Loading...
          </>
        ) : (
          "Load more"
        )}
      </Button>
    </div>
  );
}
