#!/usr/bin/env node
/**
 * Convert a 3D Gaussian Splatting .ply into the compact `.splat` format that the web viewer
 * on this site can read.
 *
 *   node scripts/ply-to-splat.mjs input.ply public/splats/output.splat [--max 400000]
 *
 * Why this exists: a raw training .ply carries full spherical harmonics (~236 bytes/splat,
 * so 100 MB+ is normal) which is far too heavy to serve. `.splat` keeps position, scale,
 * rotation, base color and opacity at 32 bytes/splat and drops the view-dependent SH terms.
 * You lose some specular shimmer as the camera moves; you gain a file 7x smaller.
 *
 * `--max N` keeps only the N most opaque splats, which is the cheapest way to trade a bit
 * of fidelity for a much smaller download. Omit it to keep everything.
 *
 * Supported input: binary_little_endian PLY with the usual 3DGS property names
 * (x/y/z, scale_0..2, rot_0..3, f_dc_0..2, opacity). Property order doesn't matter.
 */

import fs from "node:fs";

const SH_C0 = 0.28209479177387814;

function parseArgs(argv) {
  const positional = [];
  let max = Infinity;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--max") {
      max = Number(argv[++i]);
      if (!Number.isFinite(max) || max <= 0) throw new Error("--max needs a positive number");
    } else {
      positional.push(argv[i]);
    }
  }
  const [input, output] = positional;
  if (!input || !output) {
    console.error(
      "Usage: node scripts/ply-to-splat.mjs <input.ply> <output.splat> [--max 400000]",
    );
    process.exit(1);
  }
  return { input, output, max };
}

/** Reads the ASCII header and returns the vertex count, property offsets, and data start. */
function parseHeader(buffer) {
  const headerEnd = buffer.indexOf("end_header\n");
  if (headerEnd === -1) throw new Error("Not a PLY file (no end_header)");

  const header = buffer.toString("ascii", 0, headerEnd);
  if (!header.includes("binary_little_endian")) {
    throw new Error("Only binary_little_endian PLY files are supported");
  }

  const countMatch = header.match(/element vertex (\d+)/);
  if (!countMatch) throw new Error("No 'element vertex' line in header");
  const count = Number(countMatch[1]);

  const SIZES = { float: 4, float32: 4, double: 8, float64: 8, uchar: 1, uint8: 1 };
  const offsets = {};
  let stride = 0;
  for (const line of header.split("\n")) {
    const match = line.match(/^property (\w+) (\w+)/);
    if (!match) continue;
    const [, type, name] = match;
    const size = SIZES[type];
    if (!size) throw new Error(`Unsupported property type: ${type}`);
    offsets[name] = { offset: stride, type };
    stride += size;
  }

  return { count, stride, offsets, dataStart: headerEnd + "end_header\n".length };
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const clampByte = (x) => Math.max(0, Math.min(255, Math.round(x)));

function main() {
  const { input, output, max } = parseArgs(process.argv.slice(2));

  console.log(`Reading ${input}…`);
  const buffer = fs.readFileSync(input);
  const { count, stride, offsets, dataStart } = parseHeader(buffer);

  const required = ["x", "y", "z", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3", "f_dc_0", "f_dc_1", "f_dc_2", "opacity"];
  const missing = required.filter((name) => !(name in offsets));
  if (missing.length) throw new Error(`PLY is missing properties: ${missing.join(", ")}`);

  console.log(`${count.toLocaleString()} splats, ${stride} bytes each`);

  const read = (index, name) => buffer.readFloatLE(dataStart + index * stride + offsets[name].offset);

  // Rank by opacity so --max keeps the splats that actually contribute.
  let indices = Array.from({ length: count }, (_, i) => i);
  if (max < count) {
    console.log(`Keeping the ${max.toLocaleString()} most opaque splats…`);
    indices.sort((a, b) => read(b, "opacity") - read(a, "opacity"));
    indices = indices.slice(0, max);
    // Restore file order; splat viewers sort by depth at runtime, but keeping the original
    // order makes the output deterministic and diff-friendly.
    indices.sort((a, b) => a - b);
  }

  const out = Buffer.alloc(indices.length * 32);
  indices.forEach((index, n) => {
    const base = n * 32;

    out.writeFloatLE(read(index, "x"), base + 0);
    out.writeFloatLE(read(index, "y"), base + 4);
    out.writeFloatLE(read(index, "z"), base + 8);

    // Scales are stored logarithmically in 3DGS training output.
    out.writeFloatLE(Math.exp(read(index, "scale_0")), base + 12);
    out.writeFloatLE(Math.exp(read(index, "scale_1")), base + 16);
    out.writeFloatLE(Math.exp(read(index, "scale_2")), base + 20);

    // Base color is the DC term of the spherical harmonics, offset to 0-1.
    out[base + 24] = clampByte((0.5 + SH_C0 * read(index, "f_dc_0")) * 255);
    out[base + 25] = clampByte((0.5 + SH_C0 * read(index, "f_dc_1")) * 255);
    out[base + 26] = clampByte((0.5 + SH_C0 * read(index, "f_dc_2")) * 255);
    out[base + 27] = clampByte(sigmoid(read(index, "opacity")) * 255);

    // Quaternion (w, x, y, z), normalized then packed into bytes.
    const q = [read(index, "rot_0"), read(index, "rot_1"), read(index, "rot_2"), read(index, "rot_3")];
    const length = Math.hypot(...q) || 1;
    for (let i = 0; i < 4; i++) out[base + 28 + i] = clampByte((q[i] / length) * 128 + 128);
  });

  fs.writeFileSync(output, out);
  const mb = (out.length / 1024 / 1024).toFixed(1);
  console.log(`Wrote ${output} — ${indices.length.toLocaleString()} splats, ${mb} MB`);
}

main();
