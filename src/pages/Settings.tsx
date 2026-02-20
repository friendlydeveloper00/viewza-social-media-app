import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Trash2, Grid3X3, Film, Clock, AlertTriangle, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PostItem {
  id: string;
  caption: string | null;
  created_at: string;
  thumbnail_url: string | null;
  thumbnail_type: string | null;
}

interface StoryItem {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

function useUserPosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings-posts", user?.id],
    queryFn: async (): Promise<PostItem[]> => {
      if (!user) return [];
      const { data: posts } = await supabase
        .from("posts")
        .select("id, caption, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!posts?.length) return [];

      const postIds = posts.map((p) => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("post_id, media_url, media_type, sort_order")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true });

      const mediaMap = new Map<string, { media_url: string; media_type: string }>();
      media?.forEach((m) => {
        if (!mediaMap.has(m.post_id)) mediaMap.set(m.post_id, m);
      });

      return posts.map((p) => ({
        id: p.id,
        caption: p.caption,
        created_at: p.created_at,
        thumbnail_url: mediaMap.get(p.id)?.media_url || null,
        thumbnail_type: mediaMap.get(p.id)?.media_type || null,
      }));
    },
    enabled: !!user,
  });
}

function useUserReels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings-reels", user?.id],
    queryFn: async (): Promise<(PostItem & { media_id: string })[]> => {
      if (!user) return [];
      const { data: posts } = await supabase
        .from("posts")
        .select("id, caption, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!posts?.length) return [];

      const postIds = posts.map((p) => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("id, post_id, media_url, media_type")
        .in("post_id", postIds)
        .eq("media_type", "video");

      if (!media?.length) return [];

      const postMap = new Map(posts.map((p) => [p.id, p]));
      return media.map((m) => {
        const post = postMap.get(m.post_id)!;
        return {
          id: post.id,
          media_id: m.id,
          caption: post.caption,
          created_at: post.created_at,
          thumbnail_url: m.media_url,
          thumbnail_type: m.media_type,
        };
      });
    },
    enabled: !!user,
  });
}

