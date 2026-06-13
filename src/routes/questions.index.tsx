import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/questions/")({
  head: () => ({
    meta: [
      { title: "Fragen & Antworten — Solvix" },
      { name: "description", content: "Stelle Coding- und KI-Fragen und hilf anderen, weiterzukommen." },
      { property: "og:title", content: "Fragen & Antworten — Solvix" },
      { property: "og:description", content: "Coding- und KI-Fragen aus der Community." },
    ],
  }),
  component: QuestionsPage,
});

function QuestionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, title, description, category, difficulty, status, created_at, user_id, profiles:user_id(username, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Fragen & Antworten</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Stuck bei Code oder KI? Frage die Community.
            </p>
          </div>
          <Button asChild className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Link to="/ask-question"><Plus className="mr-2 h-4 w-4" /> Frage stellen</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <MessageCircleQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">Noch keine Fragen</h3>
            <p className="mt-1 text-sm text-muted-foreground">Stelle die erste Frage und starte die Diskussion.</p>
            <Button asChild className="mt-5 bg-gradient-primary hover:opacity-90"><Link to="/ask-question">Frage stellen</Link></Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {(data ?? []).map((q: any) => (
              <li key={q.id} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge>{q.category}</Badge>
                  <Badge variant="outline">{q.difficulty}</Badge>
                  <Badge variant={q.status === "solved" ? "default" : "secondary"}>
                    {q.status === "solved" ? "Gelöst" : "Offen"}
                  </Badge>
                  <span className="ml-auto text-muted-foreground">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </span>
                </div>
                <h3 className="mt-2 font-medium">{q.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">
                  von {q.profiles?.username ?? q.profiles?.full_name ?? "Anonym"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  );
}
