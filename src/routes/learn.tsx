import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  Database,
  Flame,
  GraduationCap,
  Layers3,
  Lightbulb,
  MessageCircle,
  Rocket,
  Search,
  Sparkles,
  Trophy,
  Workflow,
  Zap,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteShell } from "@/components/layout/SiteShell";
import { TiltCard } from "@/components/ui/tilt-card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Difficulty = "Starter" | "Anfänger" | "Mittel" | "Fortgeschritten";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type LearningModule = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: Difficulty;
  duration: string;
  icon: ReactNode;
  outcomes: string[];
  lessons: { title: string; body: string }[];
  quiz: QuizQuestion;
  community: {
    discussions: number;
    question: string;
    tip: string;
  };
};

type ProjectIdea = {
  title: string;
  description: string;
  difficulty: Difficulty;
  duration: string;
  goals: string[];
  requirements: string[];
};

const storageKey = "solvix.learn.mvp.progress";

const modules: LearningModule[] = [
  {
    id: "foundations",
    number: "01",
    title: "Grundlagen",
    subtitle: "Coding, KI und moderne Tools verstehen",
    description:
      "Du lernst, was Programmierung wirklich bedeutet, wie KI-Systeme arbeiten und warum moderne Tools aus Bausteinen wie UI, Datenbank, API und Automation bestehen.",
    difficulty: "Starter",
    duration: "35 min",
    icon: <GraduationCap className="h-5 w-5" />,
    outcomes: ["Du erkennst den Unterschied zwischen Tool-Nutzer und Builder.", "Du verstehst KI ohne komplizierte Fachsprache.", "Du kannst moderne Software grob einordnen."],
    lessons: [
      {
        title: "Was ist Programmierung?",
        body:
          "Programmierung bedeutet, ein Problem in klare Schritte zu zerlegen und diese Schritte so aufzuschreiben, dass ein Computer sie ausführen kann. Der wichtigste Skill ist nicht Syntax, sondern sauberes Denken: Eingabe, Verarbeitung, Ausgabe und Fehlerfälle.",
      },
      {
        title: "Was ist KI?",
        body:
          "Künstliche Intelligenz beschreibt Systeme, die aus Daten Muster lernen und auf neue Eingaben reagieren. Sie kann Texte erzeugen, Inhalte sortieren, Zusammenfassungen schreiben oder Vorschläge machen. KI ersetzt aber keine Produktlogik. Sie braucht klare Ziele, Kontext und Kontrolle.",
      },
      {
        title: "KI vs klassische Programmierung",
        body:
          "Klassische Programmierung folgt festen Regeln: Wenn A passiert, mache B. KI arbeitet wahrscheinlicher: Sie berechnet aus Mustern eine passende Antwort. In guten Produkten kombinierst du beides: Code gibt Struktur, KI liefert flexible Unterstützung.",
      },
    ],
    quiz: {
      question: "Was beschreibt Programmierung am besten?",
      options: ["Nur bunte Webseiten gestalten", "Probleme in klare Schritte für Computer übersetzen", "Computer zufällig antworten lassen", "Nur KI-Prompts schreiben"],
      correctIndex: 1,
      explanation: "Programmierung ist das strukturierte Übersetzen von Problemen in ausführbare Schritte.",
    },
    community: {
      discussions: 18,
      question: "Wie fange ich an, wenn ich noch nie programmiert habe?",
      tip: "Starte mit einem Mini-Projekt, nicht mit zehn Kursen gleichzeitig.",
    },
  },
  {
    id: "python",
    number: "02",
    title: "Python Grundlagen",
    subtitle: "Lesbare Sprache für KI, Daten und Automationen",
    description:
      "Python ist ein guter Einstieg, weil die Sprache sehr lesbar ist und besonders stark bei KI, Daten, Skripten und Automationen eingesetzt wird.",
    difficulty: "Anfänger",
    duration: "55 min",
    icon: <Code2 className="h-5 w-5" />,
    outcomes: ["Du verstehst Variablen, Listen und Funktionen.", "Du kannst einfache Skripte planen.", "Du weißt, warum Python für KI so beliebt ist."],
    lessons: [
      {
        title: "Variablen und Daten",
        body:
          "Eine Variable speichert einen Wert, zum Beispiel einen Namen, eine Zahl oder eine Liste. Programme werden nützlich, wenn sie Daten aufnehmen, verändern und wieder ausgeben können.",
      },
      {
        title: "Funktionen",
        body:
          "Funktionen bündeln wiederverwendbare Logik. Statt denselben Code mehrfach zu schreiben, gibst du einer Aufgabe einen Namen und rufst sie später wieder auf.",
      },
      {
        title: "Python in echten Projekten",
        body:
          "Python eignet sich für Datenanalyse, Automationen, KI-Workflows, kleine APIs und interne Tools. Es ist oft die Sprache, mit der Prototypen sehr schnell entstehen.",
      },
    ],
    quiz: {
      question: "Wofür ist eine Funktion besonders nützlich?",
      options: ["Um Logik wiederzuverwenden", "Um den Bildschirm dunkler zu machen", "Um Passwörter öffentlich zu speichern", "Um eine Website automatisch zu löschen"],
      correctIndex: 0,
      explanation: "Funktionen machen Code wiederverwendbar, klarer und leichter testbar.",
    },
    community: {
      discussions: 12,
      question: "Welche Python-Übung ist gut für den ersten Tag?",
      tip: "Baue einen kleinen Rechner oder einen Aufgaben-Generator mit drei Schwierigkeitsstufen.",
    },
  },
  {
    id: "apis",
    number: "03",
    title: "APIs verstehen",
    subtitle: "Apps miteinander verbinden",
    description:
      "APIs sind Schnittstellen zwischen Systemen. Sie ermöglichen, dass deine App Daten von anderen Diensten holt oder eigene Daten für andere Funktionen bereitstellt.",
    difficulty: "Anfänger",
    duration: "45 min",
    icon: <Database className="h-5 w-5" />,
    outcomes: ["Du verstehst Requests und Responses.", "Du kennst API-Keys und sichere Nutzung.", "Du kannst erklären, warum fast jedes SaaS APIs braucht."],
    lessons: [
      {
        title: "APIs in einfacher Sprache",
        body:
          "Eine API ist wie ein klar geregelter Bestellschalter. Deine App stellt eine Anfrage, die andere Seite liefert eine Antwort. Beispiel: Deine App fragt nach Wetterdaten und bekommt strukturierte Daten zurück.",
      },
      {
        title: "Request und Response",
        body:
          "Der Request ist die Anfrage. Die Response ist die Antwort. Meist werden Daten als JSON übertragen, also in einer strukturierten Textform, die Apps gut lesen können.",
      },
      {
        title: "API-Keys",
        body:
          "Ein API-Key ist ein Zugangsschlüssel zu einem Dienst. Öffentliche Frontend-Keys dürfen nur begrenzte Rechte haben. Gehe nie leichtfertig mit geheimen Service-Keys um.",
      },
    ],
    quiz: {
      question: "Was macht eine API?",
      options: ["Sie verbindet Systeme über klare Anfragen und Antworten", "Sie ersetzt immer jede Datenbank", "Sie ist nur ein Design-Element", "Sie löscht automatisch Nutzer"],
      correctIndex: 0,
      explanation: "APIs verbinden Systeme und transportieren Daten über definierte Regeln.",
    },
    community: {
      discussions: 25,
      question: "Warum bekomme ich bei meiner API einen 401-Fehler?",
      tip: "Prüfe zuerst Key, Berechtigungen, URL und ob der Request wirklich das erwartete Format hat.",
    },
  },
  {
    id: "ai-practice",
    number: "04",
    title: "KI praktisch einsetzen",
    subtitle: "LLMs, ChatGPT und Prompts produktiv nutzen",
    description:
      "Du lernst, wie große Sprachmodelle funktionieren, was ChatGPT ist und wie Prompts aufgebaut werden, damit KI in echten Workflows verlässlich hilft.",
    difficulty: "Mittel",
    duration: "60 min",
    icon: <Brain className="h-5 w-5" />,
    outcomes: ["Du verstehst LLMs ohne Hype.", "Du kannst bessere Prompts schreiben.", "Du erkennst Grenzen und Kontrollpunkte von KI."],
    lessons: [
      {
        title: "Was sind LLMs?",
        body:
          "LLMs sind große Sprachmodelle. Sie wurden mit sehr vielen Texten trainiert und können Sprache verstehen, fortsetzen, strukturieren und generieren. Sie wissen nicht im menschlichen Sinn, sondern berechnen wahrscheinliche Antworten.",
      },
      {
        title: "Was ist ChatGPT?",
        body:
          "ChatGPT ist eine Oberfläche und ein Produkt rund um Sprachmodelle. Es macht LLMs über einen Chat nutzbar. In eigenen Apps nutzt man oft APIs, um ähnliche Fähigkeiten in Workflows einzubauen.",
      },
      {
        title: "Wie funktionieren Prompts?",
        body:
          "Ein Prompt ist die Aufgabe, die du der KI gibst. Gute Prompts enthalten Ziel, Kontext, gewünschtes Format, Einschränkungen und Beispiele. Je klarer die Aufgabe, desto besser prüfbar das Ergebnis.",
      },
    ],
    quiz: {
      question: "Was macht einen guten Prompt aus?",
      options: ["Er ist möglichst geheimnisvoll", "Er enthält Ziel, Kontext und gewünschtes Ausgabeformat", "Er besteht nur aus einem Emoji", "Er vermeidet jede konkrete Anweisung"],
      correctIndex: 1,
      explanation: "Gute Prompts geben der KI Ziel, Kontext, Regeln und ein klares Ausgabeformat.",
    },
    community: {
      discussions: 31,
      question: "Wie verhindere ich, dass KI falsche Ergebnisse liefert?",
      tip: "Nutze klare Quellen, Begrenzungen, Tests und menschliche Prüfung bei wichtigen Ergebnissen.",
    },
  },
  {
    id: "automation",
    number: "05",
    title: "Automatisierungen bauen",
    subtitle: "Wiederholbare Aufgaben in Systeme verwandeln",
    description:
      "Automationen sparen Zeit, indem sie Trigger, Regeln, APIs und Daten verbinden. Du lernst, wie aus wiederkehrenden Aufgaben stabile Abläufe entstehen.",
    difficulty: "Mittel",
    duration: "50 min",
    icon: <Workflow className="h-5 w-5" />,
    outcomes: ["Du erkennst automatisierbare Prozesse.", "Du verstehst Trigger und Aktionen.", "Du kannst einfache Workflows planen."],
    lessons: [
      {
        title: "Trigger und Aktionen",
        body:
          "Ein Trigger startet einen Ablauf, zum Beispiel ein Formular, eine neue E-Mail oder ein Zeitplan. Eine Aktion ist das, was danach passiert: speichern, sortieren, senden, auswerten oder benachrichtigen.",
      },
      {
        title: "Warum Automationen oft scheitern",
        body:
          "Viele Automationen scheitern, weil Fehlerfälle fehlen. Gute Workflows haben Logs, klare Zustände, Wiederholungen und einfache manuelle Kontrolle.",
      },
      {
        title: "KI in Automationen",
        body:
          "KI kann Texte zusammenfassen, Kategorien erkennen oder Vorschläge erzeugen. Der Code drumherum entscheidet aber, wann KI genutzt wird und wohin das Ergebnis gespeichert wird.",
      },
    ],
    quiz: {
      question: "Was ist ein Trigger?",
      options: ["Ein Ereignis, das einen Workflow startet", "Eine reine Farbe im Interface", "Ein Datenbank-Passwort", "Ein fertiger SaaS-Preisplan"],
      correctIndex: 0,
      explanation: "Ein Trigger ist der Startpunkt einer Automation.",
    },
    community: {
      discussions: 16,
      question: "Welche Prozesse eignen sich für die erste Automation?",
      tip: "Nimm Aufgaben, die häufig gleich ablaufen und ein klares Ergebnis haben.",
    },
  },
  {
    id: "saas",
    number: "06",
    title: "Eigene SaaS entwickeln",
    subtitle: "Aus einem Problem ein digitales Produkt bauen",
    description:
      "Ein SaaS ist Software, die dauerhaft ein Problem löst und meist monatlich bezahlt wird. Du lernst, wie MVP, Nutzerproblem, Datenmodell und einfache Produktlogik zusammenkommen.",
    difficulty: "Fortgeschritten",
    duration: "75 min",
    icon: <Rocket className="h-5 w-5" />,
    outcomes: ["Du verstehst MVP-Denken.", "Du kannst eine SaaS-Idee strukturieren.", "Du erkennst, welche Features zuerst wichtig sind."],
    lessons: [
      {
        title: "Problem vor Feature",
        body:
          "Ein gutes SaaS startet nicht mit einer langen Feature-Liste, sondern mit einem echten wiederkehrenden Problem. Erst wenn das Problem klar ist, lohnt sich das Produkt.",
      },
      {
        title: "MVP",
        body:
          "Ein MVP ist die kleinste Version, mit der du echten Nutzen testen kannst. Es muss nicht perfekt sein, aber es muss ein konkretes Ergebnis liefern.",
      },
      {
        title: "Produktentwicklung",
        body:
          "Produktentwicklung bedeutet, Nutzerproblem, Interface, Daten, Technik und Feedback zusammenzubringen. Gute Produkte werden nicht nur gebaut, sondern regelmäßig verbessert.",
      },
    ],
    quiz: {
      question: "Was ist ein MVP?",
      options: ["Die kleinste testbare Produktversion mit echtem Nutzen", "Ein fertiges Konzernprodukt", "Eine Animation im Header", "Ein Passwort-Manager"],
      correctIndex: 0,
      explanation: "Ein MVP liefert den kleinsten echten Nutzen, um eine Idee schnell mit Nutzern zu testen.",
    },
    community: {
      discussions: 22,
      question: "Wie finde ich ein SaaS-Problem, das wirklich relevant ist?",
      tip: "Sprich mit Menschen, die das Problem heute schon manuell lösen oder Geld dafür ausgeben.",
    },
  },
];

