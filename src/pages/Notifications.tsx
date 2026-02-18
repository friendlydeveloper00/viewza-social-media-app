import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, MessageCircle, UserPlus, MessageSquare, Bell } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNotifications, useMarkNotificationsRead, NotificationWithActor } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: typeof Heart; label: string; color: string }> = {
  like: { icon: Heart, label: "liked your post", color: "text-red-500" },
  comment: { icon: MessageSquare, label: "commented on your post", color: "text-blue-500" },
  follow: { icon: UserPlus, label: "started following you", color: "text-emerald-500" },
  message: { icon: MessageCircle, label: "sent you a message", color: "text-primary" },
};

function NotificationItem({ notification }: { notification: NotificationWithActor }) {
  const navigate = useNavigate();
  const config = typeConfig[notification.type] || { icon: Bell, label: "notification", color: "text-muted-foreground" };
  const Icon = config.icon;
  const actorName = notification.actor.display_name || notification.actor.username || "Someone";

  const handleClick = () => {
    if (notification.type === "like" || notification.type === "comment") {
      // Navigate to home for now (could navigate to specific post)
      navigate("/");
    } else if (notification.type === "follow") {
      navigate(`/profile/${notification.actor_id}`);
    } else if (notification.type === "message" && notification.conversation_id) {
      navigate(`/messages/${notification.conversation_id}`);
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
        !notification.read_at && "bg-primary/5"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={notification.actor.avatar_url || undefined} />
          <AvatarFallback className="bg-secondary text-xs">
            {actorName[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn("absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 bg-background")}>
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{actorName}</span>{" "}
          <span className="text-muted-foreground">{config.label}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {!notification.read_at && (
        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </motion.button>
  );
}

export default function Notifications() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  // Mark all as read when viewing the page
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read_at);
    if (unread.length > 0) {
      markRead.mutate(undefined);
    }
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <h1 className="text-lg font-bold">Activity</h1>
      </div>

      {isLoading ? (
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-secondary animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 bg-secondary animate-pulse rounded" />
                <div className="h-2.5 w-20 bg-secondary animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 px-4">
          <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Activity Yet</h2>
          <p className="text-muted-foreground text-sm">When people interact with your content, you'll see it here.</p>
        </motion.div>
      ) : (
        <div className="divide-y divide-border/30">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
