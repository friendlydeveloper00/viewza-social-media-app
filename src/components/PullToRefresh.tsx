import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const y = useMotionValue(0);

  const indicatorOpacity = useTransform(y, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, THRESHOLD], [0.5, 1]);
  const spinnerRotate = useTransform(y, [0, THRESHOLD], [0, 180]);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return false;
    // Check if the scrollable parent is at the top
    let parent: HTMLElement | null = el;
    while (parent) {
      if (parent.scrollTop > 0) return false;
      parent = parent.parentElement;
    }
    return true;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      if (isAtTop()) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    },
    [refreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        y.set(0);
        return;
      }
      // Dampen the pull
      const dampened = Math.min(delta * 0.45, MAX_PULL);
      y.set(dampened);
    },
    [refreshing, y]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (y.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(y, THRESHOLD * 0.6, { duration: 0.2 });
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    } else {
      animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  }, [onRefresh, refreshing, y]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        style={{ opacity: indicatorOpacity, scale: indicatorScale }}
        className="absolute left-1/2 -translate-x-1/2 top-0 z-20 flex items-center justify-center"
      >
        <motion.div
          style={{ rotate: refreshing ? undefined : spinnerRotate }}
          animate={refreshing ? { rotate: 360 } : {}}
          transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: "linear" } : {}}
          className="h-8 w-8 rounded-full bg-card border border-border/50 shadow-lg flex items-center justify-center"
        >
          <Loader2 className="h-4 w-4 text-primary" />
        </motion.div>
      </motion.div>

      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
