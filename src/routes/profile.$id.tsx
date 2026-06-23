import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Bell,
  BellOff,
  BookOpen,
  Code2,
  Flame,
  Github,
  Globe,
  MessageCircle,
  Pencil,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeUrl } from "@/lib/safe-url";
import { toast } from "sonner";

const learningModuleLabels: Record<string, string> = {
  foundations: "Grundlagen",
  python: "Python Grundlagen",
  apis: "APIs verstehen",
  "ai-practice": "KI praktisch einsetzen",
  automation: "Automatisierungen bauen",
  saas: "Eigene SaaS entwickeln",
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
        .select(
          "id, title, slug, short_description, category, difficulty, technologies, image_url, likes_count, learning_module_id",
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ["profile-learning-achievements", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_learning_achievements")
        .select("module_id, completed_at")
        .eq("user_id", id)
        .order("completed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: communityPostCount = 0 } = useQuery({
    queryKey: ["profile-community-post-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("is_removed", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const {
    data: followRelationship,
    isFetching: followLoading,
    refetch: refetchFollowRelationship,
  } = useQuery({
    queryKey: ["profile-follow", user?.id, id],
    enabled: Boolean(user && user.id !== id),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_follows")
        .select("notifications_enabled")
        .eq("follower_id", user.id)
        .eq("following_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading)
    return (
      <SiteShell>
        <div className="mx-auto max-w-5xl px-4 py-16">Lädt…</div>
      </SiteShell>
    );

  const visibleProfile = profile;

  if (!visibleProfile)
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">Profil nicht gefunden.</div>
      </SiteShell>
    );

  const isOwnProfile = user?.id === id;
  const isFollowing = Boolean(followRelationship);
  const notificationsEnabled = followRelationship?.notifications_enabled ?? false;
  const completedModules = achievements?.length ?? 0;
  const projectCount = projects?.length ?? 0;

  const toggleFollow = async () => {
    if (!user) {
      toast.error("Melde dich an, um Nutzern zu folgen.");
      return;
    }

    const result = isFollowing
      ? await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", id)
      : await supabase.from("user_follows").insert({
          follower_id: user.id,
          following_id: id,
          notifications_enabled: false,
        });

    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    await refetchFollowRelationship();
  };

  const toggleNotifications = async () => {
    if (!user) {
      toast.error("Melde dich an, um Benachrichtigungen zu aktivieren.");
      return;
    }

    const { error } = await supabase.from("user_follows").upsert(
      {
        follower_id: user.id,
        following_id: id,
        notifications_enabled: !notificationsEnabled,
      },
      { onConflict: "follower_id,following_id" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    await refetchFollowRelationship();
  };

  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-accent shadow-glow">
              {visibleProfile.avatar_url ? (
                <img
                  src={visibleProfile.avatar_url}
                  alt={visibleProfile.full_name ?? visibleProfile.username ?? "Profilbild"}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-primary text-2xl font-semibold text-primary-foreground">
                  {(visibleProfile.username ?? visibleProfile.full_name ?? "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {visibleProfile.full_name ?? visibleProfile.username}
                  </h1>
                  {visibleProfile.username && (
                    <p className="text-sm text-muted-foreground">@{visibleProfile.username}</p>
                  )}
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
                        onClick={() => void toggleFollow()}
                        disabled={followLoading}
                        className={
                          isFollowing
                            ? "bg-accent text-foreground hover:bg-accent/80"
                            : "bg-gradient-primary shadow-glow hover:opacity-90"
                        }
                      >
                        {isFollowing ? (
                          <UserCheck className="mr-2 h-4 w-4" />
                        ) : (
                          <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        {isFollowing ? "Entfolgen" : "Folgen"}
                      </Button>
                      <Button
                        size="icon"
                        variant={notificationsEnabled ? "default" : "outline"}
                        onClick={() => void toggleNotifications()}
                        disabled={followLoading}
                        className={
                          notificationsEnabled
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : ""
                        }
                        aria-label={
                          notificationsEnabled ? "Glocke deaktivieren" : "Glocke aktivieren"
                        }
                      >
                        {notificationsEnabled ? (
                          <Bell className="h-4 w-4" />
                        ) : (
                          <BellOff className="h-4 w-4" />
                        )}
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
              {visibleProfile.bio && (
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">{visibleProfile.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {safeUrl(visibleProfile.github_url) && (
                  <a
                    href={safeUrl(visibleProfile.github_url)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                )}
                {safeUrl(visibleProfile.website_url) && (
                  <a
                    href={safeUrl(visibleProfile.website_url)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
              {visibleProfile.skills && visibleProfile.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visibleProfile.skills.map((s: string) => (
                    <span
                      key={s}
                      className="rounded-md bg-accent px-2 py-1 text-xs text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <ProfileMetric
            icon={<BookOpen className="h-4 w-4" />}
            value={completedModules}
            label="Module abgeschlossen"
          />
          <ProfileMetric
            icon={<Code2 className="h-4 w-4" />}
            value={projectCount}
            label="Projekte veröffentlicht"
          />
          <ProfileMetric
            icon={<MessageCircle className="h-4 w-4" />}
            value={communityPostCount}
            label="Community-Beiträge"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-glow" />
              <h2 className="font-medium">Lernfortschritt</h2>
            </div>
            {achievements && achievements.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.module_id}
                    className="rounded-xl border border-border bg-card/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {learningModuleLabels[achievement.module_id] ?? achievement.module_id}
                      </span>
                      <Award className="h-4 w-4 text-primary-glow" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Abgeschlossen am{" "}
                      {new Date(achievement.completed_at).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Noch keine öffentlich sichtbaren Lernmodule abgeschlossen.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary-glow" />
              <h2 className="font-medium">Builder-Badges</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProfileBadge active={completedModules >= 1} label="Explorer" />
              <ProfileBadge active={completedModules >= 3} label="Momentum" />
              <ProfileBadge active={completedModules === 6} label="SaaS Ready" />
              <ProfileBadge active={projectCount >= 1} label="First Build" />
              <ProfileBadge active={projectCount >= 3} label="Product Builder" />
              <ProfileBadge active={communityPostCount >= 5} label="Community Voice" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="mb-5 text-lg font-medium">Projekte</h2>
        {(projects ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Projekte.{" "}
            <Link to="/upload-project" className="text-primary hover:underline">
              Eines hochladen?
            </Link>
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(projects ?? []).map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function ProfileMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <div className="flex items-center gap-2 text-primary-glow">{icon}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ProfileBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
        active
          ? "border-primary/35 bg-primary/10 text-primary-glow"
          : "border-border bg-background/40 text-muted-foreground opacity-60"
      }`}
    >
      <Flame className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
