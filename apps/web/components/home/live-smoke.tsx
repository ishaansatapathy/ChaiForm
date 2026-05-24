"use client";

import { useEffect, useRef } from "react";

type SmokePuff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  phase: number;
};

function createSmoke(width: number, height: number, count: number): SmokePuff[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: height * (0.25 + Math.random() * 0.65),
    vx: (Math.random() - 0.5) * 0.14,
    vy: (Math.random() - 0.5) * 0.1 - 0.03,
    radius: Math.random() * 70 + 80,
    opacity: Math.random() * 0.06 + 0.07,
    phase: Math.random() * Math.PI * 2,
  }));
}

export function LiveSmoke() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let smoke: SmokePuff[] = [];
    let frameId = 0;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      smoke = createSmoke(w, h, reducedMotion ? 6 : 16);
    };

    const drawSmoke = (x: number, y: number, radius: number, alpha: number) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(220,220,220,${alpha})`);
      grad.addColorStop(0.35, `rgba(180,180,180,${alpha * 0.55})`);
      grad.addColorStop(0.65, `rgba(140,140,140,${alpha * 0.2})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = () => {
      if (!reducedMotion) time += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "screen";

      const windX = Math.sin(time * 0.1) * 0.08;
      const windY = Math.cos(time * 0.08) * 0.05;

      for (const puff of smoke) {
        if (!reducedMotion) {
          puff.x += puff.vx + windX;
          puff.y += puff.vy + windY + Math.sin(time * 0.06 + puff.phase) * 0.025;
        }

        if (puff.x < -puff.radius) puff.x = w + puff.radius;
        if (puff.x > w + puff.radius) puff.x = -puff.radius;
        if (puff.y < -puff.radius) puff.y = h + puff.radius;
        if (puff.y > h + puff.radius) puff.y = -puff.radius;

        const breathe = 0.82 + Math.sin(time * 0.35 + puff.phase) * 0.18;
        drawSmoke(puff.x, puff.y, puff.radius, puff.opacity * breathe);
      }

      ctx.globalCompositeOperation = "source-over";
      frameId = requestAnimationFrame(tick);
    };

    resize();
    frameId = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    />
  );
}
