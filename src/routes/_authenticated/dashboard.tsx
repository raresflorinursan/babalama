import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload, MessageCircleQuestion, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Solvix" }, { name: "description", content: "Verwalte deine Projekte und Fragen auf Solvix." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: myProjects } = useQuery({
    queryKey: ["my-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, slug, short_description, category, difficulty, technologies, image_url, likes_count")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myQuestions } = useQuery({
    queryKey: ["my-questions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("id, title, status, created_at").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_projects")
        .select("project_id, projects(id, title, slug, short_description, category, difficulty, technologies, image_url, likes_count)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: any) => r.projects).filter(Boolean);
    },
  });

  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Hallo {user?.email?.split("@")[0]} 👋</h1>
            <p className="mt-1 text-muted-foreground">Dein persönliches Dashboard auf Solvix.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-gradient-primary hover:opacity-90"><Link to="/upload-project"><Upload className="mr-2 h-4 w-4" />Neues Projekt</Link></Button>
            <Button asChild variant="outline"><Link to="/ask-question"><Plus className="mr-2 h-4 w-4" />Neue Frage</Link></Button>
            <Button asChild variant="ghost"><Link to="/profile/$id" params={{ id: user?.id ?? "" }}>Profil ansehen</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6">
        <Block title="Meine Projekte" count={myProjects?.length ?? 0}>
          {myProjects && myProjects.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myProjects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
            </div>
          ) : (
            <Empty icon={<Upload className="h-6 w-6" />} title="Noch keine Projekte" cta="Projekt hochladen" to="/upload-project" />
          )}
        </Block>

        <Block title="Gespeicherte Projekte" count={saved?.length ?? 0}>
          {saved && saved.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{saved.map((p: any, i: number) => <ProjectCard key={p.id} project={p} index={i} />)}</div>
          ) : (
            <Empty icon={<Heart className="h-6 w-6" />} title="Noch nichts gespeichert" cta="Projekte entdecken" to="/projects" />
          )}
        </Block>

        <Block title="Meine Fragen" count={myQuestions?.length ?? 0}>
          {myQuestions && myQuestions.length > 0 ? (
            <ul className="space-y-2">
              {myQuestions.map((q) => (
                <li key={q.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm">
                  <span>{q.title}</span>
                  <span className="text-xs text-muted-foreground">{q.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<MessageCircleQuestion className="h-6 w-6" />} title="Noch keine Fragen" cta="Frage stellen" to="/ask-question" />
          )}
        </Block>
      </section>
    </SiteShell>
  );
}

function Block({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ icon, title, cta, to }: { icon: React.ReactNode; title: string; cta: string; to: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-primary-glow">{icon}</div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <Button asChild className="mt-4 bg-gradient-primary hover:opacity-90"><Link to={to}>{cta}</Link></Button>
    </div>
  );
}
