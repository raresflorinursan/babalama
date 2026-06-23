import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LEARNING_MODULES,
  PROJECT_CATEGORIES,
  PROJECT_DIFFICULTIES,
  type ProjectFormValues,
} from "@/lib/project-form";

export function ProjectForm({
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
}: {
  values: ProjectFormValues;
  onChange: (key: keyof ProjectFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const linkedModule = LEARNING_MODULES.find((module) => module.id === values.learning_module_id);
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card-elegant sm:p-6"
    >
      {linkedModule?.id && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs font-medium uppercase text-primary-glow">Lernprojekt</p>
          <p className="mt-1 text-sm font-medium">{linkedModule.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Das Projekt wird mit deinem Lernpfad und Builder-Profil verknüpft.
          </p>
        </div>
      )}
      <Field label="Bezug zum Lernpfad" htmlFor="learning-module">
        <NativeSelect
          id="learning-module"
          value={values.learning_module_id}
          onChange={(value) => onChange("learning_module_id", value)}
          options={LEARNING_MODULES.map((module) => module.id)}
          labels={Object.fromEntries(LEARNING_MODULES.map((module) => [module.id, module.label]))}
        />
      </Field>
      <Field label="Projektname *" htmlFor="project-title">
        <Input
          id="project-title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          required
          maxLength={120}
        />
      </Field>
      <Field label="Kurzbeschreibung *" htmlFor="project-summary">
        <Input
          id="project-summary"
          value={values.short_description}
          onChange={(event) => onChange("short_description", event.target.value)}
          required
          maxLength={160}
        />
      </Field>
      <Field label="Ausführliche Beschreibung" htmlFor="project-description">
        <Textarea
          id="project-description"
          rows={5}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          maxLength={5000}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategorie" htmlFor="project-category">
          <NativeSelect
            id="project-category"
            value={values.category}
            onChange={(value) => onChange("category", value)}
            options={PROJECT_CATEGORIES}
          />
        </Field>
        <Field label="Schwierigkeit" htmlFor="project-difficulty">
          <NativeSelect
            id="project-difficulty"
            value={values.difficulty}
            onChange={(value) => onChange("difficulty", value)}
            options={PROJECT_DIFFICULTIES}
          />
        </Field>
      </div>
      <Field label="Technologien (Komma-getrennt)" htmlFor="project-technologies">
        <Input
          id="project-technologies"
          value={values.technologies}
          onChange={(event) => onChange("technologies", event.target.value)}
          placeholder="React, Supabase, TypeScript"
          maxLength={400}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GitHub-Link" htmlFor="project-github-url">
          <Input
            id="project-github-url"
            type="url"
            value={values.github_url}
            onChange={(event) => onChange("github_url", event.target.value)}
            placeholder="https://github.com/…"
          />
        </Field>
        <Field label="Live-Demo-Link" htmlFor="project-demo-url">
          <Input
            id="project-demo-url"
            type="url"
            value={values.demo_url}
            onChange={(event) => onChange("demo_url", event.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="Bild-/Screenshot-URL" htmlFor="project-image-url">
        <Input
          id="project-image-url"
          type="url"
          value={values.image_url}
          onChange={(event) => onChange("image_url", event.target.value)}
          placeholder="https://…/screenshot.png"
        />
      </Field>
      <Field label="Welches Problem löst es?" htmlFor="project-problem">
        <Textarea
          id="project-problem"
          rows={3}
          value={values.problem_solved}
          onChange={(event) => onChange("problem_solved", event.target.value)}
          maxLength={2000}
        />
      </Field>
      <Field label="Was hast du gelernt?" htmlFor="project-lessons">
        <Textarea
          id="project-lessons"
          rows={3}
          value={values.lessons_learned}
          onChange={(event) => onChange("lessons_learned", event.target.value)}
          maxLength={2000}
        />
      </Field>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-primary shadow-glow hover:opacity-90"
      >
        {submitting ? "Wird gespeichert…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  options,
  labels,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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
