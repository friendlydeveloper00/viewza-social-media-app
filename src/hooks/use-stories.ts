import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export interface StoryWithDetails {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  is_viewed: boolean;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface StoryGroup {
  user_id: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  stories: StoryWithDetails[];
  has_unviewed: boolean;
}

export function useStories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async (): Promise<StoryGroup[]> => {
      const { data: stories, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!stories?.length) return [];

      const userIds = [...new Set(stories.map((s) => s.user_id))];

      const [profilesRes, viewsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", userIds),
        user
          ? supabase.from("story_views").select("story_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]));
      const viewedSet = new Set(viewsRes.data?.map((v) => v.story_id));

      const enriched: StoryWithDetails[] = stories.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        media_url: s.media_url,
        media_type: s.media_type,
        caption: s.caption,
        created_at: s.created_at,
        expires_at: s.expires_at,
        is_viewed: viewedSet.has(s.id),
        profile: profileMap.get(s.user_id) || { username: null, display_name: null, avatar_url: null },
      }));

      // Group by user, current user first
      const grouped = new Map<string, StoryGroup>();
      for (const story of enriched) {
        if (!grouped.has(story.user_id)) {
          grouped.set(story.user_id, {
            user_id: story.user_id,
            profile: story.profile,
            stories: [],
            has_unviewed: false,
          });
        }
        const group = grouped.get(story.user_id)!;
        group.stories.push(story);
        if (!story.is_viewed) group.has_unviewed = true;
      }

      const groups = Array.from(grouped.values());
      // Sort: current user first, then unviewed, then viewed
      groups.sort((a, b) => {
        if (a.user_id === user?.id) return -1;
        if (b.user_id === user?.id) return 1;
        if (a.has_unviewed && !b.has_unviewed) return -1;
        if (!a.has_unviewed && b.has_unviewed) return 1;
        return 0;
      });

      return groups;
    },
    enabled: !!user,
  });
}

export function useCreateStory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const mediaType = file.type.startsWith("video") ? "video" : "image";

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({ title: "Story posted!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to post story", description: err.message, variant: "destructive" });
    },
  });
}

export function useMarkStoryViewed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) return;
      await supabase
        .from("story_views")
        .upsert({ story_id: storyId, user_id: user.id }, { onConflict: "story_id,user_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });
}
