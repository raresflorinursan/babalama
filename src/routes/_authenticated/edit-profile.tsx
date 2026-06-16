import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  Github,
  Globe,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
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

const BIO_MAX = 220;

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
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
    [form.skills],
  );

  const displayName = form.fullName.trim() || form.username.trim() || user?.email?.split("@")[0] || "Solvix Creator";
  const username = form.username.trim() || "username";
  const initial = displayName.slice(0, 1).toUpperCase();

  const completion = useMemo(() => {
    const fields = [form.fullName, form.username, form.bio, form.avatarUrl, form.websiteUrl, form.githubUrl, form.skills];
    const done = fields.filter((v) => v.trim().length > 0).length;
    return Math.round((done / fields.length) * 100);
  }, [form]);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((c) => ({ ...c, [key]: value }));
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
      toast.error(message);
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
      <section className="mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:pt-14">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück zum Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Profil bearbeiten</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Verwalte deine öffentliche Identität auf Solvix. Änderungen werden sofort in der Vorschau sichtbar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vollständigkeit</div>
              <div className="text-2xl font-semibold tabular-nums">{completion}%</div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile/$id" params={{ id: user?.id ?? "" }}>
                Ansehen
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/60">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* FORM column */}
          <div className="space-y-6">
            {/* Avatar */}
            <SectionCard
              step="01"
              title="Profilbild"
              description="Dein Avatar erscheint überall, wo du auf Solvix auftauchst."
              icon={<Camera className="h-4 w-4" />}
            >
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-accent ring-1 ring-border/50">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Profilbild" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-primary text-3xl font-semibold text-primary-foreground">
                      {initial}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? "Lädt hoch..." : "Bild hochladen"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                      disabled={uploading}
                    />
                  </label>
                  {form.avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField("avatarUrl", "")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Entfernen
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">PNG, JPG oder WebP · max. 5 MB · empfohlen 400×400 px</p>
            </SectionCard>

            {/* Identity */}
            <SectionCard
              step="02"
              title="Identität"
              description="Wie wirst du auf Solvix angesprochen?"
              icon={<UserRound className="h-4 w-4" />}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Voller Name" hint="Wird groß auf deinem Profil angezeigt.">
                  <Input
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="z.B. Florin Ursan"
                  />
                </Field>
                <Field label="Username" hint="Eindeutig, mindestens 3 Zeichen.">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      @
                    </span>
                    <Input
                      value={form.username}
                      onChange={(e) => updateField("username", e.target.value.replace(/\s/g, ""))}
                      placeholder="solvixceo"
                      className="pl-7"
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>

            {/* Bio */}
            <SectionCard
              step="03"
              title="Über dich"
              description="Eine kurze Bio hilft anderen, dich einzuordnen."
              icon={<Sparkles className="h-4 w-4" />}
            >
              <Field label="Bio">
                <Textarea
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value.slice(0, BIO_MAX))}
                  placeholder="Coding, KI und SaaS. Ich baue Solvix in Public."
                  className="min-h-28 resize-none"
                />
              </Field>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Tipp: Konkrete Themen funktionieren besser als Buzzwords.</span>
                <span className="tabular-nums">
                  {form.bio.length}/{BIO_MAX}
                </span>
              </div>
            </SectionCard>

            {/* Links */}
            <SectionCard
              step="04"
              title="Links"
              description="Verbinde deine Projekte und Profile."
              icon={<Globe className="h-4 w-4" />}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Website">
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.websiteUrl}
                      onChange={(e) => updateField("websiteUrl", e.target.value)}
                      placeholder="https://deine-seite.com"
                      className="pl-9"
                    />
                  </div>
                </Field>
                <Field label="GitHub">
                  <div className="relative">
                    <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.githubUrl}
                      onChange={(e) => updateField("githubUrl", e.target.value)}
                      placeholder="https://github.com/deinname"
                      className="pl-9"
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>

            {/* Skills */}
            <SectionCard
              step="05"
              title="Skills"
              description="Womit arbeitest du? Maximal 8 Skills werden angezeigt."
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              <Field label="Skills (kommagetrennt)">
                <Input
                  value={form.skills}
                  onChange={(e) => updateField("skills", e.target.value)}
                  placeholder="React, AI Agents, SaaS, Supabase"
                />
              </Field>
              {skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-md border border-border/60 bg-accent/60 px-2.5 py-1 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* PREVIEW column */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live-Vorschau</div>
              <div className="flex h-2 w-2 items-center justify-center">
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="h-24 bg-[radial-gradient(circle_at_25%_20%,hsl(var(--primary)/.45),transparent_36%),linear-gradient(135deg,hsl(var(--accent)),transparent)]" />
              <div className="px-5 pb-5">
                <div className="-mt-10 flex items-end justify-between">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-card bg-accent">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-primary text-2xl font-semibold text-primary-foreground">
                        {initial}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    Folgen
                  </Button>
                </div>
                <h3 className="mt-4 truncate text-xl font-semibold">{displayName}</h3>
                <p className="text-sm text-muted-foreground">@{username}</p>
                <p className="mt-3 min-h-[2.5rem] text-sm text-muted-foreground">
                  {form.bio.trim() || "Kurze Bio über dich, deine Projekte und woran du gerade baust."}
                </p>
                {(safeUrl(form.githubUrl) || safeUrl(form.websiteUrl)) && (
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-4 text-sm">
                    {safeUrl(form.githubUrl) && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Github className="h-3.5 w-3.5" />
                        GitHub
                      </span>
                    )}
                    {safeUrl(form.websiteUrl) && (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </span>
                    )}
                  </div>
                )}
                {skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span key={skill} className="rounded-md bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="hidden text-xs text-muted-foreground sm:block">
            Änderungen werden erst nach dem Speichern öffentlich.
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Abbrechen</Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              size="sm"
              className="bg-gradient-primary shadow-glow hover:opacity-90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Profil speichern
            </Button>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function SectionCard({
  step,
  title,
  description,
  icon,
  children,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-2xl border border-border/80 bg-card/70 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur transition-colors hover:border-border">
      <div className="mb-5 flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-accent/60 text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Schritt {step}
          </div>
          <h2 className="mt-0.5 text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
