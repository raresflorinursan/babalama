import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Code2,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Shield,
  UserCheck,
  UserPlus,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";

type Conversation = {
  id: number;
  name: string;
  handle: string;
  role: string;
  avatar: string;
  preview: string;
  time: string;
  online?: boolean;
  unread?: number;
  pinned?: boolean;
  messages: ChatMessage[];
};

type ChatMessage = {
  id: number;
  body: string;
  time: string;
  own?: boolean;
};

const names = [
  ["Mia Dev", "miacodes", "Frontend Developer", "Ich kann dir beim Profil-Layout helfen.", true],
  [
    "AI Builder",
    "agentstack",
    "AI Agent Dev",
    "Wir koennen spaeter einen Agenten fuer Matching bauen.",
    false,
  ],
  ["Noah SaaS", "noahmvp", "SaaS Founder", "MVP Feedback waere stark.", false],
  [
    "Lina Backend",
    "linadb",
    "Backend Engineer",
    "Die RLS-Regeln sollten wir vor Launch pruefen.",
    true,
  ],
  ["Tom Product", "tomships", "Product Builder", "Ich habe eine Idee fuer Projekt-Reviews.", false],
  [
    "Sara Design",
    "saraui",
    "UI Designer",
    "Die Chatkarten koennten noch mehr Tiefe bekommen.",
    true,
  ],
  ["Max Automate", "maxflows", "Automation", "Ein Onboarding-Agent passt gut zu Solvix.", false],
  ["Elias Cloud", "eliasdeploy", "DevOps", "Vercel Logs sehen jetzt sauber aus.", false],
  ["Nora Learn", "noralabs", "Student", "Welche Mini-Projekte empfiehlst du?", true],
  ["Ben Founder", "benmvp", "Founder", "Ich suche Beta-Tester fuer mein Tool.", false],
  ["Kira AI", "kiraprompt", "Prompt Engineer", "Wir koennen Vorlagen fuer KI-Agenten bauen.", true],
  ["Leo Code", "leocode", "Fullstack", "Supabase Storage ist perfekt fuer Avatare.", false],
  ["Amir Growth", "amirgrowth", "Growth", "Build-in-public Posts brauchen bessere Hooks.", true],
  [
    "Jana Data",
    "janadata",
    "Data Analyst",
    "Ein Dashboard fuer Community-Metriken waere spannend.",
    false,
  ],
  ["Finn API", "finnapi", "API Developer", "Ich kann bei Webhooks helfen.", false],
  ["Mara QA", "maraqa", "QA Engineer", "Wir sollten Auth-Flows sauber testen.", true],
  ["Oskar Mobile", "oskario", "Mobile Dev", "Push-Notifications spaeter direkt mitdenken.", false],
  ["Nico Stack", "nicostack", "Builder", "Der Feed wirkt jetzt deutlich ruhiger.", false],
  ["Tessa Jobs", "tessatech", "Recruiting", "Ein Talent-Bereich waere stark.", true],
  ["Yasin Mentor", "yasinmentor", "Mentor", "Meetings fuer Code-Reviews machen Sinn.", false],
] as const;