function useUserStories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings-stories", user?.id],
    queryFn: async (): Promise<StoryItem[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("stories")
        .select("id, media_url, media_type, caption, created_at, expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });
}

function useDeletePosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postIds: string[]) => {
      // Delete related data first
      await supabase.from("comments").delete().in("post_id", postIds);
      await supabase.from("likes").delete().in("post_id", postIds);
      await supabase.from("post_hashtags").delete().in("post_id", postIds);
      await supabase.from("post_media").delete().in("post_id", postIds);
      const { error } = await supabase.from("posts").delete().in("id", postIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-posts"] });
      queryClient.invalidateQueries({ queryKey: ["settings-reels"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts-grid"] });
      queryClient.invalidateQueries({ queryKey: ["posts-count"] });
      toast({ title: "Deleted", description: "Selected posts have been deleted." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

function useDeleteStories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyIds: string[]) => {
      await supabase.from("story_views").delete().in("story_id", storyIds);
      const { error } = await supabase.from("stories").delete().in("id", storyIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-stories"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({ title: "Deleted", description: "Selected stories have been deleted." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

function ContentGrid({
  items,
  selected,
  onToggle,
  type,
}: {
  items: { id: string; thumbnail_url?: string | null; thumbnail_type?: string | null; media_url?: string; media_type?: string; caption: string | null; created_at: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  type: "post" | "reel" | "story";
}) {
  if (!items.length) {
    const Icon = type === "post" ? Grid3X3 : type === "reel" ? Film : Clock;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Icon className="h-12 w-12 mb-3 opacity-30" />
        <p>No {type}s yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map((item) => {
        const isSelected = selected.has(item.id);
        const imgSrc = type === "story" ? item.media_url : item.thumbnail_url;
        const mediaType = type === "story" ? item.media_type : item.thumbnail_type;

        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
              isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
            )}
          >
            {imgSrc ? (
              mediaType === "video" ? (
                <video src={imgSrc} className="w-full h-full object-cover" muted />
              ) : (
                <img src={imgSrc} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Grid3X3 className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute top-1.5 right-1.5">
              <Checkbox checked={isSelected} className="border-white/70 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            </div>
            {isSelected && <div className="absolute inset-0 bg-primary/20" />}
          </button>
        );
      })}
    </div>
  );
}

function PushNotificationCard() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast({ title: "Push notifications disabled" });
    } else {
      const ok = await subscribe();
      if (ok) {
        toast({ title: "Push notifications enabled!", description: "You'll now receive alerts even when the app is in the background." });
      } else if (permission === "denied") {
        toast({ title: "Permission denied", description: "Please enable notifications in your browser settings.", variant: "destructive" });
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {isSubscribed ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            Push Notifications
          </CardTitle>
          <CardDescription>
            {isSubscribed
              ? "You'll receive alerts even when the app is closed"
              : "Get notified about likes, comments, and follows"}
          </CardDescription>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? "..." : isSubscribed ? "Disable" : "Enable"}
        </Button>
      </CardHeader>
    </Card>
  );
}

export default function Settings() {
  const { data: posts = [], isLoading: postsLoading } = useUserPosts();
  const { data: reels = [], isLoading: reelsLoading } = useUserReels();
  const { data: stories = [], isLoading: storiesLoading } = useUserStories();

  const deletePosts = useDeletePosts();
  const deleteStories = useDeleteStories();

  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectedReels, setSelectedReels] = useState<Set<string>>(new Set());
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"posts" | "reels" | "stories" | null>(null);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget === "posts") {
      deletePosts.mutate([...selectedPosts], { onSuccess: () => setSelectedPosts(new Set()) });
    } else if (deleteTarget === "reels") {
      deletePosts.mutate([...selectedReels], { onSuccess: () => setSelectedReels(new Set()) });
    } else if (deleteTarget === "stories") {
      deleteStories.mutate([...selectedStories], { onSuccess: () => setSelectedStories(new Set()) });
    }
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  const openDelete = (target: "posts" | "reels" | "stories") => {
    setDeleteTarget(target);
    setConfirmOpen(true);
  };

  const selectionCount = (target: "posts" | "reels" | "stories") =>
    target === "posts" ? selectedPosts.size : target === "reels" ? selectedReels.size : selectedStories.size;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm mb-6">Manage your content & notifications</p>

        <PushNotificationCard />

        <div className="mt-6" />

        <Tabs defaultValue="posts">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1 gap-1.5">
              <Grid3X3 className="h-4 w-4" /> Posts ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="reels" className="flex-1 gap-1.5">
              <Film className="h-4 w-4" /> Reels ({reels.length})
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex-1 gap-1.5">
              <Clock className="h-4 w-4" /> Stories ({stories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Your Posts</CardTitle>
                  <CardDescription>Select posts to delete</CardDescription>
                </div>
                <div className="flex gap-2">
                  {posts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedPosts(selectedPosts.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)))
                      }
                    >
                      {selectedPosts.size === posts.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedPosts.size === 0 || deletePosts.isPending}
                    onClick={() => openDelete("posts")}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete ({selectedPosts.size})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="py-12 text-center text-muted-foreground animate-pulse">Loading...</div>
                ) : (
                  <ContentGrid
                    items={posts}
                    selected={selectedPosts}
                    onToggle={(id) => toggle(selectedPosts, setSelectedPosts, id)}
                    type="post"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reels">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Your Reels</CardTitle>
                  <CardDescription>Select reels to delete</CardDescription>
                </div>
                <div className="flex gap-2">
                  {reels.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedReels(selectedReels.size === reels.length ? new Set() : new Set(reels.map((r) => r.id)))
                      }
                    >
                      {selectedReels.size === reels.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedReels.size === 0 || deletePosts.isPending}
                    onClick={() => openDelete("reels")}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete ({selectedReels.size})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reelsLoading ? (
                  <div className="py-12 text-center text-muted-foreground animate-pulse">Loading...</div>
                ) : (
                  <ContentGrid
                    items={reels}
                    selected={selectedReels}
                    onToggle={(id) => toggle(selectedReels, setSelectedReels, id)}
                    type="reel"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Your Stories</CardTitle>
                  <CardDescription>Select stories to delete</CardDescription>
                </div>
                <div className="flex gap-2">
                  {stories.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedStories(
                          selectedStories.size === stories.length ? new Set() : new Set(stories.map((s) => s.id))
                        )
                      }
                    >
                      {selectedStories.size === stories.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedStories.size === 0 || deleteStories.isPending}
                    onClick={() => openDelete("stories")}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete ({selectedStories.size})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {storiesLoading ? (
                  <div className="py-12 text-center text-muted-foreground animate-pulse">Loading...</div>
                ) : (
                  <ContentGrid
                    items={stories}
                    selected={selectedStories}
                    onToggle={(id) => toggle(selectedStories, setSelectedStories, id)}
                    type="story"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {deleteTarget}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectionCount(deleteTarget!)} selected {deleteTarget}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
