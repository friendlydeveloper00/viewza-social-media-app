import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StoryGroup } from "@/hooks/use-stories";
import { useMarkStoryViewed } from "@/hooks/use-stories";
import { formatDistanceToNow } from "date-fns";

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const markViewed = useMarkStoryViewed();

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.is_viewed) {
      markViewed.mutate(currentStory.id);
    }
  }, [currentStory?.id]);

  const goNext = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
    setProgress(0);
    elapsedRef.current = 0;
  }, [storyIndex, groupIndex, currentGroup, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    }
    setProgress(0);
    elapsedRef.current = 0;
  }, [storyIndex, groupIndex, groups]);

  // Timer for auto-advance
  useEffect(() => {
    if (paused) return;

    startTimeRef.current = Date.now();
    const remaining = STORY_DURATION - elapsedRef.current;

    const animate = () => {
      const now = Date.now();
      const totalElapsed = elapsedRef.current + (now - startTimeRef.current);
      const pct = Math.min((totalElapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        goNext();
      } else {
        timerRef.current = requestAnimationFrame(animate);
      }
    };

    timerRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(timerRef.current);
  }, [groupIndex, storyIndex, paused, goNext]);

  const handlePause = () => {
    elapsedRef.current += Date.now() - startTimeRef.current;
    setPaused(true);
  };

  const handleResume = () => {
    setPaused(false);
  };

  // Tap zones
  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else if (x > (rect.width * 2) / 3) {
      goNext();
    }
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!currentStory) return null;

  const isVideo = currentStory.media_type === "video";
  const profile = currentGroup.profile;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
    >
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white/80 hover:text-white">
        <X className="h-7 w-7" />
      </button>

      {/* Nav arrows (desktop) */}
      {groupIndex > 0 && (
        <button onClick={goPrev} className="hidden md:flex absolute left-4 z-50 text-white/60 hover:text-white">
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {groupIndex < groups.length - 1 && (
        <button onClick={goNext} className="hidden md:flex absolute right-16 z-50 text-white/60 hover:text-white">
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Story container */}
      <div
        className="relative w-full max-w-md h-full max-h-[100dvh] md:max-h-[90vh] md:rounded-xl overflow-hidden"
        onClick={handleTap}
        onMouseDown={handlePause}
        onMouseUp={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-40 flex gap-1 p-2 pt-3">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute top-6 left-0 right-0 z-40 flex items-center gap-3 px-4 py-2">
          <Avatar className="h-8 w-8 ring-2 ring-white/50">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-secondary">
              {(profile.username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-sm font-semibold">{profile.username || "user"}</span>
          <span className="text-white/50 text-xs">
            {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
          </span>
          {isVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
              className="ml-auto text-white/80"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Media */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black"
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted={muted}
                playsInline
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt=""
                className="w-full h-full object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-8 left-0 right-0 z-40 px-6 text-center">
            <p className="text-white text-sm bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
              {currentStory.caption}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
