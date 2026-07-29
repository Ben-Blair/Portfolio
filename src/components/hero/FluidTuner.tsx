"use client";

import { useEffect, useRef, useState } from "react";

import { FLUID_CONFIG, type FluidConfig } from "@/lib/fluid/config";
import type { FluidSimulation } from "@/lib/fluid/simulation";

/**
 * TEMPORARY dev-only tuning panel for the hero fluid.
 *
 * This exists so the numbers in `FLUID_CONFIG` can be dialled in against the real canvas
 * instead of by guesswork. It is not part of the site: it renders only when
 * NODE_ENV === "development", and the whole thing is meant to be deleted (this file plus the
 * one `<FluidTuner />` line in Hero.tsx) once the defaults are settled.
 *
 * It mutates `window.__fluid.config` in place, which the simulation re-reads every frame.
 */

/** [min, max, step] per key, plus whether a change needs a reload to take effect. */
const SLIDERS: Array<{
  key: keyof FluidConfig;
  min: number;
  max: number;
  step: number;
  needsReload?: boolean;
  hint?: string;
}> = [
  { key: "DENSITY_DISSIPATION", min: 0, max: 5, step: 0.01, hint: "how fast color fades" },
  { key: "VELOCITY_DISSIPATION", min: 0, max: 5, step: 0.01, hint: "how fast motion settles" },
  { key: "PRESSURE", min: 0, max: 1, step: 0.01 },
  { key: "PRESSURE_ITERATIONS", min: 1, max: 40, step: 1 },
  { key: "CURL", min: 0, max: 60, step: 1, hint: "vorticity / swirliness" },
  { key: "SPLAT_RADIUS", min: 0.01, max: 1, step: 0.01 },
  { key: "SPLAT_FORCE", min: 500, max: 12000, step: 100 },
  { key: "SPLAT_INTENSITY", min: 0.01, max: 1, step: 0.01, hint: "dye brightness" },
  { key: "OPACITY", min: 0, max: 1, step: 0.01 },
  { key: "SHADING", min: 0, max: 1, step: 0.01, hint: "0 = flat, 1 = lit edges" },
  { key: "COLOR_UPDATE_SPEED", min: 0, max: 30, step: 0.5, hint: "hue re-rolls per second" },
  { key: "SATURATION", min: 0, max: 1, step: 0.01 },
  { key: "VALUE", min: 0, max: 1, step: 0.01 },
  { key: "AMBIENT_INTERVAL", min: 0.2, max: 8, step: 0.1, hint: "seconds between idle splats" },
  { key: "AMBIENT_SCALE", min: 0, max: 2, step: 0.05 },
  { key: "INITIAL_SPLATS", min: 0, max: 40, step: 1, needsReload: true },
  { key: "SIM_RESOLUTION", min: 32, max: 256, step: 32, needsReload: true },
  { key: "DYE_RESOLUTION", min: 256, max: 2048, step: 128, needsReload: true },
  { key: "MAX_DPR", min: 0.5, max: 3, step: 0.5, needsReload: true },
];

type Values = Record<string, number>;

/**
 * `FluidSimulation.config` is private, and deliberately stays that way — this panel is
 * temporary and shouldn't widen the real API. Reach past the modifier here instead.
 */
function cfg(sim: FluidSimulation): FluidConfig & Values {
  return (sim as unknown as { config: FluidConfig & Values }).config;
}

function readInitial(): Values {
  const out: Values = {};
  for (const { key } of SLIDERS) out[key] = FLUID_CONFIG[key] as number;
  return out;
}

export function FluidTuner() {
  const [values, setValues] = useState<Values>(readInitial);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const simRef = useRef<FluidSimulation | null>(null);

  // FluidCanvas parks the instance on window in development; poll briefly for it, since this
  // panel can mount before the canvas effect has run.
  useEffect(() => {
    const find = () => {
      const sim = (window as unknown as { __fluid?: FluidSimulation }).__fluid;
      if (sim) {
        simRef.current = sim;
        return true;
      }
      return false;
    };
    if (find()) return;
    const id = setInterval(() => {
      if (find()) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const set = (key: string, value: number) => {
    setValues((v) => ({ ...v, [key]: value }));
    const sim = simRef.current;
    if (sim) cfg(sim)[key] = value;
  };

  const exportText = () =>
    SLIDERS.map(({ key }) => `${key}: ${values[key]},`).join("\n");

  const copy = () => {
    const text = exportText();
    // Logged as well as copied so the values are recoverable if the clipboard is blocked.
    console.log("[fluid-tuner]\n" + text);
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const reset = () => {
    const initial = readInitial();
    setValues(initial);
    const sim = simRef.current;
    if (sim) Object.assign(cfg(sim), initial);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-3 top-3 z-[9999] rounded bg-neutral-900 px-3 py-1.5 font-mono text-xs text-white shadow-lg"
      >
        fluid ▸
      </button>
    );
  }

  return (
    <div className="fixed right-3 top-3 z-[9999] max-h-[92vh] w-[290px] select-text overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 font-mono text-[11px] text-neutral-100 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">fluid tuner (dev)</span>
        <button onClick={() => setOpen(false)} className="px-1 text-neutral-400 hover:text-white">
          ✕
        </button>
      </div>

      {SLIDERS.map(({ key, min, max, step, needsReload, hint }) => (
        <label key={key} className="mb-2 block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate">
              {key}
              {needsReload && <span className="text-amber-400" title="needs reload"> *</span>}
            </span>
            <span className="tabular-nums text-sky-300">{values[key]}</span>
          </span>
          {hint && <span className="block text-[10px] text-neutral-500">{hint}</span>}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[key]}
            onChange={(e) => set(key, Number(e.target.value))}
            className="mt-0.5 w-full accent-sky-400"
          />
        </label>
      ))}

      <label className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          defaultChecked={FLUID_CONFIG.AMBIENT_SPLATS}
          onChange={(e) => {
            const sim = simRef.current;
            if (sim) cfg(sim).AMBIENT_SPLATS = e.target.checked;
          }}
        />
        AMBIENT_SPLATS
      </label>

      <p className="mb-2 text-[10px] leading-snug text-amber-400/80">
        * marked values only apply after a page reload.
      </p>

      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex-1 rounded bg-sky-600 px-2 py-1.5 font-semibold hover:bg-sky-500"
        >
          {copied ? "copied!" : "copy values"}
        </button>
        <button onClick={reset} className="rounded bg-neutral-700 px-2 py-1.5 hover:bg-neutral-600">
          reset
        </button>
      </div>
    </div>
  );
}
