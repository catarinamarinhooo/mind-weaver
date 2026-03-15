import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrainCircuit, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentCard } from "@/components/shared/ContentCard";
import { forgotPassword, loginUser, registerUser, resetPassword } from "@/lib/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Email is required.");
        return;
      }
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const response = await forgotPassword({ email: email.trim() });
        setMessage(response.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Password reset request failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "reset") {
      if (!resetToken.trim() || !password.trim()) {
        setError("Reset token and new password are required.");
        return;
      }
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const response = await resetPassword({
          token: resetToken.trim(),
          new_password: password.trim(),
        });
        setMessage(response.message);
        setMode("login");
        setPassword("");
        setResetToken("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Password reset failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "register" && !nickname.trim()) {
      setError("Nickname is required to create your workspace.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        await registerUser({
          email: email.trim(),
          password: password.trim(),
          nickname: nickname.trim(),
          full_name: nickname.trim(),
        });
      } else {
        await loginUser({
          email: email.trim(),
          password: password.trim(),
        });
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-semibold text-foreground">CortexKnows</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Your personal AI-powered knowledge, ideas, glossary, watchlist, and discovery system.
          </p>
        </div>

        <ContentCard hover={false} className="mx-auto max-w-lg space-y-5 p-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {mode === "login"
                ? "Login"
                : mode === "register"
                  ? "Create Account"
                  : mode === "forgot"
                    ? "Forgot Password"
                    : "Reset Password"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Enter your personal CortexKnows workspace."
                : mode === "register"
                  ? "Create a personal CortexKnows workspace with secure login."
                  : mode === "forgot"
                    ? "Request a password reset for your CortexKnows account."
                    : "Use the reset token to define a new password."}
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email / Login</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cortexknows.app" />
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nickname</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="How CortexKnows should call you"
                />
              </div>
            </div>
          )}

          {mode === "reset" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reset Token</label>
              <Input value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Paste the reset token" />
            </div>
          )}

          {mode !== "forgot" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {mode === "reset" ? "New Password" : "Password"}
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "reset" ? "Choose a new password" : "Enter your password"} />
              </div>
            </div>
          )}

          <Button className="w-full" onClick={() => void handleSubmit()} disabled={loading}>
            {loading
              ? mode === "login"
                ? "Signing in..."
                : mode === "register"
                  ? "Creating account..."
                  : mode === "forgot"
                    ? "Generating token..."
                    : "Resetting password..."
              : mode === "login"
                ? "Enter CortexKnows"
                : mode === "register"
                  ? "Create CortexKnows account"
                  : mode === "forgot"
                    ? "Generate reset token"
                    : "Save new password"}
          </Button>

          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode((current) => (current === "login" ? "register" : "login"));
                setError("");
                setMessage("");
              }}
              disabled={loading || mode === "forgot" || mode === "reset"}
            >
              {mode === "login"
                ? "Need a new account? Create one"
                : "Already have an account? Log in"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode((current) =>
                  current === "forgot" || current === "reset" ? "login" : "forgot"
                );
                setError("");
                setMessage("");
              }}
              disabled={loading}
            >
              {mode === "forgot" || mode === "reset"
                ? "Back to login"
                : "Forgot your password?"}
            </Button>
            {mode === "forgot" && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMode("reset");
                  setError("");
                  setMessage("");
                }}
                disabled={loading}
              >
                I already have a reset token
              </Button>
            )}
          </div>
        </ContentCard>
      </div>
    </div>
  );
};

export default LoginPage;
