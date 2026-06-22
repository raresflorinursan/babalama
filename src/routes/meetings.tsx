import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Search,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Meeting = {
  id: string;
  title: string;
  counterpartId: string;
  counterpartName: string;
  isCreator: boolean;
  type: string;
  startsAt: string;
  durationMinutes: number;
  status: "scheduled" | "cancelled" | "completed";
  code: string;
  notes: string;
};

type PersonOption = {
  id: string;
  name: string;
  handle: string;
};

const meetingTypes = [
  "Code Review",
  "Design Review",
  "Pair Coding",
  "SaaS Feedback",
  "AI Planning",
];
const hours = Array.from({ length: 24 }, (_, index) => index.toString().padStart(2, "0"));
const minutes = Array.from({ length: 12 }, (_, index) => (index * 5).toString().padStart(2, "0"));
const durationOptions = Array.from({ length: 12 }, (_, index) => `${(index + 1) * 15} min`);
const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const Route = createFileRoute("/meetings")({
  validateSearch: (search: Record<string, unknown>) => ({
    meeting: typeof search.meeting === "string" ? search.meeting : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Meetings — Solvix" },
      {
        name: "description",
        content: "Erstelle und verwalte Solvix Meetings fuer Coding, KI und SaaS.",
      },
      { property: "og:title", content: "Solvix Meetings" },
      { property: "og:description", content: "Plane private Calls, Reviews und Build-Sessions." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { meeting: requestedMeetingCode } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [account, setAccount] = useState({ name: "Solvix", handle: "profil", role: "Member" });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [person, setPerson] = useState("");
  const [meetingType, setMeetingType] = useState("Code Review");
  const [date, setDate] = useState(() => toDateInputValue(new Date(Date.now() + 86400000)));
  const [time, setTime] = useState("14:00");
  const [duration, setDuration] = useState("30 min");
  const [openPicker, setOpenPicker] = useState<"date" | "time" | "duration" | null>(null);
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);
  const calendarDays = useMemo(() => buildMonthCalendar(new Date()), []);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date()),
    [],
  );
  const [selectedHour, selectedMinute] = time.split(":");

  const filteredMeetings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return meetings;
    return meetings.filter(
      (meeting) =>
        meeting.title.toLowerCase().includes(query) ||
        meeting.counterpartName.toLowerCase().includes(query) ||
        meeting.type.toLowerCase().includes(query) ||
        meeting.notes.toLowerCase().includes(query),
    );
  }, [meetings, searchQuery]);

  const plannedCount = meetings.filter((meeting) => meeting.status === "scheduled").length;
  const todayCount = meetings.filter(
    (meeting) => meeting.status === "scheduled" && isToday(new Date(meeting.startsAt)),
  ).length;
  const participantCount = new Set(meetings.map((meeting) => meeting.counterpartId)).size;
  const nextSevenDaysCount = meetings.filter((meeting) => {
    const start = new Date(meeting.startsAt).getTime();
    return (
      meeting.status === "scheduled" && start >= Date.now() && start <= Date.now() + 7 * 86400000
    );
  }).length;

  const loadMeetings = useCallback(async () => {
    if (!user) {
      setMeetings([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [meetingResult, profileResult] = await Promise.all([
      supabase.from("meetings").select("*").order("starts_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, username, full_name, platform_role")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (meetingResult.error || profileResult.error) {
      toast.error(
        meetingResult.error?.message ??
          profileResult.error?.message ??
          "Meetings konnten nicht geladen werden.",
      );
      setLoading(false);
      return;
    }

    const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
    const ownProfile = profiles.get(user.id);
    if (ownProfile) {
      setAccount({
        name: ownProfile.full_name ?? ownProfile.username ?? "Solvix Nutzer",
        handle: ownProfile.username ?? "profil",
        role: formatRole(ownProfile.platform_role),
      });
    }

    const selectablePeople = (profileResult.data ?? [])
      .filter((profile) => profile.id !== user.id)
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name ?? profile.username ?? "Solvix Nutzer",
        handle: profile.username ?? "profil",
      }));
    setPeople(selectablePeople);
    setPerson((current) => current || selectablePeople[0]?.id || "");

    setMeetings(
      (meetingResult.data ?? []).map((meeting) => {
        const isCreator = meeting.creator_id === user.id;
        const counterpartId = isCreator ? meeting.participant_id : meeting.creator_id;
        const counterpart = profiles.get(counterpartId);
        return {
          id: meeting.id,
          title: meeting.title,
          counterpartId,
          counterpartName: counterpart?.full_name ?? counterpart?.username ?? "Unbekannter Nutzer",
          isCreator,
          type: meeting.meeting_type,
          startsAt: meeting.starts_at,
          durationMinutes: meeting.duration_minutes,
          status: meeting.status as Meeting["status"],
          code: meeting.meeting_code,
          notes: meeting.notes ?? "Keine Notizen hinterlegt.",
        };
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void loadMeetings();
  }, [authLoading, loadMeetings]);

  const createMeeting = async () => {
    if (!user) {
      toast.error("Melde dich an, um ein Meeting zu erstellen.");
      return;
    }
    if (!title.trim() || !person || creating) return;

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      toast.error("Wähle ein Datum und eine Uhrzeit in der Zukunft.");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("meetings").insert({
      creator_id: user.id,
      participant_id: person,
      title: title.trim(),
      meeting_type: meetingType,
      starts_at: startsAt.toISOString(),
      duration_minutes: Number.parseInt(duration, 10),
      notes: notes.trim() || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setTitle("");
      setNotes("");
      toast.success("Meeting wurde gespeichert.");
      await loadMeetings();
    }
    setCreating(false);
  };

  const cancelMeeting = async (meeting: Meeting) => {
    if (!user || !meeting.isCreator || meeting.status !== "scheduled") return;
    const { error } = await supabase
      .from("meetings")
      .update({ status: "cancelled" })
      .eq("id", meeting.id)
      .eq("creator_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Meeting wurde abgesagt.");
    await loadMeetings();
  };

  const copyMeetingLink = async (meeting: Meeting) => {
    const url = buildMeetingLink(meeting.code);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedMeetingId(meeting.id);
    window.setTimeout(
      () => setCopiedMeetingId((current) => (current === meeting.id ? null : current)),
      1400,
    );
  };

  if (!authLoading && !user) {
    return (
      <SiteShell hideFooter>
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary-glow">
            <Video className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Private Meetings</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Melde dich an, um deine persönlichen Termine zu planen und Einladungen zu sehen.
          </p>
          <Button asChild className="mt-6 bg-gradient-primary shadow-glow">
            <Link to="/auth">Anmelden</Link>
          </Button>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell hideFooter>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-card-elegant backdrop-blur">
          <Search className="h-4 w-4 shrink-0 text-primary-glow" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Meetings, Personen oder Themen suchen"
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-5 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Panel>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-glow">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Meeting erstellen</h1>
                <p className="text-sm text-muted-foreground">
                  Schnell planen, ohne lange Ladewege.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titel, z.B. Code Review"
                className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <PersonSelect value={person} onChange={setPerson} options={people} />
                <Select
                  label="Typ"
                  value={meetingType}
                  onChange={setMeetingType}
                  options={meetingTypes}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PopoverField
                  label="Datum"
                  value={formatDate(date)}
                  icon={<CalendarDays className="h-4 w-4 text-primary-glow" />}
                  open={openPicker === "date"}
                  onToggle={() => setOpenPicker((current) => (current === "date" ? null : "date"))}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium capitalize">{monthLabel}</div>
                    <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                      Monat
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
                    {weekdayLabels.map((day) => (
                      <div key={day} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1.5">
                    {calendarDays.map((item) => (
                      <button
                        key={`${item.label}-${item.date}`}
                        type="button"
                        disabled={!item.inMonth}
                        onClick={() => {
                          setDate(item.value);
                          setOpenPicker(null);
                        }}
                        className={`aspect-square rounded-xl border text-center text-sm transition-colors ${
                          date === item.value
                            ? "border-primary bg-primary text-primary-foreground shadow-glow"
                            : item.inMonth
                              ? "border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                              : "border-transparent bg-transparent text-transparent"
                        }`}
                      >
                        <span className="block text-sm font-medium">{item.date}</span>
                      </button>
                    ))}
                  </div>
                </PopoverField>

                <PopoverField
                  label="Uhrzeit"
                  value={time}
                  icon={<Clock3 className="h-4 w-4 text-primary-glow" />}
                  open={openPicker === "time"}
                  onToggle={() => setOpenPicker((current) => (current === "time" ? null : "time"))}
                >
                  <WheelPicker
                    leftLabel="Stunde"
                    rightLabel="Minute"
                    leftOptions={hours}
                    rightOptions={minutes}
                    leftValue={selectedHour}
                    rightValue={selectedMinute}
                    onLeftChange={(value) => setTime(`${value}:${selectedMinute}`)}
                    onRightChange={(value) => setTime(`${selectedHour}:${value}`)}
                    onDone={() => setOpenPicker(null)}
                  />
                </PopoverField>
              </div>

              <PopoverField
                label="Dauer"
                value={duration}
                icon={<Clock3 className="h-4 w-4 text-primary-glow" />}
                open={openPicker === "duration"}
                onToggle={() =>
                  setOpenPicker((current) => (current === "duration" ? null : "duration"))
                }
              >
                <DurationWheel
                  value={duration}
                  onChange={setDuration}
                  onDone={() => setOpenPicker(null)}
                />
              </PopoverField>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value.slice(0, 500))}
                placeholder="Notizen oder Agenda (optional)"
                className="min-h-20 w-full resize-none rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />

              <Button
                onClick={() => void createMeeting()}
                disabled={!title.trim() || !person || creating}
                className="w-full bg-gradient-primary shadow-glow"
              >
                {creating ? "Wird gespeichert" : "Meeting erstellen"}
                <Video className="ml-2 h-4 w-4" />
              </Button>
              {people.length === 0 && !loading && (
                <p className="text-center text-xs text-muted-foreground">
                  Sobald sich ein weiterer Nutzer registriert, kannst du ihn hier einladen.
                </p>
              )}
            </div>
          </Panel>

          <main className="space-y-4">
            <Panel className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow">
                    {account.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{account.name}</div>
                    <div className="text-xs text-muted-foreground">
                      @{account.handle} · {account.role}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:w-[420px]">
                  <Metric label="Geplant" value={plannedCount.toString()} />
                  <Metric label="Heute" value={todayCount.toString()} />
                  <Metric label="Teilnehmer" value={participantCount.toString()} />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                Persönliche Anzeige: {nextSevenDaysCount} Meeting
                {nextSevenDaysCount === 1 ? "" : "s"} in den nächsten sieben Tagen.
              </div>
            </Panel>

            {loading ? (
              <Panel className="py-14 text-center">
                <p className="text-sm text-muted-foreground">Meetings werden geladen…</p>
              </Panel>
            ) : filteredMeetings.length === 0 ? (
              <Panel className="py-14 text-center">
                <CalendarDays className="mx-auto h-7 w-7 text-primary-glow" />
                <p className="mt-3 font-medium">Noch keine Meetings</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Erstelle deinen ersten privaten Termin mit einem registrierten Nutzer.
                </p>
              </Panel>
            ) : (
              filteredMeetings.map((meeting) => {
                const start = new Date(meeting.startsAt);
                return (
                  <article
                    key={meeting.id}
                    className={`rounded-2xl border bg-card/75 p-4 shadow-card-elegant backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 ${
                      meeting.code === requestedMeetingCode
                        ? "border-primary/70 ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary-glow">
                            {formatStatus(meeting.status, start)}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {meeting.type}
                          </span>
                          {!meeting.isCreator && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                              Einladung
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 text-base font-semibold">{meeting.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {meeting.isCreator ? "Mit" : "Von"} {meeting.counterpartName}
                        </p>
                        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                          {meeting.notes}
                        </p>
                      </div>
                      <div className="grid w-full gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs sm:grid-cols-2 lg:w-72">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-primary-glow" />
                          {formatDateTimeDate(start)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5 text-primary-glow" />
                          {formatTime(start)} · {meeting.durationMinutes} min
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary-glow" />
                          Du + {meeting.counterpartName}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyMeetingLink(meeting)}
                          className="flex min-w-0 items-center justify-between rounded-lg border border-border bg-card px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          <span className="truncate">Meeting-Link kopieren</span>
                          {copiedMeetingId === meeting.id ? (
                            <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-primary-glow" />
                          ) : (
                            <Copy className="ml-2 h-3.5 w-3.5 shrink-0" />
                          )}
                        </button>
                        {meeting.isCreator && meeting.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => void cancelMeeting(meeting)}
                            className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-destructive sm:col-span-2"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Meeting absagen
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </main>
        </div>
      </section>
    </SiteShell>
  );
}

function buildMonthCalendar(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = startOffset + lastDay.getDate();
  const totalCells = Math.ceil(cells / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
    const date = inMonth ? new Date(year, month, dayNumber) : new Date(year, month, 1);
    return {
      date: inMonth ? dayNumber.toString() : "",
      inMonth,
      value: inMonth ? toDateInputValue(date) : "",
      label: inMonth
        ? new Intl.DateTimeFormat("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          }).format(date)
        : "",
    };
  });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

function formatDateTimeDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatStatus(status: Meeting["status"], startsAt: Date) {
  if (status === "cancelled") return "Abgesagt";
  if (status === "completed") return "Abgeschlossen";
  return isToday(startsAt) ? "Heute" : "Geplant";
}

function formatRole(role: string) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderation";
  return "Member";
}

function buildMeetingLink(code: string) {
  const origin =
    typeof window === "undefined" ? "https://babalama.vercel.app" : window.location.origin;
  return `${origin}/meetings?meeting=${encodeURIComponent(code)}`;
}

function PersonSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: PersonOption[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted-foreground">Person</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
        className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60"
      >
        {options.length === 0 ? (
          <option value="">Keine Nutzer verfügbar</option>
        ) : (
          options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} (@{option.handle})
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PopoverField({
  label,
  value,
  icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="mb-1.5 text-xs text-muted-foreground">{label}</div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background/70 px-3 py-2.5 text-left text-sm outline-none transition-colors hover:border-primary/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{value}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border bg-card/95 p-3 shadow-card-elegant backdrop-blur-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function WheelPicker({
  leftLabel,
  rightLabel,
  leftOptions,
  rightOptions,
  leftValue,
  rightValue,
  onLeftChange,
  onRightChange,
  onDone,
}: {
  leftLabel: string;
  rightLabel: string;
  leftOptions: string[];
  rightOptions: string[];
  leftValue: string;
  rightValue: string;
  onLeftChange: (value: string) => void;
  onRightChange: (value: string) => void;
  onDone: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <WheelColumn
          label={leftLabel}
          value={leftValue}
          options={leftOptions}
          onChange={onLeftChange}
        />
        <WheelColumn
          label={rightLabel}
          value={rightValue}
          options={rightOptions}
          onChange={onRightChange}
        />
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-3 w-full rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary-glow transition-colors hover:bg-primary/25"
      >
        Übernehmen
      </button>
    </div>
  );
}

function DurationWheel({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
}) {
  return (
    <div>
      <WheelColumn
        label="Dauer bis max. 3 Stunden"
        value={value}
        options={durationOptions}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={onDone}
        className="mt-3 w-full rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary-glow transition-colors hover:bg-primary/25"
      >
        Übernehmen
      </button>
    </div>
  );
}

function WheelColumn({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-center text-[11px] text-muted-foreground">{label}</div>
      <div className="max-h-44 overflow-y-auto rounded-2xl border border-border bg-background/60 p-1.5 [scrollbar-width:thin]">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`mb-1 flex h-10 w-full items-center justify-center rounded-xl text-sm transition-colors last:mb-0 ${
              value === option
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card/70 p-4 shadow-card-elegant backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
