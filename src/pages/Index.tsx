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
          <span className="text-lg font-bold tracking-tight text-glow">VIEWZA</span>
        </div>
      </div>

      {/* Stories */}
      <div className="border-b border-border/50">
        <StoriesBar />
      </div>

      {isLoading ? (
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary animate-pulse" />
                <div className="h-3 w-24 bg-secondary animate-pulse rounded" />
              </div>
              <div className="aspect-square bg-secondary animate-pulse rounded" />
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
