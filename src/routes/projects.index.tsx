import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectCard, type ProjectCardData } from "@/components/projects/ProjectCard";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Alle", "KI", "Webentwicklung", "SaaS", "Automatisierung", "Python", "JavaScript"];
const DIFFICULTIES = ["Alle", "Anfänger", "Fortgeschritten"];

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projekt-Galerie — Solvix" },
      { name: "description", content: "Durchstöbere Coding-, KI- und SaaS-Projekte aus der Solvix Community." },
      { property: "og:title", content: "Projekt-Galerie — Solvix" },
      { property: "og:description", content: "Coding-, KI- und SaaS-Projekte zum Entdecken und Inspirieren." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Alle");
  const [diff, setDiff] = useState("Alle");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, slug, short_description, category, difficulty, technologies, image_url, likes_count, user_id, profiles:user_id(username, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (ProjectCardData & { profiles: { username: string | null; full_name: string | null } | null })[];
    },
  });

  const projects = useMemo(() => {
    const list = (data ?? []).map((p, i) => ({ ...p, author: p.profiles }));
    return list.filter((p) => {
      if (cat !== "Alle" && p.category !== cat) return false;
      if (diff !== "Alle" && p.difficulty !== diff) return false;
      if (q && !`${p.title} ${p.short_description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, cat, diff]);

  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Projekte entdecken</h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Echte Coding-, KI- und SaaS-Projekte aus der Community.
              </p>
            </div>
            <Button asChild className="bg-gradient-primary shadow-glow hover:opacity-90">
              <Link to="/upload-project"><Upload className="mr-2 h-4 w-4" /> Projekt hochladen</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Projekte durchsuchen…" className="pl-9" />
            </div>
            <Select value={cat} onChange={setCat} options={CATEGORIES} />
            <Select value={diff} onChange={setDiff} options={DIFFICULTIES} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <Grid>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}</Grid>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <Grid>{projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}</Grid>
        )}
      </section>
    </SiteShell>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Skeleton() {
  return <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <h3 className="font-medium">Noch keine Projekte hier</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Sei der Erste und lade ein Projekt hoch — egal ob KI-Tool, SaaS-Idee oder Mini-App.
      </p>
      <Button asChild className="mt-5 bg-gradient-primary hover:opacity-90">
        <Link to="/upload-project">Projekt hochladen</Link>
      </Button>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
