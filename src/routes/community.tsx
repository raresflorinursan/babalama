import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  BellOff,
  Bot,
  CircleHelp,
  Code2,
  EyeOff,
  Flame,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Newspaper,
  Rocket,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildPublicShareUrl } from "@/lib/platform-security";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Person = {
  id: string;
  name: string;
  handle: string;
  profileId: string;
  avatar: string;
  role: string;
  bio: string;
  followed: boolean;
  notifications: boolean;
};

type Post = {
  id: string;
  authorId: string;
  time: string;
  createdAt: string;
  body: string;
  category: string;
  tags: string[];
  replies: number;
  likes: number;
  shares: number;
  isEditorial: boolean;
  liked: boolean;
  commentsOpen?: boolean;
};

type CommunityComment = {
  id: string;
  body: string;
  time: string;
  author: Person;
};

type ReportTarget = {
  type: "post" | "comment" | "user";
  id: string;
  ownerId: string;
  label: string;
  excerpt: string;
};

const categories = ["Allgemein", "Gefolgt", "Coding", "KI", "SaaS", "Projekte", "Fragen"];

const aiNewsSources = [
  {
    source: "OpenAI News",
    topic: "ChatGPT, Codex und neue KI-Produkte",
    url: "https://openai.com/news/",
  },
  {
    source: "GitHub Blog",
    topic: "Copilot, Coding-Workflows und Developer Tools",
    url: "https://github.blog/",
  },
  {
    source: "Microsoft AI Blog",
    topic: "Copilot, Cloud und Enterprise-KI",
    url: "https://blogs.microsoft.com/ai/",
  },
  {
    source: "Google DeepMind",
    topic: "KI-Forschung, Modelle und Produktupdates",
    url: "https://deepmind.google/discover/blog/",
  },
];

