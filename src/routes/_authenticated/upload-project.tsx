import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteShell } from "@/components/layout/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/upload-project")({
  validateSearch: (search: Record<string, unknown>) => ({
    module: typeof search.module === "string" ? search.module : undefined,
    challenge: typeof search.challenge === "string" ? search.challenge : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Projekt hochladen — Solvix" },
      { name: "description", content: "Lade dein Coding- oder KI-Projekt auf Solvix hoch." },
    ],
  }),
  component: UploadProject,
});

const CATEGORIES = ["KI", "Webentwicklung", "SaaS", "Automatisierung", "Python", "JavaScript"];
const DIFFICULTIES = ["Anfänger", "Fortgeschritten"];
const LEARNING_MODULES = [
  { id: "", label: "Freies Projekt" },
  { id: "foundations", label: "Grundlagen" },
  { id: "python", label: "Python Grundlagen" },
  { id: "apis", label: "APIs verstehen" },
  { id: "ai-practice", label: "KI praktisch einsetzen" },
  { id: "automation", label: "Automatisierungen bauen" },
  { id: "saas", label: "Eigene SaaS entwickeln" },
] as const;
const validModuleIds = new Set(LEARNING_MODULES.map((module) => module.id));

type UploadForm = {
  title: string;
  short_description: string;
  description: string;
  category: string;
  difficulty: string;
  technologies: string;
  github_url: string;
  demo_url: string;
  image_url: string;
  problem_solved: string;
  lessons_learned: string;
  learning_module_id: string;
};

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
  const [form, setForm] = useState<UploadForm>(() => ({
    title: search.challenge?.slice(0, 120) ?? "",
    short_description: "",
    description: "",
    category: CATEGORIES[0],
    difficulty: DIFFICULTIES[0],
    technologies: "",
    github_url: "",
    demo_url: "",
    image_url: "",
    problem_solved: "",
    lessons_learned: "",
    learning_module_id: search.module && validModuleIds.has(search.module) ? search.module : "",
  }));

  const update = (key: keyof UploadForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const linkedModule = LEARNING_MODULES.find((module) => module.id === form.learning_module_id);

  const isValidHttpUrl = (v: string) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.short_description) {
      toast.error("Titel und Kurzbeschreibung sind Pflicht");
      return;
    }
    for (const [k, v] of [
      ["GitHub-Link", form.github_url],
      ["Live-Demo-Link", form.demo_url],
      ["Bild-URL", form.image_url],
    ] as const) {
      if (!isValidHttpUrl(v)) {
        toast.error(`${k} muss mit http:// oder https:// beginnen`);
        return;
      }
    }
    setLoading(true);
    const slug = slugify(form.title) + "-" + Math.random().toString(36).slice(2, 6);
    const technologies = form.technologies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: form.title,
        slug,
        short_description: form.short_description,
        description: form.description || null,
        category: form.category,
        difficulty: form.difficulty,
        technologies,
        github_url: form.github_url || null,
        demo_url: form.demo_url || null,
        image_url: form.image_url || null,
        learning_module_id: form.learning_module_id || null,
        problem_solved: form.problem_solved || null,
        lessons_learned: form.lessons_learned || null,
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
        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card-elegant"
        >
          {form.learning_module_id && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs font-medium uppercase text-primary-glow">Lernprojekt</p>
              <p className="mt-1 text-sm font-medium">{linkedModule?.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nach der Veröffentlichung erscheint das Projekt zusammen mit deinem Lernfortschritt
                im Profil.
              </p>
            </div>
          )}

          <Field label="Bezug zum Lernpfad">
            <Select
              value={form.learning_module_id}
              onChange={(value) => update("learning_module_id", value)}
              options={LEARNING_MODULES.map((module) => module.id)}
              labels={Object.fromEntries(
                LEARNING_MODULES.map((module) => [module.id, module.label]),
              )}
            />
          </Field>

          <Field label="Projektname *">
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} required />
          </Field>
          <Field label="Kurzbeschreibung *">
            <Input
              value={form.short_description}
              onChange={(e) => update("short_description", e.target.value)}
              required
              maxLength={160}
            />
          </Field>
          <Field label="Ausführliche Beschreibung">
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategorie">
              <Select
                value={form.category}
                onChange={(v) => update("category", v)}
                options={CATEGORIES}
              />
            </Field>
            <Field label="Schwierigkeit">
              <Select
                value={form.difficulty}
                onChange={(v) => update("difficulty", v)}
                options={DIFFICULTIES}
              />
            </Field>
          </div>

          <Field label="Technologien (Komma-getrennt)">
            <Input
              value={form.technologies}
              onChange={(e) => update("technologies", e.target.value)}
              placeholder="React, Supabase, OpenAI"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GitHub-Link">
              <Input
                value={form.github_url}
                onChange={(e) => update("github_url", e.target.value)}
                placeholder="https://github.com/…"
              />
            </Field>
            <Field label="Live-Demo-Link">
              <Input
                value={form.demo_url}
                onChange={(e) => update("demo_url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>

          <Field label="Bild-/Screenshot-URL">
            <Input
              value={form.image_url}
              onChange={(e) => update("image_url", e.target.value)}
              placeholder="https://…/screenshot.png"
            />
          </Field>

          <Field label="Welches Problem löst es?">
            <Textarea
              rows={3}
              value={form.problem_solved}
              onChange={(e) => update("problem_solved", e.target.value)}
            />
          </Field>
          <Field label="Was hast du gelernt?">
            <Textarea
              rows={3}
              value={form.lessons_learned}
              onChange={(e) => update("lessons_learned", e.target.value)}
            />
          </Field>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary shadow-glow hover:opacity-90"
          >
            {loading ? "Wird veröffentlicht…" : "Projekt veröffentlichen"}
          </Button>
        </form>
      </section>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  labels,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {options.map((option) => (
        <option key={option || "free"} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  );
}
