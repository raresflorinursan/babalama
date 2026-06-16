import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain,
  ChevronDown,
  Code2,
  Cpu,
  Database,
  Lightbulb,
  Rocket,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { TiltCard } from "@/components/ui/tilt-card";

type LearnTopic = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  howItWorks: string;
  whyItMatters: string;
  example: string;
  nextStep: string;
  icon: React.ReactNode;
};

const learnTopics: LearnTopic[] = [
  {
    id: "coding",
    title: "Was ist Coding?",
    summary: "Programmieren heißt, dem Computer in einer Sprache zu sagen, was er tun soll — wie ein Rezept, nur sehr präzise.",
    detail: "Coding bedeutet, ein Problem in kleine, klare Schritte zu zerlegen und diese Schritte so aufzuschreiben, dass ein Computer sie ausführen kann. Es geht nicht nur um Syntax. Es geht darum, logisch zu denken, Fehler zu finden und aus einer Idee ein funktionierendes System zu machen.",
    howItWorks: "Du nutzt Sprachen wie JavaScript oder Python, definierst Logik, speicherst Daten und reagierst auf Eingaben. Aus vielen kleinen Entscheidungen entsteht am Ende eine Website, eine App, ein Tool oder eine Automation.",
    whyItMatters: "Damit baust du Webseiten, Tools, Automationen und Produkte, statt nur vorhandene Software zu nutzen. Wer Coding versteht, kann eigene Lösungen bauen und digitale Ideen schneller testen.",
    example: "Ein einfaches Beispiel ist eine To-Do-App: Eingabe lesen, Aufgabe speichern, Liste anzeigen, Aufgabe abhaken. Klingt klein, enthält aber schon echte Produktlogik.",
    nextStep: "Starte mit einem Mini-Projekt, das du wirklich benutzen würdest. Nicht zehn Tutorials schauen, sondern ein kleines Problem sauber lösen.",
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    id: "ai",
    title: "Was ist KI?",
    summary: "Künstliche Intelligenz sind Systeme, die aus Daten lernen — z.B. um Texte zu schreiben, Bilder zu erzeugen oder Muster zu erkennen.",
    detail: "KI ist kein Magietrick. Sie besteht aus Modellen, die Muster in Daten gelernt haben und auf neue Eingaben reagieren können. Entscheidend ist, dass du der KI eine klare Aufgabe, guten Kontext und ein prüfbares Ziel gibst.",
    howItWorks: "Ein Modell verarbeitet Eingaben, erkennt Strukturen und gibt auf Basis gelernter Muster eine Antwort zurück. Je besser Kontext, Daten und Ziel formuliert sind, desto brauchbarer wird das Ergebnis.",
    whyItMatters: "Du kannst damit Recherche, Support, Content, Analyse und ganze Workflows deutlich schneller machen. In Kombination mit Coding wird KI nicht nur ein Chat, sondern ein Teil deines Produkts.",
    example: "Ein KI-Assistent kann Nutzerfragen zusammenfassen, passende Projektideen vorschlagen oder aus Formular-Daten automatisch eine strukturierte Aufgabe erzeugen.",
    nextStep: "Lerne nicht nur Prompts. Lerne, wie KI mit Daten, UI, Datenbanken und klaren Regeln in echte Systeme eingebaut wird.",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    id: "importance",
    title: "Warum ist das wichtig?",
    summary: "Coding und KI sind heute überall: Apps, Webseiten, Automatisierungen, Geschäftsideen. Wer es versteht, kann Dinge bauen, nicht nur konsumieren.",
    detail: "Digitale Produkte entscheiden heute oft über Reichweite, Geschwindigkeit und Umsatz. Unternehmen, Creator und Teams suchen ständig nach Wegen, schneller zu arbeiten, bessere Entscheidungen zu treffen und wiederkehrende Aufgaben zu reduzieren.",
    howItWorks: "Wenn du Software und KI kombinierst, kannst du Probleme lösen, Prozesse beschleunigen und neue Systeme bauen. Coding macht die Struktur, KI bringt Unterstützung bei Text, Analyse, Suche und Automatisierung.",
    whyItMatters: "Das ist der Unterschied zwischen Nutzer und Builder. Genau dort entstehen Chancen für Projekte, Jobs und SaaS, weil du nicht nur Tools konsumierst, sondern eigene Werkzeuge erschaffst.",
    example: "Ein Student kann eine Lernplattform bauen, ein Freelancer ein Kunden-Dashboard und ein Gründer ein SaaS für ein konkretes Firmenproblem.",
    nextStep: "Suche echte Probleme in deinem Alltag. Wenn sich etwas wiederholt, langsam ist oder nervt, ist es oft eine gute Projektidee.",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "languages",
    title: "Welche Sprache zuerst?",
    summary: "Python für KI/Daten/Automation, JavaScript für Web. Beide sind anfängerfreundlich und überall einsetzbar.",
    detail: "Du musst nicht alles gleichzeitig lernen. Die beste erste Sprache ist die, mit der du schnell echte Ergebnisse bauen kannst. Python und JavaScript sind dafür stark, weil sie große Communities, viele Beispiele und viele Einsatzbereiche haben.",
    howItWorks: "Python ist sehr lesbar und stark bei Daten, Automationen und KI. JavaScript läuft direkt im Browser und ist Pflicht fürs Web. Später kannst du beide kombinieren.",
    whyItMatters: "Mit der richtigen ersten Sprache kommst du schneller ins Bauen und bleibst eher dran. Zu viele Sprachen am Anfang führen oft zu Chaos statt Fortschritt.",
    example: "Wenn du Webseiten und Plattformen bauen willst, starte mit JavaScript/TypeScript. Wenn du KI, Daten oder Automationen bauen willst, ist Python ein sehr guter Start.",
    nextStep: "Wähle eine Sprache für 30 Tage. Baue jeden Tag ein kleines Feature, statt ständig die Richtung zu wechseln.",
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    id: "apis",
    title: "APIs & Datenbanken",
    summary: "APIs verbinden Apps miteinander, Datenbanken speichern Informationen. Zusammen sind sie das Rückgrat fast jeder Software.",
    detail: "Ohne Daten und Verbindungen bleiben die meisten Apps statisch und isoliert. APIs und Datenbanken machen aus einer Oberfläche ein echtes Produkt, weil Informationen gespeichert, geladen und zwischen Systemen ausgetauscht werden.",
    howItWorks: "APIs schicken strukturierte Daten zwischen Systemen hin und her. Datenbanken speichern Nutzer, Inhalte und Zustände. Supabase, PostgreSQL oder ähnliche Tools übernehmen dabei viel Infrastruktur.",
    whyItMatters: "Sobald du Logins, Profile, Dashboards, Kommentare, Uploads oder Automationen baust, brauchst du diese beiden Bausteine fast immer.",
    example: "Bei Solvix speichern Profile, Projekte, Fragen und später Tweets ihre Daten in Tabellen. Die App fragt diese Daten ab und zeigt sie passend im Interface an.",
    nextStep: "Lerne CRUD: Create, Read, Update, Delete. Wenn du das verstehst, kannst du sehr viele Produktideen technisch umsetzen.",
    icon: <Database className="h-5 w-5" />,
  },
  {
    id: "automation",
    title: "Automatisierung & SaaS",
    summary: "Automatisiere Aufgaben oder baue ein SaaS — eine Software, die andere abonnieren.",
    detail: "Viele Probleme im Business sind wiederholbar. Genau das ist der beste Ausgangspunkt für Automation und Software. Ein SaaS löst ein konkretes Problem nicht einmal, sondern dauerhaft für viele Nutzer.",
    howItWorks: "Du kombinierst Regeln, APIs, Trigger und Interfaces, damit Prozesse automatisch ablaufen oder als Produkt nutzbar werden. Gute SaaS-Produkte sind oft nicht riesig, sondern klar fokussiert.",
    whyItMatters: "Hier entsteht oft der direkte Hebel für Zeitgewinn, Geld und wiederkehrenden Nutzen. Wenn ein Tool jeden Monat Wert liefert, kann daraus ein Abo-Modell entstehen.",
    example: "Ein Tool, das Firmen automatisch Leads sortiert, Bewerbungen vorstrukturiert oder Social Posts plant, kann als kleines SaaS starten.",
    nextStep: "Suche ein wiederkehrendes Problem, baue ein sehr kleines MVP und teste es mit echten Nutzern, bevor du zu viele Features baust.",
    icon: <Workflow className="h-5 w-5" />,
  },
];

