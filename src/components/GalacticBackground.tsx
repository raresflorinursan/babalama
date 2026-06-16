import { useEffect, useRef } from "react";

export function GalacticBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) return;
    const c: HTMLCanvasElement = canvas;
    const g: CanvasRenderingContext2D = ctx;

    let width = 0;
    let height = 0;
    let scrollY = window.scrollY;
    let scrollDelta = 0;
    let lastScroll = window.scrollY;
    let time = 0;
    let animId = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    class Star {
      x = Math.random() * width;
      y = Math.random() * height;
      size = Math.pow(Math.random(), 3) * 2.5 + 0.2;
      opacity = Math.random() * 0.8 + 0.1;
      twinkleSpeed = Math.random() * 0.02 + 0.005;
      twinkleOffset = Math.random() * Math.PI * 2;
      color = ["#ffffff", "#bfdbfe", "#c7d2fe", "#a5f3fc"][Math.floor(Math.random() * 4)];
      parallax = Math.random() * 0.4 + 0.05;

      draw(t: number) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * this.twinkleSpeed * 60 + this.twinkleOffset);
        const yd = ((this.y - scrollY * this.parallax * 0.15) % height + height) % height;

        ctx.save();
        ctx.globalAlpha = this.opacity * (0.5 + 0.5 * twinkle);

        if (this.size > 1.2) {
          const gradient = ctx.createRadialGradient(this.x, yd, 0, this.x, yd, this.size * 3);
          gradient.addColorStop(0, this.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(this.x, yd, this.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, yd, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Nebula {
      x = Math.random() * width;
      y = Math.random() * height;
      rx = Math.random() * 320 + 160;
      ry = Math.random() * 200 + 100;
      rotation = Math.random() * Math.PI;
      color = ["rgba(56,189,248", "rgba(129,140,248", "rgba(192,132,252", "rgba(52,211,153"][
        Math.floor(Math.random() * 4)
      ];
      opacity = Math.random() * 0.045 + 0.012;
      driftX = (Math.random() - 0.5) * 0.08;
      driftY = (Math.random() - 0.5) * 0.04;
      parallax = Math.random() * 0.25 + 0.08;

      draw(t: number) {
        this.x += this.driftX;
        this.y += this.driftY;

        if (this.x < -400) this.x = width + 400;
        if (this.x > width + 400) this.x = -400;

        const yd = this.y - scrollY * this.parallax * 0.1;

        ctx.save();
        ctx.translate(this.x, yd);
        ctx.rotate(this.rotation + t * 0.0003);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.rx);
        gradient.addColorStop(0, `${this.color},${this.opacity})`);
        gradient.addColorStop(0.5, `${this.color},${this.opacity * 0.4})`);
        gradient.addColorStop(1, `${this.color},0)`);

        ctx.scale(1, this.ry / this.rx);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class NetworkNode {
      x = Math.random() * width;
      y = Math.random() * height;
      vx = (Math.random() - 0.5) * 0.35;
      vy = (Math.random() - 0.5) * 0.35;
      r = Math.random() * 2.5 + 1;
      color = ["#38bdf8", "#818cf8", "#c084fc", "#34d399"][Math.floor(Math.random() * 4)];
      parallax = Math.random() * 0.2 + 0.05;
      pulseOffset = Math.random() * Math.PI * 2;

      update(scrollForce: number) {
        this.x += this.vx + scrollForce * 0.4;
        this.y += this.vy;

        if (this.x < -50) this.x = width + 50;
        if (this.x > width + 50) this.x = -50;
        if (this.y < -50) this.y = height + 50;
        if (this.y > height + 50) this.y = -50;
      }

      draw(t: number) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.02 + this.pulseOffset);
        const yd = ((this.y - scrollY * this.parallax * 0.1) % height + height) % height;

        ctx.save();
        ctx.shadowBlur = 18 * pulse;
        ctx.shadowColor = this.color;
        ctx.globalAlpha = 0.75 * pulse;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, yd, this.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class ShootingStar {
      x = 0;
      y = 0;
      len = 0;
      speed = 0;
      angle = 0;
      opacity = 1;
      active = false;
      timer = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width * 1.4 - width * 0.2;
        this.y = Math.random() * height * 0.45;
        this.len = Math.random() * 130 + 60;
        this.speed = Math.random() * 9 + 5;
        this.angle = Math.PI / 5 + (Math.random() - 0.5) * 0.3;
        this.opacity = 1;
        this.active = false;
        this.timer = Math.random() * 280 + 80;
      }

      update() {
        if (!this.active) {
          this.timer -= 1;
          if (this.timer <= 0) this.active = true;
          return;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.016;

        if (this.opacity <= 0) this.reset();
      }

      draw() {
        if (!this.active) return;

        const tx = this.x - Math.cos(this.angle) * this.len;
        const ty = this.y - Math.sin(this.angle) * this.len;
        const gradient = ctx.createLinearGradient(tx, ty, this.x, this.y);

        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.7, `rgba(186,230,253,${this.opacity * 0.6})`);
        gradient.addColorStop(1, `rgba(255,255,255,${this.opacity})`);

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    let stars: Star[] = [];
    let nebulae: Nebula[] = [];
    let nodes: NetworkNode[] = [];
    let shootingStars: ShootingStar[] = [];

    function initAll() {
      stars = Array.from({ length: 220 }, () => new Star());
      nebulae = Array.from({ length: 5 }, () => new Nebula());
      nodes = Array.from({ length: 30 }, () => new NetworkNode());
      shootingStars = Array.from({ length: 3 }, () => new ShootingStar());
    }

    function handleResize() {
      resize();
      initAll();
    }

    function handleScroll() {
      scrollDelta = (window.scrollY - lastScroll) * 0.06;
      lastScroll = window.scrollY;
      scrollY = window.scrollY;
    }

    function drawConnections(nodeList: NetworkNode[]) {
      const maxDist = 250 + Math.abs(scrollDelta) * 380;

      for (let i = 0; i < nodeList.length; i += 1) {
        const yi = ((nodeList[i].y - scrollY * nodeList[i].parallax * 0.1) % height + height) % height;

        for (let j = i + 1; j < nodeList.length; j += 1) {
          const yj = ((nodeList[j].y - scrollY * nodeList[j].parallax * 0.1) % height + height) % height;
          const dx = nodeList[i].x - nodeList[j].x;
          const dy = yi - yj;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = 0.025 + (1 - dist / maxDist) * 0.145;
            const gradient = ctx.createLinearGradient(nodeList[i].x, yi, nodeList[j].x, yj);

            gradient.addColorStop(0, nodeList[i].color);
            gradient.addColorStop(1, nodeList[j].color);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(nodeList[i].x, yi);
            ctx.lineTo(nodeList[j].x, yj);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    function drawGlow() {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? Math.min(scrollY / totalHeight, 1) : 0;
      const centerY = height * (0.35 - progress * 0.25);
      const glow = ctx.createRadialGradient(width * 0.5, centerY, 0, width * 0.5, centerY, width * 0.38);

      glow.addColorStop(0, `rgba(14,165,233,${0.07 + progress * 0.03})`);
      glow.addColorStop(0.4, "rgba(129,140,248,0.025)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const secondX = width * (0.25 + progress * 0.5);
      const secondGlow = ctx.createRadialGradient(secondX, height * 0.65, 0, secondX, height * 0.65, width * 0.28);
      secondGlow.addColorStop(0, `rgba(192,132,252,${0.05 + progress * 0.03})`);
      secondGlow.addColorStop(1, "transparent");
      ctx.fillStyle = secondGlow;
      ctx.fillRect(0, 0, width, height);
    }

    function drawGrid() {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? Math.min(scrollY / totalHeight, 1) : 0;
      const gridSize = 70;
      const drift = (scrollY * 0.15) % gridSize;

      ctx.save();
      ctx.globalAlpha = 0.025 + progress * 0.05;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 0.4;

      for (let x = 0; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = -gridSize + drift; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();
    }

    function animate() {
      time += 1;
      ctx.clearRect(0, 0, width, height);
      drawGrid();
      nebulae.forEach((nebula) => nebula.draw(time));
      drawGlow();
      stars.forEach((star) => star.draw(time));
      shootingStars.forEach((star) => {
        star.update();
        star.draw();
      });
      drawConnections(nodes);
      nodes.forEach((node) => {
        node.update(scrollDelta);
        node.draw(time);
      });
      scrollDelta *= 0.9;
      animId = requestAnimationFrame(animate);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" aria-hidden="true" />;
}
