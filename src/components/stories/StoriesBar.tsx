import { useState, useRef } from "react";
import { Plus, Camera } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useStories, useCreateStory, StoryGroup } from "@/hooks/use-stories";
import { useAuth } from "@/lib/auth";
import StoryViewer from "./StoryViewer";
import { cn } from "@/lib/utils";

export default function StoriesBar() {
  const { user } = useAuth();
  const { data: groups = [] } = useStories();
  const createStory = useCreateStory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const hasOwnStory = groups.some((g) => g.user_id === user?.id);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) createStory.mutate(file);
    e.target.value = "";
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Add story button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1 flex-shrink-0"
          disabled={createStory.isPending}
        >
          <div className="relative">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
              hasOwnStory
                ? "bg-gradient-to-tr from-primary to-orange-500 p-[2px]"
                : "border-2 border-dashed border-muted-foreground/40"
            )}>
              {hasOwnStory ? (
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <Plus className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            {!hasOwnStory && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full h-5 w-5 flex items-center justify-center">
                <Plus className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {createStory.isPending ? "..." : "Your story"}
          </span>
        </button>

        {/* Story groups */}
        {groups.map((group, i) => {
          if (group.user_id === user?.id && !hasOwnStory) return null;
          return (
            <button
              key={group.user_id}
              onClick={() => openViewer(i)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div
                className={cn(
                  "h-16 w-16 rounded-full p-[2px]",
                  group.has_unviewed
                    ? "bg-gradient-to-tr from-primary to-orange-500"
                    : "bg-muted-foreground/30"
                )}
              >
                <Avatar className="h-full w-full ring-2 ring-background">
                  <AvatarImage src={group.profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {(group.profile.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[64px] truncate">
                {group.user_id === user?.id ? "Your story" : group.profile.username || "user"}
              </span>
            </button>
          );
        })}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Viewer */}
      <AnimatePresence>
        {viewerOpen && groups.length > 0 && (
          <StoryViewer
            groups={groups}
            initialGroupIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
