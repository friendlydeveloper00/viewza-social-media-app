import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostWithDetails, useToggleLike } from "@/hooks/use-posts";
import { CommentsSheet } from "./CommentsSheet";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function PostCard({ post }: { post: PostWithDetails }) {
  const [showComments, setShowComments] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const toggleLike = useToggleLike();

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, isLiked: post.is_liked });
  };

  const handleDoubleTap = () => {
    if (!post.is_liked) {
      toggleLike.mutate({ postId: post.id, isLiked: false });
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const displayName = post.profile.display_name || post.profile.username || "User";

  return (
    <div className="border-b border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-primary/30">
            <AvatarImage src={post.profile.avatar_url || ""} />
            <AvatarFallback className="bg-secondary text-xs">{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{displayName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Media */}
      {post.media.length > 0 && (
        <div className="relative aspect-square bg-secondary" onDoubleClick={handleDoubleTap}>
          {post.media[currentMediaIndex]?.media_type === "video" ? (
            <video
              src={post.media[currentMediaIndex].media_url}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          ) : (
            <img
              src={post.media[currentMediaIndex]?.media_url}
              alt="Post"
              className="w-full h-full object-cover"
            />
          )}

          {/* Multi-media dots */}
          {post.media.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentMediaIndex(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === currentMediaIndex ? "bg-primary" : "bg-foreground/40"
                  )}
                />
              ))}
            </div>
          )}

          {/* Double-tap heart */}
          <AnimatePresence>
            {showHeart && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="h-20 w-20 text-primary fill-primary drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="transition-transform active:scale-125">
            <Heart className={cn("h-6 w-6", post.is_liked ? "text-primary fill-primary" : "text-foreground")} />
          </button>
          <button onClick={() => setShowComments(true)}>
            <MessageCircle className="h-6 w-6 text-foreground" />
          </button>
          <button>
            <Share2 className="h-6 w-6 text-foreground" />
          </button>
        </div>

        {/* Likes count */}
        {post.likes_count > 0 && (
          <p className="text-sm font-semibold mt-2">{post.likes_count} {post.likes_count === 1 ? "like" : "likes"}</p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm mt-1">
            <span className="font-semibold mr-1.5">{displayName}</span>
            <CaptionText text={post.caption} />
          </p>
        )}

        {/* Comments preview */}
        {post.comments_count > 0 && (
          <button onClick={() => setShowComments(true)} className="text-sm text-muted-foreground mt-1">
            View all {post.comments_count} comments
          </button>
        )}

        <p className="text-[10px] text-muted-foreground mt-1 mb-3 uppercase tracking-wide">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>
      </div>

      <CommentsSheet postId={post.id} open={showComments} onOpenChange={setShowComments} />
    </div>
  );
}

function CaptionText({ text }: { text: string }) {
  const parts = text.split(/(#\w+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="text-primary font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
