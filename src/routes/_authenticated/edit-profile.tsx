import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ExternalLink, Github, Globe, Loader2, Save, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteShell } from "@/components/layout/SiteShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { safeUrl } from "@/lib/safe-url";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ProfileForm = {
  fullName: string;
  username: string;
  bio: string;
  websiteUrl: string;
  githubUrl: string;
  skills: string;
  avatarUrl: string;
};

const emptyForm: ProfileForm = {
  fullName: "",
  username: "",
  bio: "",
  websiteUrl: "",
  githubUrl: "",
  skills: "",
  avatarUrl: "",
};

export const Route = createFileRoute("/_authenticated/edit-profile")({
  head: () => ({
    meta: [
      { title: "Profil bearbeiten — Solvix" },
      { name: "description", content: "Bearbeite dein Solvix Profil, Avatar, Bio und öffentliche Links." },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["edit-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  useEffect(() => {
    if (!user || activeUserId === user.id || isLoading) return;

    setForm({
      fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
      username: profile?.username ?? user.email?.split("@")[0] ?? "",
      bio: profile?.bio ?? "",
      websiteUrl: profile?.website_url ?? "",
      githubUrl: profile?.github_url ?? "",
      skills: profile?.skills?.join(", ") ?? "",
      avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "",
    });
    setActiveUserId(user.id);
  }, [activeUserId, isLoading, profile, user]);

  const skills = useMemo(
    () =>
      form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
        .slice(0, 8),
    [form.skills],
  );

  const displayName = form.fullName.trim() || form.username.trim() || user?.email?.split("@")[0] || "Solvix Creator";
  const username = form.username.trim() || "username";
  const initial = displayName.slice(0, 1).toUpperCase();

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte lade ein Bild hoch.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Das Bild darf maximal 5 MB groß sein.");
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      updateField("avatarUrl", `${data.publicUrl}?v=${Date.now()}`);
      toast.success("Profilbild hochgeladen.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Avatar-Upload fehlgeschlagen.";
      toast.error(`Avatar-Bucket fehlt oder Storage-Policy blockiert Upload: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const normalizedUsername = form.username.trim();
    if (normalizedUsername && normalizedUsername.length < 3) {
      toast.error("Der Username sollte mindestens 3 Zeichen haben.");
      return;
    }

    setSaving(true);
    try {
      const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: user.id,
        full_name: form.fullName.trim() || null,
        username: normalizedUsername || null,
        bio: form.bio.trim() || null,
        website_url: form.websiteUrl.trim() || null,
        github_url: form.githubUrl.trim() || null,
        skills: skills.length ? skills : null,
        avatar_url: form.avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["edit-profile", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
      ]);
      toast.success("Profil gespeichert.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              Profile MVP
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Dein öffentliches Profil</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Stelle ein, wie andere dich auf Solvix sehen: Name, Bild, Bio, Links und deine Skills.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/profile/$id" params={{ id: user?.id ?? "" }}>
              Profil ansehen
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur md:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-accent">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Profilbild" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-primary text-3xl font-semibold text-primary-foreground">
                    {initial}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="font-medium">Profilbild</h2>
                  <p className="text-sm text-muted-foreground">PNG, JPG oder WebP. Empfohlen: quadratisches Bild.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-90">
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                  {uploading ? "Lädt hoch..." : "Bild hochladen"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Field label="Name">
                <Input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="z.B. Florin Ursan" />
              </Field>
              <Field label="Username">
                <Input value={form.username} onChange={(event) => updateField("username", event.target.value)} placeholder="solvixceo" />
              </Field>
              <Field label="Website">
                <Input value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} placeholder="https://solvix-community.lovable.app" />
              </Field>
              <Field label="GitHub">
                <Input value={form.githubUrl} onChange={(event) => updateField("githubUrl", event.target.value)} placeholder="https://github.com/deinname" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bio">
                  <Textarea
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value.slice(0, 220))}
                    placeholder="Coding, KI und SaaS. Ich baue Solvix in Public."
                    className="min-h-28 resize-none"
                  />
                </Field>
                <div className="mt-1 text-right text-xs text-muted-foreground">{form.bio.length}/220</div>
              </div>
              <div className="sm:col-span-2">
                <Field label="Skills">
                  <Input value={form.skills} onChange={(event) => updateField("skills", event.target.value)} placeholder="React, AI Agents, SaaS, Supabase" />
                </Field>
                <p className="mt-2 text-xs text-muted-foreground">Kommagetrennt. Die ersten 8 Skills werden angezeigt.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button asChild variant="ghost">
                <Link to="/dashboard">Zurück</Link>
              </Button>
              <Button onClick={handleSave} disabled={saving || uploading} className="bg-gradient-primary shadow-glow hover:opacity-90">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Speichern
              </Button>
            </div>
          </div>

          <aside className="rounded-2xl border border-border/80 bg-card/70 p-5 backdrop-blur md:p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserRound className="h-4 w-4" />
              Öffentliche Vorschau
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="h-24 rounded-xl bg-[radial-gradient(circle_at_25%_20%,hsl(var(--primary)/.45),transparent_36%),linear-gradient(135deg,hsl(var(--accent)),transparent)]" />
              <div className="-mt-10 flex items-end justify-between">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-background bg-accent">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-primary text-2xl font-semibold text-primary-foreground">
                      {initial}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" disabled>Folgen</Button>
              </div>
              <h3 className="mt-4 text-xl font-semibold">{displayName}</h3>
              <p className="text-sm text-muted-foreground">@{username}</p>
              <p className="mt-3 min-h-10 text-sm text-muted-foreground">
                {form.bio.trim() || "Kurze Bio über dich, deine Projekte und woran du gerade baust."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {safeUrl(form.githubUrl) && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Github className="h-4 w-4" />
                    GitHub
                  </span>
                )}
                {safeUrl(form.websiteUrl) && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    Website
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(skills.length ? skills : ["React", "AI", "SaaS"]).map((skill) => (
                  <span key={skill} className="rounded-md bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
