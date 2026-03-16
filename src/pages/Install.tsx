import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, Apple, Flame, CheckCircle2, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Flame className="h-10 w-10 text-primary" />
          <span className="text-3xl font-bold tracking-tight text-glow font-heading">Viewza</span>
        </div>

        <AnimatePresence mode="wait">
          {isInstalled ? (
            <motion.div
              key="installed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Already Installed!</h1>
              <p className="text-muted-foreground">
                Viewza is installed on your device. Open it from your home screen.
              </p>
              <Link to="/">
                <Button className="mt-4 w-full">Open Viewza</Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="install"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Get the Viewza App</h1>
                <p className="text-muted-foreground">
                  Install Viewza on your device for a faster, app-like experience with offline support.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 gap-3 text-left">
                {[
                  { icon: Smartphone, text: "Works on any phone or tablet" },
                  { icon: Monitor, text: "Also available on desktop" },
                  { icon: Download, text: "No app store needed" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
                    <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground">{text}</span>
                  </div>
                ))}
              </div>

              {/* Install button or iOS instructions */}
              {deferredPrompt ? (
                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  size="lg"
                  className="w-full text-base gap-2"
                >
                  <Download className="h-5 w-5" />
                  {installing ? "Installing..." : "Install Viewza"}
                </Button>
              ) : isIOS ? (
                <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 text-left">
                  <div className="flex items-center gap-2">
                    <Apple className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground text-sm">Install on iPhone / iPad</span>
                  </div>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span>Tap the <Share className="inline h-4 w-4 -mt-0.5" /> Share button in Safari</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <span>Tap <strong className="text-foreground">"Add"</strong> to install</span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 text-left">
                  <span className="font-semibold text-foreground text-sm">How to install</span>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span>Open this page in <strong className="text-foreground">Chrome</strong> or <strong className="text-foreground">Edge</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span>Tap the menu (⋮) and select <strong className="text-foreground">"Install app"</strong> or <strong className="text-foreground">"Add to Home Screen"</strong></span>
                    </li>
                  </ol>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                No download required. Installs instantly from your browser.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
