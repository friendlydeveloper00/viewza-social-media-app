import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useComments, useAddComment } from "@/hooks/use-posts";
import { formatDistanceToNow } from "date-fns";

interface CommentsSheetProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsSheet({ postId, open, onOpenChange }: CommentsSheetProps) {
  const [text, setText] = useState("");
  const { data: comments, isLoading } = useComments(postId);
  const addComment = useAddComment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment.mutate({ postId, content: text.trim() });
    setText("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="text-center">Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4 max-h-[calc(70vh-140px)]">
          {isLoading && <p className="text-center text-muted-foreground text-sm">Loading…</p>}
          {!isLoading && comments?.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No comments yet. Be the first!</p>
          )}
          {comments?.map((c) => {
            const name = c.profile.display_name || c.profile.username || "User";
            return (
              <div key={c.id} className="flex gap-3 px-1">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={c.profile.avatar_url || ""} />
                  <AvatarFallback className="bg-secondary text-xs">{name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold mr-1.5">{name}</span>
                    {c.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-3 border-t border-border/50">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-secondary/50"
          />
          <Button type="submit" size="icon" disabled={!text.trim() || addComment.isPending} className="glow-red-sm">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
