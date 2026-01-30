import { useEffect } from "react";

/**
 * Custom hook to set the document title.
 * Format: "{title} | Malamar" or just "Malamar" if no title provided.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Malamar`;
    } else {
      document.title = "Malamar";
    }
  }, [title]);
}
