import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Rocket, MessageCircleQuestion, BookOpen, Upload, Code2, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/layout/SiteShell";
import { TiltCard } from "@/components/ui/tilt-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solvix — Entdecke, teile und baue Coding- & KI-Projekte" },
      { name: "description", content: "Solvix ist eine moderne Community für Coding, KI und SaaS. Entdecke echte Projekte, lade eigene hoch, stelle Fragen und lerne mit anderen." },
      { property: "og:title", content: "Solvix — Entdecke, teile und baue Coding- & KI-Projekte" },
      { property: "og:description", content: "Eine moderne Community für Coding, KI und SaaS." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground shadow-card-elegant backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              Community für Coding, KI & SaaS
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Entdecke, teile und baue{" "}
              <span className="text-gradient">Coding- und KI-Projekte.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Solvix ist eine Plattform für Menschen, die lernen, bauen und sich von echten
              Projekten inspirieren lassen wollen.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
                <Link to="/projects">
                  Projekte entdecken <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/upload-project">Eigenes Projekt hochladen</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/questions">Coding-Frage stellen</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Warum Coding und KI heute zählen
            </h2>
            <p className="mt-3 text-muted-foreground">
              Die Werkzeuge sind da. Was fehlt, sind Ideen, Übung und eine Community,
              die zeigt, was wirklich möglich ist.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <FeatureCard
              icon={<Code2 className="h-5 w-5" />}
              title="Echte Projekte"
              desc="Statt Theorie: durchsuche reale Coding- und KI-Projekte mit Code, Demo und Erklärung."
              delay={0}
            />
            <FeatureCard
              icon={<Brain className="h-5 w-5" />}
              title="KI verständlich"
              desc="Lerne, wie moderne KI-Tools praktisch eingesetzt werden — ohne Buzzword-Bingo."
              delay={90}
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Schneller Einstieg"
              desc="Für Anfänger erklärt, für Fortgeschrittene tief genug. Du wählst, wie tief es geht."
              delay={180}
            />
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Eine Plattform. Drei Wege, dich einzubringen.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Entdecke fertige Projekte, lade eigene hoch oder frage die Community —
                alles an einem Ort, sauber und übersichtlich.
              </p>
            </div>
            <div className="grid gap-4">
              <Step icon={<Rocket className="h-5 w-5" />} title="Projekte entdecken" desc="Filtere nach KI, Webentwicklung, SaaS, Automatisierung und mehr." to="/projects" delay={0} />
              <Step icon={<Upload className="h-5 w-5" />} title="Projekt hochladen" desc="Teile, was du gebaut hast — inkl. Tech-Stack, Lernpunkte und Demo." to="/upload-project" delay={80} />
              <Step icon={<MessageCircleQuestion className="h-5 w-5" />} title="Frage stellen" desc="Stuck? Stelle Coding- oder KI-Fragen, andere helfen weiter." to="/questions" delay={160} />
              <Step icon={<BookOpen className="h-5 w-5" />} title="Lernen" desc="Einfache Einführung in Coding, KI, APIs, Python, JavaScript & Co." to="/learn" delay={240} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card-elegant">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Bereit, dein nächstes Projekt zu zeigen?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Erstelle einen kostenlosen Account und veröffentliche dein erstes Projekt in
              wenigen Minuten.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
                <Link to="/auth">Kostenlos starten</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/projects">Galerie ansehen</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function FeatureCard({ icon, title, desc, delay = 0 }: { icon: React.ReactNode; title: string; desc: string; delay?: number }) {
  return (
    <TiltCard delay={delay} className="rounded-xl">
      <div className="group h-full rounded-xl border border-border bg-card p-6 shadow-card-elegant transition-colors hover:border-primary/40">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary-glow">
          {icon}
        </div>
        <h3 className="mt-4 font-medium">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      </div>
    </TiltCard>
  );
}

function Step({ icon, title, desc, to, delay = 0 }: { icon: React.ReactNode; title: string; desc: string; to: string; delay?: number }) {
  return (
    <TiltCard delay={delay} max={5} className="rounded-xl">
      <Link
        to={to}
        className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:shadow-glow"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary-glow">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{title}</h3>
            <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground transition-all group-hover:translate-x-0 group-hover:text-foreground" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
      </Link>
    </TiltCard>
  );
}
