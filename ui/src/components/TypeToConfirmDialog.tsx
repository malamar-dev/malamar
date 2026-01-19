import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TypeToConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel = 'Confirm',
  onConfirm,
  variant = 'destructive',
  isLoading = false,
}: TypeToConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('');
    }
    onOpenChange(newOpen);
  };

  const isConfirmDisabled = inputValue !== confirmText || isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm-input" className="text-sm text-muted-foreground">
            Type <span className="font-mono font-semibold text-foreground">{confirmText}</span> to confirm
          </Label>
          <Input
            id="confirm-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmText}
            className="mt-2"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={isConfirmDisabled}>
            {isLoading ? 'Loading...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
