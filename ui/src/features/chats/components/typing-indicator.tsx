import { cn } from "@/lib/utils.ts";

interface TypingIndicatorProps {
  className?: string;
}

export const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span
            className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};
