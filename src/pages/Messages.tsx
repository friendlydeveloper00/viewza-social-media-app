import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft, Search } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/use-messages";
import { useStartConversation } from "@/hooks/use-messages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: conversations = [], isLoading } = useConversations();
  const startConversation = useStartConversation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .neq("user_id", user?.id || "")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleStartChat = async (otherUserId: string) => {
    const convId = await startConversation.mutateAsync(otherUserId);
    navigate(`/messages/${convId}`);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display">Messages</h1>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-secondary border-border/50"
          />
        </div>
      </div>

      {/* Search results */}
      {searchQuery.length >= 2 && (
        <div className="px-4 pb-4">
          {searching ? (
            <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => handleStartChat(u.user_id)}
                  disabled={startConversation.isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {(u.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
          )}
        </div>
      )}

      {/* Conversations list */}
      {searchQuery.length < 2 && (
        <div>
          {isLoading ? (
            <div className="space-y-3 px-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-secondary animate-pulse rounded" />
                    <div className="h-2 w-40 bg-secondary animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/messages/${conv.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.other_user.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary">
                        {(conv.other_user.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-foreground">{conv.unread_count}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-sm font-semibold truncate", conv.unread_count > 0 && "text-foreground")}>
                        {conv.other_user.display_name || conv.other_user.username || "User"}
                      </p>
                      {conv.last_message && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className={cn("text-xs truncate", conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground")}>
                        {conv.last_message.sender_id === user?.id ? "You: " : ""}
                        {conv.last_message.is_encrypted ? "🔒 Encrypted message" : conv.last_message.content}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 px-4">
              <MessageCircle className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">No Messages Yet</h2>
              <p className="text-muted-foreground">Search for a user above to start chatting!</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
