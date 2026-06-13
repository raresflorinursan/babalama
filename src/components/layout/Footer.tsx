import { Link } from "@tanstack/react-router";
import { Code2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </span>
            Solvix
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Entdecke, teile und baue Coding- und KI-Projekte. Eine Community für Menschen,
            die lernen, bauen und sich inspirieren lassen wollen.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-medium">Plattform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/projects" className="hover:text-foreground">Projekte</Link></li>
            <li><Link to="/questions" className="hover:text-foreground">Fragen</Link></li>
            <li><Link to="/learn" className="hover:text-foreground">Lernen</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-medium">Account</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Login</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} Solvix</span>
          <span>Build with code & curiosity.</span>
        </div>
      </div>
    </footer>
  );
}
