import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useFeedPosts } from "@/hooks/use-posts";
import { PostCard } from "@/components/post/PostCard";
import StoriesBar from "@/components/stories/StoriesBar";

export default function Index() {
  const { data: posts, isLoading } = useFeedPosts();

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-glow">Viewza</span>
        </div>
      </div>

      {/* Stories */}
      <div className="border-b border-border/50">
        <StoriesBar />
      </div>

      {isLoading ? (
        <div className="space-y-6 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
              <Skeleton className="aspect-square w-full rounded-lg" />
              <div className="flex items-center gap-4 px-1">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
              </div>
              <div className="space-y-1.5 px-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 px-4">
          <Flame className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold mb-2">Your Feed</h2>
          <p className="text-muted-foreground">No posts yet. Create your first post or follow people to see their content!</p>
        </motion.div>
      )}
    </div>
  );
}
