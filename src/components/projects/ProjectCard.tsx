import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ProjectCardData = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  category: string;
  difficulty: string;
  technologies: string[] | null;
  image_url: string | null;
  likes_count: number;
  comments_count?: number;
  author?: { username: string | null; full_name: string | null } | null;
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card-elegant transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-accent">
        {project.image_url ? (
          <img
            src={project.image_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur">{project.category}</Badge>
          <Badge variant="outline" className="bg-background/80 backdrop-blur">{project.difficulty}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 font-medium tracking-tight">{project.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.short_description}</p>

        {project.technologies && project.technologies.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 4).map((t) => (
              <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="truncate">
            {project.author?.username ?? project.author?.full_name ?? "Anonym"}
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {project.likes_count}</span>
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {project.comments_count ?? 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