const projects: ProjectIdea[] = [
  {
    title: "GPT Chatbot",
    description: "Baue einen kleinen Chatbot, der Nutzerfragen annimmt, eine KI-Antwort erzeugt und den Verlauf lokal oder in einer Datenbank speichert.",
    difficulty: "Anfänger",
    duration: "2 Stunden",
    goals: ["APIs verstehen", "KI-Antworten anzeigen", "Chat-UI bauen"],
    requirements: ["JavaScript-Grundlagen", "Ein API-Key", "Ein einfaches Formular"],
  },
  {
    title: "Projektideen-Bot",
    description: "Ein Tool, das aus Thema und Niveau automatisch eine passende Coding-Aufgabe mit Lernzielen und nächstem Schritt erzeugt.",
    difficulty: "Anfänger",
    duration: "90 min",
    goals: ["Prompts strukturieren", "Level-Logik bauen", "Output formatieren"],
    requirements: ["Grundlagen", "Prompt-Verständnis"],
  },
  {
    title: "Lead-Sortierer",
    description: "Eine Automation, die Firmenkontakte nach Branche, Größe oder Relevanz sortiert und als Tabelle speichert.",
    difficulty: "Mittel",
    duration: "3 Stunden",
    goals: ["Daten strukturieren", "APIs verbinden", "Automatisierung planen"],
    requirements: ["APIs", "Datenmodell", "Basis-UI"],
  },
  {
    title: "Mini-SaaS Dashboard",
    description: "Baue ein einfaches Dashboard mit Login, Nutzerprofil, Kennzahlen und einem gespeicherten Datensatz.",
    difficulty: "Fortgeschritten",
    duration: "1 Tag",
    goals: ["Auth verstehen", "Datenbank nutzen", "SaaS-Struktur aufbauen"],
    requirements: ["React/JS", "Supabase-Grundlagen", "MVP-Denken"],
  },
];

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Lernen — Solvix" },
      { name: "description", content: "Interaktiver Lernpfad für Coding, KI, APIs, Automatisierung und SaaS." },
      { property: "og:title", content: "Solvix Lernen" },
      { property: "og:description", content: "Baue echte KI- und Coding-Projekte statt nur Theorie zu lernen." },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0].id);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [projectSearch, setProjectSearch] = useState("");
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0];

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { completedModuleIds?: string[]; quizAnswers?: Record<string, number> };
      setCompletedModuleIds(parsed.completedModuleIds ?? []);
      setQuizAnswers(parsed.quizAnswers ?? {});
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ completedModuleIds, quizAnswers }));
  }, [completedModuleIds, quizAnswers]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    async function loadAccountProgress() {
      const { data, error } = await supabase
        .from("learning_progress")
        .select("module_id, quiz_answer, completed_at")
        .eq("user_id", user!.id);

      if (error) {
        console.warn("[learn] Could not load Supabase learning progress.", error.message);
        return;
      }
      if (cancelled) return;

      setQuizAnswers(
        Object.fromEntries(
          (data ?? [])
            .filter((row) => row.quiz_answer !== null)
            .map((row) => [row.module_id, row.quiz_answer as number]),
        ),
      );
      setCompletedModuleIds((data ?? []).filter((row) => row.completed_at).map((row) => row.module_id));
    }

    loadAccountProgress();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const completedCount = completedModuleIds.length;
  const progress = Math.round((completedCount / modules.length) * 100);
  const currentAnswer = quizAnswers[selectedModule.id];
  const isQuizCorrect = currentAnswer === selectedModule.quiz.correctIndex;
  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.goals.some((goal) => goal.toLowerCase().includes(query)) ||
        project.requirements.some((requirement) => requirement.toLowerCase().includes(query)),
    );
  }, [projectSearch]);

  const statusLabel = progress === 100 ? "Lernpfad abgeschlossen" : progress > 0 ? "Aktiv im Lernpfad" : "Bereit zum Start";
  const levelLabel = progress >= 84 ? "Builder" : progress >= 50 ? "Practitioner" : progress >= 17 ? "Explorer" : "Starter";

  const continueLearning = () => {
    const nextModule = modules.find((module) => !completedModuleIds.includes(module.id)) ?? modules[modules.length - 1];
    setSelectedModuleId(nextModule.id);
    document.getElementById("learning-dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const persistAnswer = async (module: LearningModule, answer: number) => {
    setQuizAnswers((current) => ({ ...current, [module.id]: answer }));
    if (!user) return;

    const { error } = await supabase.from("learning_progress").upsert(
      {
        user_id: user.id,
        module_id: module.id,
        quiz_answer: answer,
        quiz_correct: answer === module.quiz.correctIndex,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" },
    );

    if (error) console.warn("[learn] Could not persist quiz answer.", error.message);
  };

  const markModuleComplete = async () => {
    if (!isQuizCorrect) return;
    setCompletedModuleIds((current) => (current.includes(selectedModule.id) ? current : [...current, selectedModule.id]));
    if (!user) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from("learning_progress").upsert(
      {
        user_id: user.id,
        module_id: selectedModule.id,
        quiz_answer: currentAnswer,
        quiz_correct: true,
        completed_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,module_id" },
    );

    if (error) console.warn("[learn] Could not persist completed module.", error.message);
  };

  const resetProgress = async () => {
    setCompletedModuleIds([]);
    setQuizAnswers({});
    window.localStorage.removeItem(storageKey);
    if (!user) return;

    const { error } = await supabase.from("learning_progress").delete().eq("user_id", user.id);
    if (error) console.warn("[learn] Could not reset Supabase learning progress.", error.message);
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/.16),transparent_36%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary-glow">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Solvix Learning MVP
            </Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Baue echte KI- und Coding-Projekte statt nur Theorie zu lernen.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Ein klarer Lernpfad von Grundlagen bis SaaS: kurze Lektionen, direkte Wissenskontrolle, Projektideen und Community-Fragen an einem Ort.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={continueLearning} className="bg-gradient-primary shadow-glow">
                Weiterlernen
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" asChild>
                <Link to="/community">Frage in der Community stellen</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/75 p-5 shadow-card-elegant backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Lernstatus</p>
                <h2 className="mt-1 text-2xl font-semibold">{statusLabel}</h2>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary-glow">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gesamtfortschritt</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric value={`${completedCount}/${modules.length}`} label="Module" />
              <Metric value={levelLabel} label="Stufe" />
              <Metric value={`${Object.keys(quizAnswers).length}`} label="Quiz" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LearningBadge active={completedCount >= 1} icon={<BadgeCheck className="h-3.5 w-3.5" />} label="First Module" />
              <LearningBadge active={completedCount >= 3} icon={<Flame className="h-3.5 w-3.5" />} label="Momentum" />
              <LearningBadge active={completedCount === modules.length} icon={<Rocket className="h-3.5 w-3.5" />} label="SaaS Ready" />
            </div>
          </div>
        </div>
      </section>

      <section id="learning-dashboard" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Tabs defaultValue="path" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[520px]">
            <TabsTrigger value="path">Lernpfad</TabsTrigger>
            <TabsTrigger value="projects">Projekte</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>

          <TabsContent value="path" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
              <aside className="space-y-3">
                {modules.map((module, index) => {
                  const completed = completedModuleIds.includes(module.id);
                  const selected = selectedModule.id === module.id;
                  const answered = quizAnswers[module.id] !== undefined;
                  return (
                    <TiltCard key={module.id} delay={index * 45} max={5} className="rounded-2xl">
                      <button
                        onClick={() => setSelectedModuleId(module.id)}
                        className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left shadow-card-elegant transition-colors ${
                          selected ? "border-primary/55 bg-primary/10" : "border-border bg-card/70 hover:border-primary/35"
                        }`}
                      >
                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${completed ? "bg-primary text-primary-foreground" : "bg-accent text-primary-glow"}`}>
                          {completed ? <CheckCircle2 className="h-5 w-5" /> : module.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-primary-glow">Modul {module.number}</span>
                            <StatusPill completed={completed} answered={answered} />
                          </div>
                          <h3 className="mt-1 font-medium">{module.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{module.subtitle}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <SmallPill>{module.difficulty}</SmallPill>
                            <SmallPill>{module.duration}</SmallPill>
                          </div>
                        </div>
                      </button>
                    </TiltCard>
                  );
                })}
              </aside>

              <main className="min-w-0 rounded-2xl border border-border bg-card/75 p-5 shadow-card-elegant backdrop-blur sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-primary/30 text-primary-glow">Modul {selectedModule.number}</Badge>
                      <Badge variant="secondary">{selectedModule.difficulty}</Badge>
                      <Badge variant="outline">{selectedModule.duration}</Badge>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{selectedModule.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{selectedModule.description}</p>
                  </div>
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary-glow">
                    {selectedModule.icon}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {selectedModule.outcomes.map((outcome) => (
                    <div key={outcome} className="rounded-xl border border-border bg-background/45 p-3 text-sm leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mb-2 h-4 w-4 text-primary-glow" />
                      {outcome}
                    </div>
                  ))}
                </div>

                <Accordion type="single" collapsible defaultValue="lesson-0" className="mt-7 rounded-2xl border border-border bg-background/35 px-4">
                  {selectedModule.lessons.map((lesson, index) => (
                    <AccordionItem key={lesson.title} value={`lesson-${index}`} className="border-border">
                      <AccordionTrigger className="text-left text-sm font-medium hover:text-primary-glow">
                        {lesson.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {lesson.body}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <QuizCard
                  module={selectedModule}
                  answer={currentAnswer}
                  onAnswer={(answer) => persistAnswer(selectedModule, answer)}
                />

                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="rounded-2xl border border-border bg-background/45 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageCircle className="h-4 w-4 text-primary-glow" />
                      Community zum Modul
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{selectedModule.community.question}</p>
                    <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-sm text-muted-foreground">
                      <span className="text-foreground">Tipp:</span> {selectedModule.community.tip}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Badge variant="secondary">{selectedModule.community.discussions} Diskussionen</Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/community">Frage stellen</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/45 p-4">
                    <p className="text-sm font-medium">Modulabschluss</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Beantworte das Quiz richtig, um das Modul abzuschließen und deinen Fortschritt zu speichern.
                    </p>
                    <Button onClick={markModuleComplete} disabled={!isQuizCorrect} className="mt-4 w-full bg-gradient-primary shadow-glow">
                      Modul abschließen
                    </Button>
                    {completedModuleIds.length > 0 && (
                      <button onClick={resetProgress} className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground">
                        Fortschritt zurücksetzen
                      </button>
                    )}
                  </div>
                </div>
              </main>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-0">
            <div className="rounded-2xl border border-border bg-card/75 p-5 shadow-card-elegant backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Projektbereich</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Wähle Projekte, die direkt zu deinem Lernpfad passen. Jedes Projekt zeigt Ziel, Aufwand und Voraussetzungen.
                  </p>
                </div>
                <label className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm text-muted-foreground lg:w-80">
                  <Search className="h-4 w-4 shrink-0 text-primary-glow" />
                  <input
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder="Projekt suchen"
                    className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.title} project={project} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="community" className="mt-0">
            <div className="grid gap-5 lg:grid-cols-3">
              <CommunityPanel
                icon={<CircleHelp className="h-5 w-5" />}
                title="Fragen anderer Nutzer"
                items={["Was ist der Unterschied zwischen API und Datenbank?", "Wie starte ich mit Python, wenn ich nur Web kann?", "Welche KI-Projekte sind gut für Anfänger?"]}
              />
              <CommunityPanel
                icon={<Lightbulb className="h-5 w-5" />}
                title="Community-Tipps"
                items={["Baue kleine Projekte mit sichtbarem Ergebnis.", "Teste Prompts immer mit echten Beispielen.", "Dokumentiere jeden Fehler als Lernnotiz."]}
              />
              <CommunityPanel
                icon={<Bot className="h-5 w-5" />}
                title="Direkt verbinden"
                items={["Diskussion zum aktuellen Modul starten", "Projektidee in der Community posten", "Feedback für dein MVP einsammeln"]}
                cta
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </SiteShell>
  );
}

function QuizCard({ module, answer, onAnswer }: { module: LearningModule; answer?: number; onAnswer: (answer: number) => void }) {
  const answered = answer !== undefined;
  const correct = answer === module.quiz.correctIndex;

  return (
    <div className="mt-7 rounded-2xl border border-border bg-background/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-primary-glow" />
            Wissenskontrolle
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{module.quiz.question}</p>
        </div>
        <Badge variant={answered ? (correct ? "secondary" : "destructive") : "outline"}>
          {answered ? (correct ? "Richtig" : "Nochmal prüfen") : "Offen"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2">
        {module.quiz.options.map((option, index) => {
          const isSelected = answer === index;
          const isCorrect = module.quiz.correctIndex === index;
          return (
            <button
              key={option}
              onClick={() => onAnswer(index)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                answered && isCorrect
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : isSelected
                    ? "border-destructive/45 bg-destructive/10 text-foreground"
                    : "border-border bg-card/55 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`mt-4 rounded-xl border p-3 text-sm leading-relaxed ${correct ? "border-primary/35 bg-primary/10 text-primary-glow" : "border-border bg-card/55 text-muted-foreground"}`}>
          {correct ? "Richtig. " : "Die richtige Lösung ist markiert. "}
          {module.quiz.explanation}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectIdea }) {
  return (
    <article className="rounded-2xl border border-border bg-background/45 p-4 shadow-card-elegant">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{project.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-glow">
          <Layers3 className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <SmallPill>{project.difficulty}</SmallPill>
        <SmallPill>{project.duration}</SmallPill>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniList title="Lernziele" items={project.goals} />
        <MiniList title="Voraussetzungen" items={project.requirements} />
      </div>
    </article>
  );
}

function CommunityPanel({ icon, title, items, cta = false }: { icon: ReactNode; title: string; items: string[]; cta?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card/75 p-5 shadow-card-elegant backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-glow">{icon}</div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-border bg-background/45 p-3 text-sm leading-relaxed text-muted-foreground">
            {item}
          </div>
        ))}
      </div>
      {cta && (
        <Button asChild className="mt-4 w-full bg-gradient-primary shadow-glow">
          <Link to="/community">Zur Community</Link>
        </Button>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/55 p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function LearningBadge({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
        active ? "border-primary/35 bg-primary/10 text-primary-glow" : "border-border bg-background/35 text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function StatusPill({ completed, answered }: { completed: boolean; answered: boolean }) {
  if (completed) return <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary-glow">Abgeschlossen</span>;
  if (answered) return <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Quiz gestartet</span>;
  return <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Offen</span>;
}

function SmallPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-border bg-background/55 px-2.5 py-1 text-xs text-muted-foreground">{children}</span>;
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-glow" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
