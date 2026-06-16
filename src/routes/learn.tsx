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
  const [openTopic, setOpenTopic] = useState<string | null>(learnTopics[0].id);
  const [activeLevel, setActiveLevel] = useState<keyof typeof botLevels>("Einfach");

  return (
    <SiteShell>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-primary-glow" /> Fuer Einsteiger
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Coding & KI — <span className="text-gradient">einfach erklaert</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Du brauchst keinen perfekten Start. Du brauchst nur genug Klarheit, um das erste echte Projekt zu bauen.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {learnTopics.map((topic) => {
            const isOpen = openTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setOpenTopic((current) => (current === topic.id ? null : topic.id))}
                className={`text-left rounded-xl border bg-card p-6 shadow-card-elegant transition-colors ${
                  isOpen ? "border-primary/40" : "border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary-glow">{topic.icon}</div>
                    <h3 className="mt-4 font-medium">{topic.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
                {isOpen && (
                  <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
                    <p className="text-sm leading-relaxed text-foreground">{topic.detail}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">So funktioniert es:</span> {topic.howItWorks}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Warum es relevant ist:</span> {topic.whyItMatters}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-medium">Erste Projektideen</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Kleine echte Projekte bringen dich schneller weiter als passives Lernen. Nimm etwas, das ein klares Ergebnis hat.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              Projektideen-Bot Preview
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            <IdeaCard title="To-Do-App mit Login" />
            <IdeaCard title="Web Scraper fuer News" />
            <IdeaCard title="Chatbot mit GPT-API" />
            <IdeaCard title="Automatischer Newsletter-Generator" />
            <IdeaCard title="Mini-SaaS Landingpage" />
            <IdeaCard title="Bewertungs-Automation fuer Unternehmen" />
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background/40 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium">Projektideen-Bot anfragen</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Der Bot soll spaeter Aufgaben je nach Niveau vergeben: einfach, mittel, fortgeschritten oder profi.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(botLevels).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActiveLevel(level as keyof typeof botLevels)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      activeLevel === level
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              {botLevels[activeLevel].map((task) => (
                <div key={task} className="rounded-lg border border-border bg-card px-3 py-3">
                  {task}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function IdeaCard({ title }: { title: string }) {
  return <div className="rounded-lg border border-border bg-background/40 px-3 py-3">{title}</div>;
}
