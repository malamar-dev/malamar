import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral dark:prose-invert max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-a:text-primary prose-a:underline-offset-4",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:overflow-x-auto",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
