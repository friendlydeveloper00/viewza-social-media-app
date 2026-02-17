import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useIsFollowing(targetUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-following", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) return false;
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
}

export function useToggleFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
      }
    },
    onSuccess: (_, { targetUserId }) => {
      qc.invalidateQueries({ queryKey: ["is-following"] });
      qc.invalidateQueries({ queryKey: ["follow-counts"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useFollowCounts(userId: string | null) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };
      const [followers, following] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      return { followers: followers.count || 0, following: following.count || 0 };
    },
    enabled: !!userId,
  });
}
