import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees */
  max?: number;
  /** Scale on hover */
  scale?: number;
  /** Delay (ms) before reveal */
  delay?: number;
  /** Render as Link? Pass through onClick/role on wrapping element */
  as?: "div";
  style?: CSSProperties;
};

/**
 * 3D tilt card with mouse-tracked perspective rotation and a scroll-reveal entrance.
 * Pure CSS transforms — no animation library required.
 */
export function TiltCard({
  children,
  className,
  max = 8,
  scale = 1.02,
  delay = 0,
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * max * 2;
    const ry = (px - 0.5) * max * 2;
    el.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
    el.style.setProperty("--tilt-mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--tilt-my", `${(py * 100).toFixed(1)}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-rx", "0deg");
    el.style.setProperty("--tilt-ry", "0deg");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={
        {
          transitionDelay: `${delay}ms`,
          ["--tilt-scale" as string]: scale,
          ...style,
        } as CSSProperties
      }
      className={cn("tilt-card", visible ? "tilt-card--in" : "tilt-card--out", className)}
    >
      <div className="tilt-card__inner">
        {children}
        <span aria-hidden className="tilt-card__sheen" />
      </div>
    </div>
  );
}
