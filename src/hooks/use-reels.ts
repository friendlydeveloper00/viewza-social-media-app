import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ReelWithDetails {
  id: string;
  post_id: string;
  media_url: string;
  caption: string | null;
  user_id: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export function useReels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reels", user?.id],
    queryFn: async () => {
      // Get video media with their posts
      const { data: media, error } = await supabase
        .from("post_media")
        .select("id, post_id, media_url")
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!media?.length) return [];

      const postIds = [...new Set(media.map((m) => m.post_id))];

      const [postsRes, likesRes, commentsRes, userLikesRes] = await Promise.all([
        supabase.from("posts").select("id, user_id, caption").in("id", postIds),
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
        user
          ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
          : Promise.resolve({ data: [] }),
      ]);

      const postMap = new Map(postsRes.data?.map((p) => [p.id, p]));
      const userIds = [...new Set(postsRes.data?.map((p) => p.user_id) || [])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      const likesCount = new Map<string, number>();
      likesRes.data?.forEach((l) => likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1));

      const commentsCount = new Map<string, number>();
      commentsRes.data?.forEach((c) => commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1));

      const userLikedSet = new Set(userLikesRes.data?.map((l) => l.post_id));

      return media.map((m): ReelWithDetails => {
        const post = postMap.get(m.post_id);
        return {
          id: m.id,
          post_id: m.post_id,
          media_url: m.media_url,
          caption: post?.caption || null,
          user_id: post?.user_id || "",
          profile: profileMap.get(post?.user_id || "") || { username: null, display_name: null, avatar_url: null },
          likes_count: likesCount.get(m.post_id) || 0,
          comments_count: commentsCount.get(m.post_id) || 0,
          is_liked: userLikedSet.has(m.post_id),
        };
      });
    },
    enabled: !!user,
  });
}
