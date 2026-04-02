import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Search, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PullToRefresh from "@/components/PullToRefresh";
import { useState } from "react";

export default function Explore() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["explore-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_media")
        .select("id, media_url, media_type, post_id")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["explore-posts"] });
  }, [queryClient]);

  return (
    <div className="max-w-2xl mx-auto px-2 py-4">
      <div className="px-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-none" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-0.5"
          >
            {posts?.map((media) => (
              <div key={media.id} className="relative aspect-square group cursor-pointer">
                {media.media_type === "video" ? (
                  <>
                    <video src={media.media_url} className="w-full h-full object-cover" muted />
                    <Film className="absolute top-2 right-2 h-4 w-4 text-foreground drop-shadow" />
                  </>
                ) : (
                  <img src={media.media_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-colors" />
              </div>
            ))}
          </motion.div>
        )}

        {!isLoading && (!posts || posts.length === 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 px-4">
            <Search className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Nothing to Explore Yet</h2>
            <p className="text-muted-foreground text-sm">Be the first to create a post and it'll show up here!</p>
          </motion.div>
        )}
      </PullToRefresh>
    </div>
  );
}
