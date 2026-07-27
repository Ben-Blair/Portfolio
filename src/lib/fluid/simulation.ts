import { FLUID_CONFIG, mobileConfig, type FluidConfig } from "./config";
import {
  ADVECTION_FRAG,
  BASE_VERT,
  CLEAR_FRAG,
  COPY_FRAG,
  CURL_FRAG,
  DISPLAY_FRAG,
  DIVERGENCE_FRAG,
  GRADIENT_SUBTRACT_FRAG,
  PRESSURE_FRAG,
  SPLAT_FRAG,
  VORTICITY_FRAG,
} from "./shaders";

/* -------------------------------------------------------------------------- */
/* types                                                                       */
/* -------------------------------------------------------------------------- */

type GL = WebGL2RenderingContext;

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

interface Format {
  internalFormat: number;
  format: number;
}

interface Pointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: [number, number, number];
}

/* -------------------------------------------------------------------------- */
/* small helpers                                                               */
/* -------------------------------------------------------------------------- */

function compileShader(gl: GL, type: number, source: string, defines?: string[]) {
  const withDefines = defines?.length
    ? source.replace(/^(#version[^\n]*\n)/, `$1${defines.map((d) => `#define ${d}\n`).join("")}`)
    : source;

  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, withDefines);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

/** A compiled program plus a lazily-populated uniform-location cache. */
class Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(
    private gl: GL,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ) {
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create program");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    // Pin the quad attribute to location 0 so one VAO works for every program.
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)?.name;
      if (name) this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  bind() {
    this.gl.useProgram(this.program);
  }

  destroy() {
    this.gl.deleteProgram(this.program);
  }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

/* -------------------------------------------------------------------------- */
/* the simulation                                                              */
/* -------------------------------------------------------------------------- */

export class FluidSimulation {
  private gl: GL;
  private config: FluidConfig;
  private canvas: HTMLCanvasElement;

  private ext!: {
    formatRGBA: Format;
    formatRG: Format;
    formatR: Format;
    halfFloatTexType: number;
    supportLinearFiltering: boolean;
  };

  private programs!: {
    copy: Program;
    clear: Program;
    splat: Program;
    advection: Program;
    divergence: Program;
    curl: Program;
    vorticity: Program;
    pressure: Program;
    gradientSubtract: Program;
    display: Program;
  };

  private dye!: DoubleFBO;
  private velocity!: DoubleFBO;
  private divergence!: FBO;
  private curl!: FBO;
  private pressure!: DoubleFBO;

  private quadBuffer!: WebGLBuffer;
  private quadIndexBuffer!: WebGLBuffer;
  private vao!: WebGLVertexArrayObject;

  private pointers: Pointer[] = [];
  private splatQueue: Array<{
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: [number, number, number];
  }> = [];

  private lastTime = 0;
  private hue = Math.random();
  private ambientTimer = 0;
  private rafId: number | null = null;
  private running = false;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, overrides?: Partial<FluidConfig>) {
    this.canvas = canvas;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      // The display shader writes straight (non-premultiplied) color + alpha. The WebGL
      // default is premultipliedAlpha: true, under which pale pastels with low alpha get
      // treated as already-multiplied and composite to nothing on a white page — the whole
      // effect silently disappears even though the dye buffer is full of color.
      premultipliedAlpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;

    const isSmall = window.matchMedia("(max-width: 768px)").matches;
    const base = isSmall ? mobileConfig(FLUID_CONFIG) : FLUID_CONFIG;
    this.config = { ...base, ...overrides };

    this.initExtensions();
    this.initGeometry();
    this.initPrograms();
    this.resize();
    this.seed();
  }

  /* ---------------------------------------------------------------- setup */

  private initExtensions() {
    const gl = this.gl;
    gl.getExtension("EXT_color_buffer_float");
    const supportLinearFiltering = gl.getExtension("OES_texture_float_linear") !== null;

    gl.clearColor(0, 0, 0, 0);

    const halfFloatTexType = gl.HALF_FLOAT;
    const formatRGBA = this.getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
    const formatRG = this.getSupportedFormat(gl.RG16F, gl.RG, halfFloatTexType);
    const formatR = this.getSupportedFormat(gl.R16F, gl.RED, halfFloatTexType);

    if (!formatRGBA || !formatRG || !formatR) {
      throw new Error("Required float render targets are unsupported");
    }

    this.ext = {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    };
  }

  /** Walk down to a wider format if the requested one isn't color-renderable here. */
  private getSupportedFormat(internalFormat: number, format: number, type: number): Format | null {
    const gl = this.gl;
    if (!this.supportsRenderTextureFormat(internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F:
          return this.getSupportedFormat(gl.RG16F, gl.RG, type);
        case gl.RG16F:
          return this.getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  private supportsRenderTextureFormat(internalFormat: number, format: number, type: number) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);

    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  private initGeometry() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create VAO");
    this.vao = vao;
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Failed to create buffer");
    this.quadBuffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW,
    );

    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) throw new Error("Failed to create index buffer");
    this.quadIndexBuffer = indexBuffer;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindVertexArray(null);
  }

  private initPrograms() {
    const gl = this.gl;
    const vert = compileShader(gl, gl.VERTEX_SHADER, BASE_VERT);
    const frag = (source: string, defines?: string[]) =>
      compileShader(gl, gl.FRAGMENT_SHADER, source, defines);

    const link = (fragmentShader: WebGLShader) => new Program(gl, vert, fragmentShader);

    this.programs = {
      copy: link(frag(COPY_FRAG)),
      clear: link(frag(CLEAR_FRAG)),
      splat: link(frag(SPLAT_FRAG)),
      advection: link(
        frag(ADVECTION_FRAG, this.ext.supportLinearFiltering ? [] : ["MANUAL_FILTERING"]),
      ),
      divergence: link(frag(DIVERGENCE_FRAG)),
      curl: link(frag(CURL_FRAG)),
      vorticity: link(frag(VORTICITY_FRAG)),
      pressure: link(frag(PRESSURE_FRAG)),
      gradientSubtract: link(frag(GRADIENT_SUBTRACT_FRAG)),
      display: link(frag(DISPLAY_FRAG)),
    };
  }

  /* -------------------------------------------------------------- fbo utils */

  private createFBO(w: number, h: number, format: Format, type: number, param: number): FBO {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format.internalFormat,
      w,
      h,
      0,
      format.format,
      type,
      null,
    );

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error("Failed to create framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(
    w: number,
    h: number,
    format: Format,
    type: number,
    param: number,
  ): DoubleFBO {
    const fbo1 = this.createFBO(w, h, format, type, param);
    const fbo2 = this.createFBO(w, h, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      read: fbo1,
      write: fbo2,
      swap() {
        const temp = this.read;
        this.read = this.write;
        this.write = temp;
      },
    };
  }

  private resizeFBO(target: FBO, w: number, h: number, format: Format, type: number, param: number) {
    const next = this.createFBO(w, h, format, type, param);
    this.programs.copy.bind();
    this.gl.uniform1i(this.programs.copy.uniforms.uTexture, target.attach(0));
    this.blit(next);
    this.gl.deleteFramebuffer(target.fbo);
    this.gl.deleteTexture(target.texture);
    return next;
  }

  private resizeDoubleFBO(
    target: DoubleFBO,
    w: number,
    h: number,
    format: Format,
    type: number,
    param: number,
  ) {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(target.read, w, h, format, type, param);

    this.gl.deleteFramebuffer(target.write.fbo);
    this.gl.deleteTexture(target.write.texture);
    target.write = this.createFBO(w, h, format, type, param);

    target.width = w;
    target.height = h;
    target.texelSizeX = 1 / w;
    target.texelSizeY = 1 / h;
    return target;
  }

  private blit(target: FBO | null) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    if (target === null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private getResolution(resolution: number) {
    const gl = this.gl;
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;

    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);

    return gl.drawingBufferWidth > gl.drawingBufferHeight
      ? { width: max, height: min }
      : { width: min, height: max };
  }

  private initFramebuffers() {
    const gl = this.gl;
    const simRes = this.getResolution(this.config.SIM_RESOLUTION);
    const dyeRes = this.getResolution(this.config.DYE_RESOLUTION);
    const texType = this.ext.halfFloatTexType;
    const { formatRGBA, formatRG, formatR, supportLinearFiltering } = this.ext;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    this.dye = this.dye
      ? this.resizeDoubleFBO(this.dye, dyeRes.width, dyeRes.height, formatRGBA, texType, filtering)
      : this.createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA, texType, filtering);

    this.velocity = this.velocity
      ? this.resizeDoubleFBO(this.velocity, simRes.width, simRes.height, formatRG, texType, filtering)
      : this.createDoubleFBO(simRes.width, simRes.height, formatRG, texType, filtering);

    this.divergence = this.createFBO(simRes.width, simRes.height, formatR, texType, gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, formatR, texType, gl.NEAREST);
    this.pressure = this.createDoubleFBO(
      simRes.width,
      simRes.height,
      formatR,
      texType,
      gl.NEAREST,
    );
  }

  /* ------------------------------------------------------------- public API */

  /** Match the drawing buffer to the element's CSS size. Safe to call on every resize event. */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.MAX_DPR);
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));

    const changed = this.canvas.width !== width || this.canvas.height !== height;
    if (changed) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (changed || !this.dye) this.initFramebuffers();
  }

  /**
   * Inject dye and velocity at a point.
   * Coordinates are 0-1 with the origin bottom-left; deltas are in the same space.
   */
  splat(x: number, y: number, dx: number, dy: number, color: [number, number, number]) {
    this.splatQueue.push({ x, y, dx, dy, color });
  }

  /** A splat using the current drifting hue, scaled by `intensity`. */
  splatWithCurrentHue(x: number, y: number, dx: number, dy: number, intensity = 1) {
    const [r, g, b] = hsvToRgb(this.hue, this.config.SATURATION, this.config.VALUE);
    const k = this.config.SPLAT_INTENSITY * intensity;
    this.splat(x, y, dx, dy, [r * k, g * k, b * k]);
  }

  /**
   * A few splats on load so the hero isn't blank before the cursor arrives.
   *
   * Velocity here is in *texel* units — the advection shader multiplies it by texelSize —
   * so cursor-scale forces (~1000+) move dye more than 10% of the screen per frame and blow
   * the whole seed off-canvas before the first paint. These want a gentle drift instead.
   */
  private seed() {
    for (let i = 0; i < this.config.INITIAL_SPLATS; i++) {
      const x = 0.12 + Math.random() * 0.76;
      const y = 0.15 + Math.random() * 0.7;
      const angle = Math.random() * Math.PI * 2;
      const force = 25 + Math.random() * 55;
      this.hue = (this.hue + 0.16) % 1;
      this.splatWithCurrentHue(x, y, Math.cos(angle) * force, Math.sin(angle) * force, 1.15);
    }
  }

  start() {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = () => {
      if (!this.running || this.destroyed) return;
      this.frame();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  get isRunning() {
    return this.running;
  }

  destroy() {
    this.stop();
    this.destroyed = true;
    const gl = this.gl;

    for (const program of Object.values(this.programs ?? {})) program.destroy();

    const targets = [this.dye, this.velocity, this.pressure].filter(Boolean);
    for (const t of targets) {
      for (const fbo of [t.read, t.write]) {
        gl.deleteFramebuffer(fbo.fbo);
        gl.deleteTexture(fbo.texture);
      }
    }
    for (const fbo of [this.divergence, this.curl].filter(Boolean)) {
      gl.deleteFramebuffer(fbo.fbo);
      gl.deleteTexture(fbo.texture);
    }

    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.quadIndexBuffer);
    gl.deleteVertexArray(this.vao);

    // Deliberately NOT calling WEBGL_lose_context.loseContext() here. A canvas hands back the
    // same context object for the life of the element, so losing it would leave the canvas
    // permanently dead — and React StrictMode mounts, unmounts, then remounts this component
    // in development, which would hit exactly that. Deleting the resources above is enough.
  }

  /* ----------------------------------------------------------------- frame */

  private frame() {
    const now = performance.now();
    // Clamp dt so a backgrounded tab doesn't resume with one enormous unstable step.
    const dt = Math.min((now - this.lastTime) / 1000, 0.0166);
    this.lastTime = now;

    this.hue = (this.hue + dt * this.config.HUE_DRIFT_SPEED) % 1;

    this.updateAmbient(dt);
    this.applySplats();
    this.step(dt);
    this.render();
  }

  private updateAmbient(dt: number) {
    if (!this.config.AMBIENT_SPLATS) return;
    this.ambientTimer += dt;
    if (this.ambientTimer < this.config.AMBIENT_INTERVAL) return;
    this.ambientTimer = 0;

    const x = 0.1 + Math.random() * 0.8;
    const y = 0.1 + Math.random() * 0.8;
    const angle = Math.random() * Math.PI * 2;
    // Same texel-unit caveat as seed(): keep ambient drift gentle.
    const force = 30 + Math.random() * 60;
    this.splatWithCurrentHue(
      x,
      y,
      Math.cos(angle) * force,
      Math.sin(angle) * force,
      this.config.AMBIENT_SCALE,
    );
  }

  private applySplats() {
    if (this.splatQueue.length === 0) return;
    const gl = this.gl;
    const { splat } = this.programs;

    splat.bind();
    for (const s of this.splatQueue) {
      const aspect = this.canvas.width / this.canvas.height;
      const radius = correctRadius(this.config.SPLAT_RADIUS / 100, aspect);

      gl.uniform1i(splat.uniforms.uTarget, this.velocity.read.attach(0));
      gl.uniform1f(splat.uniforms.uAspectRatio, aspect);
      gl.uniform2f(splat.uniforms.uPoint, s.x, s.y);
      gl.uniform3f(splat.uniforms.uColor, s.dx, s.dy, 0);
      gl.uniform1f(splat.uniforms.uRadius, radius);
      this.blit(this.velocity.write);
      this.velocity.swap();

      gl.uniform1i(splat.uniforms.uTarget, this.dye.read.attach(0));
      gl.uniform3f(splat.uniforms.uColor, s.color[0], s.color[1], s.color[2]);
      this.blit(this.dye.write);
      this.dye.swap();
    }
    this.splatQueue.length = 0;
  }

  private step(dt: number) {
    const gl = this.gl;
    const { curl, vorticity, divergence, clear, pressure, gradientSubtract, advection } =
      this.programs;

    gl.disable(gl.BLEND);

    // curl
    curl.bind();
    gl.uniform2f(curl.uniforms.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(curl.uniforms.uVelocity, this.velocity.read.attach(0));
    this.blit(this.curl);

    // vorticity confinement
    vorticity.bind();
    gl.uniform2f(vorticity.uniforms.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(vorticity.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(vorticity.uniforms.uCurl, this.curl.attach(1));
    gl.uniform1f(vorticity.uniforms.uCurlStrength, this.config.CURL);
    gl.uniform1f(vorticity.uniforms.uDt, dt);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // divergence
    divergence.bind();
    gl.uniform2f(divergence.uniforms.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(divergence.uniforms.uVelocity, this.velocity.read.attach(0));
    this.blit(this.divergence);

    // decay pressure, then solve
    clear.bind();
    gl.uniform1i(clear.uniforms.uTexture, this.pressure.read.attach(0));
    gl.uniform1f(clear.uniforms.uValue, this.config.PRESSURE);
    this.blit(this.pressure.write);
    this.pressure.swap();

    pressure.bind();
    gl.uniform2f(pressure.uniforms.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(pressure.uniforms.uDivergence, this.divergence.attach(0));
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressure.uniforms.uPressure, this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    // make the velocity field divergence-free
    gradientSubtract.bind();
    gl.uniform2f(
      gradientSubtract.uniforms.uTexelSize,
      this.velocity.texelSizeX,
      this.velocity.texelSizeY,
    );
    gl.uniform1i(gradientSubtract.uniforms.uPressure, this.pressure.read.attach(0));
    gl.uniform1i(gradientSubtract.uniforms.uVelocity, this.velocity.read.attach(1));
    this.blit(this.velocity.write);
    this.velocity.swap();

    // advect velocity by itself
    advection.bind();
    gl.uniform2f(advection.uniforms.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (!this.ext.supportLinearFiltering) {
      gl.uniform2f(
        advection.uniforms.uDyeTexelSize,
        this.velocity.texelSizeX,
        this.velocity.texelSizeY,
      );
    }
    const velocityId = this.velocity.read.attach(0);
    gl.uniform1i(advection.uniforms.uVelocity, velocityId);
    gl.uniform1i(advection.uniforms.uSource, velocityId);
    gl.uniform1f(advection.uniforms.uDt, dt);
    gl.uniform1f(advection.uniforms.uDissipation, this.config.VELOCITY_DISSIPATION);
    this.blit(this.velocity.write);
    this.velocity.swap();

    // advect dye by velocity
    if (!this.ext.supportLinearFiltering) {
      gl.uniform2f(advection.uniforms.uDyeTexelSize, this.dye.texelSizeX, this.dye.texelSizeY);
    }
    gl.uniform1i(advection.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(advection.uniforms.uSource, this.dye.read.attach(1));
    gl.uniform1f(advection.uniforms.uDissipation, this.config.DENSITY_DISSIPATION);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private render() {
    const gl = this.gl;
    const { display } = this.programs;

    // No blending: this is a single fullscreen quad over a cleared buffer, and the alpha it
    // writes is what the browser uses to composite the canvas over the page. Blending here
    // would multiply alpha into itself and wash the whole effect out.
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    display.bind();
    gl.uniform1i(display.uniforms.uTexture, this.dye.read.attach(0));
    gl.uniform1f(display.uniforms.uIntensity, this.config.INTENSITY);
    gl.uniform1f(display.uniforms.uOpacity, this.config.OPACITY);
    gl.uniform1f(display.uniforms.uPastel, this.config.PASTEL);
    this.blit(null);
  }

  /* --------------------------------------------------------------- pointers */

  private getPointer(id: number): Pointer {
    let pointer = this.pointers.find((p) => p.id === id);
    if (!pointer) {
      pointer = {
        id,
        texcoordX: 0,
        texcoordY: 0,
        prevTexcoordX: 0,
        prevTexcoordY: 0,
        deltaX: 0,
        deltaY: 0,
        down: false,
        moved: false,
        color: [0, 0, 0],
      };
      this.pointers.push(pointer);
    }
    return pointer;
  }

  /**
   * Feed a pointer position in CSS pixels relative to the canvas.
   * The first event for a given id only establishes position — no splat, so entering the
   * page doesn't fire a splat from wherever the cursor happened to be last.
   */
  onPointerMove(id: number, clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;

    const pointer = this.getPointer(id);
    if (!pointer.moved) {
      pointer.texcoordX = x;
      pointer.texcoordY = y;
      pointer.prevTexcoordX = x;
      pointer.prevTexcoordY = y;
      pointer.moved = true;
      return;
    }

    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = x;
    pointer.texcoordY = y;

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    // Correct the delta for aspect so a horizontal flick and a vertical one feel the same.
    pointer.deltaX = (pointer.texcoordX - pointer.prevTexcoordX) * (aspect < 1 ? aspect : 1);
    pointer.deltaY = (pointer.texcoordY - pointer.prevTexcoordY) * (aspect > 1 ? 1 / aspect : 1);

    if (Math.abs(pointer.deltaX) === 0 && Math.abs(pointer.deltaY) === 0) return;

    const force = this.config.SPLAT_FORCE;
    this.splatWithCurrentHue(
      pointer.texcoordX,
      pointer.texcoordY,
      pointer.deltaX * force,
      pointer.deltaY * force,
      pointer.down ? 1.6 : 1,
    );
  }

  onPointerDown(id: number, clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const pointer = this.getPointer(id);
    pointer.down = true;
    pointer.moved = true;
    pointer.texcoordX = (clientX - rect.left) / rect.width;
    pointer.texcoordY = 1 - (clientY - rect.top) / rect.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    this.hue = (this.hue + 0.13) % 1;
    this.splatWithCurrentHue(pointer.texcoordX, pointer.texcoordY, 0, 0, 1.4);
  }

  onPointerUp(id: number) {
    const pointer = this.pointers.find((p) => p.id === id);
    if (pointer) pointer.down = false;
  }

  onPointerLeave(id: number) {
    this.pointers = this.pointers.filter((p) => p.id !== id);
  }
}

/** Keep splats round on wide viewports instead of stretching into ellipses. */
function correctRadius(radius: number, aspectRatio: number) {
  return aspectRatio > 1 ? radius * aspectRatio : radius;
}

/** Cheap capability probe so callers can render the CSS fallback without constructing anything. */
export function supportsFluid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    const ok = gl.getExtension("EXT_color_buffer_float") !== null;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}
