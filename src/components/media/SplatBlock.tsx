"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/chat/useReducedMotion";
import type { Media } from "@/lib/schema";
import { SPLAT_CONFIG } from "@/lib/splat/config";

type SplatProps = Extract<Media, { type: "splat" }>;

/** The subset of a scan's props the dev tuner is allowed to override in the browser. */
export type SplatOverrides = Partial<
  Pick<
    SplatProps,
    "scale" | "position" | "rotation" | "cameraDistance" | "cameraYaw" | "cameraPitch"
  >
>;

/** A snapshot of the camera solve, for the tuner's readouts. */
export type SplatLiveState = {
  /** Eased position along the sweep, 0 (entering) → 1 (leaving). */
  progress: number;
  /** Camera azimuth this frame, radians. `cameraYaw` at the middle of the sweep. */
  yaw: number;
  /** Camera elevation this frame, radians. */
  pitch: number;
  /** The framed distance: `extent * cameraDistance`, before the dolly. */
  base: number;
  /** Where the camera actually is — `base` with the mid-sweep dolly applied. */
  distance: number;
  /** Measured subject radius scaled by EXTENT_MULTIPLIER. Fixed at load. */
  extent: number;
  /** How many splats the measurement pass sampled, as a sanity readout. */
  sampled: number;
  /** Whether the tuner is currently holding progress at a fixed value. */
  scrubbing: boolean;
};

/**
 * The dev tuner's handle on a running viewer. Null while loading, after a load failure, and
 * after unmount.
 *
 * Deliberately read-mostly: everything the tuner can *configure*, it configures by writing the
 * override state that the render loop already re-reads every frame. This interface exists only
 * for the things that can't work that way — reading state that lives inside the loop's closure,
 * and driving the sweep from something other than the scroll position.
 */
export type SplatController = {
  read(): SplatLiveState;
  /**
   * Hold the sweep at a fixed point so a pose can be aimed without scrolling to it; `null`
   * hands control back to the scroll position.
   */
  scrub(progress: number | null): void;
  /**
   * Re-apply the current props to the live camera on the next frame.
   *
   * Needed because the framed distance is derived once per change rather than every frame: after
   * "reset to frontmatter" the slider would read the committed value while the camera still sat
   * at whatever distance was last dialled in, with nothing to reconcile them.
   */
  reseed(): void;
};

const isDev = process.env.NODE_ENV === "development";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Dev-only tuning panel. Loaded through `dynamic` so its chunk is never requested in
 * production, where the branch below is statically false.
 */
const SplatTuner = dynamic(
  () => import("@/components/media/SplatTuner").then((m) => m.SplatTuner),
  { ssr: false },
);

/**
 * Gaussian splat viewer.
 *
 * Written against three.js directly rather than react-three-fiber. Spark renders splats by
 * walking the scene for SplatMesh instances from its own SparkRenderer; driving that through
 * R3F's reconciler produced a canvas that drew ordinary meshes fine but never any splats,
 * with no error to debug. A plain renderer + animation loop is both simpler and the setup
 * Spark's own docs describe, so that's what this is.
 *
 * The viewer is deliberately **not interactive**. The pointer does nothing — no drag, no wheel,
 * no hover parallax — and nothing moves on its own. The only input is the page scroll position,
 * which flies the camera along a corkscrew: one pass of azimuth across the aimed face while the
 * elevation rises, dips under, and rises again. That's a single reading of a single input, which
 * is why it stays legible where drag + zoom + spin + tilt all writing the same camera did not.
 *
 * Splat files are tens of megabytes, so this component is only mounted once its section is
 * near the viewport (see `MediaBlock`), and it shows the project's cover image until the
 * scan is ready.
 *
 * Everything about how the move *feels* — sweep width, easing, dolly — lives in `SPLAT_CONFIG`.
 * Everything that varies per scan lives in the MDX frontmatter.
 */
