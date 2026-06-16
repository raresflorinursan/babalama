import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SiteShell } from "@/components/layout/SiteShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Login wird abgeschlossen — Solvix" },
      { name: "description", content: "Solvix verarbeitet den Login und leitet dich weiter." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Login wird abgeschlossen...");

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();

        if (cancelled) return;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        setMessage("Login konnte nicht abgeschlossen werden. Bitte melde dich erneut an.");
        window.setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
      } catch (error) {
        if (cancelled) return;
        const detail = error instanceof Error ? error.message : "Unbekannter Login-Fehler.";
        setMessage(`Login fehlgeschlagen: ${detail}`);
        window.setTimeout(() => navigate({ to: "/auth", replace: true }), 1800);
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <SiteShell>
      <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-card-elegant">
          <BrandMark className="mx-auto h-12 w-12" />
          <h1 className="mt-5 text-xl font-semibold">Google-Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <Link to="/auth" className="mt-5 inline-flex text-sm text-primary-glow hover:text-primary">
            Zurück zum Login
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
