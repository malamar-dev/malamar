import { CheckIcon, LoaderIcon, PencilIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

interface EditableChatTitleProps {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  isSaving?: boolean;
  className?: string;
}

/**
 * An inline-editable chat title component.
 * Shows the title with a pencil icon, and switches to an input on click.
 */
export const EditableChatTitle = ({
  title,
  onSave,
  isSaving,
  className,
}: EditableChatTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  // Focus input when entering edit mode
  const inputRefCallback = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && isEditing) {
        node.focus();
        node.select();
      }
    },
    [isEditing],
  );

  const handleStartEdit = useCallback(() => {
    setEditValue(title);
    setIsEditing(true);
  }, [title]);

  const handleCancel = useCallback(() => {
    setEditValue(title);
    setIsEditing(false);
  }, [title]);

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === title) {
      handleCancel();
      return;
    }

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch {
      // Keep editing on error
    }
  }, [editValue, title, onSave, handleCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          ref={inputRefCallback}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className="h-7 w-48 text-sm"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <LoaderIcon className="h-3 w-3 animate-spin" />
          ) : (
            <CheckIcon className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <XIcon className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className={cn(
        "text-foreground group inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-blue-500",
        className,
      )}
    >
      <span>{title}</span>
      <PencilIcon className="text-muted-foreground h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
};