const conversations: Conversation[] = names.map(([name, handle, role, preview, online], index) => ({
  id: index + 1,
  name,
  handle,
  role,
  avatar: name.slice(0, 1),
  preview,
  time:
    index === 0 ? "09:52" : index < 5 ? `${9 + index}:1${index}` : index < 12 ? "Gestern" : "Mo",
  online,
  unread: index % 5 === 0 ? index + 1 : undefined,
  pinned: index < 2,
  messages: [
    {
      id: index * 10 + 1,
      body: `Hey, ich habe deine Arbeit an Solvix gesehen. ${preview}`,
      time: index === 0 ? "09:45" : "18:10",
    },
    {
      id: index * 10 + 2,
      body: "Danke. Ich will die Plattform Schritt fuer Schritt professioneller machen.",
      time: index === 0 ? "09:47" : "18:14",
      own: true,
    },
    {
      id: index * 10 + 3,
      body: "Gute Richtung. Oeffentliche Community, private Chats und Meetings sollten klar getrennt sein.",
      time: index === 0 ? "09:52" : "18:18",
    },
  ],
}));

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [
      { title: "Chats — Solvix" },
      { name: "description", content: "Private 1:1 Chats fuer Solvix Mitglieder." },
      { property: "og:title", content: "Solvix Chats" },
      { property: "og:description", content: "Finde Nutzer und fuehre private Gespräche." },
    ],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [messageText, setMessageText] = useState("");
  const [localConversations, setLocalConversations] = useState(conversations);
  const [followingIds, setFollowingIds] = useState<Record<number, boolean>>({ 1: true, 4: true });
  const [bellIds, setBellIds] = useState<Record<number, boolean>>({ 1: true });

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return localConversations;
    return localConversations.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        chat.handle.toLowerCase().includes(query) ||
        chat.role.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query),
    );
  }, [localConversations, searchQuery]);

  const activeChat =
    localConversations.find((chat) => chat.id === activeId) ?? localConversations[0];
  const isFollowing = Boolean(followingIds[activeChat.id]);
  const bellActive = Boolean(bellIds[activeChat.id]);

  const sendMessage = () => {
    if (!messageText.trim()) return;
    setLocalConversations((current) =>
      current.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              preview: messageText.trim(),
              time: "jetzt",
              unread: undefined,
              messages: [
                ...chat.messages,
                {
                  id: Date.now(),
                  body: messageText.trim(),
                  time: "jetzt",
                  own: true,
                },
              ],
            }
          : chat,
      ),
    );
    setMessageText("");
  };

  return (
    <SiteShell hideFooter>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <label className="mb-5 flex min-w-0 items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-card-elegant backdrop-blur">
          <Search className="h-4 w-4 shrink-0 text-primary-glow" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Chats, Personen oder Rollen suchen"
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-5 md:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="max-h-[780px] space-y-2 overflow-y-auto pr-1">
              {filteredConversations.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveId(chat.id)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-card-elegant backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] ${
                    activeChat.id === chat.id
                      ? "border-primary/40 bg-accent text-foreground shadow-[0_12px_30px_hsl(217_91%_60%/0.16)]"
                      : "border-border bg-card/65 text-muted-foreground hover:border-border/80 hover:bg-accent/70 hover:text-foreground"
                  }`}
                >
                  <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {chat.avatar}
                    {chat.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{chat.name}</span>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs text-muted-foreground">@{chat.handle}</span>
                      {chat.pinned && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary-glow">
                          Pinned
                        </span>
                      )}
                    </div>
                  </div>
                  {chat.unread && (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                      {chat.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/75 shadow-card-elegant backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground">
                  {activeChat.avatar}
                  {activeChat.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{activeChat.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    @{activeChat.handle} · {activeChat.role}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    setFollowingIds((current) => ({
                      ...current,
                      [activeChat.id]: !current[activeChat.id],
                    }))
                  }
                  className={`h-9 ${isFollowing ? "bg-accent text-foreground hover:bg-accent/80" : "bg-gradient-primary shadow-glow hover:opacity-90"}`}
                >
                  {isFollowing ? (
                    <UserCheck className="mr-2 h-4 w-4" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{isFollowing ? "Entfolgen" : "Folgen"}</span>
                </Button>
                <Button
                  size="icon"
                  variant={bellActive ? "default" : "outline"}
                  onClick={() =>
                    setBellIds((current) => ({
                      ...current,
                      [activeChat.id]: !current[activeChat.id],
                    }))
                  }
                  className={`h-9 w-9 ${bellActive ? "bg-primary text-primary-foreground shadow-glow" : ""}`}
                  aria-label={bellActive ? "Glocke deaktivieren" : "Glocke aktivieren"}
                >
                  {bellActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" className="h-9">
                  <Video className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Meeting</span>
                </Button>
                <button
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Chat Optionen"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-[560px] flex-col justify-end gap-3 px-5 py-6">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary-glow" />
                Privater Chat zwischen dir und {activeChat.name}
              </div>
              {activeChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.own ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.own
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-foreground"
                    }`}
                  >
                    <p>{message.body}</p>
                    <div
                      className={`mt-1 text-[10px] ${message.own ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {message.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-end gap-3 rounded-2xl border border-border bg-background/70 p-2">
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Datei anhaengen"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Code senden"
                >
                  <Code2 className="h-4 w-4" />
                </button>
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Nachricht an ${activeChat.name}`}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-gradient-primary shadow-glow"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </main>
        </div>
      </section>
    </SiteShell>
  );
}
