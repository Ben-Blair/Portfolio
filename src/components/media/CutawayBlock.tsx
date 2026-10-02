"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/chat/useReducedMotion";
import type { Media } from "@/lib/schema";

type CutawayProps = Extract<Media, { type: "cutaway" }>;

/**
 * One stop on the camera's flight. The camera passes through each in order as the block travels
 * up the viewport, splined between them so it never stops dead at one.
 */
type CutawayKey = {
  /** Where along the scroll window this pose is reached, 0 (entering) → 1 (leaving). */
  at: number;
  /**
   * What the camera looks at, as a fraction of the model's length from its centre: +0.5 is the
   * nose, −0.5 the tail.
   */
  along: number;
  /** Azimuth off square-on to the cut, radians. Positive swings the camera toward the nose. */
  yaw: number;
  /** Elevation, radians. Positive looks down into the section. */
  pitch: number;
  /** Camera distance as a multiple of the model's length. */
  distance: number;
};

/**
 * Every knob for how the cutaway viewer *feels*. Per-model content (the file, its poster) lives in
 * frontmatter; this is the move itself.
 */
export const CUTAWAY_CONFIG = {
  /**
   * The flight, against the scroll measure in `scrollProgress`. Everything up to 0.35 is one held
   * pose — the whole vehicle, closed, three-quarter on — so the block arrives looking the same
   * however it got on screen. Scrolling on opens the cut (see `OPEN_*`), dives in past the canard
   * bay and avionics, and ends on the motor and fins.
   */
  KEYS: [
    { at: 0.0, along: 0.0, yaw: 0.25, pitch: 0.32, distance: 1.45 },
    { at: 0.35, along: 0.0, yaw: 0.25, pitch: 0.32, distance: 1.45 },
    { at: 0.55, along: 0.13, yaw: -0.35, pitch: 0.45, distance: 0.42 },
    { at: 0.78, along: -0.3, yaw: -0.7, pitch: 0.26, distance: 0.66 },
    { at: 1.0, along: -0.3, yaw: -0.7, pitch: 0.26, distance: 0.66 },
  ] satisfies CutawayKey[],

  /**
   * The stretch of the scroll over which the cut opens: the near half of the skin peels away from
   * the nose back to the tail. Before `OPEN_START` the vehicle is whole.
   */
  OPEN_START: 0.35,
  OPEN_END: 0.5,

  /** Dev only: hold the flight at this progress instead of reading the scroll. */
  SCRUB: null as number | null,

  /** Seconds for the camera to close ~63% of the gap to the scroll-derived pose. */
  SCROLL_EASE_TAU: 0.12,

  /**
   * Where the cut sits, metres toward the camera from the model's centre plane. Not zero: the
   * avionics sled lies exactly on that plane, and a cut straight through its middle shows it as a
   * flat slab instead of as the part it is.
   */
  CUT_OFFSET: 0.003,

  /** Nose-up tilt of the whole vehicle in frame, radians. A level rocket wastes a 16:10 frame. */
  TILT: 0.3,

  /**
   * The canards fly a made-up control history: two steering channels and a roll channel, each a
   * pair of incommensurate sines so the pattern never visibly repeats. Amplitudes in radians,
   * frequencies in Hz. Peak deflection is the sum, about 14°.
   */
  STEER: [
    { amp: 0.13, hz: 0.31, phase: 0.5 },
    { amp: 0.05, hz: 0.83, phase: 0 },
  ],
  STEER_2: [
    { amp: 0.11, hz: 0.27, phase: 2.1 },
    { amp: 0.04, hz: 0.71, phase: 1 },
  ],
  ROLL: [{ amp: 0.06, hz: 0.19, phase: 1.3 }],

  /** The airframe's answer to the canards: a slow weathervane sway in the frame, radians. */
  SWAY: [
    { amp: 0.012, hz: 0.21, phase: 0 },
    { amp: 0.004, hz: 0.53, phase: 0.8 },
  ],

  FOV: 28,
  MAX_DPR: 2,

  /** Section faces are the part's own colour scaled by this, in linear light. */
  CAP_SHADE: 0.62,

  /**
   * How far section faces are pulled toward the camera, metres, so they win against a surface
   * they land exactly on (see the shader). Kept well under the thinnest wall in the model: the
   * canard panels are 4 mm, and a nudge anywhere near that lets hidden faces flash through.
   */
  CAP_NUDGE: 0.0002,
};

