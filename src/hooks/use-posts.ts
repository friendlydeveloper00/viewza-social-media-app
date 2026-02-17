import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export interface PostWithDetails {
  id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  media: { id: string; media_url: string; media_type: string; sort_order: number }[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export function useFeedPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get followed user IDs
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followedIds = followsData?.map((f) => f.following_id) || [];
      // Include own posts + followed users' posts
      const feedUserIds = [user.id, ...followedIds];

      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, user_id, caption, created_at")
        .in("user_id", feedUserIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!posts?.length) return [];

      const postIds = posts.map((p) => p.id);
      const userIds = [...new Set(posts.map((p) => p.user_id))];

      const [profilesRes, mediaRes, likesRes, commentsRes, userLikesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", userIds),
        supabase.from("post_media").select("id, post_id, media_url, media_type, sort_order").in("post_id", postIds).order("sort_order"),
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
        user ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]));
      const mediaByPost = new Map<string, typeof mediaRes.data>();
      mediaRes.data?.forEach((m) => {
        const arr = mediaByPost.get(m.post_id) || [];
        arr.push(m);
        mediaByPost.set(m.post_id, arr);
      });

      const likesCount = new Map<string, number>();
      likesRes.data?.forEach((l) => likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1));

      const commentsCount = new Map<string, number>();
      commentsRes.data?.forEach((c) => commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1));

      const userLikedSet = new Set(userLikesRes.data?.map((l) => l.post_id));

      return posts.map((post): PostWithDetails => ({
        ...post,
        profile: profileMap.get(post.user_id) || { username: null, display_name: null, avatar_url: null },
        media: mediaByPost.get(post.id) || [],
        likes_count: likesCount.get(post.id) || 0,
        comments_count: commentsCount.get(post.id) || 0,
        is_liked: userLikedSet.has(post.id),
      }));
    },
    enabled: !!user,
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isLiked) {
        await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId);
      } else {
        await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!comments?.length) return [];

      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return comments.map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { username: null, display_name: null, avatar_url: null },
      }));
    },
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("comments").insert({ user_id: user.id, post_id: postId, content });
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ caption, files }: { caption: string; files: File[] }) => {
      if (!user) throw new Error("Not authenticated");

      // Extract hashtags
      const hashtagRegex = /#(\w+)/g;
      const hashtags = [...caption.matchAll(hashtagRegex)].map((m) => m[1].toLowerCase());

      // Create post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({ user_id: user.id, caption })
        .select("id")
        .single();

      if (postError) throw postError;

      // Upload media
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${post.id}/${i}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);
        const mediaType = file.type.startsWith("video") ? "video" : "image";

        await supabase.from("post_media").insert({
          post_id: post.id,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          sort_order: i,
        });
      }

      // Handle hashtags
      for (const tag of hashtags) {
        const { data: existing } = await supabase.from("hashtags").select("id").eq("name", tag).single();
        let hashtagId: string;

        if (existing) {
          hashtagId = existing.id;
        } else {
          const { data: created, error } = await supabase.from("hashtags").insert({ name: tag }).select("id").single();
          if (error) continue;
          hashtagId = created.id;
        }

        await supabase.from("post_hashtags").insert({ post_id: post.id, hashtag_id: hashtagId });
      }

      return post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post created!", description: "Your post is now live." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
