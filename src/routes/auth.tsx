import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SiteShell } from "@/components/layout/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark } from "@/components/BrandMark";
import { normalizeUsername, validateUsername } from "@/lib/platform-security";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login & Registrieren — Solvix" },
      { name: "description", content: "Melde dich an oder erstelle einen kostenlosen Account, um Projekte zu teilen und Fragen zu stellen." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <SiteShell>
      <section className="bg-gradient-hero">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-4 py-16">
          <Link to="/" className="mb-6 flex items-center gap-2 font-semibold">
            <BrandMark className="h-9 w-9" />
            <span className="text-lg">Solvix</span>
          </Link>

          <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-card-elegant">
            <h1 className="text-xl font-semibold">Willkommen bei Solvix</h1>
            <p className="mt-1 text-sm text-muted-foreground">Logge dich ein oder erstelle einen Account.</p>

            <GoogleButton />

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              oder mit E-Mail
              <div className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error("Google-Login fehlgeschlagen");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    window.location.href = "/dashboard";
  };
  return (
    <Button onClick={handle} disabled={loading} variant="outline" className="w-full">
      <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/>
      </svg>
      Mit Google fortfahren
    </Button>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Willkommen zurück!");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="login-email">E-Mail</Label>
        <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="login-pw">Passwort</Label>
        <Input id="login-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow hover:opacity-90">
        {loading ? "Wird angemeldet…" : "Einloggen"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Passwort min. 6 Zeichen"); return; }
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      toast.error(usernameValidation.message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { username: usernameValidation.username, full_name: usernameValidation.username },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account erstellt. Du bist eingeloggt.");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="su-username">Benutzername</Label>
        <Input id="su-username" required value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} />
      </div>
      <div>
        <Label htmlFor="su-email">E-Mail</Label>
        <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="su-pw">Passwort</Label>
        <Input id="su-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow hover:opacity-90">
        {loading ? "Erstelle Account…" : "Account erstellen"}
      </Button>
    </form>
  );
}