// Lets the flight be tuned from the console: `__cutaway.SCRUB = 0.75`, `__cutaway.KEYS[1].yaw = …`.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as { __cutaway: typeof CUTAWAY_CONFIG }).__cutaway =
    CUTAWAY_CONFIG;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Uniform Catmull-Rom through `p0…p3`, evaluated between `p1` and `p2`. */
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 *
  (2 * p1 +
    (p2 - p0) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

/** The camera pose at a point on the scroll window. Pure — same input, same view. */
function solve(progress: number) {
  const keys = CUTAWAY_CONFIG.KEYS;
  let i = 0;
  while (i < keys.length - 2 && progress > keys[i + 1].at) i++;
  const a = keys[Math.max(0, i - 1)];
  const b = keys[i];
  const c = keys[i + 1];
  const d = keys[Math.min(keys.length - 1, i + 2)];
  const t = clamp01((progress - b.at) / (c.at - b.at || 1));
  const at = (field: Exclude<keyof CutawayKey, "at">) =>
    catmull(a[field], b[field], c[field], d[field], t);
  return {
    along: at("along"),
    yaw: at("yaw"),
    pitch: at("pitch"),
    distance: at("distance"),
  };
}

type Wave = { amp: number; hz: number; phase: number }[];
const wave = (parts: Wave, t: number) =>
  parts.reduce(
    (sum, { amp, hz, phase }) =>
      sum + amp * Math.sin(2 * Math.PI * hz * t + phase),
    0,
  );

const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * 0 while the block's top is in the bottom tenth of the viewport, 1 once 80% of the block has
 * scrolled off the top. Tuned so a block scrolled to the middle of the screen sits at about 0.5:
 * cut open, camera starting its dive.
 *
 * Not SplatBlock's enter-to-exit measure: that one starts counting the moment the block's top
 * edge appears, which spends the held opening pose on a block that's barely on screen.
 */
function scrollProgress(rect: DOMRect, vh: number) {
  const line = vh * 0.9;
  return clamp01((line - rect.top) / (line + rect.height * 0.8));
}

/**
 * A CAD model cut in half down its long axis, flown past by the page scroll.
 *
 * Built the same way as `SplatBlock` and for the same reasons: plain three.js, no pointer input
 * at all, and the scroll position as the only thing that moves the camera.
 *
 * The cut is a pair of clipping planes, so the model file is just closed solids. One is the
 * lengthwise section; the other sweeps down the vehicle with the scroll, and only what's on the
 * cut side of *both* is removed — that's the cut opening. Where the planes open a solid up, the
 * camera is looking at the *inside* of its far wall — a back face — and the shader paints every
 * back face as flat section material in the part's own colour. That is the whole trick, and it's
 * why the model must be closed solids, which a CAD export always is.
 *
 * The canards are separate nodes in the file, each with its origin on its hinge line and the axis
 * in `extras.hingeAxis` (see `scripts/cutaway/build-glb.py`). All four panels are exempt from the
 * cut, so they swing whole instead of being sliced as they deflect or as the cut sweeps past.
 */
export function CutawayBlock(props: CutawayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // Only ever rendered on the client (`ssr: false` in MediaBlock), so this can be decided up front.
  const [supported] = useState(() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  });

  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    if (!supported) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    // Registered as each resource is created and run in reverse, so an early return mid-load
    // still releases the WebGL context. See SplatBlock for the leak this shape exists to avoid.
    const disposers: Array<() => void> = [];

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const { RoomEnvironment } =
        await import("three/addons/environments/RoomEnvironment.js");
      if (disposed) return;

      const dpr = Math.min(window.devicePixelRatio, CUTAWAY_CONFIG.MAX_DPR);
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.localClippingEnabled = true;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      Object.assign(renderer.domElement.style, {
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
      });
      host.appendChild(renderer.domElement);
      disposers.push(() => {
        renderer.dispose();
        renderer.domElement.remove();
      });

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.85;
      pmrem.dispose();
      disposers.push(() => envTarget.dispose());

      // The key light casts, so the open half of the airframe throws shade into the bay below it.
      const key = new THREE.DirectionalLight(0xffffff, 1.7);
      key.position.set(0.5, 1.6, 1.1);
      key.castShadow = true;
      key.shadow.mapSize.set(4096, 4096);
      key.shadow.radius = 8;
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.003;
      Object.assign(key.shadow.camera, {
        left: -0.9,
        right: 0.9,
        top: 0.9,
        bottom: -0.9,
        near: 0.5,
        far: 4,
      });
      scene.add(key, key.target);

      const camera = new THREE.PerspectiveCamera(
        CUTAWAY_CONFIG.FOV,
        16 / 10,
        0.01,
        50,
      );

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

      /* ------------------------------------------------------------ load */

      let gltf: Awaited<
        ReturnType<InstanceType<typeof GLTFLoader>["loadAsync"]>
      >;
      try {
        gltf = await new GLTFLoader().loadAsync(props.src);
      } catch (error) {
        console.error("[cutaway] failed to load", props.src, error);
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return;

      const model = gltf.scene;
      // The tilt is a roll about the camera-facing axis, so the cut plane is unaffected by it.
      const pivot = new THREE.Group();
      pivot.rotation.z = CUTAWAY_CONFIG.TILT;
      pivot.add(model);
      scene.add(pivot);

      // Centre the model on the origin so `along` is measured from its middle.
      const box = new THREE.Box3().setFromObject(model);
      const centre = box.getCenter(new THREE.Vector3());
      model.position.set(-centre.x, -centre.y, 0);
      const length = box.max.x - box.min.x;

      // Both planes in the pivot's frame, re-expressed in world space every frame (clipping planes
      // are world-space) so they ride along with the tilt and the sway.
      const sectionLocal = new THREE.Plane(
        new THREE.Vector3(0, 0, -1),
        CUTAWAY_CONFIG.CUT_OFFSET,
      );
      const sweepLocal = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
      const planes = [sectionLocal.clone(), sweepLocal.clone()];

      const hinges: Array<{
        node: InstanceType<typeof THREE.Object3D>;
        axis: InstanceType<typeof THREE.Vector3>;
        rest: InstanceType<typeof THREE.Quaternion>;
        index: number;
      }> = [];
      model.traverse((object) => {
        const match = /^canard-(\d)$/.exec(object.name);
        const axis = object.userData.hingeAxis as number[] | undefined;
        if (match && axis) {
          hinges.push({
            node: object,
            axis: new THREE.Vector3(...axis),
            rest: object.quaternion.clone(),
            index: Number(match[1]),
          });
        }
      });

      // The canard panels are outside the airframe, so the cut never has a reason to remove them:
      // clipped, they'd be sliced every time one deflected across the section plane, and the one
      // facing the camera would be chopped in half as the cut swept past it. The two shafts in the
      // section plane stay whole too. The other two run through the part of the bay that's cut
      // away, so they're clipped with it rather than left floating.
      const exempt = new Set<InstanceType<typeof THREE.Object3D>>();
      for (const { node, index } of hinges) {
        node.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const panel =
            (child.material as InstanceType<typeof THREE.Material>).name ===
            "canard";
          if (panel || index % 2 === 0) exempt.add(child);
        });
      }

      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;

        const clipped = !exempt.has(object);
        const material = (
          clipped ? object.material : object.material.clone()
        ) as InstanceType<typeof THREE.MeshStandardMaterial>;
        object.material = material;
        if (!clipped) {
          // Never cut, so never opened up: a plain closed solid that needs no section shading.
          // Reset explicitly, because the clone may have come from a material already set up below.
          material.side = THREE.FrontSide;
          material.clippingPlanes = null;
          material.onBeforeCompile = () => {};
          material.needsUpdate = true;
          disposers.push(() => material.dispose());
          return;
        }
        material.side = THREE.DoubleSide;
        material.clippingPlanes = planes;
        material.clipIntersection = true;
        material.clipShadows = true;

        // The section colour is injected after tone mapping and the sRGB conversion, so it's
        // converted here to match what the lit faces beside it end up as.
        const cap = material.color
          .clone()
          .multiplyScalar(CUTAWAY_CONFIG.CAP_SHADE)
          .convertLinearToSRGB();
        material.onBeforeCompile = (shader) => {
          shader.uniforms.capColor = { value: cap };
          // d(depth)/d(distance) for a perspective projection is near·far / ((far − near)·z²),
          // so this turns the nudge into depth units at whatever distance the fragment is.
          shader.uniforms.capNudge = {
            value:
              (CUTAWAY_CONFIG.CAP_NUDGE * camera.near * camera.far) /
              (camera.far - camera.near),
          };
          shader.fragmentShader =
            "uniform vec3 capColor;\nuniform float capNudge;\n" +
            shader.fragmentShader.replace(
              "#include <dithering_fragment>",
              `#include <dithering_fragment>
              if (!gl_FrontFacing) gl_FragColor = vec4(capColor, 1.0);
              // A section face can land exactly on another part's surface — a battery opened up
              // on the sled it's strapped to — and the two then fight over every pixel. Pulling
              // section faces a fraction of a millimetre toward the camera settles it their way,
              // which is the right answer: the cut material is in front. The nudge is a fixed
              // distance, not a fixed depth: depth precision falls off with distance, and a fixed
              // depth offset grew to millimetres in the wide shot.
              gl_FragDepth = gl_FragCoord.z -
                (gl_FrontFacing ? 0.0 : capNudge / (vViewPosition.z * vViewPosition.z));`,
            );
        };
        material.needsUpdate = true;

        disposers.push(() => {
          object.geometry.dispose();
          material.dispose();
        });
      });

      /* ------------------------------------------------------------ loop */

      const state = { progress: 0, snap: true };
      const target = new THREE.Vector3();
      const zAxis = new THREE.Vector3(0, 0, 1);
      const turn = new THREE.Quaternion();
      const clock = performance.now();

      setReady(true);

      let last = performance.now();
      const animate = () => {
        if (disposed) return;
        const now = performance.now();
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;
        const reducedMotion = reducedRef.current;

        const rect = host.getBoundingClientRect();
        const scrolled = scrollProgress(rect, window.innerHeight || 1);
        const goal = reducedMotion ? 1 : (CUTAWAY_CONFIG.SCRUB ?? scrolled);

        if (state.snap || reducedMotion) {
          state.progress = goal;
          state.snap = false;
        } else {
          const ease = 1 - Math.exp(-delta / CUTAWAY_CONFIG.SCROLL_EASE_TAU);
          state.progress += (goal - state.progress) * ease;
        }

        /* --------------------------------------------- the vehicle in flight */

        // Reduced motion: no canard play and no sway — the vehicle holds still, fully open.
        const t = reducedMotion ? 0 : (now - clock) / 1000;
        const live = reducedMotion ? 0 : 1;
        pivot.rotation.z =
          CUTAWAY_CONFIG.TILT + live * wave(CUTAWAY_CONFIG.SWAY, t);
        pivot.updateMatrixWorld();

        const steer = live * wave(CUTAWAY_CONFIG.STEER, t);
        const steer2 = live * wave(CUTAWAY_CONFIG.STEER_2, t);
        const roll = live * wave(CUTAWAY_CONFIG.ROLL, t);
        for (const { node, axis, rest, index } of hinges) {
          // Opposite panels share a steering channel; roll twists every panel the same way round
          // the airframe, which with fixed axes means flipping its sign on the far panel of a pair.
          const angle =
            (index % 2 === 0 ? steer : steer2) + (index < 2 ? roll : -roll);
          node.quaternion
            .copy(rest)
            .multiply(turn.setFromAxisAngle(axis, angle));
        }

        /* ---------------------------------------------------------- the cut */

        // The sweep plane travels from just past the nose to just past the tail; everything on the
        // near side of the section *and* forward of the sweep is cut, so the cut opens nose-first.
        const open = smoothstep(
          CUTAWAY_CONFIG.OPEN_START,
          CUTAWAY_CONFIG.OPEN_END,
          state.progress,
        );
        const reach = length / 2 + 0.02;
        sweepLocal.constant = reach - 2 * reach * open;
        planes[0].copy(sectionLocal).applyMatrix4(pivot.matrixWorld);
        planes[1].copy(sweepLocal).applyMatrix4(pivot.matrixWorld);

        /* ------------------------------------------------------- the camera */

        const pose = solve(state.progress);
        target
          .set(pose.along * length, 0, 0)
          .applyAxisAngle(zAxis, CUTAWAY_CONFIG.TILT);
        const distance = pose.distance * length;
        camera.position.set(
          target.x + Math.sin(pose.yaw) * Math.cos(pose.pitch) * distance,
          target.y + Math.sin(pose.pitch) * distance,
          target.z + Math.cos(pose.yaw) * Math.cos(pose.pitch) * distance,
        );
        camera.lookAt(target);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };

      // No reason to draw while the block is off screen; the canards pick up wherever the clock is.
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
      console.error("[cutaway] viewer failed", error);
      if (!disposed) setFailed(true);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      for (let i = disposers.length - 1; i >= 0; i--) {
        try {
          disposers[i]();
        } catch {
          /* keep tearing down */
        }
      }
      disposers.length = 0;
    };
  }, [supported, props.src]);

  const live = supported && !failed;
  const showPoster = Boolean(props.poster) && (!ready || !live);

  return (
    <figure className="not-prose">
      <div
        role="img"
        aria-label={props.alt || undefined}
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50"
      >
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
              Loading 3D model…
            </span>
          </div>
        )}
      </div>

      {props.caption && (
        <figcaption className="mt-2 text-[13px] text-neutral-500">
          {props.caption}
        </figcaption>
      )}
    </figure>
  );
}

export default CutawayBlock;
