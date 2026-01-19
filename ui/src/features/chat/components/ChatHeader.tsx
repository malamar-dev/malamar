import { ArrowLeft, MoreHorizontal, Square, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useCancelChat, useDeleteChat } from '../hooks/use-chats';
import type { Chat } from '../types/chat.types';

interface ChatHeaderProps {
  chat: Chat;
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const deleteChat = useDeleteChat(workspaceId!);
  const cancelChat = useCancelChat();

  const handleDelete = async () => {
    try {
      await deleteChat.mutateAsync(chat.id);
      toast.success('Chat deleted');
      navigate(`/workspaces/${workspaceId}/chats`);
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelChat.mutateAsync(chat.id);
      toast.success('Chat cancelled');
      setIsCancelDialogOpen(false);
    } catch {
      toast.error('Failed to cancel chat');
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/workspaces/${workspaceId}/chats`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{chat.title}</h2>
          <p className="text-sm text-muted-foreground">{chat.agent_name || 'Malamar'}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {chat.is_processing && (
              <>
                <DropdownMenuItem onClick={() => setIsCancelDialogOpen(true)}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={deleteChat.isPending}
      />

      <ConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Stop Processing"
        description="Are you sure you want to stop the agent? This will cancel the current response."
        confirmLabel="Stop"
        onConfirm={handleCancel}
        variant="destructive"
        isLoading={cancelChat.isPending}
      />
    </>
  );
}
