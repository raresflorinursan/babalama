export const PROJECT_CATEGORIES = [
  "KI",
  "Webentwicklung",
  "SaaS",
  "Automatisierung",
  "Python",
  "JavaScript",
] as const;
export const PROJECT_DIFFICULTIES = ["Anfänger", "Fortgeschritten"] as const;
export const LEARNING_MODULES = [
  { id: "", label: "Freies Projekt" },
  { id: "foundations", label: "Grundlagen" },
  { id: "python", label: "Python Grundlagen" },
  { id: "apis", label: "APIs verstehen" },
  { id: "ai-practice", label: "KI praktisch einsetzen" },
  { id: "automation", label: "Automatisierungen bauen" },
  { id: "saas", label: "Eigene SaaS entwickeln" },
] as const;
export type LearningModuleId = Exclude<(typeof LEARNING_MODULES)[number]["id"], "">;

const validLearningModuleIds = new Set<string>(
  LEARNING_MODULES.map((module) => module.id).filter(Boolean),
);

export function isLearningModuleId(value: unknown): value is LearningModuleId {
  return typeof value === "string" && validLearningModuleIds.has(value);
}

export type ProjectFormValues = {
  title: string;
  short_description: string;
  description: string;
  category: string;
  difficulty: string;
  technologies: string;
  github_url: string;
  demo_url: string;
  image_url: string;
  problem_solved: string;
  lessons_learned: string;
  learning_module_id: string;
};

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  title: "",
  short_description: "",
  description: "",
  category: PROJECT_CATEGORIES[0],
  difficulty: PROJECT_DIFFICULTIES[0],
  technologies: "",
  github_url: "",
  demo_url: "",
  image_url: "",
  problem_solved: "",
  lessons_learned: "",
  learning_module_id: "",
};

export function parseTechnologies(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

export function validateProjectForm(values: ProjectFormValues) {
  if (!values.title.trim() || !values.short_description.trim()) {
    return "Titel und Kurzbeschreibung sind Pflicht.";
  }
  for (const [label, value] of [
    ["GitHub-Link", values.github_url],
    ["Live-Demo-Link", values.demo_url],
    ["Bild-URL", values.image_url],
  ] as const) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return `${label} muss mit http:// oder https:// beginnen.`;
      }
    } catch {
      return `${label} muss eine gültige URL sein.`;
    }
  }
  return null;
}
