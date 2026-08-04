"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { SplatController, SplatOverrides } from "@/components/media/SplatBlock";
import { type Media, splatMediaSchema } from "@/lib/schema";
import { SPLAT_CONFIG, SPLAT_DEFAULTS, type SplatConfig } from "@/lib/splat/config";

type SplatProps = Extract<Media, { type: "splat" }>;

/**
 * Dev-only tuning panel for a splat viewer, in the mould of `FluidTuner`.
 *
 * Two kinds of knob, deliberately kept on separate tabs because they have different lifetimes:
 *
 * - **scan** — per-capture values that belong in the MDX frontmatter. `copy yaml` emits them
 *   already indented to drop under the `- type: splat` list item, with anything still at its
 *   schema default omitted.
 * - **feel** — the global `SPLAT_CONFIG`, shared by every splat on the site. Tuned once.
 *
 * Nothing here writes to disk. The workflow is: dial it in, hit copy, paste into the MDX (or
 * into `src/lib/splat/config.ts`). Local tuning is mirrored to localStorage so a reload mid-session
 * doesn't lose it, and the header says so whenever what you're looking at isn't what's committed.
 *
 * The panel is portalled to `document.body` and fixed to the viewport rather than positioned
 * inside the viewer: overlaying the scan meant tuning the framing while covering a third of the
 * thing being framed, and the panel was clipped to the 4:3 box. Being a portal also keeps it out
 * of the figure's stacking and overflow context, so nothing about the viewer's layout constrains
 * it — and dropping the tuner later is deleting the mount, with no positioning left behind.
 *
 * This panel renders only when NODE_ENV === "development"; `SplatBlock` loads it through
 * `dynamic()` so its chunk is never requested in production.
 */

/* ------------------------------------------------------------------ metadata */

type NumKey = "scale" | "cameraDistance" | "cameraYaw" | "cameraPitch";
type VecKey = "position" | "rotation";

type ScanControl =
  | {
      kind: "slider";
      key: NumKey;
      label?: string;
      min: number;
      max: number;
      step: number;
      hint?: string;
    }
  | {
      kind: "axis";
      key: VecKey;
      axis: 0 | 1 | 2;
      label: string;
      min: number;
      max: number;
      step: number;
      hint?: string;
    }
  | { kind: "vec"; key: VecKey; label: string; step: number; degrees?: boolean };

const PI = Math.PI;

const SCAN_CONTROLS: ScanControl[] = [
  {
    kind: "slider",
    key: "cameraDistance",
    min: 0.2,
    max: 8,
    step: 0.05,
    hint: "how far back, as a multiple of the scan's size",
  },
  { kind: "slider", key: "scale", min: 0.01, max: 5, step: 0.01 },
  {
    kind: "axis",
    key: "position",
    axis: 1,
    label: "pan Y",
    min: -3,
    max: 3,
    step: 0.02,
    hint: "drag left to move the subject down in frame",
  },
  { kind: "vec", key: "position", label: "position [x, y, z]", step: 0.05 },
  { kind: "vec", key: "rotation", label: "rotation [x, y, z]", step: 0.1, degrees: true },
  {
    kind: "slider",
    key: "cameraYaw",
    min: -PI,
    max: PI,
    step: 0.01,
    hint: "azimuth at mid-sweep — aim it at the face worth seeing",
  },
  {
    kind: "slider",
    key: "cameraPitch",
    min: -SPLAT_DEFAULTS.PITCH_LIMIT,
    max: SPLAT_DEFAULTS.PITCH_LIMIT,
    step: 0.01,
    hint: "elevation at mid-sweep",
  },
];

