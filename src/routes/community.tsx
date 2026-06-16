import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bot,
  CircleHelp,
  Code2,
  Flame,
  Heart,
  ImagePlus,
  Rocket,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";

type Post = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  role: string;
  time: string;
  body: string;
  category: string;
  tags: string[];
  replies: number;
  likes: number;
  shares: number;
  followed?: boolean;
};

const categories = ["Allgemein", "Gefolgt", "Coding", "KI", "SaaS", "Projekte", "Fragen"];

const categoryKeywords: Record<string, string[]> = {
  Fragen: ["?", "frage", "fragen", "hilfe", "warum", "wie", "problem", "fehler", "bug", "geht nicht"],
  Coding: ["code", "coding", "react", "typescript", "javascript", "api", "frontend", "backend", "component", "funktion", "datenbank", "supabase"],
  KI: ["ki", "ai", "agent", "prompt", "automation", "automatisieren", "modell", "llm", "openai"],
  SaaS: ["saas", "mvp", "kunde", "kunden", "abo", "subscription", "revenue", "umsatz", "business", "startup"],
  Projekte: ["projekt", "baue", "bauen", "feature", "launch", "upload", "dashboard", "plattform", "release"],
};

function detectCategory(text: string) {
  const normalized = text.toLowerCase();
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => ({
    category,
    score: keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0),
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.score > 0 ? best.category : "Projekte";
}

function getCategoryTags(category: string) {
  const tags: Record<string, string[]> = {
    Fragen: ["Frage", "Community Help"],
    Coding: ["Coding", "Development"],
    KI: ["AI", "Automation"],
    SaaS: ["SaaS", "Business"],
    Projekte: ["Build in Public", "Projekt"],
  };
  return tags[category] ?? ["Community", category];
}

function CategoryIcon({ category, className = "h-4 w-4" }: { category: string; className?: string }) {
  if (category === "Fragen") return <CircleHelp className={className} />;
  if (category === "Coding") return <Code2 className={className} />;
  if (category === "KI") return <Bot className={className} />;
  if (category === "SaaS") return <Sparkles className={className} />;
  if (category === "Projekte") return <Rocket className={className} />;
  if (category === "Gefolgt") return <Users className={className} />;
  return <Flame className={className} />;
}

const starterPosts: Post[] = [
  {
    id: 1,
    name: "SolvixCEO",
    handle: "solvixceo",
    avatar: "S",
    role: "Founder",
    time: "2 min",
    body: "Ich baue gerade die naechste Community-Funktion: kurze Updates, Fragen und Projektfortschritte an einem Ort.",
    category: "Projekte",
    tags: ["Build in Public", "Supabase", "SaaS"],
    replies: 12,
    likes: 48,
    shares: 7,
    followed: false,
  },
  {
    id: 2,
    name: "Mia Dev",
    handle: "miacodes",
    avatar: "M",
    role: "Frontend",
    time: "18 min",
    body: "Tutorials sind gut. Aber ein kleines eigenes Feature pro Tag bringt dich schneller nach vorne.",
    category: "Coding",
    tags: ["Coding", "Learning", "Projects"],
    replies: 6,
    likes: 31,
    shares: 5,
    followed: true,
  },
  {
    id: 3,
    name: "AI Builder",
    handle: "agentstack",
    avatar: "A",
    role: "AI Agent Dev",
    time: "43 min",
    body: "Ein guter AI-Agent braucht nicht nur Prompts. Er braucht Daten, Tools, Logs und eine klare wiederholbare Aufgabe.",
    category: "KI",
    tags: ["AI Agents", "Automation", "Systems"],
    replies: 19,
    likes: 86,
    shares: 14,
    followed: true,
  },
];

const people = [
  { name: "SolvixCEO", handle: "solvixceo", role: "Founder" },
  { name: "Mia Dev", handle: "miacodes", role: "Frontend" },
  { name: "AI Builder", handle: "agentstack", role: "Automation" },
  { name: "Noah SaaS", handle: "noahmvp", role: "SaaS Founder" },
];

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Solvix" },
      { name: "description", content: "Solvix Community Feed fuer Coding, KI, SaaS und Build in Public." },
      { property: "og:title", content: "Solvix Community" },
      { property: "og:description", content: "Poste Updates, suche Builder und entdecke passende Kategorien." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState(starterPosts);
  const [activeCategory, setActiveCategory] = useState("Allgemein");
  const [searchQuery, setSearchQuery] = useState("");

  const remaining = 240 - postText.length;
  const canPost = postText.trim().length > 0 && postText.length <= 240;
  const detectedCategory = useMemo(() => detectCategory(postText), [postText]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === "Allgemein" ||
        (activeCategory === "Gefolgt" ? post.followed : post.category === activeCategory);
      const matchesSearch =
        !query ||
        post.name.toLowerCase().includes(query) ||
        post.handle.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, posts, searchQuery]);

  const matchingPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return people;
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.handle.toLowerCase().includes(query) ||
        person.role.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const publishPost = () => {
    if (!canPost) return;
    setPosts((current) => [
      {
        id: Date.now(),
        name: "SolvixCEO",
        handle: "solvixceo",
        avatar: "S",
        role: "Founder",
        time: "jetzt",
        body: postText.trim(),
        category: detectedCategory,
        tags: getCategoryTags(detectedCategory),
        replies: 0,
        likes: 0,
        shares: 0,
        followed: true,
      },
      ...current,
    ]);
    setPostText("");
  };

  return (
    <SiteShell hideFooter>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-card-elegant backdrop-blur">
          <Search className="h-4 w-4 shrink-0 text-primary-glow" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Posts, Personen oder Kategorien suchen"
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "border border-border bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <CategoryIcon category={category} />
              {category}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-4">

          <div className="rounded-2xl border border-border bg-card/75 p-4 shadow-card-elegant backdrop-blur">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow">
                S
              </div>
              <div className="min-w-0 flex-1">
                <textarea
                  value={postText}
                  onChange={(event) => setPostText(event.target.value.slice(0, 260))}
                  placeholder="Was moechtest du teilen?"
                  className="min-h-24 w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                />
                <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-foreground" aria-label="Bild hinzufuegen">
                      <ImagePlus className="h-4 w-4" />
                    </button>
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-foreground" aria-label="Code Snippet">
                      <Code2 className="h-4 w-4" />
                    </button>
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon category={detectedCategory} className="h-3.5 w-3.5" />
                      Erkannt: {detectedCategory}
                    </span>
                    <span className={remaining < 0 ? "text-destructive" : ""}>{remaining} Zeichen</span>
                  </div>
                  <Button onClick={publishPost} disabled={!canPost} className="bg-gradient-primary shadow-glow hover:opacity-90">
                    Posten
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <Panel className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Keine passenden Posts gefunden.</p>
            </Panel>
          )}
          </main>

          <aside className="space-y-4">
          <Panel>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary-glow" />
              Nutzer finden
            </div>
            <div className="mt-4 space-y-3">
              {matchingPeople.map((person) => (
                <div key={person.handle} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-xs font-medium text-primary-glow">
                      {person.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{person.name}</div>
                      <div className="truncate text-xs text-muted-foreground">@{person.handle} · {person.role}</div>
                    </div>
                  </div>
                  <button className="rounded-md px-2 py-1 text-xs text-primary-glow hover:bg-accent">Profil</button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Flame className="h-4 w-4 text-primary-glow" />
              Aktive Themen
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["AI Agents", "SaaS MVPs", "React Start", "Supabase Auth", "Build in Public"].map((trend) => (
                <button
                  key={trend}
                  onClick={() => setSearchQuery(trend)}
                  className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  #{trend.replaceAll(" ", "")}
                </button>
              ))}
            </div>
          </Panel>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="rounded-2xl border border-border bg-card/75 p-4 shadow-card-elegant backdrop-blur">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-sm font-semibold text-primary-glow">
          {post.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{post.name}</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary-glow">{post.role}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  <CategoryIcon category={post.category} className="h-3 w-3" />
                  {post.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                @{post.handle} · {post.time}
              </p>
            </div>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Mehr Optionen">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{post.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                #{tag.replaceAll(" ", "")}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              <MessageCircle className="h-4 w-4" />
              {post.replies}
            </button>
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Heart className="h-4 w-4" />
              {post.likes}
            </button>
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Share2 className="h-4 w-4" />
              {post.shares}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card/70 p-4 shadow-card-elegant backdrop-blur ${className}`}>
      {children}
    </div>
  );
}
