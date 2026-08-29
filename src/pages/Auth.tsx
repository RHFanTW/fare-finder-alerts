import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentMeta } from "@/hooks/use-document-meta";

export function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useDocumentMeta("Sign in — Flight Price Notifier", [
    {
      name: "description",
      content: "Sign in or create an account to start tracking flight prices.",
    },
    { property: "og:title", content: "Sign in — Flight Price Notifier" },
    {
      property: "og:description",
      content: "Sign in or create an account to start tracking flight prices.",
    },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-gradient shadow-glow">
            <Plane className="size-4 text-primary-foreground" />
          </span>
          Flight Price Notifier
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-glow">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className={
                mode === "sign-in"
                  ? "rounded-md bg-violet-gradient py-2 text-primary-foreground"
                  : "rounded-md py-2 text-muted-foreground hover:text-foreground"
              }
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className={
                mode === "sign-up"
                  ? "rounded-md bg-violet-gradient py-2 text-primary-foreground"
                  : "rounded-md py-2 text-muted-foreground hover:text-foreground"
              }
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full shadow-glow" disabled={loading}>
              {loading ? "…" : mode === "sign-in" ? "Sign In / 登入" : "Create Account / 註冊"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
