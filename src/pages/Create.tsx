import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ImagePlus, X, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/use-posts";
import { cn } from "@/lib/utils";

export default function Create() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const navigate = useNavigate();

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 10) return;

    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [
      ...prev,
      ...selected.map((f) => ({ url: URL.createObjectURL(f), type: f.type.startsWith("video") ? "video" : "image" })),
    ]);
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i].url);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !caption.trim()) return;
    await createPost.mutateAsync({ caption, files });
    navigate("/");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-glow">New Post</h1>
          <Button
            onClick={handleSubmit}
            disabled={createPost.isPending || (files.length === 0 && !caption.trim())}
            className="glow-red-sm"
          >
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
          </Button>
        </div>

        {/* Media preview grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
              {p.type === "video" ? (
                <video src={p.url} className="w-full h-full object-cover" />
              ) : (
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-background/70 rounded-full p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {p.type === "video" && (
                <div className="absolute bottom-1 left-1">
                  <Film className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          ))}

          {files.length < 10 && (
            <button
              onClick={() => fileRef.current?.click()}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors",
                files.length === 0 && "col-span-3 aspect-video"
              )}
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-xs">Add photos/videos</span>
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />

        {/* Caption */}
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption… Use #hashtags"
          className="min-h-[120px] bg-secondary/50 resize-none border-border/50"
          maxLength={2200}
        />
        <p className="text-[10px] text-muted-foreground text-right mt-1">{caption.length}/2200</p>
      </motion.div>
    </div>
  );
}