const botLevels = {
  Einfach: [
    "Baue eine To-Do-Liste mit lokalem Speicher.",
    "Erstelle einen Timer mit Start, Pause und Reset.",
    "Zeige API-Daten in einer kleinen Kartenansicht an.",
  ],
  Mittel: [
    "Baue ein Dashboard mit Login und Profilbereich.",
    "Erstelle ein Formular, das Daten in Supabase speichert.",
    "Verbinde eine externe API mit Filter- und Suchfunktion.",
  ],
  Fortgeschritten: [
    "Baue einen kleinen AI-Workflow mit Prompt, Ergebnis und Verlauf.",
    "Erstelle ein Mehrseiten-Tool mit Rollen, Datenbank und Dateiupload.",
    "Automatisiere einen Business-Prozess mit Webhooks und Status-Tracking.",
  ],
  Profi: [
    "Baue ein vertikales SaaS mit Auth, Billing-Logik und Admin-Ansicht.",
    "Erstelle ein Agenten-System mit Tool-Aufrufen und Ergebnis-Speicherung.",
    "Plane ein skalierbares Community-Feature mit Realtime, Moderation und Feed-Logik.",
  ],
} satisfies Record<string, string[]>;

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Einführung in Coding & KI — Solvix" },
      { name: "description", content: "Verständliche Einführung in Coding, KI, Python, JavaScript, APIs und Automatisierung — speziell für Anfänger." },
      { property: "og:title", content: "Einführung in Coding & KI — Solvix" },
      { property: "og:description", content: "Was ist Coding, was ist KI und wie fängt man an?" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<keyof typeof botLevels>("Einfach");
  const [botPrompt, setBotPrompt] = useState("");
  const selectedTopic = learnTopics.find((topic) => topic.id === selectedTopicId) ?? null;
  const generatedTask =
    botPrompt.trim().length > 0
      ? `Baue ein ${activeLevel.toLowerCase()}es Mini-Projekt zu "${botPrompt.trim()}": definiere zuerst das Ziel, erstelle eine einfache Oberfläche, speichere mindestens einen Zustand und dokumentiere, was du gelernt hast.`
      : botLevels[activeLevel][0];

  return (
    <SiteShell>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-primary-glow" /> Für Einsteiger
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Coding & KI — <span className="text-gradient">einfach erklärt</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Du brauchst keinen perfekten Start. Du brauchst nur genug Klarheit, um das erste echte Projekt zu bauen.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {learnTopics.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            return (
              <TiltCard key={topic.id} delay={learnTopics.indexOf(topic) * 60} max={6} className="rounded-xl">
                <button
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`group flex h-full w-full items-start justify-between gap-4 rounded-xl border bg-card p-5 text-left shadow-card-elegant transition-colors ${
                    isSelected ? "border-primary/50 shadow-glow" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary-glow">{topic.icon}</div>
                    <h3 className="mt-4 font-medium">{topic.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isSelected ? "-rotate-90 text-primary-glow" : ""}`} />
                </button>
              </TiltCard>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-card p-4 shadow-card-elegant">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-medium">Erste Projektideen</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Kleine echte Projekte bringen dich schneller weiter als passives Lernen. Nimm etwas, das ein klares Ergebnis hat.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              Projektideen-Bot Preview
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            <IdeaCard title="To-Do-App mit Login" />
            <IdeaCard title="Web Scraper für News" />
            <IdeaCard title="Chatbot mit GPT-API" />
            <IdeaCard title="Automatischer Newsletter-Generator" />
            <IdeaCard title="Mini-SaaS Landingpage" />
            <IdeaCard title="Bewertungs-Automation für Unternehmen" />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary-glow" />
                  <input
                    value={botPrompt}
                    onChange={(event) => setBotPrompt(event.target.value)}
                    placeholder="Beschreibe, welche Aufgabe du bauen möchtest"
                    className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <div className="rounded-xl border border-border bg-card px-3 py-2">
                  <p className="mb-2 text-xs text-muted-foreground">Niveau</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(botLevels).map((level) => (
                      <button
                        key={level}
                        onClick={() => setActiveLevel(level as keyof typeof botLevels)}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                          activeLevel === level
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : "border border-border bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Projektideen-Bot Preview</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary-glow">{activeLevel}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{generatedTask}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {selectedTopic && <LearnTopicModal topic={selectedTopic} onClose={() => setSelectedTopicId(null)} />}
    </SiteShell>
  );
}

function LearnTopicModal({ topic, onClose }: { topic: LearnTopic; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4 py-8 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,hsl(var(--primary)/.18),transparent_34%)]" />
      <TiltCard max={4} scale={1.01} className="relative z-10 w-full max-w-3xl rounded-2xl">
        <article className="max-h-[86vh] overflow-y-auto rounded-2xl border border-primary/35 bg-card/95 p-6 shadow-[0_30px_140px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-primary-glow shadow-glow">
                {topic.icon}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-glow">Lernfenster</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{topic.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Lernfenster schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-7 space-y-5">
            <ModalTextBlock title="Kurz erklärt" text={topic.detail} />
            <div className="grid gap-4 md:grid-cols-2">
              <ModalTextBlock title="So funktioniert es" text={topic.howItWorks} />
              <ModalTextBlock title="Warum es wichtig ist" text={topic.whyItMatters} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ModalTextBlock title="Beispiel" text={topic.example} />
              <ModalTextBlock title="Nächster Schritt" text={topic.nextStep} />
            </div>
          </div>
        </article>
      </TiltCard>
    </div>
  );
}

function ModalTextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/45 p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function IdeaCard({ title }: { title: string }) {
  return <div className="rounded-lg border border-border bg-background/40 px-3 py-2">{title}</div>;
}
