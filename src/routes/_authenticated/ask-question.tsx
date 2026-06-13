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

export const Route = createFileRoute("/_authenticated/ask-question")({
  head: () => ({ meta: [{ title: "Frage stellen — Solvix" }, { name: "description", content: "Stelle eine Coding- oder KI-Frage an die Solvix Community." }] }),
  component: AskQuestion,
});

const CATEGORIES = ["KI", "Webentwicklung", "SaaS", "Automatisierung", "Python", "JavaScript", "Allgemein"];

function AskQuestion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: CATEGORIES[0], code_snippet: "", difficulty: "Anfänger" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.description) { toast.error("Titel und Beschreibung sind Pflicht"); return; }
    setLoading(true);
    const { error } = await supabase.from("questions").insert({
      user_id: user.id, title: form.title, description: form.description,
      category: form.category, code_snippet: form.code_snippet || null, difficulty: form.difficulty,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Frage veröffentlicht");
    navigate({ to: "/questions" });
  };

  return (
    <SiteShell>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Frage stellen</h1>
          <p className="mt-2 text-muted-foreground">Beschreibe dein Problem so präzise wie möglich.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card-elegant">
          <div className="space-y-1.5"><Label>Titel *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Beschreibung *</Label><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kategorie</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Schwierigkeit</Label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Anfänger</option><option>Fortgeschritten</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Code-Snippet (optional)</Label><Textarea rows={6} value={form.code_snippet} onChange={(e) => setForm({ ...form, code_snippet: e.target.value })} className="font-mono text-xs" /></div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow hover:opacity-90">{loading ? "Wird gesendet…" : "Frage veröffentlichen"}</Button>
        </form>
      </section>
    </SiteShell>
  );
}
