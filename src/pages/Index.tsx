import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export default function Index() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <Flame className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
        <h1 className="text-3xl font-bold mb-2 text-glow">Your Feed</h1>
        <p className="text-muted-foreground">
          Follow people to see their posts here. Coming in Phase 2!
        </p>
      </motion.div>
    </div>
  );
}