/** `*` = only applies after a reload. `†` = applies next time the framing is recomputed. */
const FEEL_SLIDERS: Array<{
  key: keyof SplatConfig;
  min: number;
  max: number;
  step: number;
  needsReload?: boolean;
  reframe?: boolean;
  hint?: string;
}> = [
  { key: "YAW_SWEEP", min: 0, max: PI, step: 0.01, hint: "half-width of the swing, radians" },
  { key: "PITCH_SWEEP", min: -1, max: 1, step: 0.01, hint: "elevation amplitude; negative flips it" },
  { key: "PITCH_CYCLES", min: 0, max: 3, step: 0.25, hint: "helix turns across the sweep" },
  { key: "DOLLY", min: -0.4, max: 0.4, step: 0.01, hint: "push-in at mid-sweep" },
  { key: "SCROLL_START", min: 0, max: 0.5, step: 0.01 },
  { key: "SCROLL_END", min: 0.5, max: 1, step: 0.01 },
  { key: "SCROLL_EASE_TAU", min: 0, max: 0.8, step: 0.01, hint: "follow lag, seconds. 0 = locked" },
  { key: "PITCH_LIMIT", min: 0.2, max: 1.5, step: 0.01 },
  { key: "FOV", min: 20, max: 90, step: 1, reframe: true },
  { key: "NEAR_RATIO", min: 100, max: 5000, step: 100, reframe: true },
  { key: "FAR_RATIO", min: 5, max: 200, step: 5, reframe: true },
  { key: "SAMPLE_STRIDE", min: 1, max: 64, step: 1, needsReload: true },
  { key: "EXTENT_PERCENTILE", min: 0.5, max: 1, step: 0.01, needsReload: true },
  { key: "EXTENT_MULTIPLIER", min: 0.5, max: 4, step: 0.1, needsReload: true },
  { key: "FALLBACK_EXTENT", min: 0.5, max: 20, step: 0.5, needsReload: true },
  { key: "MAX_DPR", min: 0.5, max: 3, step: 0.25, needsReload: true },
];

/**
 * Schema defaults, read off the schema itself so the "omit unchanged values" logic in the copy
 * output can never drift from `splatMedia`.
 */
const SCHEMA_DEFAULTS = splatMediaSchema.parse({ type: "splat", src: "" });

/** Emission order for `copy yaml` — grouped the way the frontmatter already reads. */
const YAML_KEYS: Array<keyof SplatOverrides> = [
  "scale",
  "position",
  "rotation",
  "cameraDistance",
  "cameraYaw",
  "cameraPitch",
];

/* ------------------------------------------------------------------- helpers */

const round3 = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
};

const deg = (rad: number) => `${(rad * (180 / PI)).toFixed(1)}°`;

const same = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => round3(v as number) === round3(b[i] as number))
    : typeof a === "number" && typeof b === "number"
      ? round3(a) === round3(b)
      : a === b;

