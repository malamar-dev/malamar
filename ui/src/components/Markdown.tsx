import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          // Custom styling for elements
          a: ({ ...props }) => (
            <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre className="rounded-lg bg-muted p-4 overflow-x-auto" {...props}>
              {children}
            </pre>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse border border-border" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border bg-muted px-3 py-2 text-left font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-3 py-2" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
