import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface ChatSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ChatSearchInput({
  value,
  onChange,
  placeholder = "Search chats...",
}: ChatSearchInputProps) {
  return (
    <div className="relative">
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9 pl-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => onChange("")}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
