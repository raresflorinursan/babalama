import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ban, CheckCircle2, Clock3, Eye, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const adminRoles = new Set(["owner", "admin", "moderator"]);
const statusLabels: Record<string, string> = {
  pending: "Offen",
  reviewing: "In Prüfung",
  resolved: "Erledigt",
  dismissed: "Abgelehnt",
};
const reasonLabels: Record<string, string> = {
  spam: "Spam oder Werbung",
  harassment: "Belästigung oder Mobbing",
  hate: "Hassrede",
  misinformation: "Irreführende Information",
  impersonation: "Identitätsmissbrauch",
  illegal: "Rechtswidriger Inhalt",
  other: "Anderer Grund",
};

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!profile || !adminRoles.has(profile.platform_role)) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Moderation — Solvix" },
      { name: "description", content: "Geschützter Moderationsbereich von Solvix." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("pending");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-moderation"],
    queryFn: async () => {
      const [reportResult, restrictionResult] = await Promise.all([
        supabase.from("content_reports").select("*").order("created_at", { ascending: false }),
        supabase.from("user_restrictions").select("*").order("created_at", { ascending: false }),
      ]);
      if (reportResult.error) throw reportResult.error;
      if (restrictionResult.error) throw restrictionResult.error;

      const profileIds = Array.from(
        new Set(
          (reportResult.data ?? []).flatMap((report) => [
            report.reporter_id,
            report.target_owner_id,
          ]),
        ),
      );
      const { data: profiles, error: profileError } = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, full_name, platform_role")
            .in("id", profileIds)
        : { data: [], error: null };
      if (profileError) throw profileError;

      return {
        reports: reportResult.data ?? [],
        restrictions: restrictionResult.data ?? [],
        profiles: new Map((profiles ?? []).map((profile) => [profile.id, profile])),
      };
    },
  });

  const visibleReports = useMemo(
    () => (data?.reports ?? []).filter((report) => filter === "all" || report.status === filter),
    [data?.reports, filter],
  );
  const restrictionByUser = useMemo(
    () =>
      new Map((data?.restrictions ?? []).map((restriction) => [restriction.user_id, restriction])),
    [data?.restrictions],
  );

  const updateReport = async (reportId: string, status: string, adminNotes?: string) => {
    if (!user) return;
    const { error: updateError } = await supabase
      .from("content_reports")
      .update({
        status,
        admin_notes: adminNotes ?? null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success("Meldung aktualisiert.");
    await refetch();
  };

  const removeContent = async (report: NonNullable<typeof data>["reports"][number]) => {
    if (!window.confirm("Diesen Inhalt aus der Community entfernen?")) return;
    const result =
      report.target_type === "post"
        ? await supabase
            .from("community_posts")
            .update({ is_removed: true })
            .eq("id", report.target_id)
        : report.target_type === "comment"
          ? await supabase
              .from("community_post_comments")
              .update({ is_removed: true })
              .eq("id", report.target_id)
          : null;
    if (!result) {
      toast.error("Für eine Nutzermeldung gibt es keinen einzelnen Inhalt zum Entfernen.");
      return;
    }
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    await updateReport(report.id, "resolved", "Gemeldeter Inhalt wurde entfernt.");
  };

  const restrictUser = async (
    report: NonNullable<typeof data>["reports"][number],
    status: "suspended" | "banned",
  ) => {
    if (!user) return;
    const target = data?.profiles.get(report.target_owner_id);
    if (target && adminRoles.has(target.platform_role)) {
      toast.error("Administrationskonten können hier nicht gesperrt werden.");
      return;
    }
    const label = status === "banned" ? "dauerhaft sperren" : "für sieben Tage sperren";
    if (!window.confirm(`@${target?.username ?? "unbekannt"} ${label}?`)) return;

    const expiresAt =
      status === "suspended" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error: restrictionError } = await supabase.from("user_restrictions").upsert(
      {
        user_id: report.target_owner_id,
        status,
        reason: reasonLabels[report.reason] ?? report.reason,
        expires_at: expiresAt,
        created_by: user.id,
      },
      { onConflict: "user_id" },
    );
    if (restrictionError) {
      toast.error(restrictionError.message);
      return;
    }
    toast.success(status === "banned" ? "Nutzer wurde gesperrt." : "Nutzer wurde suspendiert.");
    await updateReport(report.id, "resolved", `Nutzerstatus: ${status}.`);
  };

  const liftRestriction = async (userId: string) => {
    if (!window.confirm("Diese Kontosperre aufheben?")) return;
    const { error: deleteError } = await supabase
      .from("user_restrictions")
      .delete()
      .eq("user_id", userId);
    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }
    toast.success("Kontosperre wurde aufgehoben.");
    await refetch();
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-primary-glow">
              <ShieldCheck className="h-4 w-4" />
              Geschützter Bereich
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Moderation</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Meldungen prüfen, problematische Inhalte entfernen und Kontozugriffe kontrollieren.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Metric
              label="Offen"
              value={(data?.reports ?? []).filter((item) => item.status === "pending").length}
            />
            <Metric
              label="Prüfung"
              value={(data?.reports ?? []).filter((item) => item.status === "reviewing").length}
            />
            <Metric label="Gesperrt" value={data?.restrictions.length ?? 0} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["pending", "reviewing", "resolved", "dismissed", "all"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm",
                filter === status
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {status === "all" ? "Alle" : statusLabels[status]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Meldungen werden geladen…
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-destructive">
              Moderationsdaten konnten nicht geladen werden.
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>
              Erneut versuchen
            </Button>
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary-glow" />
            <p className="mt-3 font-medium">Keine Meldungen in dieser Ansicht</p>
            <p className="mt-1 text-sm text-muted-foreground">Der aktuelle Prüfbereich ist leer.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {visibleReports.map((report) => {
              const reporter = data?.profiles.get(report.reporter_id);
              const target = data?.profiles.get(report.target_owner_id);
              const restriction = restrictionByUser.get(report.target_owner_id);
              return (
                <article
                  key={report.id}
                  className="rounded-xl border border-border bg-card/75 p-5 shadow-card-elegant"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">
                          {reasonLabels[report.reason] ?? report.reason}
                        </span>
                        <span>{statusLabels[report.status] ?? report.status}</span>
                        <span>{new Date(report.created_at).toLocaleString("de-DE")}</span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
                        {report.target_excerpt}
                      </p>
                      {report.details && (
                        <p className="mt-3 rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
                          Hinweis: {report.details}
                        </p>
                      )}
                      <div className="mt-3 text-xs text-muted-foreground">
                        Gemeldet von @{reporter?.username ?? "unbekannt"} · Ziel @
                        {target?.username ?? "unbekannt"} · {report.target_type}
                      </div>
                      {restriction && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          <Ban className="h-3.5 w-3.5" />
                          Konto: {restriction.status}
                          {restriction.expires_at &&
                            ` bis ${new Date(restriction.expires_at).toLocaleDateString("de-DE")}`}
                        </div>
                      )}
                    </div>
                    <div className="flex max-w-md flex-wrap gap-2 lg:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateReport(report.id, "reviewing")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> Prüfen
                      </Button>
                      {(report.target_type === "post" || report.target_type === "comment") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void removeContent(report)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Inhalt entfernen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void restrictUser(report, "suspended")}
                      >
                        <Clock3 className="mr-2 h-4 w-4" /> 7 Tage
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void restrictUser(report, "banned")}
                      >
                        <Ban className="mr-2 h-4 w-4" /> Sperren
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void updateReport(report.id, "dismissed")}
                      >
                        <ShieldOff className="mr-2 h-4 w-4" /> Ablehnen
                      </Button>
                      {restriction && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void liftRestriction(report.target_owner_id)}
                        >
                          Sperre aufheben
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-lg border border-border bg-card/60 px-3 py-2">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
