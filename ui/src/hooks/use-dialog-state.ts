import { useCallback, useState } from "react";

/**
 * Hook for managing dialog open/close state.
 * Provides a consistent pattern for controlling dialog visibility.
 *
 * @param initialState - Initial open state (default: false)
 * @returns Object with open state and control functions
 *
 * @example
 * const { isOpen, open, close, setOpen } = useDialogState();
 *
 * <Button onClick={open}>Open Dialog</Button>
 * <Dialog open={isOpen} onOpenChange={setOpen}>
 *   ...
 * </Dialog>
 */
export function useDialogState(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen: setIsOpen,
  };
}
