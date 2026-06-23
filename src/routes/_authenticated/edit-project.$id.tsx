import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { type ProjectFormValues, parseTechnologies, validateProjectForm } from "@/lib/project-form";

export const Route = createFileRoute("/_authenticated/edit-project/$id")({
  head: () => ({
    meta: [
      { title: "Projekt bearbeiten — Solvix" },
      { name: "description", content: "Bearbeite dein veröffentlichtes Solvix-Projekt." },
    ],
  }),
  component: EditProjectPage,
});

function EditProjectPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProjectFormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["project-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, user_id, title, short_description, description, category, difficulty, technologies, github_url, demo_url, image_url, problem_solved, lessons_learned, learning_module_id",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!project || form) return;
    setForm({
      title: project.title,
      short_description: project.short_description,
      description: project.description ?? "",
      category: project.category,
      difficulty: project.difficulty,
      technologies: (project.technologies ?? []).join(", "),
      github_url: project.github_url ?? "",
      demo_url: project.demo_url ?? "",
      image_url: project.image_url ?? "",
      problem_solved: project.problem_solved ?? "",
      lessons_learned: project.lessons_learned ?? "",
      learning_module_id: project.learning_module_id ?? "",
    });
  }, [form, project]);

  if (authLoading || isLoading || (project && !form)) {
    return <ProjectState title="Projekt wird geladen…" />;
  }

  if (isError) {
    return <ProjectState title="Projekt konnte nicht geladen werden." retry />;
  }

  if (!project || !user || project.user_id !== user.id || !form) {
    return (
      <ProjectState
        title="Kein Zugriff auf dieses Projekt."
        description="Nur der Eigentümer kann ein Projekt bearbeiten."
      />
    );
  }

  const update = (key: keyof ProjectFormValues, value: string) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateProjectForm(form);
    if (validationError) return toast.error(validationError);

    setSubmitting(true);
    const { error } = await supabase
      .from("projects")
      .update({
        title: form.title.trim(),
        short_description: form.short_description.trim(),
        description: form.description.trim() || null,
        category: form.category,
        difficulty: form.difficulty,
        technologies: parseTechnologies(form.technologies),
        github_url: form.github_url.trim() || null,
        demo_url: form.demo_url.trim() || null,
        image_url: form.image_url.trim() || null,
        problem_solved: form.problem_solved.trim() || null,
        lessons_learned: form.lessons_learned.trim() || null,
        learning_module_id: form.learning_module_id || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    setSubmitting(false);

    if (error) return toast.error("Projekt konnte nicht gespeichert werden.");

    await queryClient.invalidateQueries({ queryKey: ["project", id] });
    await queryClient.invalidateQueries({ queryKey: ["my-projects", user.id] });
    toast.success("Projekt wurde aktualisiert.");
    navigate({ to: "/projects/$id", params: { id } });
  };

  return (
    <SiteShell>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link
            to="/projects/$id"
            params={{ id }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück zum Projekt
          </Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Projekt bearbeiten</h1>
          <p className="mt-2 text-muted-foreground">
            Aktualisiere Inhalte, Links und deinen Lernfortschritt.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ProjectForm
          values={form}
          onChange={update}
          onSubmit={submit}
          submitting={submitting}
          submitLabel="Änderungen speichern"
        />
      </section>
    </SiteShell>
  );
}

function ProjectState({
  title,
  description,
  retry = false,
}: {
  title: string;
  description?: string;
  retry?: boolean;
}) {
  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-6 flex justify-center gap-2">
          {retry && <Button onClick={() => window.location.reload()}>Erneut versuchen</Button>}
          <Button asChild variant="outline">
            <Link to="/dashboard">Zum Dashboard</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
