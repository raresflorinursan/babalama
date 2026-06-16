import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Clock3, Copy, Search, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";

type Meeting = {
  id: number;
  title: string;
  with: string;
  type: string;
  date: string;
  time: string;
  duration: string;
  status: "Geplant" | "Heute" | "Entwurf";
  link: string;
  notes: string;
};

const account = {
  name: "SolvixCEO",
  handle: "solvixceo",
  role: "Founder",
  weeklyCapacity: 6,
};

const people = ["Mia Dev", "AI Builder", "Noah SaaS", "Lina Backend"];
const meetingTypes = ["Code Review", "Design Review", "Pair Coding", "SaaS Feedback", "AI Planning"];
const quickDates = ["Heute", "Morgen", "Freitag", "Naechste Woche"];
const calendarDays = [
  { day: "Mo", date: "17", label: "Mo, 17" },
  { day: "Di", date: "18", label: "Di, 18" },
  { day: "Mi", date: "19", label: "Mi, 19" },
  { day: "Do", date: "20", label: "Do, 20" },
  { day: "Fr", date: "21", label: "Fr, 21" },
  { day: "Sa", date: "22", label: "Sa, 22" },
  { day: "So", date: "23", label: "So, 23" },
];
const quickTimes = ["09:00", "10:30", "11:00", "14:00", "15:30", "16:30", "18:00", "19:30"];
const durations = ["15 min", "30 min", "45 min", "60 min"];

const starterMeetings: Meeting[] = [
  {
    id: 1,
    title: "Solvix Profil Review",
    with: "Mia Dev",
    type: "Design Review",
    date: "Heute",
    time: "16:30",
    duration: "30 min",
    status: "Heute",
    link: "solvix.app/meet/profil-review",
    notes: "Profilheader, Follow-Button und mobile Ansicht besprechen.",
  },
  {
    id: 2,
    title: "AI Agent MVP Planung",
    with: "AI Builder",
    type: "AI Planning",
    date: "Morgen",
    time: "11:00",
    duration: "45 min",
    status: "Geplant",
    link: "solvix.app/meet/agent-mvp",
    notes: "Use Case, Datenfluss und erste Automationen definieren.",
  },
  {
    id: 3,
    title: "SaaS Feedback Session",
    with: "Noah SaaS",
    type: "SaaS Feedback",
    date: "Fr, 21",
    time: "18:00",
    duration: "30 min",
    status: "Geplant",
    link: "solvix.app/meet/saas-feedback",
    notes: "MVP testen und klare nächste Aufgaben festlegen.",
  },
];

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Solvix" },
      { name: "description", content: "Erstelle und verwalte Solvix Meetings fuer Coding, KI und SaaS." },
      { property: "og:title", content: "Solvix Meetings" },
      { property: "og:description", content: "Plane private Calls, Reviews und Build-Sessions." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const [meetings, setMeetings] = useState(starterMeetings);
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [person, setPerson] = useState("Mia Dev");
  const [meetingType, setMeetingType] = useState("Code Review");
  const [date, setDate] = useState("Morgen");
  const [time, setTime] = useState("14:00");
  const [duration, setDuration] = useState("30 min");

  const filteredMeetings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return meetings;
    return meetings.filter(
      (meeting) =>
        meeting.title.toLowerCase().includes(query) ||
        meeting.with.toLowerCase().includes(query) ||
        meeting.type.toLowerCase().includes(query) ||
        meeting.notes.toLowerCase().includes(query),
    );
  }, [meetings, searchQuery]);

  const plannedCount = meetings.filter((meeting) => meeting.status === "Geplant").length;
  const todayCount = meetings.filter((meeting) => meeting.status === "Heute").length;
  const participantCount = new Set(meetings.map((meeting) => meeting.with)).size + 1;

  const createMeeting = () => {
    if (!title.trim()) return;
    setMeetings((current) => [
      {
        id: Date.now(),
        title: title.trim(),
        with: person,
        type: meetingType,
        date,
        time,
        duration,
        status: date === "Heute" ? "Heute" : "Geplant",
        link: `solvix.app/meet/${title.trim().toLowerCase().replaceAll(" ", "-")}`,
        notes: "Neu erstelltes Meeting. Details koennen spaeter erweitert werden.",
      },
      ...current,
    ]);
    setTitle("");
  };

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
                <p className="text-sm text-muted-foreground">Schnell planen, ohne lange Ladewege.</p>
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
                <Select label="Person" value={person} onChange={setPerson} options={people} />
                <Select label="Typ" value={meetingType} onChange={setMeetingType} options={meetingTypes} />
              </div>

              <Picker label="Tag auswählen">
                <div className="grid grid-cols-2 gap-2">
                  {quickDates.map((value) => (
                    <Choice key={value} active={date === value} onClick={() => setDate(value)}>
                      {value}
                    </Choice>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarDays.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setDate(item.label)}
                      className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                        date === item.label
                          ? "border-primary bg-primary text-primary-foreground shadow-glow"
                          : "border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <span className="block text-[10px]">{item.day}</span>
                      <span className="block text-sm font-medium">{item.date}</span>
                    </button>
                  ))}
                </div>
              </Picker>

              <Picker label="Uhrzeit auswählen">
                <div className="grid grid-cols-4 gap-2">
                  {quickTimes.map((value) => (
                    <Choice key={value} active={time === value} onClick={() => setTime(value)}>
                      {value}
                    </Choice>
                  ))}
                </div>
                <input
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Picker>

              <Picker label="Dauer">
                <div className="grid grid-cols-4 gap-2">
                  {durations.map((value) => (
                    <Choice key={value} active={duration === value} onClick={() => setDuration(value)}>
                      {value}
                    </Choice>
                  ))}
                </div>
              </Picker>

              <Button onClick={createMeeting} disabled={!title.trim()} className="w-full bg-gradient-primary shadow-glow">
                Meeting erstellen
                <Video className="ml-2 h-4 w-4" />
              </Button>
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
                    <div className="text-xs text-muted-foreground">@{account.handle} · {account.role}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:w-[420px]">
                  <Metric label="Geplant" value={plannedCount.toString()} />
                  <Metric label="Heute" value={todayCount.toString()} />
                  <Metric label="Teilnehmer" value={participantCount.toString()} />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                Personalisierte Anzeige fuer deinen Account: {meetings.length} von {account.weeklyCapacity} Meeting-Slots diese Woche geplant.
              </div>
            </Panel>

            {filteredMeetings.map((meeting) => (
              <article key={meeting.id} className="rounded-2xl border border-border bg-card/75 p-5 shadow-card-elegant backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary-glow">{meeting.status}</span>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{meeting.type}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">{meeting.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Mit {meeting.with}</p>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{meeting.notes}</p>
                  </div>
                  <div className="w-full rounded-xl border border-border bg-background/60 p-3 lg:w-64">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-primary-glow" />
                      {meeting.date}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Clock3 className="h-4 w-4 text-primary-glow" />
                      {meeting.time} · {meeting.duration}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary-glow" />
                      Du + {meeting.with}
                    </div>
                    <button className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground">
                      <span className="truncate">{meeting.link}</span>
                      <Copy className="ml-2 h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </main>
        </div>
      </section>
    </SiteShell>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
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

function Picker({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs text-muted-foreground">{label}</div>
      <div className="rounded-2xl border border-border bg-background/40 p-3">{children}</div>
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-glow"
          : "border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
    <div className={`rounded-2xl border border-border bg-card/70 p-4 shadow-card-elegant backdrop-blur ${className}`}>
      {children}
    </div>
  );
}
