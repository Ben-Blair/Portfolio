"use client";

import { useEffect, useRef, useState } from "react";

import { FluidSimulation, supportsFluid } from "@/lib/fluid/simulation";

/**
 * The cursor-reactive background.
 *
 * Absolutely positioned inside its container (the hero section) rather than fixed, so it
 * scrolls away with the hero instead of bleeding behind the rest of the page — and so the
 * IntersectionObserver below can actually tell when it's off screen. It has
 * `pointer-events: none`, so it never intercepts clicks; pointer events are read from
 * `window` instead, which also means the fluid keeps reacting while the cursor is over the
 * headline or the chat input.
 *
 * Tunables live in `src/lib/fluid/config.ts`, not here.
 */
export function FluidCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !supportsFluid()) {
      setFallback(true);
      return;
    }

    let sim: FluidSimulation;
    try {
      sim = new FluidSimulation(canvas);
    } catch (error) {
      console.warn("[fluid] falling back to static background:", error);
      setFallback(true);
      return;
    }

    let isOnScreen = true;
    sim.start();

    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __fluid?: FluidSimulation }).__fluid = sim;
    }

    const onPointerMove = (e: PointerEvent) => {
      if (isOnScreen) sim.onPointerMove(e.pointerId, e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (isOnScreen) sim.onPointerDown(e.pointerId, e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => sim.onPointerUp(e.pointerId);
    const onPointerCancel = (e: PointerEvent) => sim.onPointerLeave(e.pointerId);

    // Passive: we never preventDefault, so touch scrolling stays completely unaffected.
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => sim.resize());
    };
    window.addEventListener("resize", onResize);

    const onVisibility = () => {
      if (document.hidden) sim.stop();
      else if (isOnScreen) sim.start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isOnScreen = entry.isIntersecting;
        if (isOnScreen && !document.hidden) sim.start();
        else sim.stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      sim.destroy();
    };
  }, []);

  if (fallback) {
    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
        style={{
          background:
            "radial-gradient(60% 55% at 18% 30%, rgba(134,239,172,0.30), transparent 70%)," +
            "radial-gradient(55% 50% at 78% 22%, rgba(196,181,253,0.32), transparent 70%)," +
            "radial-gradient(65% 60% at 62% 78%, rgba(251,207,232,0.34), transparent 70%)," +
            "radial-gradient(50% 45% at 30% 82%, rgba(186,230,253,0.28), transparent 70%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full ${className}`}
    />
  );
}
