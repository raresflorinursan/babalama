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
  icon: React.ReactNode;
};

const learnTopics: LearnTopic[] = [
  {
    id: "coding",
    title: "Was ist Coding?",
    summary: "Programmieren heißt, dem Computer in einer Sprache zu sagen, was er tun soll — wie ein Rezept, nur sehr präzise.",
    detail: "Du schreibst Anweisungen Schritt für Schritt. Der Computer versteht keine Absicht, sondern nur klare Regeln.",
    howItWorks: "Du nutzt Sprachen wie JavaScript oder Python, definierst Logik, speicherst Daten und reagierst auf Eingaben.",
    whyItMatters: "Damit baust du Webseiten, Tools, Automationen und Produkte, statt nur vorhandene Software zu nutzen.",
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    id: "ai",
    title: "Was ist KI?",
    summary: "Künstliche Intelligenz sind Systeme, die aus Daten lernen — z.B. um Texte zu schreiben, Bilder zu erzeugen oder Muster zu erkennen.",
    detail: "KI ist kein Magietrick. Sie basiert auf Modellen, Trainingsdaten und klaren Aufgaben.",
    howItWorks: "Ein Modell verarbeitet Eingaben, erkennt Strukturen und gibt auf Basis gelernter Muster eine Antwort zurück.",
    whyItMatters: "Du kannst damit Recherche, Support, Content, Analyse und ganze Workflows deutlich schneller machen.",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    id: "importance",
    title: "Warum ist das wichtig?",
    summary: "Coding und KI sind heute überall: Apps, Webseiten, Automatisierungen, Geschäftsideen. Wer es versteht, kann Dinge bauen, nicht nur konsumieren.",
    detail: "Digitale Produkte entscheiden heute oft über Reichweite, Geschwindigkeit und Umsatz.",
    howItWorks: "Wenn du Software und KI kombinierst, kannst du Probleme lösen, Prozesse beschleunigen und neue Systeme bauen.",
    whyItMatters: "Das ist der Unterschied zwischen Nutzer und Builder. Genau dort entstehen Chancen für Projekte, Jobs und SaaS.",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "languages",
    title: "Welche Sprache zuerst?",
    summary: "Python für KI/Daten/Automation, JavaScript für Web. Beide sind anfängerfreundlich und überall einsetzbar.",
    detail: "Du musst nicht alles gleichzeitig lernen. Starte mit einer Sprache und baue echte Mini-Projekte.",
    howItWorks: "Python ist sehr lesbar und stark bei Daten und KI. JavaScript läuft direkt im Browser und ist Pflicht fürs Web.",
    whyItMatters: "Mit der richtigen ersten Sprache kommst du schneller ins Bauen und bleibst eher dran.",
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    id: "apis",
    title: "APIs & Datenbanken",
    summary: "APIs verbinden Apps miteinander, Datenbanken speichern Informationen. Zusammen sind sie das Rückgrat fast jeder Software.",
    detail: "Ohne Daten und Verbindungen bleiben die meisten Apps statisch und isoliert.",
    howItWorks: "APIs schicken strukturierte Daten zwischen Systemen hin und her. Datenbanken speichern Nutzer, Inhalte und Zustände.",
    whyItMatters: "Sobald du Logins, Profile, Dashboards oder Automationen baust, brauchst du diese beiden Bausteine fast immer.",
    icon: <Database className="h-5 w-5" />,
  },
  {
    id: "automation",
    title: "Automatisierung & SaaS",
    summary: "Automatisiere Aufgaben oder baue ein SaaS — eine Software, die andere abonnieren.",
    detail: "Viele Probleme im Business sind wiederholbar. Genau das ist der beste Ausgangspunkt für Automation und Software.",
    howItWorks: "Du kombinierst Regeln, APIs, Trigger und Interfaces, damit Prozesse automatisch ablaufen oder als Produkt nutzbar werden.",
    whyItMatters: "Hier entsteht oft der direkte Hebel für Zeitgewinn, Geld und wiederkehrenden Nutzen.",
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
  const [selectedTopicId, setSelectedTopicId] = useState(learnTopics[0].id);
  const [activeLevel, setActiveLevel] = useState<keyof typeof botLevels>("Einfach");
  const [botPrompt, setBotPrompt] = useState("");
  const selectedTopic = learnTopics.find((topic) => topic.id === selectedTopicId) ?? learnTopics[0];
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
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-start lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1">
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

          <TiltCard key={selectedTopic.id} max={4} scale={1.01} className="rounded-xl md:sticky md:top-24">
            <aside className="rounded-xl border border-primary/35 bg-card/90 p-5 shadow-glow backdrop-blur animate-in fade-in zoom-in-95 slide-in-from-right-4 duration-300">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-primary-glow">
                  {selectedTopic.icon}
                </div>
                <div>
                  <p className="text-xs uppercase text-primary-glow">Lernfenster</p>
                  <h2 className="mt-1 text-lg font-medium">{selectedTopic.title}</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground">{selectedTopic.detail}</p>
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">So funktioniert es:</span> {selectedTopic.howItWorks}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Warum es relevant ist:</span> {selectedTopic.whyItMatters}
                </p>
              </div>
            </aside>
          </TiltCard>
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
    </SiteShell>
  );
}

function IdeaCard({ title }: { title: string }) {
  return <div className="rounded-lg border border-border bg-background/40 px-3 py-2">{title}</div>;
}