const categoryKeywords: Record<string, string[]> = {
  Fragen: [
    "?",
    "frage",
    "fragen",
    "hilfe",
    "warum",
    "wie",
    "problem",
    "fehler",
    "bug",
    "geht nicht",
  ],
  Coding: [
    "code",
    "coding",
    "react",
    "typescript",
    "javascript",
    "api",
    "frontend",
    "backend",
    "component",
    "funktion",
    "datenbank",
    "supabase",
  ],
  KI: ["ki", "ai", "agent", "prompt", "automation", "automatisieren", "modell", "llm", "openai"],
  SaaS: [
    "saas",
    "mvp",
    "kunde",
    "kunden",
    "abo",
    "subscription",
    "revenue",
    "umsatz",
    "business",
    "startup",
  ],
  Projekte: [
    "projekt",
    "baue",
    "bauen",
    "feature",
    "launch",
    "upload",
    "dashboard",
    "plattform",
    "release",
  ],
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

function extractHashTags(text: string) {
  return Array.from(new Set((text.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((tag) => tag.slice(1))));
}

function getCategoryTags(category: string, body: string) {
  const customTags = extractHashTags(body);
  if (customTags.length > 0) return customTags;
  const tags: Record<string, string[]> = {
    Fragen: ["Frage", "CommunityHelp"],
    Coding: ["Coding", "Development"],
    KI: ["KI", "Automation"],
    SaaS: ["SaaS", "Business"],
    Projekte: ["BuildInPublic", "Projekt"],
  };
  return tags[category] ?? ["Community", category];
}

function formatRelativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "jetzt";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} T.`;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
}

function personFromProfile(
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  },
  previous?: Person,
): Person {
  const handle = profile.username || `creator_${profile.id.slice(0, 8)}`;
  const name = profile.full_name || profile.username || "Solvix Builder";
  return {
    id: profile.id,
    name,
    handle,
    profileId: profile.id,
    avatar: name.slice(0, 1).toUpperCase(),
    role: handle.toLowerCase() === "solvixceo" ? "Founder" : "Builder",
    bio: profile.bio || "Baut und teilt Projekte auf Solvix.",
    followed: previous?.followed ?? false,
    notifications: previous?.notifications ?? false,
  };
}

function CategoryIcon({
  category,
  className = "h-4 w-4",
}: {
  category: string;
  className?: string;
}) {
  if (category === "Fragen") return <CircleHelp className={className} />;
  if (category === "Coding") return <Code2 className={className} />;
  if (category === "KI") return <Bot className={className} />;
  if (category === "SaaS") return <Sparkles className={className} />;
  if (category === "Projekte") return <Rocket className={className} />;
  if (category === "Gefolgt") return <Users className={className} />;
  return <Flame className={className} />;
}

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Solvix" },
      {
        name: "description",
        content: "Solvix Community Feed für Coding, KI, SaaS und Build in Public.",
      },
      { property: "og:title", content: "Solvix Community" },
      {
        property: "og:description",
        content: "Poste Updates, suche Builder und entdecke passende Kategorien.",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Allgemein"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareDialogPostId, setShareDialogPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const remaining = 200 - postText.length;
  const canPost =
    Boolean(user) && postText.trim().length > 0 && postText.length <= 200 && !publishing;
  const detectedCategory = useMemo(() => detectCategory(postText), [postText]);
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const shareDialogPost = shareDialogPostId
    ? posts.find((post) => post.id === shareDialogPostId)
    : undefined;
  const shareDialogAuthor = shareDialogPost ? peopleById.get(shareDialogPost.authorId) : undefined;
  const currentPerson = user ? peopleById.get(user.id) : undefined;

  const loadCommunity = useCallback(async () => {
    setFeedError(null);
    const { data: postRows, error: postError } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postError) {
      setFeedError(postError.message);
      setFeedLoading(false);
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio")
      .order("created_at", { ascending: false })
      .limit(50);

    if (profileError) {
      setFeedError(profileError.message);
      setFeedLoading(false);
      return;
    }

    let likedIds = new Set<string>();
    const followSettings = new Map<string, boolean>();
    let blockedIds = new Set<string>();
    if (user) {
      const [likedResult, followResult, blockResult] = await Promise.all([
        supabase.from("community_post_likes").select("post_id").eq("user_id", user.id),
        supabase
          .from("user_follows")
          .select("following_id, notifications_enabled")
          .eq("follower_id", user.id),
        supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
      ]);
      const { data: likedRows, error: likedError } = likedResult;
      if (!likedError) likedIds = new Set((likedRows ?? []).map((like) => like.post_id));
      for (const follow of followResult.data ?? []) {
        followSettings.set(follow.following_id, follow.notifications_enabled);
      }
      blockedIds = new Set((blockResult.data ?? []).map((block) => block.blocked_id));
    }

    setPeople(
      (profileRows ?? [])
        .filter((profile) => !blockedIds.has(profile.id))
        .map((profile) => ({
          ...personFromProfile(profile),
          followed: followSettings.has(profile.id),
          notifications: followSettings.get(profile.id) ?? false,
        })),
    );

    setPosts(
      (postRows ?? []).map((post) => ({
        id: post.id,
        authorId: post.user_id,
        time: formatRelativeTime(post.created_at),
        createdAt: post.created_at,
        body: post.body,
        category: post.category,
        tags: post.tags,
        replies: post.comment_count,
        likes: post.like_count,
        shares: post.share_count,
        isEditorial: post.is_editorial,
        liked: likedIds.has(post.id),
      })),
    );
    setFeedLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void loadCommunity();
  }, [authLoading, loadCommunity]);

  const loadComments = useCallback(
    async (postId: string) => {
      setCommentsLoading(postId);
      const { data: commentRows, error } = await supabase
        .from("community_post_comments")
        .select("id, body, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Antworten konnten nicht geladen werden.");
        setCommentsLoading(null);
        return;
      }

      const authorIds = Array.from(new Set((commentRows ?? []).map((comment) => comment.user_id)));
      const { data: profileRows } = authorIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, bio")
            .in("id", authorIds)
        : { data: [] };

      const commentPeople = new Map(
        (profileRows ?? []).map((profile) => [
          profile.id,
          personFromProfile(profile, peopleById.get(profile.id)),
        ]),
      );

      setCommentsByPost((current) => ({
        ...current,
        [postId]: (commentRows ?? [])
          .map((comment) => {
            const author = commentPeople.get(comment.user_id);
            return author
              ? {
                  id: comment.id,
                  body: comment.body,
                  time: formatRelativeTime(comment.created_at),
                  author,
                }
              : null;
          })
          .filter((comment): comment is CommunityComment => comment !== null),
      }));
      setCommentsLoading(null);
    },
    [peopleById],
  );

  const publishPost = async () => {
    if (!user) {
      toast.error("Melde dich an, um einen Beitrag zu posten.");
      return;
    }
    if (!canPost) return;

    setPublishing(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      body: postText.trim(),
      category: detectedCategory,
      tags: getCategoryTags(detectedCategory, postText),
    });

    if (error) {
      toast.error(error.message);
    } else {
      setPostText("");
      toast.success("Beitrag veröffentlicht.");
      await loadCommunity();
    }
    setPublishing(false);
  };

  const toggleFollow = async (id: string) => {
    if (!user) {
      toast.error("Melde dich an, um Nutzern zu folgen.");
      return;
    }
    if (id === user.id) return;

    const person = peopleById.get(id);
    if (!person) return;

    const result = person.followed
      ? await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", id)
      : await supabase.from("user_follows").insert({
          follower_id: user.id,
          following_id: id,
          notifications_enabled: false,
        });

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    setPeople((current) =>
      current.map((item) =>
        item.id === id ? { ...item, followed: !person.followed, notifications: false } : item,
      ),
    );
  };

  const toggleNotifications = async (id: string) => {
    if (!user) {
      toast.error("Melde dich an, um Benachrichtigungen zu aktivieren.");
      return;
    }
    if (id === user.id) return;

    const person = peopleById.get(id);
    if (!person) return;
    const nextValue = !person.notifications;
    const { error } = await supabase.from("user_follows").upsert(
      {
        follower_id: user.id,
        following_id: id,
        notifications_enabled: nextValue,
      },
      { onConflict: "follower_id,following_id" },
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    setPeople((current) =>
      current.map((item) =>
        item.id === id ? { ...item, followed: true, notifications: nextValue } : item,
      ),
    );
  };

  const blockUser = async (person: Person) => {
    if (!user) {
      toast.error("Melde dich an, um Nutzer zu blockieren.");
      return;
    }
    if (person.id === user.id) return;

    const { error } = await supabase
      .from("user_blocks")
      .upsert(
        { blocker_id: user.id, blocked_id: person.id },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );

    if (error) {
      toast.error(error.message);
      return;
    }

    setOpenMenuId(null);
    toast.success(`@${person.handle} wurde blockiert.`);
    await loadCommunity();
  };

  const submitReport = async (reason: string, details: string) => {
    if (!user || !reportTarget) {
      toast.error("Melde dich an, um Inhalte zu melden.");
      return false;
    }

    const { error } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      target_type: reportTarget.type,
      target_id: reportTarget.id,
      target_owner_id: reportTarget.ownerId,
      target_excerpt: reportTarget.excerpt.slice(0, 500),
      reason,
      details: details.trim() || null,
    });

    if (error) {
      toast.error(
        error.code === "23505" ? "Du hast diesen Inhalt bereits gemeldet." : error.message,
      );
      return false;
    }

    toast.success("Meldung wurde sicher übermittelt.");
    setReportTarget(null);
    return true;
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.error("Melde dich an, um Beiträge zu liken.");
      return;
    }

    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? { ...item, liked: !item.liked, likes: Math.max(0, item.likes + (item.liked ? -1 : 1)) }
          : item,
      ),
    );

    const result = post.liked
      ? await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
      : await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });

    if (result.error) {
      toast.error("Like konnte nicht gespeichert werden.");
      await loadCommunity();
    }
  };

  const toggleComments = async (postId: string) => {
    const willOpen = !posts.find((post) => post.id === postId)?.commentsOpen;
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, commentsOpen: willOpen } : post)),
    );
    if (willOpen && !commentsByPost[postId]) await loadComments(postId);
  };

  const submitComment = async (postId: string, body: string) => {
    if (!user) {
      toast.error("Melde dich an, um zu antworten.");
      return false;
    }

    const { error } = await supabase.from("community_post_comments").insert({
      post_id: postId,
      user_id: user.id,
      body: body.trim(),
    });

    if (error) {
      toast.error(error.message);
      return false;
    }

    await Promise.all([loadComments(postId), loadCommunity()]);
    return true;
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) => {
      const isActive = current.includes(category);
      if (category === "Allgemein") return isActive ? [] : ["Allgemein"];
      const withoutAll = current.filter((item) => item !== "Allgemein");
      return isActive ? withoutAll.filter((item) => item !== category) : [...withoutAll, category];
    });
  };

  const filteredPosts = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const isHashTagSearch = rawQuery.startsWith("#");
    const query = isHashTagSearch ? rawQuery.slice(1) : rawQuery;

    return posts.filter((post) => {
      const author = peopleById.get(post.authorId);
      if (!author) return false;

      const showAll = selectedCategories.length === 0 || selectedCategories.includes("Allgemein");
      const matchesCategory =
        showAll ||
        selectedCategories.some((category) =>
          category === "Gefolgt" ? author.followed : post.category === category,
        );
      const matchesSearch =
        !query ||
        (isHashTagSearch
          ? post.tags.some((tag) => tag.toLowerCase().includes(query))
          : author.name.toLowerCase().includes(query) ||
            author.handle.toLowerCase().includes(query) ||
            post.body.toLowerCase().includes(query) ||
            post.tags.some((tag) => tag.toLowerCase().includes(query)));

      return matchesCategory && matchesSearch;
    });
  }, [peopleById, posts, searchQuery, selectedCategories]);

  const matchingPeople = useMemo(() => {
    const query = searchQuery.trim().replace(/^#/, "").toLowerCase();
    if (!query) return people;
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.handle.toLowerCase().includes(query) ||
        person.role.toLowerCase().includes(query) ||
        person.bio.toLowerCase().includes(query),
    );
  }, [people, searchQuery]);

  return (
    <SiteShell hideFooter>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-card-elegant backdrop-blur">
          <Search className="h-4 w-4 shrink-0 text-primary-glow" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Posts, Personen, Kategorien oder #Coding suchen"
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors",
                selectedCategories.includes(category)
                  ? "bg-blue-700 text-white shadow-glow"
                  : "border border-border bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-pressed={selectedCategories.includes(category)}
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
                  {currentPerson?.avatar ?? "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <textarea
                    value={postText}
                    onChange={(event) => setPostText(event.target.value.slice(0, 200))}
                    placeholder={
                      user
                        ? "Was möchtest du teilen? Nutze z.B. #Coding oder #SaaS"
                        : "Melde dich an, um etwas zu teilen"
                    }
                    className="min-h-24 w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Code2 className="h-4 w-4" />
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon category={detectedCategory} className="h-3.5 w-3.5" />
                        Erkannt: {detectedCategory}
                      </span>
                      <span>{remaining} Zeichen</span>
                    </div>
                    <Button
                      onClick={() => void publishPost()}
                      disabled={!canPost}
                      className="bg-gradient-primary shadow-glow hover:opacity-90"
                    >
                      {publishing ? "Wird gepostet" : "Posten"}
                      <Send className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {feedLoading ? (
              <Panel className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Community wird geladen…</p>
              </Panel>
            ) : feedError ? (
              <Panel className="py-10 text-center">
                <p className="text-sm text-destructive">Der Feed konnte nicht geladen werden.</p>
                <Button variant="outline" className="mt-4" onClick={() => void loadCommunity()}>
                  Erneut versuchen
                </Button>
              </Panel>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => {
                const author = peopleById.get(post.authorId);
                if (!author) return null;
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    author={author}
                    comments={commentsByPost[post.id] ?? []}
                    commentsLoading={commentsLoading === post.id}
                    canReply={Boolean(user)}
                    currentUserId={user?.id}
                    isOwnAuthor={user?.id === author.id}
                    isMenuOpen={openMenuId === post.id}
                    onMenuToggle={() =>
                      setOpenMenuId((current) => (current === post.id ? null : post.id))
                    }
                    onBlock={() => void blockUser(author)}
                    onReportPost={() => {
                      setOpenMenuId(null);
                      setReportTarget({
                        type: "post",
                        id: post.id,
                        ownerId: author.id,
                        label: `Beitrag von @${author.handle}`,
                        excerpt: post.body,
                      });
                    }}
                    onReportComment={(comment) =>
                      setReportTarget({
                        type: "comment",
                        id: comment.id,
                        ownerId: comment.author.id,
                        label: `Antwort von @${comment.author.handle}`,
                        excerpt: comment.body,
                      })
                    }
                    onFollow={() => void toggleFollow(author.id)}
                    onBell={() => void toggleNotifications(author.id)}
                    onLike={() => void toggleLike(post.id)}
                    onComment={() => void toggleComments(post.id)}
                    onReply={(body) => submitComment(post.id, body)}
                    onShare={() => setShareDialogPostId(post.id)}
                    onTagSearch={(tag) => setSearchQuery("#" + tag.replaceAll(" ", ""))}
                  />
                );
              })
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
                  <PersonRow
                    key={person.id}
                    person={person}
                    isOwn={user?.id === person.id}
                    onFollow={() => void toggleFollow(person.id)}
                    onBell={() => void toggleNotifications(person.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Flame className="h-4 w-4 text-primary-glow" />
                Aktive Themen
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["#Coding", "#KI", "#SaaS", "#Supabase", "#BuildInPublic"].map((trend) => (
                  <button
                    key={trend}
                    onClick={() => setSearchQuery(trend)}
                    className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {trend}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Newspaper className="h-4 w-4 text-primary-glow" />
                  News
                </div>
                <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                  KI & Coding
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {aiNewsSources.map((item) => (
                  <a
                    key={item.source}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border bg-background/45 p-3 transition-colors hover:border-primary/40 hover:bg-accent/60"
                  >
                    <div className="text-sm font-medium">{item.source}</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.topic}
                    </p>
                  </a>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </section>

      {shareDialogPost && shareDialogAuthor && (
        <ShareDialog
          post={shareDialogPost}
          author={shareDialogAuthor}
          onClose={() => setShareDialogPostId(null)}
          onShare={() => setShareDialogPostId(null)}
        />
      )}
      {reportTarget && (
        <ReportDialog
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={submitReport}
        />
      )}
    </SiteShell>
  );
}
function PostCard({
  post,
  author,
  comments,
  commentsLoading,
  canReply,
  currentUserId,
  isOwnAuthor,
  isMenuOpen,
  onMenuToggle,
  onBlock,
  onReportPost,
  onReportComment,
  onFollow,
  onBell,
  onLike,
  onComment,
  onReply,
  onShare,
  onTagSearch,
}: {
  post: Post;
  author: Person;
  comments: CommunityComment[];
  commentsLoading: boolean;
  canReply: boolean;
  currentUserId?: string;
  isOwnAuthor: boolean;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onBlock: () => void;
  onReportPost: () => void;
  onReportComment: (comment: CommunityComment) => void;
  onFollow: () => void;
  onBell: () => void;
  onLike: () => void;
  onComment: () => void;
  onReply: (body: string) => Promise<boolean>;
  onShare: () => void;
  onTagSearch: (tag: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const sendReply = async () => {
    const body = replyText.trim();
    if (!body || replying) return;
    setReplying(true);
    const saved = await onReply(body);
    if (saved) setReplyText("");
    setReplying(false);
  };

  return (
    <article className="rounded-2xl border border-border bg-card/75 p-4 shadow-card-elegant backdrop-blur">
      <div className="flex gap-3">
        <Link
          to="/profile/$id"
          params={{ id: author.profileId }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-sm font-semibold text-primary-glow hover:ring-2 hover:ring-primary/40"
        >
          {author.avatar}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/profile/$id"
                  params={{ id: author.profileId }}
                  className="font-medium hover:text-primary-glow"
                >
                  {author.name}
                </Link>
                {post.isEditorial ? (
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200">
                    Redaktion
                  </span>
                ) : (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary-glow">
                    {author.role}
                  </span>
                )}
                {!isOwnAuthor && !author.followed && (
                  <button
                    onClick={onFollow}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-0.5 text-[11px] text-primary-glow hover:bg-primary/10"
                  >
                    <UserPlus className="h-3 w-3" />
                    Folgen
                  </button>
                )}
                {!isOwnAuthor && (
                  <button
                    onClick={onBell}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full border",
                      author.notifications
                        ? "border-primary/40 bg-primary/15 text-primary-glow"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    aria-label={author.notifications ? "Glocke deaktivieren" : "Glocke aktivieren"}
                  >
                    {author.notifications ? (
                      <Bell className="h-3.5 w-3.5" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  <CategoryIcon category={post.category} className="h-3 w-3" />
                  {post.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                @{author.handle} · {post.time}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={onMenuToggle}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Mehr Optionen"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 text-sm shadow-card-elegant">
                  <Link
                    to="/profile/$id"
                    params={{ id: author.profileId }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"
                  >
                    <Users className="h-4 w-4" />
                    Profil ansehen
                  </Link>
                  {!isOwnAuthor && (
                    <>
                      <button
                        onClick={onBlock}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
                      >
                        <EyeOff className="h-4 w-4" />
                        Nutzer blockieren
                      </button>
                      <button
                        onClick={onReportPost}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Flag className="h-4 w-4" />
                        Beitrag melden
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-foreground">{post.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagSearch(tag)}
                className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                #{tag.replaceAll(" ", "")}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
            <button
              onClick={onComment}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {post.replies}
            </button>
            <button
              onClick={onLike}
              className={cn(
                "inline-flex items-center gap-1.5",
                post.liked ? "text-primary-glow" : "hover:text-foreground",
              )}
            >
              <Heart className={cn("h-4 w-4", post.liked && "fill-current")} />
              {post.likes}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
              aria-label={`Beitrag von ${author.name} teilen`}
            >
              <Share2 className="h-4 w-4" />
              {post.shares > 0 ? post.shares : null}
            </button>
          </div>

          {post.commentsOpen && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {commentsLoading ? (
                <p className="text-xs text-muted-foreground">Antworten werden geladen…</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Link
                      to="/profile/$id"
                      params={{ id: comment.author.profileId }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-xs text-primary-glow"
                    >
                      {comment.author.avatar}
                    </Link>
                    <div className="min-w-0 flex-1 rounded-xl bg-background/55 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium">{comment.author.name}</span>
                        <span className="text-muted-foreground">{comment.time}</span>
                        {currentUserId && currentUserId !== comment.author.id && (
                          <button
                            type="button"
                            onClick={() => onReportComment(comment)}
                            className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            aria-label="Antwort melden"
                            title="Antwort melden"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{comment.body}</p>
                    </div>
                  </div>
                ))
              )}
              <label className="flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-sm">
                <input
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value.slice(0, 300))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendReply();
                    }
                  }}
                  disabled={!canReply || replying}
                  placeholder={canReply ? "Antwort schreiben" : "Zum Antworten anmelden"}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={!canReply || !replyText.trim() || replying}
                  aria-label="Antwort senden"
                >
                  <Send className="h-4 w-4 text-primary-glow" />
                </button>
              </label>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
type SharePlatform = {
  name: string;
  label: string;
  tone: string;
  action: "direct" | "native";
  url?: string;
};

function ShareDialog({
  post,
  author,
  onClose,
  onShare,
}: {
  post: Post;
  author: Person;
  onClose: () => void;
  onShare: () => void;
}) {
  const shareUrl = buildPublicShareUrl(`/community?tweet=${post.id}`);
  const shareTitle = `Beitrag von ${author.name} auf Solvix`;
  const shareText = `${post.body}\n\n${shareUrl}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(shareTitle);

  const platforms = [
    {
      name: "WhatsApp",
      label: "whatsapp",
      tone: "bg-emerald-500/15 text-emerald-200 border-emerald-400/35 hover:bg-emerald-500/25",
      action: "direct",
      url: `https://wa.me/?text=${encodedText}`,
    },
    {
      name: "Instagram",
      label: "instagram",
      tone: "bg-pink-500/15 text-pink-200 border-pink-400/35 hover:bg-pink-500/25",
      action: "native",
      url: "https://www.instagram.com/",
    },
    {
      name: "TikTok",
      label: "tiktok",
      tone: "bg-cyan-500/15 text-cyan-200 border-cyan-400/35 hover:bg-cyan-500/25",
      action: "native",
      url: "https://www.tiktok.com/",
    },
    {
      name: "Snapchat",
      label: "snapchat",
      tone: "bg-yellow-400/15 text-yellow-100 border-yellow-300/35 hover:bg-yellow-400/25",
      action: "native",
      url: "https://www.snapchat.com/",
    },
    {
      name: "X",
      label: "x",
      tone: "bg-slate-500/15 text-slate-100 border-slate-300/35 hover:bg-slate-500/25",
      action: "direct",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.body)}&url=${encodedUrl}`,
    },
    {
      name: "Facebook",
      label: "facebook",
      tone: "bg-blue-500/15 text-blue-200 border-blue-400/35 hover:bg-blue-500/25",
      action: "direct",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      label: "linkedin",
      tone: "bg-sky-500/15 text-sky-200 border-sky-400/35 hover:bg-sky-500/25",
      action: "direct",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Telegram",
      label: "telegram",
      tone: "bg-cyan-500/15 text-cyan-100 border-cyan-300/35 hover:bg-cyan-500/25",
      action: "direct",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(post.body)}`,
    },
    {
      name: "E-Mail",
      label: "email",
      tone: "bg-violet-500/15 text-violet-200 border-violet-400/35 hover:bg-violet-500/25",
      action: "direct",
      url: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
    },
  ] satisfies SharePlatform[];

  const handlePlatformShare = async (platform: SharePlatform) => {
    if (platform.action === "native" && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: post.body, url: shareUrl });
        onShare();
        return;
      } catch {
        // If the user cancels or the browser blocks native share, use the platform fallback.
      }
    }

    if (platform.url) {
      window.open(platform.url, "_blank", "noopener,noreferrer");
      onShare();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-glow animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Teilen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Wähle eine Plattform zum Weiterleiten.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Teilen schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-sm font-medium text-primary-glow">
              {author.avatar}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{author.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{author.handle} · {post.time}
              </p>
            </div>
          </div>
          <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-foreground">{post.body}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handlePlatformShare(platform)}
              title={platform.name}
              aria-label={`Auf ${platform.name} teilen`}
              className={`grid h-12 w-12 place-items-center rounded-full border transition-transform hover:-translate-y-0.5 ${platform.tone}`}
            >
              <BrandIcon name={platform.label} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const reportReasons = [
  { value: "spam", label: "Spam oder Werbung" },
  { value: "harassment", label: "Belästigung oder Mobbing" },
  { value: "hate", label: "Hassrede" },
  { value: "misinformation", label: "Irreführende Information" },
  { value: "impersonation", label: "Identitätsmissbrauch" },
  { value: "illegal", label: "Rechtswidriger Inhalt" },
  { value: "other", label: "Anderer Grund" },
];

function ReportDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: ReportTarget;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onSubmit(reason, details);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-glow animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 id="report-title" className="text-xl font-semibold">
                Inhalt melden
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{target.label}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Meldung schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {reportReasons.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setReason(item.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                reason === item.value
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-background/45 text-muted-foreground hover:bg-accent",
              )}
              aria-pressed={reason === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-medium">
          Zusätzliche Hinweise <span className="font-normal text-muted-foreground">(optional)</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value.slice(0, 500))}
            placeholder="Beschreibe kurz, was geprüft werden soll."
            className="mt-2 min-h-24 w-full resize-none rounded-xl border border-border bg-background/55 px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
          />
        </label>

        <p className="mt-2 text-xs text-muted-foreground">
          Die Meldung wird gespeichert und ist nur für die Moderation sichtbar.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? "Wird gesendet" : "Meldung senden"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BrandIcon({ name }: { name: string }) {
  if (name === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.04 2a9.86 9.86 0 0 0-8.46 14.91L2.5 22l5.22-1.03A9.86 9.86 0 1 0 12.04 2Zm0 2a7.86 7.86 0 1 1-3.8 14.74l-.33-.18-2.75.54.57-2.68-.2-.35A7.86 7.86 0 0 1 12.04 4Zm-3.08 3.95c-.17 0-.45.06-.68.32-.23.25-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.87 4.48 3.9 2.22.87 2.68.7 3.16.66.48-.05 1.55-.64 1.77-1.25.22-.62.22-1.15.15-1.25-.06-.1-.24-.16-.5-.3-.26-.13-1.55-.76-1.79-.85-.24-.08-.42-.13-.6.14-.17.26-.68.85-.84 1.02-.15.18-.31.2-.57.07-.26-.13-1.1-.4-2.1-1.29-.78-.69-1.3-1.54-1.45-1.8-.15-.27-.02-.41.11-.54.12-.12.26-.31.39-.46.13-.16.17-.27.26-.44.09-.18.04-.33-.02-.46-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.46h-.51Z"
        />
      </svg>
    );
  }
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7.6 2.8h8.8a4.8 4.8 0 0 1 4.8 4.8v8.8a4.8 4.8 0 0 1-4.8 4.8H7.6a4.8 4.8 0 0 1-4.8-4.8V7.6a4.8 4.8 0 0 1 4.8-4.8Zm0 2A2.8 2.8 0 0 0 4.8 7.6v8.8a2.8 2.8 0 0 0 2.8 2.8h8.8a2.8 2.8 0 0 0 2.8-2.8V7.6a2.8 2.8 0 0 0-2.8-2.8H7.6Zm4.4 3.3a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Zm0 2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Zm4.2-2.5a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"
        />
      </svg>
    );
  }
  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M15.5 2.5c.25 2.1 1.43 3.58 3.55 4.42.72.28 1.4.4 1.95.42v3.08a8.5 8.5 0 0 1-5.45-1.86v6.6c0 3.79-2.6 6.34-6.12 6.34-3.17 0-5.43-2.13-5.43-5.03 0-3.15 2.42-5.46 5.82-5.46.48 0 .91.05 1.3.14v3.16a3.35 3.35 0 0 0-1.22-.22c-1.57 0-2.58.9-2.58 2.28 0 1.2.9 2.04 2.15 2.04 1.47 0 2.42-.98 2.42-2.78V2.5h3.6Z"
        />
      </svg>
    );
  }
  if (name === "snapchat") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2.2c2.92 0 5 2.18 5 5.22v2.15c.37-.18.74-.28 1.08-.28.6 0 1.02.3 1.02.75 0 .8-1.06 1.06-1.66 1.28.18 1.6 1.28 2.78 3.13 3.45.42.15.65.42.62.76-.04.55-.75.74-1.5.86-.22.04-.32.13-.38.34-.18.62-.62.85-1.27.85-.36 0-.78-.08-1.24-.08-.88 0-1.46.47-2.12.98-.68.52-1.44 1.1-2.68 1.1s-2-.58-2.68-1.1c-.66-.5-1.24-.98-2.12-.98-.46 0-.88.08-1.24.08-.65 0-1.09-.23-1.27-.85-.06-.21-.16-.3-.38-.34-.75-.12-1.46-.31-1.5-.86-.03-.34.2-.61.62-.76 1.85-.67 2.95-1.85 3.13-3.45-.6-.22-1.66-.48-1.66-1.28 0-.45.42-.75 1.02-.75.34 0 .71.1 1.08.28V7.42c0-3.04 2.08-5.22 5-5.22Z"
        />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.8 3h3.1l-6.75 7.72L21.1 21h-6.23l-4.88-6.38L4.4 21H1.3l7.22-8.25L.9 3h6.38l4.41 5.83L16.8 3Zm-1.1 16.2h1.72L6.34 4.7H4.5l11.2 14.5Z"
        />
      </svg>
    );
  }
  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.2 8.1V6.65c0-.7.45-.86.78-.86h2V2.5l-2.76-.02c-3.06 0-3.75 2.3-3.75 3.76V8.1H8.7v3.4h1.77V21h3.73v-9.5h2.52l.33-3.4H14.2Z"
        />
      </svg>
    );
  }
  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5.35 7.8H2.4V21h2.95V7.8ZM3.88 2.5a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM21.6 13.43c0-3.55-1.9-5.2-4.43-5.2-2.04 0-2.95 1.12-3.46 1.9V7.8h-2.95V21h2.95v-7.37c0-1.98 1.08-2.98 2.5-2.98 1.36 0 2.02.96 2.02 2.98V21h3.37v-7.57Z"
        />
      </svg>
    );
  }
  if (name === "telegram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.8 4.35 18.6 19.5c-.24 1.06-.87 1.32-1.76.82l-4.86-3.58-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.95 9-8.13c.39-.35-.09-.54-.6-.2L6.28 13.2 1.5 11.7C.46 11.37.44 10.66 1.72 10.16L20.4 2.96c.86-.32 1.62.2 1.4 1.39Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5h18v14H3V5Zm2 2v.35l7 5.05 7-5.05V7H5Zm14 10V9.8l-7 5.05L5 9.8V17h14Z"
      />
    </svg>
  );
}

function PersonRow({
  person,
  isOwn,
  onFollow,
  onBell,
}: {
  person: Person;
  isOwn: boolean;
  onFollow: () => void;
  onBell: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        to="/profile/$id"
        params={{ id: person.profileId }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-xs font-medium text-primary-glow">
          {person.avatar}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{person.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            @{person.handle} · {person.role}
          </div>
        </div>
      </Link>
      {!isOwn && (
        <div className="flex items-center gap-1">
          <button
            onClick={onFollow}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={person.followed ? "Entfolgen" : "Folgen"}
          >
            {person.followed ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          </button>
          <button
            onClick={onBell}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={person.notifications ? "Glocke deaktivieren" : "Glocke aktivieren"}
          >
            {person.notifications ? (
              <Bell className="h-4 w-4 text-primary-glow" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
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
