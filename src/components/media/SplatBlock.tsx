"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Media } from "@/lib/schema";

type SplatProps = Extract<Media, { type: "splat" }>;

/**
 * Gaussian splat viewer.
 *
 * Written against three.js directly rather than react-three-fiber. Spark renders splats by
 * walking the scene for SplatMesh instances from its own SparkRenderer; driving that through
 * R3F's reconciler produced a canvas that drew ordinary meshes fine but never any splats,
 * with no error to debug. A plain renderer + animation loop is both simpler and the setup
 * Spark's own docs describe, so that's what this is.
 *
 * Splat files are tens of megabytes, so this component is only mounted once its section is
 * near the viewport (see `MediaBlock`), and it shows the project's cover image until the
 * scan is ready.
 */
export function SplatBlock(props: SplatProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  // Props the animation loop reads. Held in a ref so changing them never restarts the scene.
  const optionsRef = useRef(props);
  optionsRef.current = props;

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
    let cleanupExtras: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setClearColor(0xfafafa, 1);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "pan-y";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 4 / 3, 0.01, 5000);

      scene.add(new SparkRenderer({ renderer }));

      const mesh = new SplatMesh({ url: props.src });
      scene.add(mesh);

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
      resize();

      /* -------------------------------------------------------- controls */

      // Hand-rolled orbit: yaw/pitch/distance around the scan's centre. Simpler than pulling
      // in OrbitControls, and it lets scroll-tilt and auto-rotate compose cleanly with drags.
      const state = {
        yaw: 0,
        pitch: 0,
        distance: 5,
        minDistance: 0.1,
        maxDistance: 1e5,
        dragging: false,
        lastX: 0,
        lastY: 0,
        userPitch: 0,
        scrollTilt: 0,
        pointerX: 0,
      };

      const onPointerDown = (e: PointerEvent) => {
        if (!optionsRef.current.interactive) return;
        state.dragging = true;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!state.dragging) return;
        state.yaw -= (e.clientX - state.lastX) * 0.005;
        state.userPitch = Math.max(
          -1.2,
          Math.min(1.2, state.userPitch - (e.clientY - state.lastY) * 0.005),
        );
        state.lastX = e.clientX;
        state.lastY = e.clientY;
      };
      const onPointerUp = (e: PointerEvent) => {
        state.dragging = false;
        if (renderer.domElement.hasPointerCapture(e.pointerId)) {
          renderer.domElement.releasePointerCapture(e.pointerId);
        }
      };
      const onWheel = (e: WheelEvent) => {
        if (!optionsRef.current.interactive) return;
        // Only hijack the wheel once the pointer is genuinely over the viewer, and never
        // block the page from scrolling past it.
        e.preventDefault();
        state.distance = Math.max(
          state.minDistance,
          Math.min(state.maxDistance, state.distance * (1 + e.deltaY * 0.001)),
        );
      };

      const el = renderer.domElement;
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
      el.addEventListener("wheel", onWheel, { passive: false });

      const onScroll = () => {
        const rect = host.getBoundingClientRect();
        const mid = window.innerHeight / 2;
        const centre = rect.top + rect.height / 2;
        state.scrollTilt = Math.max(-1, Math.min(1, (mid - centre) / mid));
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      const onWindowPointerMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        state.pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      };
      window.addEventListener("pointermove", onWindowPointerMove, { passive: true });

      cleanupExtras = () => {
        observer.disconnect();
        el.removeEventListener("pointerdown", onPointerDown);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
        el.removeEventListener("wheel", onWheel);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onWindowPointerMove);
      };

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
      // Sampling every 8th is plenty to size a scan and keeps this well under a frame even
      // for a million splats.
      //
      // Framing off raw min/max is unreliable: training leaves a scatter of stray Gaussians
      // far outside the subject, and one of those blows the box up and parks the camera in
      // the next postcode. Standard deviation has the opposite failure — a room scan has
      // most of its splats bunched in the middle, so it frames the camera inside the walls.
      //
      // The 95th percentile of radial distance from the centroid handles both: it ignores
      // the strays but still contains the actual subject.
      let count = 0;
      const mean = [0, 0, 0];
      mesh.forEachSplat((index, position) => {
        if (index % 8 !== 0) return;
        count++;
        // Running mean, so a large scan can't accumulate float error.
        mean[0] += (position.x - mean[0]) / count;
        mean[1] += (position.y - mean[1]) / count;
        mean[2] += (position.z - mean[2]) / count;
      });

      const centre = new THREE.Vector3(mean[0], mean[1], mean[2]);
      let extent = 4;

      if (count > 1) {
        const radii = new Float32Array(count);
        let i = 0;
        mesh.forEachSplat((index, position) => {
          if (index % 8 !== 0 || i >= count) return;
          radii[i++] = Math.hypot(
            position.x - mean[0],
            position.y - mean[1],
            position.z - mean[2],
          );
        });
        radii.sort();
        const p95 = radii[Math.min(radii.length - 1, Math.floor(radii.length * 0.95))];
        extent = p95 > 1e-4 ? p95 * 2 : 4;
      }

      state.distance = extent * optionsRef.current.cameraDistance;
      state.minDistance = state.distance * 0.15;
      state.maxDistance = state.distance * 4;
      camera.near = Math.max(0.01, state.distance / 1000);
      camera.far = state.distance * 40;
      camera.updateProjectionMatrix();

      setReady(true);

      /* ------------------------------------------------------------ loop */

      const pivot = new THREE.Object3D();
      scene.add(pivot);
      pivot.add(mesh);
      // Offset the scan so its centre sits on the pivot's origin; rotating the pivot then
      // spins the scan in place instead of swinging it around the world origin.
      mesh.position.copy(centre).negate();
      // Splat captures are Y-down relative to three.js's convention.
      mesh.rotateX(Math.PI);

      let last = performance.now();
      const animate = () => {
        if (disposed) return;
        const now = performance.now();
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;

        const opts = optionsRef.current;
        if (opts.autoRotate && !state.dragging) state.yaw += delta * 0.18;

        const targetPitch =
          state.userPitch + (opts.scrollTilt ? state.scrollTilt * 0.25 : 0);
        state.pitch += (targetPitch - state.pitch) * 0.08;

        pivot.rotation.set(0, state.yaw, 0);
        pivot.scale.setScalar(opts.scale);
        pivot.position.set(opts.position[0], opts.position[1], opts.position[2]);

        // Orbit the camera rather than tilting the model, so the horizon stays level.
        const parallax = state.pointerX * 0.12;
        camera.position.set(
          Math.sin(parallax) * state.distance * Math.cos(state.pitch),
          Math.sin(state.pitch) * state.distance,
          Math.cos(parallax) * state.distance * Math.cos(state.pitch),
        );
        camera.lookAt(pivot.position);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      cleanupExtras = (() => {
        const previous = cleanupExtras!;
        return () => {
          previous();
          scene.remove(pivot);
          mesh.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      })();
    })().catch((error) => {
      console.error("[splat] viewer failed", error);
      if (!disposed) setFailed(true);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanupExtras?.();
    };
    // Only the source identifies the scene; everything else is read live from optionsRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, props.src]);

  const live = supported === true && !failed;
  const showPoster = Boolean(props.poster) && (!ready || !live);

  return (
    <figure className="not-prose">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
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

        {live && ready && props.interactive && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[11.5px] font-medium text-neutral-500 backdrop-blur">
            Drag to orbit · scroll to zoom
          </span>
        )}
      </div>

      {props.caption && (
        <figcaption className="mt-2 text-[13px] text-neutral-500">{props.caption}</figcaption>
      )}
    </figure>
  );
}

export default SplatBlock;