const fmt = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map((n) => round3(n as number)).join(", ")}]`
    : String(round3(v as number));

function copyOut(label: string, text: string) {
  // Logged as well as copied, so the values survive a blocked clipboard. Labelled because more
  // than one panel can be open.
  console.log(`[splat-tuner] ${label}\n${text}`);
  navigator.clipboard?.writeText(text).catch(() => {});
}

/**
 * Mount into `document.body`, outside the viewer's box.
 *
 * `SplatBlock` loads this component with `ssr: false`, so `document` is always there by the time
 * anything renders; the guard is only for a future caller that forgets.
 */
const portal = (node: React.ReactNode) =>
  typeof document === "undefined" ? null : createPortal(node, document.body);

/* ------------------------------------------------------------------- storage */

const SCAN_KEY = (src: string) => `splat-tuner:${src}`;
const FEEL_KEY = "splat-tuner:__config";

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; values?: T };
    if (parsed?.v !== 1 || !parsed.values) return null;
    return parsed.values;
  } catch {
    return null;
  }
}

function save(key: string, values: object) {
  try {
    if (Object.keys(values).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ v: 1, values }));
  } catch {
    /* private mode, quota — tuning just won't persist */
  }
}

/**
 * Keep only the values that actually differ from the scan's frontmatter.
 *
 * Storing diffs rather than a full snapshot matters: a snapshot would pin every field to
 * whatever it was the first time the panel opened, so a later frontmatter edit to a field you
 * never touched would silently appear to do nothing.
 */
function prune(overrides: SplatOverrides, scan: SplatProps): SplatOverrides {
  const out: Record<string, unknown> = {};
  for (const key of YAML_KEYS) {
    const v = overrides[key];
    if (v === undefined) continue;
    if (!same(v, scan[key])) out[key] = v;
  }
  return out as SplatOverrides;
}

/* ----------------------------------------------------------------- component */

type Props = {
  scan: SplatProps;
  overrides: SplatOverrides;
  setOverrides: React.Dispatch<React.SetStateAction<SplatOverrides>>;
  controllerRef: React.RefObject<SplatController | null>;
  ready: boolean;
};

export function SplatTuner({ scan, overrides, setOverrides, controllerRef, ready }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"scan" | "feel">("scan");
  const [side, setSide] = useState<"left" | "right">("left");
  const [copied, setCopied] = useState<string | null>(null);
  // Where the sweep is being held for aiming, or null to follow the scroll position.
  const [scrub, setScrubState] = useState<number | null>(null);
  // Restored straight into the initialiser rather than from an effect: the panel is client-only
  // (SplatBlock loads it with ssr:false), so there is no server render to mismatch, and applying
  // it here means the first frame after a reload already uses the tuned values.
  const [feel, setFeel] = useState<Record<string, number>>(() => {
    const saved = load<Partial<SplatConfig>>(FEEL_KEY);
    if (saved) Object.assign(SPLAT_CONFIG, saved);
    const out: Record<string, number> = {};
    for (const { key } of FEEL_SLIDERS) out[key] = SPLAT_CONFIG[key];
    return out;
  });
  const readoutRef = useRef<HTMLPreElement>(null);

  const name = scan.src.split("/").pop() ?? scan.src;
  const values = { ...scan, ...overrides };
  const stored = prune(overrides, scan);
  const dirty = Object.keys(stored).length > 0;

  /* --------------------------------------------------- restore from storage */

  // The scan overrides live in SplatBlock (the render loop needs them before this panel mounts),
  // so they can't be restored in an initialiser the way `feel` is. One write on mount.
  useEffect(() => {
    const saved = load<SplatOverrides>(SCAN_KEY(scan.src));
    if (saved && Object.keys(saved).length > 0) setOverrides((o) => ({ ...saved, ...o }));
    // Restore once per scan, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan.src]);

  /* ------------------------------------------------------ persist to storage */

  useEffect(() => {
    const id = setTimeout(() => save(SCAN_KEY(scan.src), stored), 200);
    return () => clearTimeout(id);
  }, [scan.src, stored]);

  useEffect(() => {
    const id = setTimeout(() => {
      const diff: Record<string, number> = {};
      for (const { key } of FEEL_SLIDERS) {
        if (feel[key] !== SPLAT_DEFAULTS[key]) diff[key] = feel[key];
      }
      save(FEEL_KEY, diff);
    }, 200);
    return () => clearTimeout(id);
  }, [feel]);

  /* --------------------------------------------------------------- readouts */

  // Driven off an interval writing textContent directly rather than React state: re-rendering
  // ~25 inputs at 60fps, while a splat renderer competes for the same frame budget, would make
  // the panel the thing you end up measuring.
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const el = readoutRef.current;
      if (!el) return;
      const c = controllerRef.current;
      if (!c) {
        el.textContent = ready ? "no scene" : "loading…";
        return;
      }
      const s = c.read();
      el.textContent =
        `sweep ${s.progress.toFixed(3)}${s.scrubbing ? " (held)" : ""}\n` +
        `yaw ${deg(s.yaw)}   pitch ${deg(s.pitch)}\n` +
        `dist ${s.distance.toFixed(2)}   extent ${s.extent.toFixed(2)}\n` +
        `${s.sampled.toLocaleString()} sampled`;
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [open, ready, controllerRef]);

  /* ---------------------------------------------------------------- actions */

  const setValue = (key: keyof SplatOverrides, value: unknown) =>
    setOverrides((o) => ({ ...o, [key]: value }));

  const setAxis = (key: VecKey, axis: 0 | 1 | 2, value: number) =>
    setOverrides((o) => {
      const cur = (o[key] ?? scan[key]) as [number, number, number];
      const next: [number, number, number] = [cur[0], cur[1], cur[2]];
      next[axis] = value;
      return { ...o, [key]: next };
    });

  /**
   * Hold the sweep at a fixed point, or hand it back to the scroll.
   *
   * This is how a scan gets aimed. The camera path is a pure function of the sweep position, so
   * pinning it to 0.5 puts you at the pose the visitor sees with the section centred — dial
   * `cameraYaw` and `cameraPitch` against that, then run 0 → 1 to check both ends. Scrolling the
   * panel's own page to reach a pose isn't an option: the page is what drives the thing you're
   * trying to hold still.
   */
  const setScrub = (v: number | null) => {
    controllerRef.current?.scrub(v);
    setScrubState(v);
  };

  const flash = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied(null), 1200);
  };

  const copyYaml = () => {
    const lines: string[] = [];
    for (const key of YAML_KEYS) {
      const v = values[key];
      if (same(v, SCHEMA_DEFAULTS[key])) continue;
      lines.push(`    ${key}: ${fmt(v)}`);
    }
    const text = lines.length
      ? lines.join("\n")
      : "    # every value is still a schema default";
    copyOut(name, text);
    flash("yaml");
  };

  const copyConfig = () => {
    const text = FEEL_SLIDERS.map(({ key }) => `  ${key}: ${feel[key]},`).join("\n");
    copyOut("SPLAT_CONFIG", text);
    flash("config");
  };

  const setFeelValue = (key: keyof SplatConfig, value: number) => {
    setFeel((f) => ({ ...f, [key]: value }));
    SPLAT_CONFIG[key] = value;
  };

  /**
   * Back to exactly what the MDX says. `reseed` matters here: the framed distance is only
   * recomputed when `cameraDistance` changes, so without it a reset back to a value the camera
   * already held would leave the framing wherever it was last dragged to.
   */
  const resetScan = () => {
    setOverrides({});
    controllerRef.current?.reseed();
    setScrubState(null);
  };

  const resetFeel = () => {
    Object.assign(SPLAT_CONFIG, SPLAT_DEFAULTS);
    const out: Record<string, number> = {};
    for (const { key } of FEEL_SLIDERS) out[key] = SPLAT_DEFAULTS[key];
    setFeel(out);
  };

  /* ------------------------------------------------------------------ chrome */

  if (!open) {
    return portal(
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-3 z-[100] flex items-center gap-1.5 rounded bg-neutral-900/85 px-2 py-1 font-mono text-[10px] text-white backdrop-blur hover:bg-neutral-900 ${
          side === "left" ? "left-3" : "right-3"
        }`}
      >
        splat ▸ {name}
        {dirty && <span className="size-1.5 rounded-full bg-amber-400" title="local overrides" />}
      </button>,
    );
  }

  const btn = "rounded bg-neutral-700 px-2 py-1 hover:bg-neutral-600";

  return portal(
    <div
      className={`fixed inset-y-3 z-[100] flex w-[280px] select-text flex-col rounded-lg border border-neutral-700 bg-neutral-900/95 font-mono text-[11px] text-neutral-100 shadow-2xl backdrop-blur ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-700 px-3 py-2">
        <span className="truncate font-semibold">{name}</span>
        <span className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setSide((s) => (s === "left" ? "right" : "left"))}
            className="px-1 text-neutral-400 hover:text-white"
            title="move panel"
          >
            {side === "left" ? "◨" : "◧"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-1 text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </span>
      </div>

      <div className="shrink-0 space-y-2 px-3 py-2">
        <pre ref={readoutRef} className="leading-relaxed text-sky-300">
          loading…
        </pre>

        <div className="flex gap-1.5">
          <button
            onClick={() => setScrub(scrub === null ? 0.5 : null)}
            disabled={!ready}
            className="flex-1 rounded bg-sky-600 px-2 py-1 font-semibold hover:bg-sky-500 disabled:opacity-40"
            title="hold the sweep at a fixed point so a pose can be aimed without scrolling"
          >
            {scrub === null ? "hold sweep" : "follow scroll"}
          </button>
          <button onClick={copyYaml} className={`${btn} flex-1 font-semibold`}>
            {copied === "yaml" ? "copied!" : "copy yaml"}
          </button>
        </div>

        {scrub !== null && (
          <label className="block rounded bg-amber-500/10 px-2 py-1 text-amber-300">
            <span className="flex items-baseline justify-between gap-2 text-[10px]">
              <span>sweep held — 0 enter · 0.5 centre · 1 leave</span>
              <span className="tabular-nums">{scrub.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={scrub}
              onChange={(e) => setScrub(Number(e.target.value))}
              className="mt-0.5 w-full accent-amber-400"
            />
          </label>
        )}

        {dirty && (
          <div className="flex items-center justify-between gap-2 rounded bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
            <span>local overrides, not in the MDX</span>
            <button onClick={resetScan} className="underline hover:text-amber-200">
              reset
            </button>
          </div>
        )}

        <div className="flex gap-1">
          {(["scan", "feel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded px-2 py-1 ${
                tab === t ? "bg-neutral-700 font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {tab === "scan" ? (
          <>
            {SCAN_CONTROLS.map((c) => {
              if (c.kind === "vec") {
                const vec = values[c.key];
                return (
                  <div key={`${c.key}-vec`} className="mb-2">
                    <div className="text-neutral-400">{c.label}</div>
                    <div className="grid grid-cols-3 gap-1">
                      {([0, 1, 2] as const).map((axis) => (
                        <input
                          key={axis}
                          type="number"
                          step={c.step}
                          value={vec[axis]}
                          onChange={(e) => setAxis(c.key, axis, Number(e.target.value))}
                          className="w-full rounded bg-white/10 px-1 py-0.5 tabular-nums"
                        />
                      ))}
                    </div>
                    {c.degrees && (
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-neutral-500">
                        {([0, 1, 2] as const).map((axis) => (
                          <span key={axis} className="text-center">
                            {deg(vec[axis])}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              const value = c.kind === "axis" ? values[c.key][c.axis] : values[c.key];
              const label = c.kind === "axis" ? c.label : (c.label ?? c.key);

              return (
                <label key={`${c.key}-${label}`} className="mb-2 block">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{label}</span>
                    <span className="tabular-nums text-sky-300">{round3(value)}</span>
                  </span>
                  {c.hint && (
                    <span className="block text-[10px] text-neutral-500">{c.hint}</span>
                  )}
                  <input
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={value}
                    onChange={(e) =>
                      c.kind === "axis"
                        ? setAxis(c.key, c.axis, Number(e.target.value))
                        : setValue(c.key, Number(e.target.value))
                    }
                    className="mt-0.5 w-full accent-sky-400"
                  />
                </label>
              );
            })}

            <button onClick={resetScan} className={`${btn} mt-1 w-full`}>
              reset to frontmatter
            </button>
          </>
        ) : (
          <>
            {FEEL_SLIDERS.map(({ key, min, max, step, needsReload, reframe, hint }) => (
              <label key={key} className="mb-2 block">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate">
                    {key}
                    {needsReload && (
                      <span className="text-amber-400" title="needs a reload">
                        {" *"}
                      </span>
                    )}
                    {reframe && (
                      <span className="text-amber-400" title="applies on the next reframe">
                        {" †"}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-sky-300">{feel[key]}</span>
                </span>
                {hint && <span className="block text-[10px] text-neutral-500">{hint}</span>}
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={feel[key]}
                  onChange={(e) => setFeelValue(key, Number(e.target.value))}
                  className="mt-0.5 w-full accent-sky-400"
                />
              </label>
            ))}

            <p className="mb-2 text-[10px] leading-snug text-amber-400/80">
              * needs a reload. † applies when the framing next changes — nudge cameraDistance.
            </p>

            <div className="flex gap-1.5">
              <button onClick={copyConfig} className={`${btn} flex-1 font-semibold`}>
                {copied === "config" ? "copied!" : "copy config"}
              </button>
              <button onClick={resetFeel} className={btn}>
                reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
  );
}

export default SplatTuner;
