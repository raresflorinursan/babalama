import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { GalacticBackground } from "@/components/GalacticBackground";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <GalacticBackground />
      <Navbar />
      <main key={pathname} className="page-transition relative z-10 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
