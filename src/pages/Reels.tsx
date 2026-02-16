import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReels, ReelWithDetails } from "@/hooks/use-reels";
import { useToggleLike } from "@/hooks/use-posts";
import { CommentsSheet } from "@/components/post/CommentsSheet";
import { cn } from "@/lib/utils";

export default function Reels() {
  const { data: reels, isLoading } = useReels();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setCurrentIndex(idx);
  }, []);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-80px)] md:h-screen flex items-center justify-center">
        <div className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reels || reels.length === 0) {
    return (
      <div className="h-[calc(100vh-80px)] md:h-screen flex flex-col items-center justify-center px-4 text-center">
        <Play className="h-16 w-16 text-primary mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">No Reels Yet</h2>
        <p className="text-muted-foreground">Upload a video post to see it here!</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-80px)] md:h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {reels.map((reel, i) => (
        <ReelItem key={reel.id} reel={reel} isActive={i === currentIndex} />
      ))}
    </div>
  );
}

function ReelItem({ reel, isActive }: { reel: ReelWithDetails; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const toggleLike = useToggleLike();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
    }
  }, [isActive]);

  const handleTap = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const handleDoubleTap = () => {
    if (!reel.is_liked) {
      toggleLike.mutate({ postId: reel.post_id, isLiked: false });
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleLike = () => {
    toggleLike.mutate({ postId: reel.post_id, isLiked: reel.is_liked });
  };

  const displayName = reel.profile.display_name || reel.profile.username || "User";
  let lastTap = 0;

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      handleDoubleTap();
    } else {
      setTimeout(() => {
        if (Date.now() - lastTap >= 300) handleTap();
      }, 300);
    }
    lastTap = now;
  };

  return (
    <div className="h-[calc(100vh-80px)] md:h-screen snap-start relative bg-background overflow-hidden">
      <video
        ref={videoRef}
        src={reel.media_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        onClick={onTap}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30 pointer-events-none" />

      {/* Pause indicator */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-background/40 backdrop-blur-sm rounded-full p-5">
              <Play className="h-10 w-10 text-foreground fill-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="h-24 w-24 text-primary fill-primary drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-28 md:bottom-20 flex flex-col items-center gap-5 z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 active:scale-110 transition-transform">
          <Heart className={cn("h-7 w-7", reel.is_liked ? "text-primary fill-primary" : "text-foreground drop-shadow")} />
          <span className="text-xs font-semibold drop-shadow">{reel.likes_count}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-7 w-7 text-foreground drop-shadow" />
          <span className="text-xs font-semibold drop-shadow">{reel.comments_count}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <Share2 className="h-7 w-7 text-foreground drop-shadow" />
        </button>

        <button onClick={() => setMuted(!muted)} className="mt-2">
          {muted ? (
            <VolumeX className="h-6 w-6 text-foreground drop-shadow" />
          ) : (
            <Volume2 className="h-6 w-6 text-foreground drop-shadow" />
          )}
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-16 bottom-8 md:bottom-6 z-10">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-9 w-9 ring-2 ring-primary/50">
            <AvatarImage src={reel.profile.avatar_url || ""} />
            <AvatarFallback className="bg-secondary text-xs">{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm drop-shadow">{displayName}</span>
        </div>
        {reel.caption && (
          <p className="text-sm drop-shadow line-clamp-2">
            <CaptionText text={reel.caption} />
          </p>
        )}
      </div>

      <CommentsSheet postId={reel.post_id} open={showComments} onOpenChange={setShowComments} />
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
