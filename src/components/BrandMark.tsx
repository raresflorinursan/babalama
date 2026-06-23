type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "h-8 w-8" }: BrandMarkProps) {
  return (
    <img
      src="/solvix-logo.png"
      alt="Solvix"
      className={`${className} rounded-lg border border-white/10 object-cover shadow-glow`}
      decoding="async"
      fetchPriority="high"
    />
  );
}