export function SplatBlock(props: SplatProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  // Dev tuner overrides. Always empty in production, where SplatTuner never mounts to set them.
  const [overrides, setOverrides] = useState<SplatOverrides>({});
  const controllerRef = useRef<SplatController | null>(null);

  // Subscribed here rather than read in the loop, so the subscription lives with the component.
  // When set, the sweep is pinned to its midpoint and the scan renders as a still.
  const reduced = useReducedMotion();

  // Everything the animation loop reads, reduced motion included. Held in a ref so changing any
  // of it never restarts the scene — the effect below only re-runs for a new `src`.
  const options = { ...(isDev ? { ...props, ...overrides } : props), reduced };
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setSupported(Boolean(canvas.getContext("webgl2")));
    } catch {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    if (supported !== true) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    // Teardown steps, registered as each resource is created and run in reverse. The previous
    // shape of this — one `cleanupExtras` closure reassigned after the loop started — meant the
    // early returns below (load failure, unmount mid-download) never disposed the renderer.
    // React StrictMode double-invokes effects in dev, so that leaked a WebGL context on every
    // mount, and browsers cap how many can be live at once.
    const disposers: Array<() => void> = [];

    (async () => {
      const THREE = await import("three");
      const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, SPLAT_CONFIG.MAX_DPR));
      renderer.setClearColor(SPLAT_CONFIG.CLEAR_COLOR, 1);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      // The viewer takes no pointer input at all, so the canvas stays out of the way entirely:
      // scroll, clicks and text selection that start over it behave as if it weren't there.
      renderer.domElement.style.pointerEvents = "none";
      host.appendChild(renderer.domElement);
      disposers.push(() => {
        renderer.dispose();
        renderer.domElement.remove();
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(SPLAT_CONFIG.FOV, 4 / 3, 0.01, 5000);

      scene.add(new SparkRenderer({ renderer }));

      const mesh = new SplatMesh({ url: props.src });
      scene.add(mesh);
      disposers.push(() => mesh.dispose());

      /* ---------------------------------------------------------- sizing */

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      disposers.push(() => observer.disconnect());
      resize();

      /* -------------------------------------------------------- camera state */

      // Only two things carry across frames: the eased sweep position, and the framed distance
      // (derived from `cameraDistance` whenever that changes). Everything else about the camera
      // is solved fresh from `progress` every frame, which is what keeps the move reproducible —
      // the same scroll position always produces the same view.
      const state = {
        progress: 0,
        base: 1,
        /** Non-null while the dev tuner is holding the sweep at a fixed point. */
        scrub: null as number | null,
        /** Set after a pause or a reframe: take the target directly instead of easing to it. */
        snap: true,
      };

      const clampPitch = (v: number) =>
        Math.max(-SPLAT_CONFIG.PITCH_LIMIT, Math.min(SPLAT_CONFIG.PITCH_LIMIT, v));

      /* ------------------------------------------------------------ load */

      try {
        await mesh.initialized;
      } catch (error) {
        console.error("[splat] failed to load", props.src, error);
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return;

      /* --------------------------------------------------------- framing */

      // Spark's getBoundingBox() reports an empty box here, so measure the splats directly.
      // See SPLAT_CONFIG.EXTENT_PERCENTILE for why this uses a percentile rather than the
      // bounding box or the standard deviation.
      const stride = Math.max(1, Math.round(SPLAT_CONFIG.SAMPLE_STRIDE));
      let count = 0;
      const mean = [0, 0, 0];
      mesh.forEachSplat((index, position) => {
        if (index % stride !== 0) return;
        count++;
        // Running mean, so a large scan can't accumulate float error.
        mean[0] += (position.x - mean[0]) / count;
        mean[1] += (position.y - mean[1]) / count;
        mean[2] += (position.z - mean[2]) / count;
      });

      const centre = new THREE.Vector3(mean[0], mean[1], mean[2]);
      let extent = SPLAT_CONFIG.FALLBACK_EXTENT;

      if (count > 1) {
        const radii = new Float32Array(count);
        let i = 0;
        mesh.forEachSplat((index, position) => {
          if (index % stride !== 0 || i >= count) return;
          radii[i++] = Math.hypot(
            position.x - mean[0],
            position.y - mean[1],
            position.z - mean[2],
          );
        });
        // Float32Array.sort is numeric by default — this is not the classic lexicographic bug.
        radii.sort();
        const p = radii[
          Math.min(radii.length - 1, Math.floor(radii.length * SPLAT_CONFIG.EXTENT_PERCENTILE))
        ];
        extent =
          p > 1e-4 ? p * SPLAT_CONFIG.EXTENT_MULTIPLIER : SPLAT_CONFIG.FALLBACK_EXTENT;
      }

      /** Re-derive the framed distance and clip planes. Cheap — safe to call from the loop. */
      const applyFraming = (cameraDistance: number) => {
        state.base = extent * cameraDistance;
        camera.fov = SPLAT_CONFIG.FOV;
        camera.near = Math.max(0.01, state.base / SPLAT_CONFIG.NEAR_RATIO);
        camera.far = state.base * SPLAT_CONFIG.FAR_RATIO;
        camera.updateProjectionMatrix();
      };

      // The `cameraDistance` currently reflected in the live camera. The loop diffs against this
      // to decide when to reframe; setting it to NaN forces a re-apply, since NaN !== anything.
      let appliedDistance = optionsRef.current.cameraDistance;
      applyFraming(appliedDistance);

      /* ------------------------------------------------------------ scene graph */

      const pivot = new THREE.Object3D();
      scene.add(pivot);
      pivot.add(mesh);
      disposers.push(() => scene.remove(pivot));

      // Splat captures are Y-down relative to three.js's convention.
      mesh.rotateX(Math.PI);
      // Offset the scan so its centroid lands on the pivot's origin. Rotated through the flip
      // above rather than negated raw: a bare `-centre` is applied in the mesh's *parent* space,
      // so the flip carries the centroid back off the origin by twice its y and z, and the scan
      // ends up orbiting a point it isn't standing on.
      mesh.position.copy(centre).applyQuaternion(mesh.quaternion).negate();

      // The orbit centre, the camera's gaze point and the world origin are all the same point.
      // Collapsing them is what makes the move read as centred: `position` then slides the scan
      // against a fixed point rather than dragging the gaze along with it, so tuning it actually
      // changes what's in the middle of the frame instead of being visually inert.
      const anchor = new THREE.Vector3(0, 0, 0);

      /* ------------------------------------------------------------ loop */

      /** The camera solve for a given point on the sweep. Pure — same input, same view. */
      const solve = (progress: number) => {
        const opts = optionsRef.current;
        // smoothstep, so the ends of the sweep decelerate instead of stopping dead
        const s = progress * progress * (3 - 2 * progress);

        const yaw = opts.cameraYaw + SPLAT_CONFIG.YAW_SWEEP * (s * 2 - 1);
        // The cosine is remapped to 0…1 rather than −1…1 so that `cameraPitch` is the elevation
        // at the *centre* of the sweep, not its mean. Otherwise the resting pose — the one a
        // reader sees with the section sitting still in the middle of their screen — could only
        // be aimed by solving `cameraPitch − PITCH_SWEEP` in your head, and it would drift every
        // time the site-wide sweep amplitude was retuned.
        const pitch = clampPitch(
          opts.cameraPitch +
            SPLAT_CONFIG.PITCH_SWEEP *
              ((Math.cos(s * Math.PI * 2 * SPLAT_CONFIG.PITCH_CYCLES) + 1) / 2),
        );
        // Closest at the midpoint, where the aimed face is square to the camera.
        const distance = state.base * (1 - SPLAT_CONFIG.DOLLY * Math.sin(s * Math.PI));
        return { yaw, pitch, distance };
      };

      controllerRef.current = {
        read: () => {
          const { yaw, pitch, distance } = solve(state.progress);
          return {
            progress: state.progress,
            yaw,
            pitch,
            base: state.base,
            distance,
            extent,
            sampled: count,
            scrubbing: state.scrub !== null,
          };
        },
        scrub: (progress: number | null) => {
          state.scrub = progress === null ? null : clamp01(progress);
        },
        reseed: () => {
          appliedDistance = NaN;
          state.scrub = null;
        },
      };
      disposers.push(() => {
        controllerRef.current = null;
      });

      setReady(true);

      let last = performance.now();
      const animate = () => {
        if (disposed) return;
        const now = performance.now();
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;

        const opts = optionsRef.current;

        // Apply the framing prop live. Change detection lives here rather than behind a
        // controller method so that a tuner slider, an HMR frontmatter edit and a restored
        // override all take exactly one path. Must run before anything reads `state.base`.
        if (opts.cameraDistance !== appliedDistance) {
          applyFraming(opts.cameraDistance);
          appliedDistance = opts.cameraDistance;
        }

        /* ------------------------------------------------ scroll → progress */

        // Raw travel: 0 when the block's top touches the bottom of the viewport, 1 when its
        // bottom clears the top. Measured here rather than from a `scroll` listener so it stays
        // correct when the page scrolls inside an overflow container, and across resizes — this
        // is a layout read with no interleaved writes, which is the cheap direction.
        const rect = host.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const raw = (vh - rect.top) / (vh + rect.height);
        const span = SPLAT_CONFIG.SCROLL_END - SPLAT_CONFIG.SCROLL_START;
        const scrolled = clamp01(
          span > 0 ? (raw - SPLAT_CONFIG.SCROLL_START) / span : 0.5,
        );

        // Reduced motion pins the sweep to its midpoint: the aimed face, square on and level.
        const target = opts.reduced ? 0.5 : (state.scrub ?? scrolled);

        if (state.snap || opts.reduced) {
          state.progress = target;
          state.snap = false;
        } else {
          // Frame-rate independent easing: a fixed per-frame fraction would ease twice as fast
          // on a 120Hz display as on a 60Hz one.
          const ease =
            SPLAT_CONFIG.SCROLL_EASE_TAU > 0
              ? 1 - Math.exp(-delta / SPLAT_CONFIG.SCROLL_EASE_TAU)
              : 1;
          state.progress += (target - state.progress) * ease;
        }

        /* ------------------------------------------------------- camera */

        // The scan holds still and the camera flies. Doing it the other way — spinning the pivot
        // — swings the capture's floor and background splats around with the subject.
        pivot.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
        pivot.scale.setScalar(opts.scale);
        pivot.position.set(opts.position[0], opts.position[1], opts.position[2]);

        const { yaw, pitch, distance } = solve(state.progress);
        camera.position.set(
          Math.sin(yaw) * distance * Math.cos(pitch),
          Math.sin(pitch) * distance,
          Math.cos(yaw) * distance * Math.cos(pitch),
        );
        camera.lookAt(anchor);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };

      // Nothing here animates on its own, so a loop running while the block is off screen is
      // pure cost. Pausing also means the camera can't ease through poses nobody is looking at:
      // it snaps to wherever the scroll left it on the way back in.
      let running = false;
      const start = () => {
        if (running || disposed) return;
        running = true;
        state.snap = true;
        last = performance.now();
        raf = requestAnimationFrame(animate);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };
      const visibility = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0 },
      );
      visibility.observe(host);
      disposers.push(() => {
        visibility.disconnect();
        stop();
      });
      start();
    })().catch((error) => {
      console.error("[splat] viewer failed", error);
      if (!disposed) setFailed(true);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      // Reverse order, and each guarded — one throwing teardown shouldn't strand the rest.
      for (let i = disposers.length - 1; i >= 0; i--) {
        try {
          disposers[i]();
        } catch {
          /* keep tearing down */
        }
      }
      disposers.length = 0;
    };
    // Only the source identifies the scene; everything else is read live from optionsRef, so
    // tuning a scan never re-downloads it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, props.src]);

  const live = supported === true && !failed;
  const showPoster = Boolean(props.poster) && (!ready || !live);

  return (
    <figure className="not-prose">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-black">
        <div ref={hostRef} className="absolute inset-0" />

        {showPoster && (
          <Image
            src={props.poster!}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="pointer-events-none object-cover"
          />
        )}

        {live && !ready && (
          <div className="pointer-events-none absolute inset-0 flex items-end p-4">
            <span className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 backdrop-blur">
              <Loader2 className="size-3.5 animate-spin" />
              Loading 3D scan…
            </span>
          </div>
        )}

        {isDev && (
          <SplatTuner
            scan={props}
            overrides={overrides}
            setOverrides={setOverrides}
            controllerRef={controllerRef}
            ready={ready}
          />
        )}
      </div>

      {props.caption && (
        <figcaption className="mt-2 text-[13px] text-neutral-500">{props.caption}</figcaption>
      )}
    </figure>
  );
}

export default SplatBlock;
