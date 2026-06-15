import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Github, Globe, Pencil } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeUrl } from "@/lib/safe-url";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [{ title: "Profil — Solvix" }, { name: "description", content: "Solvix Nutzerprofil." }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["profile-projects", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, slug, short_description, category, difficulty, technologies, image_url, likes_count")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <SiteShell><div className="mx-auto max-w-5xl px-4 py-16">Lädt…</div></SiteShell>;
  if (!profile) return <SiteShell><div className="mx-auto max-w-3xl px-4 py-24 text-center">Profil nicht gefunden.</div></SiteShell>;

  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-accent shadow-glow">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name ?? profile.username ?? "Profilbild"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-primary text-2xl font-semibold text-primary-foreground">
                  {(profile.username ?? profile.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">{profile.full_name ?? profile.username}</h1>
                  {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
                </div>
                {user?.id === id && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/edit-profile">
                      <Pencil className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Link>
                  </Button>
                )}
              </div>
              {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {safeUrl(profile.github_url) && <a href={safeUrl(profile.github_url)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /> GitHub</a>}
                {safeUrl(profile.website_url) && <a href={safeUrl(profile.website_url)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Globe className="h-4 w-4" /> Website</a>}
              </div>
              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.skills.map((s: string) => (
                    <span key={s} className="rounded-md bg-accent px-2 py-1 text-xs text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="mb-5 text-lg font-medium">Projekte</h2>
        {(projects ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Projekte. <Link to="/upload-project" className="text-primary hover:underline">Eines hochladen?</Link></p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(projects ?? []).map((p: any, i: number) => <ProjectCard key={p.id} project={p} index={i} />)}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
