import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface InstructionEditorModalProps {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstructionEditorModal({
  value,
  onChange,
  open,
  onOpenChange,
}: InstructionEditorModalProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalValue(value);
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    onChange(localValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Instruction</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <Textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Enter the agent instruction..."
            className="h-full min-h-0 resize-none font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
