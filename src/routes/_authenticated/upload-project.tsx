import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  EMPTY_PROJECT_FORM,
  type LearningModuleId,
  type ProjectFormValues,
  isLearningModuleId,
  parseTechnologies,
  validateProjectForm,
} from "@/lib/project-form";

type UploadProjectSearch = {
  module?: LearningModuleId;
  challenge?: string;
};

export const Route = createFileRoute("/_authenticated/upload-project")({
  validateSearch: (search: Record<string, unknown>): UploadProjectSearch => ({
    ...(isLearningModuleId(search.module) ? { module: search.module } : {}),
    ...(typeof search.challenge === "string" ? { challenge: search.challenge } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Projekt hochladen — Solvix" },
      { name: "description", content: "Lade dein Coding- oder KI-Projekt auf Solvix hoch." },
    ],
  }),
  component: UploadProject,
});

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "project"
  );
}

function UploadProject() {
  const search = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProjectFormValues>(() => ({
    ...EMPTY_PROJECT_FORM,
    title: search.challenge?.slice(0, 120) ?? "",
    learning_module_id: search.module ?? "",
  }));

  const update = (key: keyof ProjectFormValues, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const validationError = validateProjectForm(form);
    if (validationError) return toast.error(validationError);

    setLoading(true);
    const slug = slugify(form.title) + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: form.title.trim(),
        slug,
        short_description: form.short_description.trim(),
        description: form.description.trim() || null,
        category: form.category,
        difficulty: form.difficulty,
        technologies: parseTechnologies(form.technologies),
        github_url: form.github_url.trim() || null,
        demo_url: form.demo_url.trim() || null,
        image_url: form.image_url.trim() || null,
        learning_module_id: form.learning_module_id || null,
        problem_solved: form.problem_solved.trim() || null,
        lessons_learned: form.lessons_learned.trim() || null,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Projekt veröffentlicht!");
    navigate({ to: "/projects/$id", params: { id: data.id } });
  };

  return (
    <SiteShell>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Projekt hochladen</h1>
          <p className="mt-2 text-muted-foreground">
            Teile, was du gebaut hast. Andere können davon lernen und Feedback geben.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ProjectForm
          values={form}
          onChange={update}
          onSubmit={submit}
          submitting={loading}
          submitLabel="Projekt veröffentlichen"
        />
      </section>
    </SiteShell>
  );
}
