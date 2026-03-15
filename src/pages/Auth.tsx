import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Flame, Mail, Phone, KeyRound, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores"),
});

const emailOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const phoneOtpSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number").max(15).regex(/^\+?[0-9]+$/, "Enter a valid phone number with country code"),
});

type AuthMode = "password" | "email-otp" | "phone-otp";
type AuthStep = "input" | "verify";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [authStep, setAuthStep] = useState<AuthStep>("input");

  // Password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP fields
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Email verification after signup
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithEmailOtp, signInWithPhoneOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const parsed = emailOtpSchema.parse({ email: forgotEmail });
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Reset link sent!", description: `Check your inbox at ${parsed.email}` });
      setShowForgot(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || err.errors?.[0]?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const parsed = loginSchema.parse({ email, password });
        const { error } = await signIn(parsed.email, parsed.password);
        if (error) throw error;
        navigate("/");
      } else {
        const parsed = signupSchema.parse({ email, password, username });
        const { error } = await signUp(parsed.email, parsed.password, parsed.username);
        if (error) throw error;
        toast({ title: "Verification email sent!", description: "Please check your inbox and verify your email to continue." });
        setPendingVerification(true);
        setVerificationEmail(parsed.email);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || err.errors?.[0]?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const parsed = emailOtpSchema.parse({ email: otpEmail });
      const { error } = await signInWithEmailOtp(parsed.email);
      if (error) throw error;
      toast({ title: "Code sent!", description: `Check your inbox at ${parsed.email}` });
      setAuthStep("verify");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || err.errors?.[0]?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const parsed = phoneOtpSchema.parse({ phone: otpPhone });
      const { error } = await signInWithPhoneOtp(parsed.phone);
      if (error) throw error;
      toast({ title: "Code sent!", description: `Check your SMS at ${parsed.phone}` });
      setAuthStep("verify");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || err.errors?.[0]?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setIsLoading(true);
    try {
      const type = authMode === "email-otp" ? "email" as const : "sms" as const;
      const target = authMode === "email-otp" ? otpEmail : otpPhone;
      const { error } = await verifyOtp(otpCode, type, target);
      if (error) throw error;
      toast({ title: "Signed in!", description: "Welcome to Viewza." });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Invalid code",
        description: err.message || "Please check your code and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetToModeSelect = () => {
    setAuthStep("input");
    setOtpCode("");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Google sign-in failed", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const modeButtons = [
    { mode: "password" as AuthMode, icon: KeyRound, label: "Password" },
    { mode: "email-otp" as AuthMode, icon: Mail, label: "Email OTP" },
    { mode: "phone-otp" as AuthMode, icon: Phone, label: "Phone OTP" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Flame className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-glow">Viewza</h1>
          </motion.div>
          <p className="text-muted-foreground">See the world your way</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle>
              {pendingVerification
                ? "Verify your email"
                : authStep === "verify"
                ? "Enter verification code"
                : isLogin
                ? "Welcome back"
                : "Create account"}
            </CardTitle>
            <CardDescription>
              {pendingVerification
                ? `We sent a verification link to ${verificationEmail}`
                : authStep === "verify"
                ? `We sent a 6-digit code to ${authMode === "email-otp" ? otpEmail : otpPhone}`
                : isLogin
                ? "Choose your sign-in method"
                : "Join the Viewza community"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingVerification ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 text-center"
              >
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please check your email and click the verification link to activate your account, then sign in.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPendingVerification(false);
                    setIsLogin(true);
                    setAuthMode("password");
                  }}
                >
                  Back to Sign In
                </Button>
              </motion.div>
            ) : (
            <>
            {/* Auth method selector */}
            {authStep === "input" && isLogin && (
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-5">
                {modeButtons.map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setAuthMode(mode)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                      authMode === mode
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* OTP Verification Step */}
              {authStep === "verify" && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={setOtpCode}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button type="submit" className="w-full glow-red-sm" disabled={isLoading || otpCode.length !== 6}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Verify & Sign In
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={resetToModeSelect}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={authMode === "email-otp" ? handleEmailOtpSend : handlePhoneOtpSend}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        disabled={isLoading}
                      >
                        Resend code
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Password Login/Signup */}
              {authStep === "input" && authMode === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {!isLogin && (
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="your_username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="bg-secondary/50"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-secondary/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full glow-red-sm" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {isLogin ? "Sign In" : "Create Account"}
                    </Button>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="w-full text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
                      >
                        Forgot password?
                      </button>
                    )}
                  </form>

                  {showForgot && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border/50"
                    >
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <p className="text-sm font-medium">Reset your password</p>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="bg-background/50"
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" className="flex-1" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Send reset link
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setShowForgot(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Email OTP */}
              {authStep === "input" && authMode === "email-otp" && (
                <motion.div
                  key="email-otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <form onSubmit={handleEmailOtpSend} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-email">Email address</Label>
                      <Input
                        id="otp-email"
                        type="email"
                        placeholder="you@example.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        className="bg-secondary/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll send a 6-digit verification code to your email
                      </p>
                    </div>
                    <Button type="submit" className="w-full glow-red-sm" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                      Send Code
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* Phone OTP */}
              {authStep === "input" && authMode === "phone-otp" && (
                <motion.div
                  key="phone-otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <form onSubmit={handlePhoneOtpSend} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-phone">Phone number</Label>
                      <Input
                        id="otp-phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        className="bg-secondary/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Include country code (e.g. +1 for US). We'll send a 6-digit SMS code.
                      </p>
                    </div>
                    <Button type="submit" className="w-full glow-red-sm" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                      Send SMS Code
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle login/signup - only for password mode */}
            {authStep === "input" && (
              <div className="mt-6 text-center">
                {authMode === "password" && (
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
