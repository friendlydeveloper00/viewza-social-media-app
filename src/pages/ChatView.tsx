import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMessages, useSendMessage, useMarkMessagesRead, useTypingIndicator } from "@/hooks/use-messages";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday " + format(d, "h:mm a");
  return format(d, "MMM d, h:mm a");
}

export default function ChatView() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages(conversationId || null);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();
  const { othersTyping, setTyping } = useTypingIndicator(conversationId || null);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get other participant info
  const { data: otherUser } = useQuery({
    queryKey: ["chat-other-user", conversationId],
    queryFn: async () => {
      if (!conversationId || !user) return null;
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);

      if (!participants?.length) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("user_id", participants[0].user_id)
        .single();

      return profile;
    },
    enabled: !!conversationId && !!user,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, othersTyping]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const hasUnread = messages.some((m) => m.sender_id !== user?.id && !m.read_at);
      if (hasUnread) {
        markRead(conversationId);
      }
    }
  }, [conversationId, messages, user?.id, markRead]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleSend = () => {
    if (!text.trim() || !conversationId) return;
    setTyping(false);
    sendMessage.mutate({ conversationId, content: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find the last own message that was read by the other user
  const lastReadMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id && messages[i].read_at) {
        return messages[i].id;
      }
    }
    return null;
  })();

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[100dvh] md:h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {otherUser && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={otherUser.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-xs">
                  {(otherUser.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">{otherUser.display_name || otherUser.username}</span>
                {othersTyping.length > 0 && (
                  <span className="text-[11px] text-primary animate-pulse">typing...</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.sender_id === user?.id;
            const showAvatar = !isOwn && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
            const isLastOwnInGroup = isOwn && (i === messages.length - 1 || messages[i + 1].sender_id !== user?.id);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
              >
                {!isOwn && (
                  <div className="w-7 flex-shrink-0">
                    {showAvatar && (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={msg.sender_profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-[10px]">
                          {(msg.sender_profile.username || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                <div className="flex flex-col items-end gap-0.5">
                  <div
                    className={cn(
                      "max-w-[75%] px-3 py-2 rounded-2xl",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <div className={cn("flex items-center gap-1 justify-end mt-0.5")}>
                      <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isOwn && (
                        msg.read_at ? (
                          <CheckCheck className="h-3 w-3 text-primary-foreground/80" />
                        ) : (
                          <Check className="h-3 w-3 text-primary-foreground/50" />
                        )
                      )}
                    </div>
                  </div>
                  {/* Read receipt label on last read own message */}
                  {isOwn && isLastOwnInGroup && msg.id === lastReadMessageId && (
                    <span className="text-[10px] text-muted-foreground mr-1">Read</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {othersTyping.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 justify-start"
          >
            <div className="w-7 flex-shrink-0" />
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 px-4 py-3 bg-background/80 backdrop-blur-md pb-safe">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTyping(false)}
            placeholder="Message..."
            className="flex-1 bg-secondary border-border/50 rounded-full"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="rounded-full h-10 w-10 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
