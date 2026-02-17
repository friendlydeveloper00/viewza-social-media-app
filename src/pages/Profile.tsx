import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Camera, Edit3, Check, X, Grid3X3, Film, UserPlus, UserCheck } from "lucide-react";
import { useIsFollowing, useToggleFollow, useFollowCounts } from "@/hooks/use-follows";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const profileUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Fetch profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["user-profile", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", profileUserId)
        .single();
      return data as Profile | null;
    },
    enabled: !!profileUserId,
  });

  // Follow state
  const { data: isFollowing = false } = useIsFollowing(isOwnProfile ? null : profileUserId || null);
  const toggleFollow = useToggleFollow();
  const { data: counts } = useFollowCounts(profileUserId || null);

  // Posts count
  const { data: postsCount = 0 } = useQuery({
    queryKey: ["posts-count", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return 0;
      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profileUserId);
      return count || 0;
    },
    enabled: !!profileUserId,
  });

  // User posts grid
  const { data: userPosts = [] } = useQuery({
    queryKey: ["user-posts-grid", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      const { data: posts } = await supabase
        .from("posts")
        .select("id, created_at")
        .eq("user_id", profileUserId)
        .order("created_at", { ascending: false });

      if (!posts?.length) return [];

      const postIds = posts.map((p) => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("post_id, media_url, media_type, sort_order")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true });

      // Get first media per post
      const mediaMap = new Map<string, { media_url: string; media_type: string }>();
      media?.forEach((m) => {
        if (!mediaMap.has(m.post_id)) mediaMap.set(m.post_id, m);
      });

      return posts.map((p) => ({
        id: p.id,
        thumbnail: mediaMap.get(p.id) || null,
      }));
    },
    enabled: !!profileUserId,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim() })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
      setEditing(false);
      refetch();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast({ title: "Avatar updated!" });
    refetch();
  };

  const handleFollowToggle = () => {
    if (!profileUserId) return;
    toggleFollow.mutate({ targetUserId: profileUserId, isFollowing });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-primary/30">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6 text-primary-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold">@{profile?.username || "unknown"}</h1>
              {isOwnProfile ? (
                !editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit3 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleSave}><Check className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3 w-3" /></Button>
                  </div>
                )
              ) : (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollowToggle}
                  disabled={toggleFollow.isPending}
                  className={cn(isFollowing && "border-primary/30")}
                >
                  {isFollowing ? (
                    <><UserCheck className="h-3 w-3 mr-1" /> Following</>
                  ) : (
                    <><UserPlus className="h-3 w-3 mr-1" /> Follow</>
                  )}
                </Button>
              )}
            </div>

            <div className="flex gap-6 text-sm mb-3">
              <div><span className="font-bold">{postsCount}</span> <span className="text-muted-foreground">posts</span></div>
              <div><span className="font-bold">{counts?.followers || 0}</span> <span className="text-muted-foreground">followers</span></div>
              <div><span className="font-bold">{counts?.following || 0}</span> <span className="text-muted-foreground">following</span></div>
            </div>

            {isOwnProfile && editing ? (
              <div className="space-y-2">
                <Input
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-secondary/50"
                  maxLength={50}
                />
                <Textarea
                  placeholder="Write a bio..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-secondary/50 resize-none"
                  rows={3}
                  maxLength={160}
                />
              </div>
            ) : (
              <div>
                <p className="font-medium">{profile?.display_name}</p>
                <p className="text-sm text-muted-foreground">{profile?.bio || "No bio yet."}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 border-primary text-primary">
            <Grid3X3 className="h-4 w-4" /> Posts
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Film className="h-4 w-4" /> Reels
          </button>
        </div>

        {/* Posts grid */}
        {userPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {userPosts.map((post) => (
              <div key={post.id} className="aspect-square bg-secondary overflow-hidden">
                {post.thumbnail ? (
                  post.thumbnail.media_type === "video" ? (
                    <video src={post.thumbnail.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.thumbnail.media_url} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Grid3X3 className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground/60">
                {isOwnProfile ? "Your posts will appear here." : "This user hasn't posted yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
