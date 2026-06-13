import { createFileRoute } from "@tanstack/react-router";
import { Code2, Brain, Cpu, Database, Workflow, Lightbulb, Rocket } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";

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
              Du musst kein Genie sein. Du brauchst nur einen Anfang, etwas Neugier und ein paar Projekte zum Nachbauen.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Card icon={<Code2 className="h-5 w-5" />} title="Was ist Coding?" body="Programmieren heißt, dem Computer in einer Sprache zu sagen, was er tun soll — wie ein Rezept, nur sehr präzise." />
          <Card icon={<Brain className="h-5 w-5" />} title="Was ist KI?" body="Künstliche Intelligenz sind Systeme, die aus Daten lernen — z.B. um Texte zu schreiben, Bilder zu erzeugen oder Muster zu erkennen." />
          <Card icon={<Rocket className="h-5 w-5" />} title="Warum ist das wichtig?" body="Coding und KI sind heute überall: Apps, Webseiten, Automatisierungen, Geschäftsideen. Wer es versteht, kann Dinge bauen, nicht nur konsumieren." />
          <Card icon={<Cpu className="h-5 w-5" />} title="Welche Sprache zuerst?" body="Python für KI/Daten/Automation, JavaScript für Web. Beide sind anfängerfreundlich und überall einsetzbar." />
          <Card icon={<Database className="h-5 w-5" />} title="APIs & Datenbanken" body="APIs verbinden Apps miteinander, Datenbanken speichern Informationen. Zusammen sind sie das Rückgrat fast jeder Software." />
          <Card icon={<Workflow className="h-5 w-5" />} title="Automatisierung & SaaS" body="Automatisiere Aufgaben (z.B. mit n8n oder Skripten) oder baue ein SaaS — eine Software, die andere abonnieren." />
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-medium">Erste Projektideen</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• To-Do-App mit Login</li>
            <li>• Web Scraper für News</li>
            <li>• Chatbot mit GPT-API</li>
            <li>• Automatischer Newsletter-Generator</li>
            <li>• Mini-SaaS Landingpage</li>
            <li>• Bewertungs-Automation für Unternehmen</li>
          </ul>
        </div>
      </section>
    </SiteShell>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card-elegant">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary-glow">{icon}</div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
