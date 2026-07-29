/**
 * GLSL ES 3.00 sources for the fluid simulation.
 *
 * Each fragment shader is one stage of the standard stable-fluids pipeline, run over a
 * fullscreen triangle. The vertex shader precomputes the four neighbour UVs so the
 * finite-difference stages don't have to.
 */

export const BASE_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexelSize;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexelSize.x, 0.0);
  vR = vUv + vec2(uTexelSize.x, 0.0);
  vT = vUv + vec2(0.0, uTexelSize.y);
  vB = vUv - vec2(0.0, uTexelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const COPY_FRAG = /* glsl */ `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;

void main() {
  fragColor = texture(uTexture, vUv);
}
`;

export const CLEAR_FRAG = /* glsl */ `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float uValue;

void main() {
  fragColor = uValue * texture(uTexture, vUv);
}
`;

/** Injects a soft gaussian blob of `uColor` at `uPoint`. Used for both velocity and dye. */
export const SPLAT_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;

void main() {
  vec2 p = vUv - uPoint.xy;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}
`;

/**
 * Semi-Lagrangian advection: trace backwards along the velocity field and sample where
 * this parcel came from. `uDissipation` is what makes trails fade.
 */
export const ADVECTION_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform vec2 uDyeTexelSize;
uniform float uDt;
uniform float uDissipation;

/** Manual bilinear filter, for when the platform can't linearly filter float textures. */
vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);

  vec4 a = texture(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture(sam, (iuv + vec2(1.5, 1.5)) * tsize);

  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - uDt * bilerp(uVelocity, vUv, uTexelSize).xy * uTexelSize;
  vec4 result = bilerp(uSource, coord, uDyeTexelSize);
#else
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
  vec4 result = texture(uSource, coord);
#endif
  float decay = 1.0 + uDissipation * uDt;
  fragColor = result / decay;
}
`;

export const DIVERGENCE_FRAG = /* glsl */ `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;

  // Reflect velocity at the boundaries so the fluid doesn't leak off-canvas.
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }

  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

export const CURL_FRAG = /* glsl */ `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

/**
 * Vorticity confinement. The advection step numerically damps small eddies; this pushes
 * energy back into them along the curl gradient. Without it there are no swirls at all.
 */
export const VORTICITY_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;

void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;

  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity += force * uDt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`;

export const PRESSURE_FRAG = /* glsl */ `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

export const GRADIENT_SUBTRACT_FRAG = /* glsl */ `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`;

/**
 * The display pass, kept deliberately identical to the upstream WebGL-Fluid-Simulation one
 * (PavelDoGreat/WebGL-Fluid-Simulation, `displayShaderSource`) minus the bloom and sunrays
 * branches, which need extra framebuffers we don't allocate.
 *
 * The important line is the last one. Writing `vec4(c, max(c.rgb))` emits **premultiplied**
 * alpha: every channel is already scaled by the coverage it represents. That is what makes
 * the color read correctly on a light page, and it is worth spelling out why, because the
 * obvious-looking alternative is wrong.
 *
 * Where two different hues overlap, the dye buffer *sums* them. Normalising that sum back to
 * a hue (`dye / max(dye)`) turns red+green+blue into grey, so overlaps composite as brown mud
 * on white. Premultiplied output instead lets an overlap resolve as `c + (1 - a) * white`, so
 * summed hues wash out toward *white* — a bright highlight rather than dirt. Same reason
 * upstream's colors look clean; it just gets there over black instead.
 *
 * This requires the canvas context to be created with `premultipliedAlpha: true`.
 */
export const DISPLAY_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform float uOpacity;
uniform float uShading;

void main() {
  vec3 c = texture(uTexture, vUv).rgb;

  // Fake a light pointing out of the screen, shaded by the dye's own gradient. This is what
  // gives a ribbon a lit edge and a darker flank instead of a flat wash of tint.
  vec3 lc = texture(uTexture, vL).rgb;
  vec3 rc = texture(uTexture, vR).rgb;
  vec3 tc = texture(uTexture, vT).rgb;
  vec3 bc = texture(uTexture, vB).rgb;

  float dx = length(rc) - length(lc);
  float dy = length(tc) - length(bc);

  vec3 n = normalize(vec3(dx, dy, length(uTexelSize)));
  float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
  c *= mix(1.0, diffuse, uShading);

  float a = max(c.r, max(c.g, c.b));

  // Scaling color and alpha together keeps the output premultiplied, so OPACITY fades the
  // effect out without shifting its hue.
  fragColor = vec4(c, a) * uOpacity;
}
`;
