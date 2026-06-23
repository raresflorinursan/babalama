import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteShell } from "@/components/layout/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { safeUrl } from "@/lib/safe-url";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const learningModuleLabels: Record<string, string> = {
  foundations: "Grundlagen",
  python: "Python Grundlagen",
  apis: "APIs verstehen",
  "ai-practice": "KI praktisch einsetzen",
  automation: "Automatisierungen bauen",
  saas: "Eigene SaaS entwickeln",
};

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Projekt — Solvix" },
      { name: "description", content: "Projektdetails auf Solvix." },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const {
    data: project,
    isLoading,
    isError: projectError,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, profiles:user_id(id, username, full_name, avatar_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: comments, isError: commentsError } = useQuery({
    queryKey: ["project-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, comment, created_at, user_id, profiles:user_id(username, full_name)")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: liked } = useQuery({
    queryKey: ["project-liked", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
  });

  const [comment, setComment] = useState("");
  const [deleting, setDeleting] = useState(false);

  const toggleLike = async () => {
    if (!user) {
      toast.error("Bitte einloggen, um zu liken");
      return;
    }
    const { error } = liked
      ? await supabase.from("likes").delete().eq("project_id", id).eq("user_id", user.id)
      : await supabase.from("likes").insert({ project_id: id, user_id: user.id });
    if (error) return toast.error("Like konnte nicht gespeichert werden.");
    qc.invalidateQueries({ queryKey: ["project-liked", id, user.id] });
    qc.invalidateQueries({ queryKey: ["project", id] });
  };

  const deleteProject = async () => {
    if (!user || project?.user_id !== user.id) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
    setDeleting(false);
    if (error) return toast.error("Projekt konnte nicht gelöscht werden.");

    await qc.invalidateQueries({ queryKey: ["my-projects", user.id] });
    toast.success("Projekt wurde gelöscht.");
    navigate({ to: "/dashboard" });
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Bitte einloggen, um zu kommentieren");
      return;
    }
    if (!comment.trim()) return;
    const { error } = await supabase
      .from("comments")
      .insert({ project_id: id, user_id: user.id, comment: comment.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setComment("");
    qc.invalidateQueries({ queryKey: ["project-comments", id] });
  };

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-5xl px-4 py-16">Lädt…</div>
      </SiteShell>
    );
  }
  if (projectError) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Projekt konnte nicht geladen werden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Prüfe deine Verbindung und versuche es erneut.
          </p>
          <Button
            onClick={() => qc.invalidateQueries({ queryKey: ["project", id] })}
            className="mt-6"
          >
            Erneut versuchen
          </Button>
        </div>
      </SiteShell>
    );
  }
  if (!project) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Projekt nicht gefunden</h1>
          <Button asChild className="mt-6">
            <Link to="/projects">Zur Galerie</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  const author = project.profiles;
  const isOwner = user?.id === project.user_id;

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück zur Galerie
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card-elegant">
          <div className="aspect-[21/9] bg-accent">
            {safeUrl(project.image_url) ? (
              <img
                src={safeUrl(project.image_url)}
                alt={project.title}
                className="h-full w-full object-cover"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{project.category}</Badge>
              <Badge variant="outline">{project.difficulty}</Badge>
              {project.learning_module_id && (
                <Badge variant="secondary">
                  Lernprojekt ·{" "}
                  {learningModuleLabels[project.learning_module_id] ?? project.learning_module_id}
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{project.title}</h1>
            <p className="mt-2 text-muted-foreground">{project.short_description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {safeUrl(project.github_url) && (
                <Button asChild variant="outline" size="sm">
                  <a href={safeUrl(project.github_url)} target="_blank" rel="noreferrer noopener">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              )}
              {safeUrl(project.demo_url) && (
                <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
                  <a href={safeUrl(project.demo_url)} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Live-Demo
                  </a>
                </Button>
              )}
              <Button onClick={toggleLike} variant={liked ? "default" : "outline"} size="sm">
                <Heart className={"mr-2 h-4 w-4 " + (liked ? "fill-current" : "")} />{" "}
                {project.likes_count}
              </Button>
              {isOwner && (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/edit-project/$id" params={{ id }}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Das Projekt sowie zugehörige Likes, Kommentare und Speicherungen werden
                          dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteProject}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Endgültig löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                {project.description && (
                  <Section title="Beschreibung">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {project.description}
                    </p>
                  </Section>
                )}
                {project.problem_solved && (
                  <Section title="Welches Problem löst es?">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {project.problem_solved}
                    </p>
                  </Section>
                )}
                {project.lessons_learned && (
                  <Section title="Was habe ich gelernt?">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {project.lessons_learned}
                    </p>
                  </Section>
                )}
              </div>
              <aside className="space-y-6">
                {project.learning_module_id && (
                  <Section title="Lernpfad">
                    <div className="rounded-lg border border-primary/25 bg-primary/10 p-3">
                      <p className="text-sm font-medium text-primary-glow">
                        {learningModuleLabels[project.learning_module_id] ??
                          project.learning_module_id}
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                        <Link to="/learn">Zum Lernbereich</Link>
                      </Button>
                    </div>
                  </Section>
                )}
                <Section title="Tech-Stack">
                  <div className="flex flex-wrap gap-1.5">
                    {(project.technologies ?? []).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-md bg-accent px-2 py-1 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Section>
                <Section title="Autor">
                  {author ? (
                    <Link
                      to="/profile/$id"
                      params={{ id: author.id }}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-medium text-primary-foreground">
                        {(author.username ?? author.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {author.username ?? author.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground">Profil ansehen</div>
                      </div>
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">Anonym</span>
                  )}
                </Section>
              </aside>
            </div>
          </div>
        </div>

        {/* Comments */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <MessageCircle className="h-5 w-5" /> Kommentare
          </h2>

          <form onSubmit={submitComment} className="mt-4 space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                user ? "Schreibe einen Kommentar…" : "Bitte einloggen, um zu kommentieren"
              }
              disabled={!user}
              rows={3}
            />
            <Button
              type="submit"
              disabled={!user || !comment.trim()}
              className="bg-gradient-primary hover:opacity-90"
            >
              Kommentar posten
            </Button>
          </form>

          <ul className="mt-6 space-y-3">
            {commentsError && (
              <li className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Kommentare konnten nicht geladen werden.
              </li>
            )}
            {(comments ?? []).map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {c.profiles?.username ?? c.profiles?.full_name ?? "Anonym"}
                  </span>
                  <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{c.comment}</p>
              </li>
            ))}
            {comments && comments.length === 0 && (
              <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Noch keine Kommentare — sei der Erste.
              </li>
            )}
          </ul>
        </section>
      </div>
    </SiteShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
