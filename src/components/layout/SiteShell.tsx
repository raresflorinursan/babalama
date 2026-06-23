import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { GalacticBackground } from "@/components/GalacticBackground";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteShell({
  children,
  hideFooter = false,
}: {
  children: ReactNode;
  hideFooter?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
      >
        Zum Hauptinhalt
      </a>
      <GalacticBackground />
      <Navbar />
      <main
        id="main-content"
        key={pathname}
        tabIndex={-1}
        className="page-transition relative z-10 flex-1 outline-none"
      >
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
