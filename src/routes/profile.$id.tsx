import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, BellOff, Github, Globe, MessageCircle, Pencil, UserCheck, UserPlus } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeUrl } from "@/lib/safe-url";

const mockProfiles: Record<string, any> = {
  solvixceo: {
    id: "solvixceo",
    username: "solvixceo",
    full_name: "SolvixCEO",
    bio: "Baut Solvix als Plattform für Coding, KI, SaaS und echte Projektideen.",
    avatar_url: null,
    github_url: null,
    website_url: null,
    skills: ["SaaS", "Build in Public", "Community", "KI"],
  },
  miacodes: {
    id: "miacodes",
    username: "miacodes",
    full_name: "Mia Dev",
    bio: "Frontend-Entwicklerin mit Fokus auf React, UI-Systeme und saubere Lernprojekte.",
    avatar_url: null,
    github_url: null,
    website_url: null,
    skills: ["React", "Frontend", "Design Systems", "Coding"],
  },
  agentstack: {
    id: "agentstack",
    username: "agentstack",
    full_name: "AI Builder",
    bio: "Entwickelt KI-Agenten, Automationen und Workflows für produktive Teams.",
    avatar_url: null,
    github_url: null,
    website_url: null,
    skills: ["KI-Agenten", "Automation", "APIs", "Workflows"],
  },
  noahmvp: {
    id: "noahmvp",
    username: "noahmvp",
    full_name: "Noah SaaS",
    bio: "Teilt MVPs, SaaS-Experimente und Learnings aus frühen Kundenfeedbacks.",
    avatar_url: null,
    github_url: null,
    website_url: null,
    skills: ["SaaS", "MVP", "Kundenfeedback", "Startup"],
  },
};

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [{ title: "Profil — Solvix" }, { name: "description", content: "Solvix Nutzerprofil." }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

  const visibleProfile = profile ?? mockProfiles[id];

  if (!visibleProfile) return <SiteShell><div className="mx-auto max-w-3xl px-4 py-24 text-center">Profil nicht gefunden.</div></SiteShell>;

  const isOwnProfile = user?.id === id;

  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-accent shadow-glow">
              {visibleProfile.avatar_url ? (
                <img src={visibleProfile.avatar_url} alt={visibleProfile.full_name ?? visibleProfile.username ?? "Profilbild"} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-primary text-2xl font-semibold text-primary-foreground">
                  {(visibleProfile.username ?? visibleProfile.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">{visibleProfile.full_name ?? visibleProfile.username}</h1>
                  {visibleProfile.username && <p className="text-sm text-muted-foreground">@{visibleProfile.username}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isOwnProfile ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/edit-profile">
                        <Pencil className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setIsFollowing((current) => !current)}
                        className={isFollowing ? "bg-accent text-foreground hover:bg-accent/80" : "bg-gradient-primary shadow-glow hover:opacity-90"}
                      >
                        {isFollowing ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        {isFollowing ? "Entfolgen" : "Folgen"}
                      </Button>
                      <Button
                        size="icon"
                        variant={notificationsEnabled ? "default" : "outline"}
                        onClick={() => setNotificationsEnabled((current) => !current)}
                        className={notificationsEnabled ? "bg-primary text-primary-foreground shadow-glow" : ""}
                        aria-label={notificationsEnabled ? "Glocke deaktivieren" : "Glocke aktivieren"}
                      >
                        {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Nachricht
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {!isOwnProfile && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-background/60 px-3 py-1">
                    {isFollowing ? "Du folgst diesem Profil" : "Noch nicht gefolgt"}
                  </span>
                  <span className="rounded-full border border-border bg-background/60 px-3 py-1">
                    {notificationsEnabled ? "Glocke aktiv" : "Glocke aus"}
                  </span>
                </div>
              )}
              {visibleProfile.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{visibleProfile.bio}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {safeUrl(visibleProfile.github_url) && <a href={safeUrl(visibleProfile.github_url)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /> GitHub</a>}
                {safeUrl(visibleProfile.website_url) && <a href={safeUrl(visibleProfile.website_url)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Globe className="h-4 w-4" /> Website</a>}
              </div>
              {visibleProfile.skills && visibleProfile.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visibleProfile.skills.map((s: string) => (
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
